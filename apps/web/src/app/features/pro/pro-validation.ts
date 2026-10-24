/** Règle de validation d'un champ numérique de la saisie pro. */
export interface NumberRule {
  min: number;
  max: number;
  integer?: boolean;
  /** Champ facultatif : vide → `undefined`. */
  optional?: boolean;
  message: string;
}

export type ParseResult =
  { ok: true; value: number | undefined } | { ok: false; error: string };

/** Bornes alignées sur l'API (`POST /simulations`) et le moteur. */
export const RULES = {
  powerW: { min: 0.1, max: 1_000_000, message: 'Puissance requise : > 0 W.' },
  quantity: {
    min: 1,
    max: 1000,
    integer: true,
    message: 'Quantité entière entre 1 et 1 000.',
  },
  hoursPerDay: { min: 0.1, max: 24, message: 'Entre 0,1 et 24 h / jour.' },
  surgeFactor: {
    min: 1,
    max: 10,
    optional: true,
    message: 'Facteur k entre 1 et 10.',
  },
  totalPowerW: {
    min: 1,
    max: 10_000_000,
    message: 'Puissance totale requise : ≥ 1 W.',
  },
  dailyEnergyWh: {
    min: 1,
    max: 100_000_000,
    message: 'Énergie journalière requise : ≥ 1 Wh/j.',
  },
  peakFactor: {
    min: 1,
    max: 10,
    optional: true,
    message: 'Facteur de pointe entre 1 et 10.',
  },
  cableLengthM: {
    min: 0.5,
    max: 500,
    message: 'Longueur entre 0,5 et 500 m.',
  },
} satisfies Record<string, NumberRule>;

/** Lit un nombre saisi à la française (« 1 250,5 ») et le valide. */
export function parseField(raw: string, rule: NumberRule): ParseResult {
  const text = raw.replace(/[\s\u00a0\u202f]/g, '').replace(',', '.');
  if (text === '') {
    return rule.optional
      ? { ok: true, value: undefined }
      : { ok: false, error: rule.message };
  }
  if (!/^\d*\.?\d+$|^\d+\.$/.test(text)) {
    return { ok: false, error: rule.message };
  }
  const value = Number(text);
  if (
    !Number.isFinite(value) ||
    value < rule.min ||
    value > rule.max ||
    (rule.integer && !Number.isInteger(value))
  ) {
    return { ok: false, error: rule.message };
  }
  return { ok: true, value };
}

/** Valeur affichée dans un champ (virgule décimale, sans séparateur de milliers). */
export function toField(value: number | undefined): string {
  if (value === undefined) return '';
  return String(Math.round(value * 1000) / 1000).replace('.', ',');
}
