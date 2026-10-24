import {
  ErrorHandler,
  inject,
  Injectable,
  InjectionToken,
  isDevMode,
} from '@angular/core';
import { API_BASE_URL } from './simulation-api';

export interface ClientErrorsConfig {
  /** Envoi des erreurs à l'API ; la journalisation console reste active. */
  enabled: boolean;
  /** Proportion des erreurs envoyées (0 à 1). */
  sampleRate: number;
  /** Plafond d'envois par chargement de page. */
  maxPerSession: number;
}

export const CLIENT_ERRORS_CONFIG = new InjectionToken<ClientErrorsConfig>(
  'CLIENT_ERRORS_CONFIG',
  {
    providedIn: 'root',
    factory: () => ({
      enabled: !isDevMode(),
      sampleRate: 0.25,
      maxPerSession: 10,
    }),
  },
);

/** Retire ce qui pourrait identifier une personne (e-mail, téléphone, jetons). */
export function scrub(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]')
    .replace(/\+?\d[\d ().-]{6,}\d/g, '[nombre]')
    .replace(/[A-Za-z0-9_-]{20,}/g, '[jeton]');
}

/** Chemin de la page sans paramètres ni segments ressemblant à un identifiant. */
export function safePath(pathname: string): string {
  return pathname
    .split('/')
    .map((s) => (/^[A-Za-z0-9_-]{12,}$/.test(s) ? ':id' : s))
    .join('/')
    .slice(0, 200);
}

/**
 * Suivi des erreurs navigateur : journalise en console puis envoie un résumé
 * anonyme à `POST /api/v1/client-errors` (échantillonné, dédoublonné, plafonné).
 */
@Injectable()
export class ClientErrorHandler implements ErrorHandler {
  private readonly config = inject(CLIENT_ERRORS_CONFIG);
  private readonly url = `${inject(API_BASE_URL)}/client-errors`;
  private readonly seen = new Set<string>();
  private sent = 0;

  handleError(error: unknown): void {
    console.error(error);
    try {
      this.report(error);
    } catch {
      // Le suivi des erreurs ne doit jamais provoquer d'erreur.
    }
  }

  private report(error: unknown): void {
    const { enabled, sampleRate, maxPerSession } = this.config;
    if (!enabled || this.sent >= maxPerSession) return;
    const err = error instanceof Error ? error : undefined;
    const message = scrub(err?.message ?? String(error)).slice(0, 500);
    const stack = err?.stack ? scrub(err.stack).slice(0, 4000) : undefined;
    const key = `${message}|${stack?.split('\n')[1] ?? ''}`;
    if (this.seen.has(key)) return;
    this.seen.add(key);
    if (Math.random() >= sampleRate) return;
    this.sent++;
    void fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        message,
        stack,
        path: safePath(globalThis.location?.pathname ?? ''),
        kind: 'error',
      }),
    }).catch(() => undefined);
  }
}
