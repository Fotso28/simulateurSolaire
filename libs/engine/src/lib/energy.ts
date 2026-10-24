import type {
  Catalog,
  SimulationInput,
  SimulationMode,
} from '@simulateur/shared-types';
import { EngineError } from './errors';

export type LoadInput = NonNullable<SimulationInput['loads']>[number];
export type PowerLevel = 'min' | 'typ' | 'max';

export interface ResolvedLoad {
  index: number;
  label: string;
  deviceId?: string;
  quantity: number;
  hoursPerDay: number;
  dutyCycle: number;
  surgeFactor: number;
  powerW: Record<PowerLevel, number>;
}

/** Besoin électrique ramené aux grandeurs des étapes 1 et 2. */
export interface Demand {
  energyWh: number;
  installedW: number;
  surgeW: number;
}

export interface LoadEnergy {
  index: number;
  label: string;
  min: number;
  typ: number;
  max: number;
}

export interface DailyEnergy {
  min: number;
  typ: number;
  max: number;
  perLoad: LoadEnergy[];
}

function assertNonNegative(value: number, field: string, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new EngineError(
      'INVALID_INPUT',
      `Valeur invalide pour « ${label} » : ${field}.`,
    );
  }
}

/**
 * Associe chaque ligne saisie à son appareil du catalogue.
 * Une puissance saisie (`powerW`) remplace la fourchette du catalogue (min = typ = max).
 * En mode pro, sans puissance saisie, la puissance typique est retenue.
 */
export function resolveLoads(
  loads: readonly LoadInput[],
  catalog: Pick<Catalog, 'devices'>,
  mode: SimulationMode = 'particulier',
): ResolvedLoad[] {
  return loads.map((load, index) => {
    const label = load.label;
    assertNonNegative(load.quantity, 'quantité', label);
    assertNonNegative(load.hoursPerDay, 'heures par jour', label);
    if (load.hoursPerDay > 24) {
      throw new EngineError(
        'INVALID_INPUT',
        `Valeur invalide pour « ${label} » : heures par jour > 24.`,
      );
    }
    if (
      load.surgeFactor !== undefined &&
      !(Number.isFinite(load.surgeFactor) && load.surgeFactor >= 1)
    ) {
      throw new EngineError(
        'INVALID_INPUT',
        `Valeur invalide pour « ${label} » : facteur de démarrage < 1.`,
      );
    }
    const device = load.deviceId
      ? catalog.devices.find((d) => d.id === load.deviceId)
      : undefined;
    if (load.deviceId && !device) {
      throw new EngineError(
        'DEVICE_NOT_FOUND',
        `Appareil inconnu : ${load.deviceId}.`,
      );
    }
    let powerW: Record<PowerLevel, number>;
    if (load.powerW !== undefined && load.powerW !== null) {
      assertNonNegative(load.powerW, 'puissance', label);
      powerW = { min: load.powerW, typ: load.powerW, max: load.powerW };
    } else if (device) {
      powerW =
        mode === 'pro'
          ? {
              min: device.powerTypW,
              typ: device.powerTypW,
              max: device.powerTypW,
            }
          : {
              min: device.powerMinW,
              typ: device.powerTypW,
              max: device.powerMaxW,
            };
    } else {
      throw new EngineError(
        'INVALID_INPUT',
        `Puissance manquante pour « ${label} ».`,
      );
    }
    return {
      index,
      label,
      deviceId: device?.id,
      quantity: load.quantity,
      hoursPerDay: load.hoursPerDay,
      dutyCycle: device?.dutyCycle ?? 1,
      surgeFactor: load.surgeFactor ?? device?.surgeFactor ?? 1,
      powerW,
    };
  });
}

/** Étape 1 pour une ligne : q × P × h × τ. */
export function loadEnergyWh(load: ResolvedLoad, level: PowerLevel): number {
  return load.quantity * load.powerW[level] * load.hoursPerDay * load.dutyCycle;
}

/** Étapes 1 et 2 sur une liste d'appareils, au niveau de puissance demandé. */
export function demandFromLoads(
  loads: readonly ResolvedLoad[],
  level: PowerLevel,
  simultaneity: number,
): Demand {
  let energyWh = 0;
  let sumW = 0;
  let maxExtraSurgeW = 0;
  for (const load of loads) {
    energyWh += loadEnergyWh(load, level);
    sumW += load.quantity * load.powerW[level];
    if (load.quantity > 0) {
      maxExtraSurgeW = Math.max(
        maxExtraSurgeW,
        (load.surgeFactor - 1) * load.powerW[level],
      );
    }
  }
  const installedW = simultaneity * sumW;
  return { energyWh, installedW, surgeW: installedW + maxExtraSurgeW };
}

/**
 * Énergie journalière d'une liste d'appareils (récapitulatif particulier) :
 * total min / typ / max et détail par ligne.
 */
export function computeDailyEnergy(
  loads: readonly LoadInput[],
  catalog: Pick<Catalog, 'devices'>,
  mode: SimulationMode = 'particulier',
): DailyEnergy {
  const perLoad = resolveLoads(loads, catalog, mode).map((load) => ({
    index: load.index,
    label: load.label,
    min: loadEnergyWh(load, 'min'),
    typ: loadEnergyWh(load, 'typ'),
    max: loadEnergyWh(load, 'max'),
  }));
  const sum = (level: PowerLevel) =>
    perLoad.reduce((acc, l) => acc + l[level], 0);
  return { min: sum('min'), typ: sum('typ'), max: sum('max'), perLoad };
}
