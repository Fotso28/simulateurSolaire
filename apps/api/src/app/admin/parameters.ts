import { ApiError } from '../common/api-error';

type Json = number | string | boolean | null | Json[] | { [key: string]: Json };

function sameShape(base: unknown, value: unknown): boolean {
  if (typeof base === 'number')
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
  if (Array.isArray(base)) {
    const item = base[0];
    return (
      Array.isArray(value) &&
      value.length > 0 &&
      value.every((v) =>
        item === undefined ? typeof v === 'number' : sameShape(item, v),
      )
    );
  }
  if (typeof base === 'object' && base !== null) {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
      return false;
    const b = base as Record<string, unknown>;
    const v = value as Record<string, unknown>;
    return Object.keys(b).every((k) => k in v && sameShape(b[k], v[k]));
  }
  return typeof base === typeof value;
}

/**
 * Nouvelle version des paramètres = version de base + modifications.
 * Chaque clé modifiée doit exister dans la base et en conserver la forme
 * (nombre ≥ 0, liste de nombres, objet aux mêmes clés).
 */
export function mergeParameters(
  base: Record<string, unknown>,
  changes: Record<string, unknown>,
): Record<string, Json> {
  for (const [key, value] of Object.entries(changes)) {
    if (!(key in base)) {
      throw ApiError.badRequest(
        'UNKNOWN_PARAMETER',
        `Paramètre inconnu : ${key}.`,
        `values.${key}`,
      );
    }
    if (!sameShape(base[key], value)) {
      throw ApiError.badRequest(
        'VALIDATION_ERROR',
        `La valeur du paramètre « ${key} » est invalide.`,
        `values.${key}`,
      );
    }
  }
  return { ...base, ...changes } as Record<string, Json>;
}
