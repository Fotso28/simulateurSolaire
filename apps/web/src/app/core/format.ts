/**
 * Formatage français : virgule décimale, espace fine insécable (U+202F) entre
 * milliers, espace insécable (U+00A0) avant l'unité.
 */
export const NBSP = '\u00a0';
export const THIN_NBSP = '\u202f';

const formatters = new Map<number, Intl.NumberFormat>();

function formatter(decimals: number): Intl.NumberFormat {
  let f = formatters.get(decimals);
  if (!f) {
    f = new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: true,
    });
    formatters.set(decimals, f);
  }
  return f;
}

/** Nombre au format français (séparateur de milliers : espace fine). */
export function formatNumber(value: number, decimals = 0): string {
  // Normalise l'espace de groupement (selon le moteur ICU : U+202F ou U+00A0).
  return formatter(decimals)
    .format(value)
    .replace(/[\u00a0\u202f ]/g, THIN_NBSP)
    .replace('-', '−');
}

/** Valeur suivie de son unité, séparées par une espace insécable. */
export function withUnit(value: number, unit: string, decimals = 0): string {
  return `${formatNumber(value, decimals)}${NBSP}${unit}`;
}

export const formatW = (w: number) => withUnit(w, 'W');
export const formatWh = (wh: number) => withUnit(wh, 'Wh');

/** Wh → kWh (nombre seul, une décimale par défaut). */
export function kwh(wh: number, decimals = 1): string {
  return formatNumber(wh / 1000, decimals);
}

export const formatKwh = (wh: number, decimals = 1) =>
  `${kwh(wh, decimals)}${NBSP}kWh`;

/** Wc → kWc (deux décimales). */
export const formatKwp = (wp: number) => withUnit(wp / 1000, 'kWc', 2);

/** Ratio (1,15) → « 115 % ». */
export function formatPercent(ratio: number): string {
  return withUnit(Math.round(ratio * 100), '%');
}

/** Durée d'usage : 0,5 → « 30 min », 1,5 → « 1 h 30 », 6 → « 6 h ». */
export function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}${NBSP}min`;
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  if (minutes === 0) return `${whole}${NBSP}h`;
  return `${whole}${NBSP}h${NBSP}${String(minutes).padStart(2, '0')}`;
}

/** Jours d'autonomie : deux décimales (1,05). */
export const formatDays = (days: number) => formatNumber(days, 2);

/** Accord simple : « 1 appareil », « 3 appareils ». */
export function plural(count: number, singular: string, pluralForm?: string) {
  const word = count > 1 ? (pluralForm ?? `${singular}s`) : singular;
  return `${formatNumber(count)}${NBSP}${word}`;
}

/** Libellé d'un palier d'autonomie (0,5 → « Une nuit »). */
export function autonomyLabel(days: number): string {
  const labels: Record<number, string> = {
    0.5: 'Une nuit',
    1: 'Une journée',
    1.5: 'Un jour et demi',
    2: 'Deux jours',
    3: 'Trois jours',
  };
  return labels[days] ?? `${formatNumber(days, days % 1 ? 1 : 0)} jours`;
}
