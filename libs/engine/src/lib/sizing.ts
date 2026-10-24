import type {
  BatteryModel,
  BatteryTech,
  CableSegment,
  Catalog,
  ControllerModel,
  InverterModel,
  PanelModel,
  SimulationInput,
  SimulationResult,
  SystemVoltage,
} from '@simulateur/shared-types';
import { PROTECTION_RATING_TYPES } from '../data/equipment';
import type { Demand } from './energy';
import { EngineError, HARDWARE_ERROR_CODES } from './errors';
import type { ResolvedParameters } from './params';

/** Tolérance des comparaisons et arrondis (évite 3,0000001 → 4). */
const EPS = 1e-9;
const VOLTAGES: readonly SystemVoltage[] = [12, 24, 48];

export type Overrides = NonNullable<SimulationInput['overrides']>;

export interface SizingContext {
  catalog: Catalog;
  params: ResolvedParameters;
  /** Ensoleillement H (kWh/m²/j). */
  irradiation: number;
  /** Tension du réseau / sortie onduleur (V). */
  acVoltage: number;
  batteryTech: BatteryTech;
  autonomyDays: number;
  inverterType: 'hybride' | 'separe';
  forcedVoltage?: SystemVoltage;
  cableLengthsM: Record<CableSegment, number>;
}

export interface StringLayout {
  series: number;
  strings: number;
  count: number;
  /** I_reg = marge × N_pan × P_pan / V_sys. */
  chargeCurrentA: number;
  /** N_p × I_sc × marge. */
  pvCurrentA: number;
}

/** Caractéristiques MPPT vérifiées : régulateur séparé ou MPPT intégré d'un hybride. */
export interface MpptSpec {
  maxCurrentA: number;
  maxPvVoltageV: number;
  maxInputCurrentA: number;
}

export interface BatterySizing {
  model: BatteryModel;
  series: number;
  parallel: number;
  capacityWh: number;
  requiredAh: number;
  effectiveAutonomyDays: number;
}

export interface Sizing {
  systemVoltage: SystemVoltage;
  pvRequiredWp: number;
  panel: PanelModel;
  layout: StringLayout;
  controller?: ControllerModel;
  inverter: InverterModel;
  battery: BatterySizing;
  cables: SimulationResult['cables'];
  protections: SimulationResult['protections'];
  pvCoverage: number;
}

const ceil = (x: number) => Math.ceil(x - EPS);
const floor = (x: number) => Math.floor(x + EPS);

function findById<T extends { id: string }>(
  items: readonly T[],
  id: string,
  what: string,
): T {
  const item = items.find((i) => i.id === id);
  if (!item) {
    throw new EngineError('OVERRIDE_NOT_FOUND', `${what} introuvable : ${id}.`);
  }
  return item;
}

/** Étape 3 : tension système d'après 1,25 × P_inst et P_PV. */
export function selectSystemVoltage(
  installedW: number,
  pvRequiredWp: number,
  params: ResolvedParameters,
): SystemVoltage {
  const inverterW = params.inverterPowerMargin * installedW;
  const { max12V, max24V } = params.voltageThresholds;
  if (inverterW <= max12V.inverterW + EPS && pvRequiredWp <= max12V.pvWp + EPS)
    return 12;
  if (inverterW <= max24V.inverterW + EPS && pvRequiredWp <= max24V.pvWp + EPS)
    return 24;
  return 48;
}

export function selectPanel(
  catalog: Catalog,
  panelModelId?: string,
): PanelModel {
  if (panelModelId)
    return findById(catalog.panels, panelModelId, 'Modèle de panneau');
  const active = catalog.panels.filter((p) => p.active);
  const panel = active.find((p) => p.isDefault) ?? active[0];
  if (!panel) {
    throw new EngineError(
      'NO_PANEL',
      'Aucun modèle de panneau actif dans le catalogue.',
    );
  }
  return panel;
}

/**
 * Étapes 5 et 6 : répartition en chaînes pour un MPPT donné.
 * N_s entre N_s,min et N_s,max sans dépasser N_pan, N_p = ⌈N_pan / N_s⌉, contrôles du courant
 * d'entrée et du courant de charge. Parmi les N_s valides, retient le moins de panneaux
 * (N_s × N_p), puis le plus grand N_s. Renvoie `undefined` si aucune répartition n'est valide.
 */
export function layoutStrings(
  spec: MpptSpec,
  panel: PanelModel,
  panelCount: number,
  systemVoltage: SystemVoltage,
  params: ResolvedParameters,
): StringLayout | undefined {
  const nsMax = Math.min(
    floor(spec.maxPvVoltageV / (params.pvVocSafetyFactor * panel.vocV)),
    panelCount,
  );
  const nsMin = Math.max(
    1,
    ceil((params.pvMinVoltageFactor * systemVoltage) / panel.vmpV),
  );
  let best: StringLayout | undefined;
  for (let series = nsMax; series >= nsMin; series--) {
    const strings = ceil(panelCount / series);
    const count = series * strings;
    const pvCurrentA = strings * panel.iscA * params.controllerMargin;
    const chargeCurrentA =
      (params.controllerMargin * count * panel.powerWp) / systemVoltage;
    if (
      pvCurrentA > spec.maxInputCurrentA + EPS ||
      chargeCurrentA > spec.maxCurrentA + EPS
    ) {
      continue;
    }
    if (!best || count < best.count) {
      best = { series, strings, count, chargeCurrentA, pvCurrentA };
    }
  }
  return best;
}

function controllerSpec(c: ControllerModel): MpptSpec {
  return {
    maxCurrentA: c.maxCurrentA,
    maxPvVoltageV: c.maxPvVoltageV,
    maxInputCurrentA: c.maxInputCurrentA,
  };
}

function hybridSpec(inv: InverterModel): MpptSpec {
  return {
    maxCurrentA: inv.mpptMaxCurrentA ?? 0,
    maxPvVoltageV: inv.mpptMaxPvVoltageV ?? 0,
    // Le catalogue ne donne pas de courant d'entrée pour les MPPT intégrés.
    maxInputCurrentA: Number.POSITIVE_INFINITY,
  };
}

/** Étape 4 : l'onduleur vérifie P_nom ≥ marge × P_inst et f_s × P_nom ≥ P_dem. */
export function inverterCovers(
  inverter: Pick<InverterModel, 'nominalPowerW'>,
  demand: Demand,
  params: ResolvedParameters,
): boolean {
  return (
    inverter.nominalPowerW + EPS >=
      params.inverterPowerMargin * demand.installedW &&
    params.inverterSurgeFactor * inverter.nominalPowerW + EPS >= demand.surgeW
  );
}

/** Étape 7 : choix des batteries (capacité installée minimale, puis nombre d'unités). */
export function sizeBattery(
  ctx: SizingContext,
  energyWh: number,
  autonomyDays: number,
  systemVoltage: SystemVoltage,
  overrides: Pick<Overrides, 'batteryModelId' | 'batteryParallel'> = {},
): BatterySizing {
  const eta = ctx.params.inverterEfficiency;
  const dodOf = (m: BatteryModel) =>
    m.technology === 'lithium' ? ctx.params.dodLithium : ctx.params.dodLead;
  const fits = (m: BatteryModel) =>
    m.nominalVoltageV > 0 &&
    m.nominalVoltageV <= systemVoltage &&
    systemVoltage % m.nominalVoltageV === 0;

  if (overrides.batteryParallel !== undefined && !overrides.batteryModelId) {
    // Seul le nombre de branches est imposé : il s'applique au modèle choisi automatiquement.
    const auto = sizeBattery(ctx, energyWh, autonomyDays, systemVoltage);
    return sizeBattery(ctx, energyWh, autonomyDays, systemVoltage, {
      batteryModelId: auto.model.id,
      batteryParallel: overrides.batteryParallel,
    });
  }

  let candidates: BatteryModel[];
  if (overrides.batteryModelId) {
    const forced = findById(
      ctx.catalog.batteries,
      overrides.batteryModelId,
      'Modèle de batterie',
    );
    if (!fits(forced)) {
      throw new EngineError(
        'NO_COMPATIBLE_BATTERY',
        `La batterie ${forced.id} (${forced.nominalVoltageV} V) ne peut pas former un parc de ${systemVoltage} V.`,
      );
    }
    candidates = [forced];
  } else {
    candidates = ctx.catalog.batteries.filter(
      (m) => m.active && m.technology === ctx.batteryTech && fits(m),
    );
  }

  let best: BatterySizing | undefined;
  let bestUnits = Number.POSITIVE_INFINITY;
  for (const model of candidates) {
    const dod = dodOf(model);
    const requiredAh = (energyWh * autonomyDays) / (dod * eta) / systemVoltage;
    const series = systemVoltage / model.nominalVoltageV;
    const parallel =
      overrides.batteryParallel ??
      Math.max(1, ceil(requiredAh / model.capacityAh));
    const capacityWh = parallel * model.capacityAh * systemVoltage;
    const units = series * parallel;
    if (
      !best ||
      capacityWh < best.capacityWh - EPS ||
      (Math.abs(capacityWh - best.capacityWh) <= EPS && units < bestUnits)
    ) {
      best = {
        model,
        series,
        parallel,
        capacityWh,
        requiredAh,
        effectiveAutonomyDays:
          (parallel * model.capacityAh * systemVoltage * dod * eta) / energyWh,
      };
      bestUnits = units;
    }
  }
  if (!best) {
    throw new EngineError(
      'NO_COMPATIBLE_BATTERY',
      `Aucune batterie ${ctx.batteryTech === 'lithium' ? 'lithium' : 'plomb / gel'} du catalogue ne convient à un parc de ${systemVoltage} V.`,
    );
  }
  return best;
}

/** Section théorique par chute de tension : S = 2 ρ L I / (ε U). */
export function voltageDropSection(
  resistivity: number,
  lengthM: number,
  currentA: number,
  maxDrop: number,
  voltageV: number,
): number {
  return (2 * resistivity * lengthM * currentA) / (maxDrop * voltageV);
}

/** Calibre normalisé immédiatement supérieur (ou égal) au courant, pour un type de protection. */
export function protectionRating(
  catalog: Catalog,
  type: string,
  currentA: number,
): number {
  const rating = catalog.protectionRatings
    .filter((r) => r.type === type && r.ratingA + EPS >= currentA)
    .reduce<number | undefined>(
      (min, r) => (min === undefined || r.ratingA < min ? r.ratingA : min),
      undefined,
    );
  if (rating === undefined) {
    throw new EngineError(
      'NO_PROTECTION_RATING',
      `Aucun calibre « ${type} » du catalogue ne couvre ${currentA.toFixed(1)} A.`,
    );
  }
  return rating;
}

/**
 * Étape 8 : section normalisée ≥ section par chute de tension, ≥ minimum du tronçon,
 * puis intensité admissible ≥ courant et ≥ calibre de la protection associée.
 */
export function sizeCable(
  ctx: SizingContext,
  segment: CableSegment,
  currentA: number,
  voltageV: number,
  options: { minSectionMm2?: number; protectionA?: number } = {},
): SimulationResult['cables'][number] {
  const p = ctx.params;
  const raw = voltageDropSection(
    p.copperResistivity,
    ctx.cableLengthsM[segment],
    currentA,
    p.maxVoltageDrop,
    voltageV,
  );
  const minimum = Math.max(raw, options.minSectionMm2 ?? 0);
  const needA = Math.max(currentA, options.protectionA ?? 0);
  const section = [...ctx.catalog.cableSections]
    .sort((a, b) => a.sectionMm2 - b.sectionMm2)
    .find(
      (s) =>
        s.sectionMm2 + EPS >= minimum && s.allowableCurrentA + EPS >= needA,
    );
  if (!section) {
    throw new EngineError(
      'NO_CABLE_SECTION',
      `Aucune section de câble normalisée ne convient au tronçon ${segment} (${currentA.toFixed(1)} A sur ${ctx.cableLengthsM[segment]} m) : réduisez la longueur.`,
    );
  }
  return { segment, currentA, sectionMm2: section.sectionMm2 };
}

interface PowerChain {
  inverter: InverterModel;
  controller?: ControllerModel;
  layout: StringLayout;
}

/** Étapes 4 à 6 à une tension donnée (onduleur, puis résolution conjointe chaînes / MPPT). */
function sizePowerChain(
  ctx: SizingContext,
  demand: Demand,
  voltage: SystemVoltage,
  panel: PanelModel,
  panelCount: number,
  forcedInverter: InverterModel | undefined,
): PowerChain {
  const hybrid = forcedInverter
    ? forcedInverter.type === 'hybride'
    : ctx.inverterType === 'hybride';
  const inverters = forcedInverter
    ? [forcedInverter]
    : ctx.catalog.inverters
        .filter(
          (inv) =>
            inv.active &&
            inv.dcVoltageV === voltage &&
            (inv.type === 'hybride') === hybrid &&
            inverterCovers(inv, demand, ctx.params),
        )
        .sort((a, b) => a.nominalPowerW - b.nominalPowerW);
  if (inverters.length === 0) {
    throw new EngineError(
      'NO_COMPATIBLE_INVERTER',
      `Aucun onduleur ${hybrid ? 'hybride' : 'autonome'} ${voltage} V du catalogue ne couvre ${Math.round(
        ctx.params.inverterPowerMargin * demand.installedW,
      )} W (pointe ${Math.round(demand.surgeW)} W).`,
    );
  }

  if (hybrid) {
    for (const inverter of inverters) {
      const layout = layoutStrings(
        hybridSpec(inverter),
        panel,
        panelCount,
        voltage,
        ctx.params,
      );
      if (layout) return { inverter, layout };
    }
    throw new EngineError(
      'NO_COMPATIBLE_CONTROLLER',
      `Aucun onduleur hybride ${voltage} V dont le MPPT intégré accepte ${panelCount} panneaux de ${panel.powerWp} Wc.`,
    );
  }

  const inverter = inverters[0];
  const controllers = ctx.catalog.controllers
    .filter(
      (c) =>
        c.active && c.type === 'MPPT' && c.supportedVoltages.includes(voltage),
    )
    .sort(
      (a, b) =>
        a.maxCurrentA - b.maxCurrentA ||
        a.maxPvVoltageV - b.maxPvVoltageV ||
        a.maxInputCurrentA - b.maxInputCurrentA,
    );
  for (const controller of controllers) {
    const layout = layoutStrings(
      controllerSpec(controller),
      panel,
      panelCount,
      voltage,
      ctx.params,
    );
    if (layout) return { inverter, controller, layout };
  }
  throw new EngineError(
    'NO_COMPATIBLE_CONTROLLER',
    `Aucun régulateur MPPT ${voltage} V du catalogue n'accepte ${panelCount} panneaux de ${panel.powerWp} Wc.`,
  );
}

function hasEquipmentOverrides(o: Overrides): boolean {
  return [
    o.batteryModelId,
    o.batteryParallel,
    o.panelModelId,
    o.panelCount,
  ].some((v) => v !== undefined);
}

/** Étapes 3 à 9 pour un besoin donné. En tension automatique, essaie la tension supérieure si le matériel manque. */
export function sizeSystem(
  ctx: SizingContext,
  demand: Demand,
  overrides: Overrides = {},
): Sizing {
  if (!(demand.energyWh > 0)) {
    throw new EngineError(
      'ZERO_ENERGY',
      'La consommation journalière est nulle : rien à dimensionner.',
    );
  }
  const p = ctx.params;
  const panel = selectPanel(ctx.catalog, overrides.panelModelId);
  const pvRequiredWp = demand.energyWh / (ctx.irradiation * p.performanceRatio);
  const forcedInverter = overrides.inverterId
    ? findById(ctx.catalog.inverters, overrides.inverterId, 'Onduleur')
    : undefined;

  let voltages: readonly SystemVoltage[];
  if (forcedInverter) {
    voltages = [forcedInverter.dcVoltageV];
  } else if (ctx.forcedVoltage) {
    voltages = [ctx.forcedVoltage];
  } else if (hasEquipmentOverrides(overrides)) {
    // Un forçage ne change jamais la tension : elle reste celle de la proposition automatique.
    voltages = [sizeSystem(ctx, demand).systemVoltage];
  } else {
    const base = selectSystemVoltage(demand.installedW, pvRequiredWp, p);
    voltages = VOLTAGES.filter((v) => v >= base);
  }

  let lastError: EngineError | undefined;
  for (const voltage of voltages) {
    try {
      return sizeAtVoltage(
        ctx,
        demand,
        overrides,
        voltage,
        panel,
        pvRequiredWp,
        forcedInverter,
      );
    } catch (error) {
      if (
        error instanceof EngineError &&
        HARDWARE_ERROR_CODES.includes(error.code)
      ) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }
  throw lastError as EngineError;
}

function sizeAtVoltage(
  ctx: SizingContext,
  demand: Demand,
  overrides: Overrides,
  voltage: SystemVoltage,
  panel: PanelModel,
  pvRequiredWp: number,
  forcedInverter: InverterModel | undefined,
): Sizing {
  const p = ctx.params;
  const panelCount =
    overrides.panelCount ?? Math.max(1, ceil(pvRequiredWp / panel.powerWp));
  const { inverter, controller, layout } = sizePowerChain(
    ctx,
    demand,
    voltage,
    panel,
    panelCount,
    forcedInverter,
  );
  const battery = sizeBattery(
    ctx,
    demand.energyWh,
    ctx.autonomyDays,
    voltage,
    overrides,
  );

  // Étapes 8 et 9 : courants, protections, puis câbles coordonnés avec leur protection.
  const iCharge = layout.chargeCurrentA;
  const iBatteryInverter =
    (p.controllerMargin * inverter.nominalPowerW) /
    (voltage * p.inverterEfficiency);
  const iBatteryCable = controller
    ? iBatteryInverter
    : Math.max(iBatteryInverter, iCharge);
  const iOutput = (p.controllerMargin * inverter.nominalPowerW) / ctx.acVoltage;
  const T = PROTECTION_RATING_TYPES;

  const protections: SimulationResult['protections'] = [
    {
      type: 'dc_disconnect',
      ratingA: protectionRating(ctx.catalog, T.dcDisconnect, layout.pvCurrentA),
      quantity: 1,
    },
    { type: 'dc_surge_arrester', ratingA: 0, quantity: 1 },
  ];
  if (layout.strings >= 3) {
    protections.push({
      type: 'string_fuse',
      ratingA: protectionRating(
        ctx.catalog,
        T.pvFuse,
        panel.iscA * p.controllerMargin,
      ),
      quantity: layout.strings,
    });
  }
  const chargeFuseA = controller
    ? protectionRating(ctx.catalog, T.dcFuse, iCharge)
    : undefined;
  if (chargeFuseA !== undefined) {
    protections.push({
      type: 'controller_battery_fuse',
      ratingA: chargeFuseA,
      quantity: 1,
    });
  }
  const batteryFuseA = protectionRating(ctx.catalog, T.dcFuse, iBatteryCable);
  const breakerA = protectionRating(ctx.catalog, T.acBreaker, iOutput);
  protections.push(
    { type: 'battery_fuse', ratingA: batteryFuseA, quantity: 1 },
    { type: 'ac_breaker', ratingA: breakerA, quantity: 1 },
    {
      type: 'rcd_30ma',
      ratingA: protectionRating(ctx.catalog, T.rcd, breakerA),
      quantity: 1,
    },
    { type: 'ac_surge_arrester', ratingA: 0, quantity: 1 },
    { type: 'earthing', ratingA: 0, quantity: 1 },
    { type: 'mounting_structure', ratingA: 0, quantity: layout.count },
  );

  const cables: SimulationResult['cables'] = [
    sizeCable(
      ctx,
      'pv_controller',
      layout.pvCurrentA,
      layout.series * panel.vmpV,
      {
        minSectionMm2: p.pvCableMinSectionMm2,
      },
    ),
  ];
  if (controller) {
    cables.push(
      sizeCable(ctx, 'controller_battery', iCharge, voltage, {
        protectionA: chargeFuseA,
      }),
    );
  }
  cables.push(
    sizeCable(ctx, 'battery_inverter', iBatteryCable, voltage, {
      protectionA: batteryFuseA,
    }),
    sizeCable(ctx, 'inverter_board', iOutput, ctx.acVoltage, {
      protectionA: breakerA,
    }),
  );

  return {
    systemVoltage: voltage,
    pvRequiredWp,
    panel,
    layout,
    controller,
    inverter,
    battery,
    cables,
    protections,
    pvCoverage:
      (layout.count * panel.powerWp * ctx.irradiation * p.performanceRatio) /
      demand.energyWh,
  };
}
