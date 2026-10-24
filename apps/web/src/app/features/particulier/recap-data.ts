import type {
  CableSegment,
  Catalog,
  ParameterSet,
  Region,
  SimulationResult,
} from '@simulateur/shared-types';
import {
  formatDays,
  formatKwh,
  formatNumber,
  formatPercent,
  kwh,
  NBSP,
} from '../../core/format';
import {
  batteryModel,
  controllerModel,
  formatSection,
  inverterModel,
  panelLayout,
  panelModel,
  protectionLabel,
  SEGMENT_LABELS,
  segmentLength,
} from './result-view';

/** Synthèse et nomenclature du récapitulatif (écran et export PDF). */

function batteryMounting(series: number, parallel: number): string {
  if (series > 1 && parallel > 1)
    return `${parallel} branches de ${series} en série`;
  return series > 1 ? `${series} en série` : `${parallel} en parallèle`;
}

export interface BomLine {
  qty: string;
  name: string;
  note: string;
}

/** Récapitulatif final : nomenclature (RF-15), schéma, avertissement (RF-16). */
export interface BomGroup {
  title: string;
  lines: BomLine[];
}

export interface RecapSummary {
  title: string;
  keys: { value: string; label: string }[];
  facts: { label: string; value: string }[];
}

export function recapSummary(
  r: SimulationResult,
  catalog: Catalog,
  region: Region | undefined,
): RecapSummary {
  const inverter = inverterModel(catalog, r);
  return {
    title:
      inverter?.type === 'hybride'
        ? 'Installation solaire hybride'
        : 'Installation solaire autonome',
    keys: [
      {
        value: formatNumber(r.pv.totalWp / 1000, 2),
        label: 'kWc de panneaux',
      },
      { value: kwh(r.battery.capacityWh), label: 'kWh de stockage' },
      { value: formatNumber(r.inverter.nominalW), label: 'W d’onduleur' },
    ],
    facts: [
      {
        label: 'Lieu',
        value: region ? `${region.name} (${region.capital})` : '—',
      },
      {
        label: 'Consommation',
        value: `≈ ${formatKwh(r.energyWhPerDay.typ)} / jour`,
      },
      {
        label: 'Autonomie réelle',
        value: `${formatDays(r.effectiveAutonomyDays)} jour`,
      },
      { label: 'Couverture solaire', value: formatPercent(r.pvCoverage) },
    ],
  };
}

export function billOfMaterials(
  r: SimulationResult,
  catalog: Catalog,
  params: ParameterSet,
  cableLengthsM?: Partial<Record<CableSegment, number>>,
): BomGroup[] {
  const panel = panelModel(catalog, r);
  const battery = batteryModel(catalog, r);
  const controller = controllerModel(catalog, r);
  const inverter = inverterModel(catalog, r);
  const dod =
    battery?.technology === 'plomb'
      ? params.values.dodLead
      : params.values.dodLithium;
  const x = (n: number) => `${formatNumber(n)}${NBSP}×`;
  const mounting = r.protections.find((p) => p.type === 'mounting_structure');
  const units = r.battery.series * r.battery.parallel;

  const equipment: BomLine[] = [
    {
      qty: x(r.pv.count),
      name: panel?.label ?? 'Panneau solaire',
      note:
        r.pv.strings > 1 ? panelLayout(r) : `Montés en série, une seule chaîne`,
    },
  ];
  if (mounting) {
    equipment.push({
      qty: x(mounting.quantity),
      name: 'Structure de fixation',
      note: 'Une par panneau',
    });
  }
  if (controller && r.controller) {
    equipment.push({
      qty: x(1),
      name:
        controller.label ??
        `Régulateur ${controller.type} ${controller.maxCurrentA} A`,
      note: 'Charge les batteries depuis les panneaux',
    });
  }
  equipment.push(
    {
      qty: x(units),
      name: battery?.label ?? 'Batterie',
      note: `${kwh(r.battery.capacityWh)}${NBSP}kWh, dont ${kwh(r.battery.capacityWh * dod)}${NBSP}kWh utilisables${
        units > 1
          ? ` · ${batteryMounting(r.battery.series, r.battery.parallel)}`
          : ''
      }`,
    },
    {
      qty: x(1),
      name:
        inverter?.label ?? `Onduleur ${formatNumber(r.inverter.nominalW)} W`,
      note: `Sortie 230${NBSP}V, ${formatNumber(r.inverter.nominalW * params.values.inverterSurgeFactor)}${NBSP}W en pointe`,
    },
  );

  const cables: BomLine[] = r.cables.map((c) => {
    const len = segmentLength(c.segment, params, cableLengthsM);
    const label = SEGMENT_LABELS[c.segment];
    return {
      qty: `${formatNumber(len * 2)}${NBSP}m`,
      name: `${label.from} ${formatSection(c.sectionMm2)}`,
      note: label.route,
    };
  });

  const protections: BomLine[] = r.protections
    .filter((p) => p.type !== 'mounting_structure')
    .map((p) => {
      const l = protectionLabel(p);
      return {
        qty: p.type === 'earthing' ? '—' : x(p.quantity),
        name: l.name,
        note: l.why,
      };
    });

  return [
    { title: 'ÉQUIPEMENTS', lines: equipment },
    { title: 'CÂBLES · LONGUEUR TOTALE, + ET −', lines: cables },
    { title: 'PROTECTIONS', lines: protections },
  ];
}
