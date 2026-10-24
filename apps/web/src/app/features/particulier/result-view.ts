import type {
  CableSegment,
  Catalog,
  ParameterSet,
  Region,
  SimulationResult,
} from '@simulateur/shared-types';
import {
  formatKwp,
  formatNumber,
  formatW,
  kwh,
  NBSP,
  plural,
} from '../../core/format';

/**
 * Traduction d'un `SimulationResult` en textes simples pour le particulier
 * (cartes du résultat, configurateur, liste du matériel). Fonctions pures.
 */

export interface EquipmentCard {
  key: 'panels' | 'storage' | 'inverter' | 'controller';
  icon: string;
  title: string;
  value: string;
  sub: string;
  badge?: string;
  details: { label: string; value: string }[];
}

const TECH_LABEL = { lithium: 'lithium', plomb: 'plomb' } as const;

export function panelModel(catalog: Catalog, r: Partial<SimulationResult>) {
  return catalog.panels.find((p) => p.id === r.pv?.panelModelId);
}

export function batteryModel(catalog: Catalog, r: Partial<SimulationResult>) {
  return catalog.batteries.find((b) => b.id === r.battery?.modelId);
}

export function inverterModel(catalog: Catalog, r: Partial<SimulationResult>) {
  return catalog.inverters.find((i) => i.id === r.inverter?.modelId);
}

export function controllerModel(
  catalog: Catalog,
  r: Partial<SimulationResult>,
) {
  return catalog.controllers.find((c) => c.id === r.controller?.modelId);
}

/** « 1 batterie 200 Ah » / « 2 batteries 100 Ah ». */
export function batteryUnits(
  catalog: Catalog,
  r: Partial<SimulationResult>,
): string {
  const b = batteryModel(catalog, r);
  const n = (r.battery?.series ?? 1) * (r.battery?.parallel ?? 1);
  return `${plural(n, 'batterie')} ${b ? `${formatNumber(b.capacityAh)}${NBSP}Ah` : ''}`.trim();
}

/** « lithium 24 V » */
export function batteryKind(r: SimulationResult, catalog: Catalog): string {
  const b = batteryModel(catalog, r);
  return `${b ? TECH_LABEL[b.technology] : ''} ${formatNumber(r.systemVoltage)}${NBSP}V`.trim();
}

/** « 3 en série », « 2 chaînes de 3 en série ». */
export function panelLayout(r: Pick<SimulationResult, 'pv'>): string {
  const { series, strings } = r.pv;
  if (strings <= 1) return series > 1 ? `${series} en série` : '1 panneau seul';
  if (series <= 1) return `${strings} en parallèle`;
  return `${strings} chaînes de ${series} en série`;
}

/** Production moyenne journalière (Wh) : P_c × H × PR. */
export function averageProductionWh(
  r: SimulationResult,
  region: Region | undefined,
  params: ParameterSet,
): number {
  return (
    r.pv.totalWp *
    (region?.irradiationAvg ?? 0) *
    params.values.performanceRatio
  );
}

/** Stockage nécessaire (Wh) pour une énergie et une autonomie données. */
export function storageNeedWh(
  energyWh: number,
  days: number,
  dod: number,
  params: ParameterSet,
): number {
  return (energyWh * days) / (dod * params.values.inverterEfficiency);
}

export function equipmentCards(
  r: SimulationResult,
  ctx: {
    catalog: Catalog;
    params: ParameterSet;
    region: Region | undefined;
    autonomyDays: number;
  },
): EquipmentCard[] {
  const { catalog, params, region, autonomyDays } = ctx;
  const panel = panelModel(catalog, r);
  const battery = batteryModel(catalog, r);
  const controller = controllerModel(catalog, r);
  const inverter = inverterModel(catalog, r);
  const v = params.values;
  const dod = battery?.technology === 'plomb' ? v.dodLead : v.dodLithium;

  const minCount = r.range?.min.pv?.count;
  const maxCount = r.range?.max.pv?.count;
  const panelRange =
    minCount && maxCount && minCount !== maxCount
      ? `Fourchette\u00a0: ${minCount} à ${maxCount} panneaux`
      : undefined;

  const needMin = storageNeedWh(
    r.energyWhPerDay.min,
    autonomyDays,
    dod,
    params,
  );
  const needMax = storageNeedWh(
    r.energyWhPerDay.max,
    autonomyDays,
    dod,
    params,
  );
  const needBadge =
    Math.abs(needMax - needMin) < 50
      ? `Besoin\u00a0: ${kwh(needMin)}${NBSP}kWh`
      : `Besoin\u00a0: ${kwh(needMin)} à ${kwh(needMax)}${NBSP}kWh`;

  const invMin = r.range?.min.inverter?.nominalW;
  const invMax = r.range?.max.inverter?.nominalW;
  const invBadge =
    invMin && invMax
      ? invMin === invMax
        ? 'Identique dans toute la fourchette'
        : `Fourchette\u00a0: ${formatW(invMin)} à ${formatW(invMax)}`
      : undefined;

  const mounting = r.protections.find((p) => p.type === 'mounting_structure');

  const cards: EquipmentCard[] = [
    {
      key: 'panels',
      icon: 'panel',
      title: 'Panneaux solaires',
      value: plural(r.pv.count, 'panneau', 'panneaux'),
      sub: `${panel ? `${formatNumber(panel.powerWp)}${NBSP}Wc chacun · ` : ''}${formatKwp(r.pv.totalWp)} au total`,
      badge: panelRange,
      details: [
        {
          label: 'Production moyenne',
          value: `≈ ${kwh(averageProductionWh(r, region, params))}${NBSP}kWh / jour`,
        },
        { label: 'Montage', value: panelLayout(r) },
        ...(mounting
          ? [
              {
                label: 'Fixations',
                value:
                  mounting.quantity === r.pv.count
                    ? '1 structure par panneau'
                    : plural(mounting.quantity, 'structure'),
              },
            ]
          : []),
      ],
    },
    {
      key: 'storage',
      icon: 'battery',
      title: 'Stockage',
      value: `${kwh(r.battery.capacityWh)}${NBSP}kWh`,
      sub: `${batteryUnits(catalog, r)} ${batteryKind(r, catalog)}`,
      badge: needBadge,
      details: [
        {
          label: 'Énergie utilisable',
          value: `≈ ${kwh(r.battery.capacityWh * dod)}${NBSP}kWh`,
        },
        {
          label: 'Capacité',
          value: battery
            ? `${r.battery.series * r.battery.parallel} × ${formatNumber(battery.capacityAh)}${NBSP}Ah à ${formatNumber(battery.nominalVoltageV)}${NBSP}V`
            : '—',
        },
        ...(r.battery.series > 1 || r.battery.parallel > 1
          ? [
              {
                label: 'Montage',
                value: [
                  r.battery.series > 1 ? `${r.battery.series} en série` : '',
                  r.battery.parallel > 1
                    ? `${r.battery.parallel} en parallèle`
                    : '',
                ]
                  .filter(Boolean)
                  .join(', '),
              },
            ]
          : []),
      ],
    },
    {
      key: 'inverter',
      icon: 'inverter',
      title: 'Onduleur',
      value: formatW(r.inverter.nominalW),
      sub:
        inverter?.type === 'hybride'
          ? 'Onduleur hybride : charge aussi les batteries'
          : 'Transforme le courant des batteries en 230 V',
      badge: invBadge,
      details: [
        {
          label: 'Tout allumé en même temps',
          value: formatW(Math.round(r.peakW.installed)),
        },
        {
          label: 'Pic au démarrage',
          value: formatW(Math.round(r.peakW.surge)),
        },
        {
          label: 'Supporte en pointe',
          value: formatW(r.inverter.nominalW * v.inverterSurgeFactor),
        },
      ],
    },
  ];

  if (r.controller) {
    cards.push({
      key: 'controller',
      icon: 'controller',
      title: 'Régulateur de charge',
      value: controller
        ? `${controller.type} ${formatNumber(controller.maxCurrentA)}${NBSP}A`
        : 'MPPT',
      sub: 'Charge les batteries à partir des panneaux',
      details: [
        {
          label: 'Courant de charge',
          value: controller
            ? `${formatNumber(Math.round(r.controller.currentA))}${NBSP}A sur ${formatNumber(controller.maxCurrentA)}${NBSP}A`
            : `${formatNumber(Math.round(r.controller.currentA))}${NBSP}A`,
        },
      ],
    });
  }
  return cards;
}

/** Écart de stockage entre une variante et la proposition (seules les batteries changent). */
export function variantDelta(
  variant: Partial<SimulationResult>,
  current: SimulationResult,
): string {
  const diff = (variant.battery?.capacityWh ?? 0) - current.battery.capacityWh;
  if (Math.abs(diff) < 1) return 'Même stockage';
  const sign = diff > 0 ? '+' : '−';
  return `${sign}${kwh(Math.abs(diff))}${NBSP}kWh de stockage`;
}

// ——— Liste du matériel ———

export const SEGMENT_LABELS: Record<
  CableSegment,
  { from: string; route: string }
> = {
  pv_controller: { from: 'Câble solaire', route: 'Panneaux → régulateur' },
  controller_battery: { from: 'Câble', route: 'Régulateur → batterie' },
  battery_inverter: { from: 'Câble', route: 'Batterie → onduleur' },
  inverter_board: { from: 'Câble', route: 'Onduleur → tableau' },
};

const PROTECTION_LABELS: Record<string, { name: string; why: string }> = {
  dc_disconnect: {
    name: 'Sectionneur DC',
    why: 'Coupe les panneaux pour l’entretien',
  },
  dc_surge_arrester: { name: 'Parafoudre DC', why: 'Côté panneaux' },
  string_fuse: { name: 'Fusible de chaîne', why: 'Un par chaîne de panneaux' },
  controller_battery_fuse: {
    name: 'Fusible régulateur',
    why: 'Entre régulateur et batterie',
  },
  battery_fuse: {
    name: 'Fusible batterie',
    why: 'Au plus près de la batterie',
  },
  ac_breaker: { name: 'Disjoncteur', why: 'Sortie de l’onduleur' },
  rcd_30ma: { name: 'Différentiel 30 mA', why: 'Protège les personnes' },
  ac_surge_arrester: { name: 'Parafoudre AC', why: 'Côté tableau' },
  earthing: { name: 'Mise à la terre', why: 'Cadres des panneaux et masses' },
  mounting_structure: { name: 'Structure de fixation', why: 'Une par panneau' },
};

export function protectionLabel(p: { type: string; ratingA: number }): {
  name: string;
  why: string;
} {
  const base = PROTECTION_LABELS[p.type] ?? { name: p.type, why: '' };
  const rated =
    p.ratingA > 0 && p.type !== 'rcd_30ma'
      ? `${base.name} ${formatNumber(p.ratingA)}${NBSP}A`
      : base.name;
  return { name: rated, why: base.why };
}

/** Longueur d'un tronçon (m) : saisie pro, sinon valeur par défaut. */
export function segmentLength(
  segment: CableSegment,
  params: ParameterSet,
  lengths?: Partial<Record<CableSegment, number>>,
): number {
  return lengths?.[segment] ?? params.values.defaultCableLengthsM[segment];
}

export function formatSection(mm2: number): string {
  return `${formatNumber(mm2, mm2 % 1 ? 1 : 0)}${NBSP}mm²`;
}
