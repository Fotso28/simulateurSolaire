/** Tolérance relative acceptée entre le résultat du navigateur et le rejeu serveur. */
export const RESULT_TOLERANCE = 0.01;

/** Champs ignorés : la version du moteur peut différer entre client et serveur. */
const IGNORED_KEYS = new Set(['engineVersion']);

function numbersMatch(a: number, b: number, tolerance: number): boolean {
  if (a === b) return true;
  const scale = Math.max(Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= tolerance * scale + 1e-9;
}

/**
 * Compare récursivement deux résultats. Renvoie le chemin du premier écart,
 * ou `null` si tout concorde (nombres à `tolerance` près, le reste à l'identique).
 */
export function findDivergence(
  expected: unknown,
  actual: unknown,
  tolerance = RESULT_TOLERANCE,
  path = '',
): string | null {
  if (typeof expected === 'number' && typeof actual === 'number') {
    return numbersMatch(expected, actual, tolerance)
      ? null
      : path || '(racine)';
  }
  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual))
      return path || '(racine)';
    if (expected.length !== actual.length) return `${path}.length`;
    for (let i = 0; i < expected.length; i++) {
      const d = findDivergence(
        expected[i],
        actual[i],
        tolerance,
        `${path}[${i}]`,
      );
      if (d) return d;
    }
    return null;
  }
  if (
    typeof expected === 'object' &&
    expected !== null &&
    typeof actual === 'object' &&
    actual !== null
  ) {
    const e = expected as Record<string, unknown>;
    const a = actual as Record<string, unknown>;
    const keys = new Set([...Object.keys(e), ...Object.keys(a)]);
    for (const key of keys) {
      if (IGNORED_KEYS.has(key)) continue;
      if (e[key] === undefined && a[key] === undefined) continue;
      const d = findDivergence(
        e[key],
        a[key],
        tolerance,
        path ? `${path}.${key}` : key,
      );
      if (d) return d;
    }
    return null;
  }
  return expected === actual ? null : path || '(racine)';
}
