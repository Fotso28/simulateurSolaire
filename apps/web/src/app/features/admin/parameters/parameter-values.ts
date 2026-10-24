/** Aplatit / reconstruit les valeurs d'un jeu de paramètres pour l'édition et la comparaison. */

export type ParamKind = 'number' | 'list';

export interface ParamEntry {
  /** Chemin pointé, ex. `defaultCableLengthsM.pv_controller`. */
  path: string;
  kind: ParamKind;
  value: number | number[];
}

const LABELS: Record<string, string> = {
  dodLithium: 'Profondeur de décharge — lithium',
  dodLead: 'Profondeur de décharge — plomb / gel',
  inverterEfficiency: "Rendement de l'onduleur",
  performanceRatio: 'Ratio de performance du champ solaire',
  inverterPowerMargin: "Marge de puissance de l'onduleur",
  inverterSurgeFactor: 'Facteur de surcharge (démarrage)',
  controllerMargin: 'Marge du régulateur',
  maxVoltageDrop: 'Chute de tension maximale',
  copperResistivity: 'Résistivité du cuivre (Ω·mm²/m)',
  autonomySteps: "Paliers d'autonomie (jours)",
  'defaultCableLengthsM.pv_controller':
    'Longueur câble panneaux → régulateur (m)',
  'defaultCableLengthsM.controller_battery':
    'Longueur câble régulateur → batteries (m)',
  'defaultCableLengthsM.battery_inverter':
    'Longueur câble batteries → onduleur (m)',
  'defaultCableLengthsM.inverter_board':
    'Longueur câble onduleur → tableau (m)',
  simultaneity: 'Coefficient de simultanéité',
  totalsSurgeFactor: 'Facteur de démarrage (puissance totale)',
  pvVocSafetyFactor: 'Sécurité Voc (froid)',
  pvMinVoltageFactor: 'Facteur de tension PV minimale',
  'voltageThresholds.max12V.inverterW': 'Seuil 12 V — puissance onduleur (W)',
  'voltageThresholds.max12V.pvWp': 'Seuil 12 V — champ solaire (Wc)',
  'voltageThresholds.max24V.inverterW': 'Seuil 24 V — puissance onduleur (W)',
  'voltageThresholds.max24V.pvWp': 'Seuil 24 V — champ solaire (Wc)',
  pvCableMinSectionMm2: 'Section minimale câble solaire (mm²)',
  heavyDeviceThresholdW: 'Seuil appareil lourd (W)',
  minAutonomyDays: 'Autonomie minimale (jours)',
};

export function paramLabel(path: string): string {
  return LABELS[path] ?? path;
}

export function flattenValues(values: unknown, prefix = ''): ParamEntry[] {
  if (typeof values !== 'object' || values === null) return [];
  const entries: ParamEntry[] = [];
  for (const [key, value] of Object.entries(
    values as Record<string, unknown>,
  )) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'number')
      entries.push({ path, kind: 'number', value });
    else if (Array.isArray(value))
      entries.push({ path, kind: 'list', value: value as number[] });
    else entries.push(...flattenValues(value, path));
  }
  return entries;
}

/** Reconstruit l'objet imbriqué à partir d'entrées aplaties. */
export function unflattenValues(
  entries: { path: string; value: number | number[] }[],
): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  for (const { path, value } of entries) {
    const parts = path.split('.');
    let node = root;
    for (const part of parts.slice(0, -1)) {
      node[part] ??= {};
      node = node[part] as Record<string, unknown>;
    }
    node[parts[parts.length - 1]] = value;
  }
  return root;
}

export function formatParam(value: number | number[] | undefined): string {
  if (value === undefined) return '—';
  const one = (v: number) => String(v).replace('.', ',');
  return Array.isArray(value) ? value.map(one).join(' ; ') : one(value);
}

/** Saisie « 0,5 ; 1 ; 2 » → [0.5, 1, 2] ; `null` si invalide. */
export function parseList(text: string): number[] | null {
  const parts = text
    .split(';')
    .map((part) => part.trim().replace(',', '.'))
    .filter((part) => part !== '');
  if (parts.length === 0) return null;
  const numbers = parts.map(Number);
  return numbers.every((n) => Number.isFinite(n) && n >= 0) ? numbers : null;
}

export function sameValue(
  a: number | number[] | undefined,
  b: number | number[] | undefined,
): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
