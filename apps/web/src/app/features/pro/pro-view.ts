import type {
  CableSegment,
  Catalog,
  ParameterSet,
  Region,
  SimulationInput,
  SimulationResult,
} from '@simulateur/shared-types';
import { NBSP, formatNumber, formatPercent, withUnit } from '../../core/format';
import type {
  BomGroup,
  BomLine,
  RecapSummary,
} from '../particulier/recap-data';
import {
  batteryModel,
  controllerModel,
  formatSection,
  inverterModel,
  panelModel,
  protectionLabel,
  SEGMENT_LABELS,
  segmentLength,
  storageNeedWh,
} from '../particulier/result-view';

/** Contexte commun aux fiches techniques. */
export interface ProContext {
  catalog: Catalog;
  params: ParameterSet;
  region: Region | undefined;
  input: SimulationInput;
}

export interface TechRow {
  label: string;
  value: string;
  /** Contrôle satisfait (✓) ou non (✗) ; absent si ce n'est pas un contrôle. */
  ok?: boolean;
}

export interface TechCard {
  key: 'pv' | 'controller' | 'battery' | 'inverter';
  icon: string;
  title: string;
  value: string;
  rows: TechRow[];
}

export interface CableRow {
  segment: CableSegment;
  route: string;
  section: string;
  currentA: number;
  voltageV: number;
  lengthM: number;
  /** Section calculée par chute de tension (mm²). */
  rawSectionMm2: number;
  /** Chute de tension réelle avec la section retenue (ratio). */
  dropRatio: number;
  detail: string;
}

export interface ProtectionRow {
  type: string;
  name: string;
  value: string;
  quantity: number;
}

export const ROUTES: Record<CableSegment, string> = {
  pv_controller: 'Panneaux → régulateur',
  controller_battery: 'Régulateur → batteries',
  battery_inverter: 'Batteries → onduleur',
  inverter_board: 'Onduleur → tableau',
};

export const TECH_NAMES = { lithium: 'LiFePO4', plomb: 'Plomb / gel' } as const;

const n = (v: number, d = 0) => formatNumber(v, d);
const unit = (v: number, u: string, d = 0) => withUnit(v, u, d);

/** DoD retenue par le moteur pour la technologie (paramètres globaux du TRD). */
export function dodOf(tech: 'lithium' | 'plomb', params: ParameterSet): number {
  return tech === 'lithium' ? params.values.dodLithium : params.values.dodLead;
}

/** Tension du tronçon : V_mp de la chaîne, tension système ou tension AC. */
export function segmentVoltage(
  segment: CableSegment,
  r: SimulationResult,
  catalog: Catalog,
  acVoltage: number,
): number {
  if (segment === 'pv_controller') {
    return r.pv.series * (panelModel(catalog, r)?.vmpV ?? 0);
  }
  if (segment === 'inverter_board') return acVoltage;
  return r.systemVoltage;
}

export function acVoltageOf(ctx: ProContext): number {
  const country = ctx.catalog.countries.find(
    (c) => c.id === ctx.region?.countryId,
  );
  return country?.gridVoltageV || 230;
}

/** Fiches techniques par équipement, avec les contrôles du TRD. */
export function techCards(r: SimulationResult, ctx: ProContext): TechCard[] {
  const p = ctx.params.values;
  const panel = panelModel(ctx.catalog, r);
  const ctrl = controllerModel(ctx.catalog, r);
  const bat = batteryModel(ctx.catalog, r);
  const inv = inverterModel(ctx.catalog, r);
  const vocFactor = p.pvVocSafetyFactor ?? 1.1;
  const H = ctx.region?.irradiationAvg ?? 0;
  const cards: TechCard[] = [];

  const vocString = vocFactor * r.pv.series * (panel?.vocV ?? 0);
  const iPv = r.pv.strings * (panel?.iscA ?? 0) * 1.25;
  const vMax = ctrl?.maxPvVoltageV ?? inv?.mpptMaxPvVoltageV ?? null;
  cards.push({
    key: 'pv',
    icon: 'panel',
    title: 'Champ photovoltaïque',
    value: `${r.pv.count} × ${unit(panel?.powerWp ?? 0, 'Wc')} = ${unit(r.pv.totalWp, 'Wc')}`,
    rows: [
      {
        label: 'P_PV requise',
        value: unit(
          H > 0 ? r.energyWhPerDay.typ / (H * p.performanceRatio) : 0,
          'Wc',
        ),
      },
      {
        label: 'Câblage',
        value: `${r.pv.series}S × ${r.pv.strings}P`,
      },
      {
        label: `${n(vocFactor, 2)} × N_s × V_oc`,
        value:
          vMax !== null
            ? `${unit(vocString, 'V')} ≤ ${unit(vMax, 'V')}`
            : unit(vocString, 'V'),
        ...(vMax !== null ? { ok: vocString <= vMax + 1e-6 } : {}),
      },
      {
        label: 'N_p × I_sc × 1,25',
        value: unit(iPv, 'A', 1),
      },
    ],
  });

  if (r.controller) {
    const max = ctrl?.maxCurrentA ?? 0;
    cards.push({
      key: 'controller',
      icon: 'controller',
      title: 'Régulateur',
      value: ctrl
        ? `${ctrl.type} ${unit(ctrl.maxCurrentA, 'A')} / ${unit(ctrl.maxPvVoltageV, 'V')}`
        : r.controller.modelId,
      rows: [
        {
          label: `I_reg = ${n(p.controllerMargin, 2)} × ${n(r.pv.totalWp)} / ${r.systemVoltage}`,
          value: `${unit(r.controller.currentA, 'A', 1)} ≤ ${unit(max, 'A')}`,
          ok: r.controller.currentA <= max + 1e-6,
        },
        ...(ctrl
          ? [
              {
                label: 'V_PV max',
                value: unit(ctrl.maxPvVoltageV, 'V'),
              },
              {
                label: 'Courant d’entrée max',
                value: `${unit(iPv, 'A', 1)} ≤ ${unit(ctrl.maxInputCurrentA, 'A')}`,
                ok: iPv <= ctrl.maxInputCurrentA + 1e-6,
              },
            ]
          : []),
      ],
    });
  }

  const tech = bat?.technology ?? ctx.input.batteryTech;
  const dod = dodOf(tech, ctx.params);
  const needWh = storageNeedWh(
    r.energyWhPerDay.typ,
    ctx.input.autonomyDays,
    dod,
    ctx.params,
  );
  const units = r.battery.series * r.battery.parallel;
  cards.push({
    key: 'battery',
    icon: 'battery',
    title: 'Batteries',
    value: `${units} × ${TECH_NAMES[tech]} ${unit(bat?.nominalVoltageV ?? r.systemVoltage, 'V')} ${unit(bat?.capacityAh ?? 0, 'Ah')}`,
    rows: [
      {
        label: 'C requise',
        value: `${unit(needWh, 'Wh')} · ${unit(needWh / r.systemVoltage, 'Ah')}`,
      },
      {
        label: 'C installée',
        value: unit(r.battery.capacityWh, 'Wh'),
        ok: r.battery.capacityWh + 1e-6 >= needWh,
      },
      {
        label: 'Montage',
        value: `${r.battery.series}S × ${r.battery.parallel}P`,
      },
      { label: 'DoD', value: n(dod, 2) },
    ],
  });

  const needW = p.inverterPowerMargin * r.peakW.installed;
  const surgeW = p.inverterSurgeFactor * r.inverter.nominalW;
  cards.push({
    key: 'inverter',
    icon: 'inverter',
    title: inv?.type === 'hybride' ? 'Onduleur hybride' : 'Onduleur',
    value: `${unit(r.inverter.nominalW, 'W')} · ${r.systemVoltage}${NBSP}V / ${acVoltageOf(ctx)}${NBSP}V`,
    rows: [
      {
        label: `${n(p.inverterPowerMargin, 2)} × P_inst`,
        value: `${unit(needW, 'W')} ≤ ${unit(r.inverter.nominalW, 'W')}`,
        ok: needW <= r.inverter.nominalW + 1e-6,
      },
      {
        label: 'f_s × P_nom ≥ P_dem',
        value: `${n(surgeW)} ≥ ${unit(r.peakW.surge, 'W')}`,
        ok: surgeW + 1e-6 >= r.peakW.surge,
      },
      ...(inv?.type === 'hybride' && inv.mpptMaxCurrentA
        ? [
            {
              label: 'MPPT intégré',
              value: `${unit(inv.mpptMaxCurrentA, 'A')} / ${unit(inv.mpptMaxPvVoltageV ?? 0, 'V')}`,
            },
          ]
        : []),
    ],
  });
  return cards;
}

/** Sections par tronçon : courant, tension, longueur, section calculée et chute réelle. */
export function cableRows(r: SimulationResult, ctx: ProContext): CableRow[] {
  const p = ctx.params.values;
  const ac = acVoltageOf(ctx);
  return r.cables.map((c) => {
    const voltageV = segmentVoltage(c.segment, r, ctx.catalog, ac);
    const lengthM = segmentLength(
      c.segment,
      ctx.params,
      ctx.input.options?.cableLengthsM,
    );
    const k = 2 * p.copperResistivity * lengthM * c.currentA;
    const rawSectionMm2 = voltageV > 0 ? k / (p.maxVoltageDrop * voltageV) : 0;
    const dropRatio =
      voltageV > 0 && c.sectionMm2 > 0 ? k / (c.sectionMm2 * voltageV) : 0;
    const detail = [
      unit(c.currentA, 'A', 1),
      unit(voltageV, 'V', voltageV % 1 ? 1 : 0),
      unit(lengthM, 'm', lengthM % 1 ? 1 : 0),
      `calc. ${formatSection(Math.round(rawSectionMm2 * 10) / 10)}`,
      `ΔU ${formatDrop(dropRatio)}`,
    ];
    return {
      segment: c.segment,
      route: ROUTES[c.segment],
      section: formatSection(c.sectionMm2),
      currentA: c.currentA,
      voltageV,
      lengthM,
      rawSectionMm2,
      dropRatio,
      detail: detail.join(' · '),
    };
  });
}

/** Chute de tension en % avec une décimale (« 1,8 % »). */
export function formatDrop(ratio: number): string {
  return `${n(ratio * 100, 1)}${NBSP}%`;
}

/** Protections : nom technique, calibre (ou « — ») et quantité. */
export function protectionRows(r: SimulationResult): ProtectionRow[] {
  return r.protections.map((p) => ({
    type: p.type,
    name: protectionLabel({ type: p.type, ratingA: 0 }).name,
    value:
      p.type === 'rcd_30ma'
        ? '30 mA'
        : p.ratingA > 0
          ? unit(p.ratingA, 'A')
          : '—',
    quantity: p.quantity,
  }));
}

/** Synthèse du récapitulatif en vocabulaire technique (mode pro). */
export function proRecapSummary(
  r: SimulationResult,
  ctx: ProContext,
): RecapSummary {
  const inverter = inverterModel(ctx.catalog, r);
  const region = ctx.region;
  return {
    title:
      inverter?.type === 'hybride'
        ? 'Installation hybride · dimensionnement technique'
        : 'Installation autonome · dimensionnement technique',
    keys: [
      { value: n(r.pv.totalWp), label: 'Wc · champ PV' },
      { value: n(r.battery.capacityWh), label: 'Wh · C installée' },
      { value: n(r.inverter.nominalW), label: 'W · P_nom onduleur' },
    ],
    facts: [
      {
        label: 'Site',
        value: region
          ? `${region.name} · H ${n(region.irradiationAvg, 1)}${NBSP}kWh/m²/j`
          : '—',
      },
      {
        label: 'Énergie journalière E_j',
        value: unit(r.energyWhPerDay.typ, 'Wh/j'),
      },
      {
        label: 'P_inst / P_dem',
        value: `${n(r.peakW.installed)} / ${unit(r.peakW.surge, 'W')}`,
      },
      { label: 'Tension système', value: unit(r.systemVoltage, 'V') },
      { label: 'A_eff', value: unit(r.effectiveAutonomyDays, 'j', 2) },
      { label: 'C_PV', value: formatPercent(r.pvCoverage) },
    ],
  };
}

/** Nomenclature technique : câblage série/parallèle, sections et calibres. */
export function proBillOfMaterials(
  r: SimulationResult,
  ctx: ProContext,
): BomGroup[] {
  const p = ctx.params.values;
  const panel = panelModel(ctx.catalog, r);
  const ctrl = controllerModel(ctx.catalog, r);
  const bat = batteryModel(ctx.catalog, r);
  const inv = inverterModel(ctx.catalog, r);
  const x = (v: number) => `${n(v)}${NBSP}×`;
  const dod = dodOf(ctx.input.batteryTech, ctx.params);
  const vocString =
    (p.pvVocSafetyFactor ?? 1.1) * r.pv.series * (panel?.vocV ?? 0);
  const mounting = r.protections.find((pr) => pr.type === 'mounting_structure');
  const units = r.battery.series * r.battery.parallel;

  const equipment: BomLine[] = [
    {
      qty: x(r.pv.count),
      name: panel?.label ?? 'Module PV',
      note: `${r.pv.series}S × ${r.pv.strings}P · ${unit(r.pv.totalWp, 'Wc')} · V_oc chaîne ${unit(vocString, 'V')}`,
    },
  ];
  if (mounting) {
    equipment.push({
      qty: x(mounting.quantity),
      name: 'Structure de fixation',
      note: '1 par module',
    });
  }
  if (ctrl && r.controller) {
    equipment.push({
      qty: x(1),
      name: ctrl.label ?? `Régulateur ${ctrl.type} ${ctrl.maxCurrentA} A`,
      note: `I_reg ${unit(r.controller.currentA, 'A', 1)} ≤ ${unit(ctrl.maxCurrentA, 'A')} · V_PV max ${unit(ctrl.maxPvVoltageV, 'V')}`,
    });
  }
  equipment.push(
    {
      qty: x(units),
      name: bat?.label ?? 'Batterie',
      note: `${r.battery.series}S × ${r.battery.parallel}P · ${unit(r.battery.capacityWh, 'Wh')} · DoD ${n(dod, 2)} → ${unit(r.battery.capacityWh * dod, 'Wh')} utiles`,
    },
    {
      qty: x(1),
      name: inv?.label ?? `Onduleur ${n(r.inverter.nominalW)} W`,
      note: `${unit(r.systemVoltage, 'V')} DC / ${unit(acVoltageOf(ctx), 'V')} AC · P_nom ≥ 1,25 × P_inst · f_s × P_nom ${unit(r.inverter.nominalW * p.inverterSurgeFactor, 'W')} ≥ P_dem`,
    },
  );

  const cables: BomLine[] = cableRows(r, ctx).map((c) => ({
    qty: `${n(c.lengthM * 2)}${NBSP}m`,
    name: `${SEGMENT_LABELS[c.segment].from} ${c.section}`,
    note: `${c.route} · ${c.detail}`,
  }));

  const protections: BomLine[] = protectionRows(r)
    .filter((pr) => pr.type !== 'mounting_structure')
    .map((pr) => ({
      qty: pr.type === 'earthing' ? '—' : x(pr.quantity),
      name: pr.name,
      note: pr.value === '—' ? '' : `Calibre ${pr.value}`,
    }));

  return [
    { title: 'ÉQUIPEMENTS', lines: equipment },
    { title: 'CÂBLES · SECTION, LONGUEUR ALLER + RETOUR', lines: cables },
    { title: 'PROTECTIONS · CALIBRES', lines: protections },
  ];
}
