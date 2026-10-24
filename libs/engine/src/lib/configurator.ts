import type {
  Catalog,
  ParameterSet,
  SimulationInput,
  SimulationResult,
} from '@simulateur/shared-types';
import { EngineError } from './errors';
import { simulate } from './simulate';

/** Tailles voisines proposées par les boutons ‹ › du configurateur. */
export interface Neighbors<T> {
  lower?: T;
  upper?: T;
}

export interface InverterChoice {
  inverterId: string;
  nominalW: number;
}

export interface StorageChoice {
  batteryModelId: string;
  batteryParallel: number;
  capacityWh: number;
}

export interface PanelCountChoice {
  panelCount: number;
}

/** Nombre maximal de branches parallèles proposées par le configurateur. */
const MAX_PARALLEL = 20;
/** Nombre maximal d'essais pour trouver un nombre de panneaux voisin. */
const MAX_PANEL_STEPS = 30;

function withOverrides(
  input: SimulationInput,
  overrides: SimulationInput['overrides'],
): SimulationInput {
  return { ...input, overrides: { ...input.overrides, ...overrides } };
}

/** Onduleurs voisins (même tension, même type), du catalogue actif. */
export function inverterNeighbors(
  input: SimulationInput,
  catalog: Catalog,
  params: ParameterSet,
  current: SimulationResult = simulate(input, catalog, params),
): Neighbors<InverterChoice> {
  const ref = catalog.inverters.find((i) => i.id === current.inverter.modelId);
  /* istanbul ignore if */
  if (!ref) return {};
  const same = catalog.inverters
    .filter(
      (i) => i.active && i.dcVoltageV === ref.dcVoltageV && i.type === ref.type,
    )
    .sort((a, b) => a.nominalPowerW - b.nominalPowerW);
  const lower = [...same]
    .reverse()
    .find((i) => i.nominalPowerW < ref.nominalPowerW);
  const upper = same.find((i) => i.nominalPowerW > ref.nominalPowerW);
  const choice = (i: (typeof same)[number] | undefined) =>
    i && { inverterId: i.id, nominalW: i.nominalPowerW };
  return { lower: choice(lower), upper: choice(upper) };
}

/**
 * Stockages voisins : configurations (modèle × branches parallèles) de la même technologie
 * à la tension système, classées par capacité installée ; à capacité égale, le moins d'unités.
 */
export function storageNeighbors(
  input: SimulationInput,
  catalog: Catalog,
  params: ParameterSet,
  current: SimulationResult = simulate(input, catalog, params),
): Neighbors<StorageChoice> {
  const voltage = current.systemVoltage;
  const ref = catalog.batteries.find((b) => b.id === current.battery.modelId);
  /* istanbul ignore if */
  if (!ref) return {};
  const options: (StorageChoice & { units: number })[] = [];
  for (const model of catalog.batteries) {
    const fits =
      model.active &&
      model.technology === ref.technology &&
      model.nominalVoltageV <= voltage &&
      voltage % model.nominalVoltageV === 0;
    if (!fits) continue;
    const series = voltage / model.nominalVoltageV;
    for (let parallel = 1; parallel <= MAX_PARALLEL; parallel++) {
      options.push({
        batteryModelId: model.id,
        batteryParallel: parallel,
        capacityWh: parallel * model.capacityAh * voltage,
        units: series * parallel,
      });
    }
  }
  options.sort((a, b) => a.capacityWh - b.capacityWh || a.units - b.units);
  const cap = current.battery.capacityWh;
  const lower = [...options].reverse().find((o) => o.capacityWh < cap - 1e-6);
  // Premier élément de la capacité inférieure la plus proche (le moins d'unités).
  const lowerBest =
    lower &&
    options.find((o) => Math.abs(o.capacityWh - lower.capacityWh) < 1e-6);
  const upper = options.find((o) => o.capacityWh > cap + 1e-6);
  const strip = (
    o: (typeof options)[number] | undefined,
  ): StorageChoice | undefined =>
    o && {
      batteryModelId: o.batteryModelId,
      batteryParallel: o.batteryParallel,
      capacityWh: o.capacityWh,
    };
  return { lower: strip(lowerBest), upper: strip(upper) };
}

/** Nombres de panneaux voisins qui donnent effectivement une autre répartition valide. */
export function panelCountNeighbors(
  input: SimulationInput,
  catalog: Catalog,
  params: ParameterSet,
  current: SimulationResult = simulate(input, catalog, params),
): Neighbors<PanelCountChoice> {
  const count = current.pv.count;
  const tryCount = (panelCount: number): number | undefined => {
    try {
      return simulate(withOverrides(input, { panelCount }), catalog, params).pv
        .count;
    } catch (error) {
      if (error instanceof EngineError) return undefined;
      /* istanbul ignore next */
      throw error;
    }
  };
  const result: Neighbors<PanelCountChoice> = {};
  for (let k = 1; k <= MAX_PANEL_STEPS && count - k >= 1; k++) {
    const obtained = tryCount(count - k);
    if (obtained !== undefined && obtained < count) {
      result.lower = { panelCount: obtained };
      break;
    }
  }
  for (let k = 1; k <= MAX_PANEL_STEPS; k++) {
    const obtained = tryCount(count + k);
    if (obtained !== undefined && obtained > count) {
      result.upper = { panelCount: obtained };
      break;
    }
  }
  return result;
}
