import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import {
  Observable,
  catchError,
  finalize,
  map,
  of,
  shareReplay,
  tap,
} from 'rxjs';
import { API_BASE } from './api-error';
import { AdminRole, AdminUserSummary, AuthResponse } from './models';

/**
 * Session du back-office : jeton d'accès (15 min) gardé en mémoire seulement,
 * jeton de renouvellement dans un cookie httpOnly (chemin `/api/v1/auth`)
 * que le navigateur envoie seul à `/auth/refresh` et `/auth/logout`.
 *
 * Fourni par la route `/admin` (pas en racine) : rien n'alourdit le bundle initial.
 */
@Injectable()
export class AdminAuthService {
  private readonly http = inject(HttpClient);

  private token: string | null = null;
  private refreshInFlight: Observable<string | null> | null = null;

  readonly user = signal<AdminUserSummary | null>(null);
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly role = computed<AdminRole | null>(() => this.user()?.role ?? null);
  readonly isAdmin = computed(() => this.role() === 'ADMIN');

  accessToken(): string | null {
    return this.token;
  }

  login(email: string, password: string): Observable<AdminUserSummary> {
    return this.http
      .post<AuthResponse>(
        `${API_BASE}/auth/login`,
        { email: email.trim(), password },
        { withCredentials: true },
      )
      .pipe(
        tap((response) => this.store(response)),
        map((response) => response.user),
      );
  }

  /**
   * Renouvelle le jeton d'accès via le cookie. Émet le nouveau jeton, ou `null`
   * si la session est perdue (jamais d'erreur). Les appels simultanés partagent
   * la même requête : la rotation côté serveur interdit de rejouer un cookie.
   */
  refresh(): Observable<string | null> {
    this.refreshInFlight ??= this.http
      .post<AuthResponse>(
        `${API_BASE}/auth/refresh`,
        {},
        { withCredentials: true },
      )
      .pipe(
        map((response) => {
          this.store(response);
          return response.accessToken;
        }),
        catchError(() => {
          this.clearSession();
          return of(null);
        }),
        finalize(() => (this.refreshInFlight = null)),
        shareReplay(1),
      );
    return this.refreshInFlight;
  }

  /** Session valide ? Après un rechargement de page, tente un renouvellement. */
  ensureSession(): Observable<boolean> {
    if (this.token && this.user()) return of(true);
    return this.refresh().pipe(map((token) => token !== null));
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(`${API_BASE}/auth/logout`, {}, { withCredentials: true })
      .pipe(
        catchError(() => of(undefined)),
        map(() => undefined),
        finalize(() => this.clearSession()),
      );
  }

  clearSession(): void {
    this.token = null;
    this.user.set(null);
  }

  hasRole(roles: readonly AdminRole[] | undefined): boolean {
    const role = this.role();
    if (!role) return false;
    return !roles || roles.length === 0 || roles.includes(role);
  }

  private store(response: AuthResponse): void {
    this.token = response.accessToken;
    this.user.set(response.user);
  }
}
