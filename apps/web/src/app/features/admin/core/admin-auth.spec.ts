import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';
import { adminAuthGuard } from './admin-auth.guard';
import { adminAuthInterceptor } from './admin-auth.interceptor';
import { AdminAuthService } from './admin-auth.service';
import { AuthResponse } from './models';

const auth = (
  token = 'tok-1',
  role: 'ADMIN' | 'EDITEUR' = 'ADMIN',
): AuthResponse => ({
  accessToken: token,
  expiresIn: 900,
  user: { id: 'u1', email: 'admin@example.com', role },
});

describe('Back-office : authentification', () => {
  let http: HttpTestingController;
  let service: AdminAuthService;
  let client: HttpClient;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([adminAuthInterceptor])),
        provideHttpClientTesting(),
        AdminAuthService,
      ],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AdminAuthService);
    client = TestBed.inject(HttpClient);
    router = TestBed.inject(Router);
  });

  afterEach(() => http.verify());

  function login(role: 'ADMIN' | 'EDITEUR' = 'ADMIN', token = 'tok-1') {
    service.login(' admin@example.com ', 'secret').subscribe();
    const req = http.expectOne('/api/v1/auth/login');
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.body).toEqual({
      email: 'admin@example.com',
      password: 'secret',
    });
    req.flush(auth(token, role));
  }

  describe('AdminAuthService', () => {
    it('garde le jeton en mémoire et expose utilisateur et rôle', () => {
      expect(service.isAuthenticated()).toBe(false);
      login('EDITEUR');
      expect(service.accessToken()).toBe('tok-1');
      expect(service.isAuthenticated()).toBe(true);
      expect(service.isAdmin()).toBe(false);
      expect(service.hasRole(['ADMIN'])).toBe(false);
      expect(service.hasRole(['ADMIN', 'EDITEUR'])).toBe(true);
      expect(service.hasRole(undefined)).toBe(true);
    });

    it('ne persiste rien dans le stockage du navigateur', () => {
      login();
      expect(localStorage.length).toBe(0);
      expect(sessionStorage.length).toBe(0);
    });

    it('partage une seule requête de renouvellement entre appels simultanés', async () => {
      const first = firstValueFrom(service.refresh());
      const second = firstValueFrom(service.refresh());
      const req = http.expectOne('/api/v1/auth/refresh');
      expect(req.request.withCredentials).toBe(true);
      req.flush(auth('tok-2'));
      expect(await first).toBe('tok-2');
      expect(await second).toBe('tok-2');
      expect(service.accessToken()).toBe('tok-2');
    });

    it('renouvellement refusé : émet null et efface la session', async () => {
      login();
      const result = firstValueFrom(service.refresh());
      http
        .expectOne('/api/v1/auth/refresh')
        .flush(
          { code: 'INVALID_REFRESH_TOKEN', message: 'Session expirée.' },
          { status: 401, statusText: 'Unauthorized' },
        );
      expect(await result).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
    });

    it('déconnexion : appelle /auth/logout et efface la session même en cas d’erreur', () => {
      login();
      service.logout().subscribe();
      http
        .expectOne('/api/v1/auth/logout')
        .flush(null, { status: 500, statusText: 'Error' });
      expect(service.accessToken()).toBeNull();
      expect(service.user()).toBeNull();
    });
  });

  describe('adminAuthInterceptor', () => {
    it('ajoute le jeton aux seules routes /api/v1/admin', () => {
      login();
      client.get('/api/v1/admin/devices').subscribe();
      client.get('/api/v1/catalog').subscribe();
      client.get('/api/v1/administration').subscribe();
      expect(
        http
          .expectOne('/api/v1/admin/devices')
          .request.headers.get('Authorization'),
      ).toBe('Bearer tok-1');
      const publicReq = http.expectOne('/api/v1/catalog');
      expect(publicReq.request.headers.has('Authorization')).toBe(false);
      expect(publicReq.request.withCredentials).toBe(false);
      expect(
        http
          .expectOne('/api/v1/administration')
          .request.headers.has('Authorization'),
      ).toBe(false);
    });

    it('sur 401, renouvelle la session puis rejoue la requête une fois', () => {
      login();
      let body: unknown;
      client.get('/api/v1/admin/devices').subscribe((value) => (body = value));
      http
        .expectOne('/api/v1/admin/devices')
        .flush(
          { code: 'INVALID_TOKEN', message: 'Jeton expiré.' },
          { status: 401, statusText: 'Unauthorized' },
        );
      http.expectOne('/api/v1/auth/refresh').flush(auth('tok-2'));
      const retry = http.expectOne('/api/v1/admin/devices');
      expect(retry.request.headers.get('Authorization')).toBe('Bearer tok-2');
      retry.flush([{ id: 'd1' }]);
      expect(body).toEqual([{ id: 'd1' }]);
    });

    it('si le renouvellement échoue, renvoie l’erreur et retourne à la connexion', () => {
      login();
      const navigate = jest.spyOn(router, 'navigate').mockResolvedValue(true);
      let status = 0;
      client
        .get('/api/v1/admin/devices')
        .subscribe({ error: (e) => (status = e.status) });
      http
        .expectOne('/api/v1/admin/devices')
        .flush(
          { code: 'INVALID_TOKEN', message: 'x' },
          { status: 401, statusText: 'Unauthorized' },
        );
      http
        .expectOne('/api/v1/auth/refresh')
        .flush(
          { code: 'INVALID_REFRESH_TOKEN', message: 'x' },
          { status: 401, statusText: 'Unauthorized' },
        );
      expect(status).toBe(401);
      expect(navigate).toHaveBeenCalledWith(
        ['/admin/login'],
        expect.objectContaining({
          queryParams: expect.objectContaining({ expired: 1 }),
        }),
      );
      expect(service.isAuthenticated()).toBe(false);
    });

    it('ne renouvelle pas sur 403 (rôle insuffisant)', () => {
      login('EDITEUR');
      let status = 0;
      client
        .get('/api/v1/admin/users')
        .subscribe({ error: (e) => (status = e.status) });
      http
        .expectOne('/api/v1/admin/users')
        .flush(
          { code: 'FORBIDDEN', message: 'Accès refusé.' },
          { status: 403, statusText: 'Forbidden' },
        );
      http.expectNone('/api/v1/auth/refresh');
      expect(status).toBe(403);
    });
  });

  describe('adminAuthGuard', () => {
    const run = (data: Record<string, unknown> = {}, url = '/admin/journal') =>
      TestBed.runInInjectionContext(() =>
        adminAuthGuard(
          { data } as unknown as ActivatedRouteSnapshot,
          { url } as RouterStateSnapshot,
        ),
      ) as Observable<boolean | UrlTree>;

    it('laisse passer une session ouverte', async () => {
      login();
      expect(await firstValueFrom(run())).toBe(true);
    });

    it('après un rechargement, tente le renouvellement par cookie', async () => {
      const result = firstValueFrom(run());
      http.expectOne('/api/v1/auth/refresh').flush(auth());
      expect(await result).toBe(true);
    });

    it('sans session, redirige vers la connexion avec returnUrl', async () => {
      const result = firstValueFrom(run());
      http
        .expectOne('/api/v1/auth/refresh')
        .flush(
          { code: 'INVALID_REFRESH_TOKEN', message: 'x' },
          { status: 401, statusText: 'Unauthorized' },
        );
      const tree = (await result) as UrlTree;
      expect(router.serializeUrl(tree)).toBe(
        '/admin/login?returnUrl=%2Fadmin%2Fjournal',
      );
    });

    it('rôle insuffisant : renvoie l’éditeur vers le catalogue', async () => {
      login('EDITEUR');
      const tree = (await firstValueFrom(run({ roles: ['ADMIN'] }))) as UrlTree;
      expect(router.serializeUrl(tree)).toBe('/admin/appareils');
      expect(await firstValueFrom(run({}))).toBe(true);
    });
  });
});
