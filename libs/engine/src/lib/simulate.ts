import type {
  Catalog,
  ParameterSet,
  SimulationInput,
  SimulationResult,
} from '@simulateur/shared-types';
import { ALERTS, type AlertCode } from './alerts';
import {
  demandFromLoads,
  resolveLoads,
  type Demand,
  type ResolvedLoad,
} from './energy';
import { EngineError } from './errors';
import { resolveParameters, type ResolvedParameters } from './params';
import {
  inverterCovers,
  sizeBattery,
  sizeSystem,
  type BatterySizing,
  type Sizing,
  type SizingContext,
} from './sizing';

export const ENGINE_VERSION = '1.0.0';

type Alert = SimulationResult['alerts'][number];

const round = (value: number, digits: number) => {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
};

function alert(code: AlertCode, loadIndex?: number): Alert {
  const { level, message } = ALERTS[code];
  return loadIndex === undefined
    ? { level, code, message }
    : { level, code, message, loadIndex };
}

function buildAlerts(
  sizing: Pick<Sizing, 'inverter' | 'pvCoverage'>,
  effectiveAutonomyDays: number,
  demand: Demand,
  heavyLoads: readonly ResolvedLoad[],
  params: ResolvedParameters,
): Alert[] {
  const alerts: Alert[] = [];
  if (!inverterCovers(sizing.inverter, demand, params))
    alerts.push(alert('INVERTER_UNDERSIZED'));
  if (effectiveAutonomyDays < params.minAutonomyDays - 1e-9) {
    alerts.push(alert('AUTONOMY_BELOW_ONE_NIGHT'));
  }
  if (sizing.pvCoverage < 1 - 1e-9) alerts.push(alert('PV_COVERAGE_LOW'));
  for (const load of heavyLoads) alerts.push(alert('HEAVY_DEVICE', load.index));
  alerts.push(alert('RAINY_SEASON'));
  return alerts;
}

function batteryResult(b: BatterySizing): SimulationResult['battery'] {
  return {
    modelId: b.model.id,
    series: b.series,
    parallel: b.parallel,
    capacityWh: round(b.capacityWh, 1),
  };
}

/** Partie « équipements » du résultat, commune au résultat principal et à la fourchette. */
function equipmentResult(sizing: Sizing, demand: Demand) {
  return {
    peakW: {
      installed: round(demand.installedW, 1),
      surge: round(demand.surgeW, 1),
    },
    systemVoltage: sizing.systemVoltage,
    pv: {
      panelModelId: sizing.panel.id,
      count: sizing.layout.count,
      series: sizing.layout.series,
      strings: sizing.layout.strings,
      totalWp: sizing.layout.count * sizing.panel.powerWp,
    },
    ...(sizing.controller
      ? {
          controller: {
            modelId: sizing.controller.id,
            currentA: round(sizing.layout.chargeCurrentA, 2),
          },
        }
      : {}),
    battery: batteryResult(sizing.battery),
    inverter: {
      modelId: sizing.inverter.id,
      nominalW: sizing.inverter.nominalPowerW,
    },
    effectiveAutonomyDays: round(sizing.battery.effectiveAutonomyDays, 3),
    pvCoverage: round(sizing.pvCoverage, 3),
  };
}

function validateInput(input: SimulationInput): void {
  if (!input || (input.mode !== 'particulier' && input.mode !== 'pro')) {
    throw new EngineError('INVALID_INPUT', 'Mode de simulation invalide.');
  }
  if (!Number.isFinite(input.autonomyDays) || input.autonomyDays <= 0) {
    throw new EngineError(
      'INVALID_INPUT',
      'L’autonomie doit être un nombre de jours positif.',
    );
  }
  if (input.batteryTech !== 'lithium' && input.batteryTech !== 'plomb') {
    throw new EngineError('INVALID_INPUT', 'Technologie de batterie invalide.');
  }
  const simultaneity = input.options?.simultaneity;
  if (simultaneity !== undefined && !(simultaneity > 0 && simultaneity <= 1)) {
    throw new EngineError(
      'INVALID_INPUT',
      'Le coefficient de simultanéité doit être compris entre 0 et 1.',
    );
  }
  const totals = input.totals;
  if (totals) {
    const valid = [totals.powerW, totals.dailyEnergyWh].every(
      (v) => Number.isFinite(v) && v >= 0,
    );
    if (
      !valid ||
      (totals.surgeFactor !== undefined && !(totals.surgeFactor >= 1))
    ) {
      throw new EngineError(
        'INVALID_INPUT',
        'Puissance ou énergie totale invalide.',
      );
    }
  }
  const ov = input.overrides;
  for (const [key, value] of [
    ['batteryParallel', ov?.batteryParallel],
    ['panelCount', ov?.panelCount],
  ] as const) {
    if (value !== undefined && !(Number.isInteger(value) && value >= 1)) {
      throw new EngineError(
        'INVALID_INPUT',
        `Forçage invalide (${key}) : entier ≥ 1 attendu.`,
      );
    }
  }
  for (const [segment, length] of Object.entries(
    input.options?.cableLengthsM ?? {},
  )) {
    if (!(Number.isFinite(length) && (length as number) > 0)) {
      throw new EngineError(
        'INVALID_INPUT',
        `Longueur de câble invalide (${segment}).`,
      );
    }
  }
}

/** Contexte de dimensionnement commun à toutes les passes d'une simulation. */
export function buildContext(
  input: SimulationInput,
  catalog: Catalog,
  params: ResolvedParameters,
): SizingContext {
  const region = catalog.regions.find((r) => r.id === input.regionId);
  if (!region) {
    throw new EngineError(
      'REGION_NOT_FOUND',
      `Région inconnue : ${input.regionId}.`,
    );
  }
  if (!(region.irradiationAvg > 0)) {
    throw new EngineError(
      'INVALID_INPUT',
      `Ensoleillement non renseigné pour la région ${region.name}.`,
    );
  }
  const country = catalog.countries.find((c) => c.id === region.countryId);
  return {
    catalog,
    params,
    irradiation: region.irradiationAvg,
    acVoltage: country?.gridVoltageV || 230,
    batteryTech: input.batteryTech,
    autonomyDays: input.autonomyDays,
    inverterType: input.options?.inverterType ?? 'separe',
    forcedVoltage: input.options?.systemVoltage,
    cableLengthsM: {
      ...params.defaultCableLengthsM,
      ...(input.options?.cableLengthsM ?? {}),
    },
  };
}

interface Demands {
  typ: Demand;
  min: Demand;
  max: Demand;
  loads: ResolvedLoad[];
  /** Vrai en mode particulier par appareils : la fourchette min / max a un sens. */
  hasRange: boolean;
}

function buildDemands(
  input: SimulationInput,
  catalog: Catalog,
  params: ResolvedParameters,
): Demands {
  if (input.totals) {
    const t = input.totals;
    const demand: Demand = {
      energyWh: t.dailyEnergyWh,
      installedW: t.powerW,
      surgeW: t.powerW * (t.surgeFactor ?? params.totalsSurgeFactor),
    };
    return {
      typ: demand,
      min: demand,
      max: demand,
      loads: [],
      hasRange: false,
    };
  }
  const loads = resolveLoads(input.loads ?? [], catalog, input.mode).filter(
    (l) => l.quantity > 0,
  );
  if (loads.length === 0) {
    throw new EngineError(
      'NO_LOADS',
      'Ajoutez au moins un appareil ou une puissance totale.',
    );
  }
  const cs = input.options?.simultaneity ?? params.simultaneity;
  return {
    typ: demandFromLoads(loads, 'typ', cs),
    min: demandFromLoads(loads, 'min', cs),
    max: demandFromLoads(loads, 'max', cs),
    loads,
    hasRange: input.mode === 'particulier',
  };
}

/** Paliers d'autonomie voisins (strictement inférieur et supérieur) de l'autonomie demandée. */
export function neighborAutonomySteps(
  autonomyDays: number,
  steps: readonly number[],
): { lower?: number; upper?: number } {
  const sorted = [...steps].sort((a, b) => a - b);
  return {
    lower: [...sorted].reverse().find((s) => s < autonomyDays - 1e-9),
    upper: sorted.find((s) => s > autonomyDays + 1e-9),
  };
}

/**
 * Dimensionne une installation solaire autonome (étapes 1 à 9 du TRD), avec fourchette,
 * variantes d'autonomie, forçages du configurateur et alertes. Fonction pure.
 * Lève une `EngineError` (code stable, message en français) si l'entrée est invalide
 * ou si aucun matériel du catalogue ne convient.
 */
export function simulate(
  input: SimulationInput,
  catalog: Catalog,
  params: ParameterSet,
): SimulationResult {
  validateInput(input);
  const p = resolveParameters(params?.values);
  const ctx = buildContext(input, catalog, p);
  const demands = buildDemands(input, catalog, p);
  const overrides = input.overrides ?? {};
  const sizing = sizeSystem(ctx, demands.typ, overrides);
  const heavyLoads = demands.loads.filter(
    (l) => l.powerW.typ > p.heavyDeviceThresholdW,
  );

  const variant = (
    autonomyDays: number | undefined,
  ): Partial<SimulationResult> | undefined => {
    if (autonomyDays === undefined) return undefined;
    const battery = sizeBattery(
      ctx,
      demands.typ.energyWh,
      autonomyDays,
      sizing.systemVoltage,
      {
        batteryModelId: overrides.batteryModelId,
      },
    );
    return {
      battery: batteryResult(battery),
      effectiveAutonomyDays: round(battery.effectiveAutonomyDays, 3),
      alerts: buildAlerts(
        sizing,
        battery.effectiveAutonomyDays,
        demands.typ,
        heavyLoads,
        p,
      ),
    };
  };
  const steps = neighborAutonomySteps(input.autonomyDays, p.autonomySteps);

  const bound = (demand: Demand): Partial<SimulationResult> => {
    const energyWhPerDay = {
      min: demand.energyWh,
      typ: demand.energyWh,
      max: demand.energyWh,
    };
    try {
      return {
        energyWhPerDay,
        ...equipmentResult(sizeSystem(ctx, demand), demand),
      };
    } catch (error) {
      // Une borne sans matériel compatible n'empêche pas le résultat typique.
      if (error instanceof EngineError) return { energyWhPerDay };
      /* istanbul ignore next */
      throw error;
    }
  };

  const result: SimulationResult = {
    energyWhPerDay: {
      min: round(demands.min.energyWh, 1),
      typ: round(demands.typ.energyWh, 1),
      max: round(demands.max.energyWh, 1),
    },
    ...equipmentResult(sizing, demands.typ),
    cables: sizing.cables.map((c) => ({
      ...c,
      currentA: round(c.currentA, 2),
    })),
    protections: sizing.protections,
    variants: {},
    alerts: buildAlerts(
      sizing,
      sizing.battery.effectiveAutonomyDays,
      demands.typ,
      heavyLoads,
      p,
    ),
    engineVersion: ENGINE_VERSION,
    paramsVersion: params?.version ?? 0,
  };
  const lower = variant(steps.lower);
  const upper = variant(steps.upper);
  if (lower) result.variants.lower = lower;
  if (upper) result.variants.upper = upper;
  if (demands.hasRange) {
    result.range = { min: bound(demands.min), max: bound(demands.max) };
  }
  return result;
}
