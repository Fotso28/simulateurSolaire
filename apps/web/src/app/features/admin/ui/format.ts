const numberFormat = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 3,
});
const dateTimeFormat = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

/** Nombre au format français (espace fine des milliers, virgule décimale). */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return numberFormat.format(value).replace(/\u202f/g, ' ');
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return dateTimeFormat.format(new Date(value));
}

/** Convertit une saisie (virgule ou point décimal) en nombre, `null` si vide. */
export function parseDecimal(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = String(value).trim().replace(/\s/g, '').replace(',', '.');
  if (text === '') return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}
