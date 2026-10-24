import type { AdminRole } from '@prisma/client';

/** Contenu du jeton d'accès. */
export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: AdminRole;
}

/** Utilisateur authentifié attaché à la requête. */
export interface AuthUser {
  id: string;
  email: string;
  role: AdminRole;
}

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 3600 * 1000;
export const REFRESH_COOKIE = 'refresh_token';
export const MAX_FAILED_LOGINS = 5;
export const LOCK_DURATION_MS = 15 * 60 * 1000;
