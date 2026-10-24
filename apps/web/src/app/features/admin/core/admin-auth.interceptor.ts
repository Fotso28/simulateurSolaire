import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { API_BASE } from './api-error';
import { AdminAuthService } from './admin-auth.service';

const ADMIN_PREFIX = `${API_BASE}/admin`;
const AUTH_PREFIX = `${API_BASE}/auth/`;

function pathOf(url: string): string {
  try {
    return new URL(url, 'http://localhost').pathname;
  } catch {
    return url;
  }
}

/**
 * Intercepteur du back-office, limité à `/api/v1/admin` et `/api/v1/auth` :
 * - `/auth/*` : envoie le cookie de renouvellement (`withCredentials`) ;
 * - `/admin/*` : ajoute le jeton d'accès, et sur 401 renouvelle la session une
 *   fois puis rejoue la requête ; si le renouvellement échoue, retour à la connexion.
 * Les autres appels (API publique, ressources) passent sans modification.
 */
export const adminAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const path = pathOf(req.url);
  if (path.startsWith(AUTH_PREFIX)) {
    return next(
      req.withCredentials ? req : req.clone({ withCredentials: true }),
    );
  }
  if (path !== ADMIN_PREFIX && !path.startsWith(`${ADMIN_PREFIX}/`)) {
    return next(req);
  }

  const auth = inject(AdminAuthService);
  const router = inject(Router);
  const withToken = (request: HttpRequest<unknown>, token: string | null) =>
    token
      ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : request;

  return next(withToken(req, auth.accessToken())).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }
      return auth.refresh().pipe(
        switchMap((token) => {
          if (!token) {
            void router.navigate(['/admin/login'], {
              queryParams: { returnUrl: router.url, expired: 1 },
            });
            return throwError(() => error);
          }
          return next(withToken(req, token));
        }),
      );
    }),
  );
};
