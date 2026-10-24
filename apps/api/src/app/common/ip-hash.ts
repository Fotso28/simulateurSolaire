import { createHmac } from 'node:crypto';

/** Empreinte HMAC-SHA256 d'une adresse IP : l'IP n'est jamais stockée en clair. */
export function hashIp(ip: string | undefined, secret: string): string | null {
  if (!ip) return null;
  return createHmac('sha256', secret).update(ip).digest('hex');
}
