import type {
  Catalog,
  ParameterSet,
  Region,
  SimulationInput,
  SimulationResult,
} from '@simulateur/shared-types';
import type {
  Content,
  TableCell,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';
import { formatDays, formatNumber, formatPercent } from '../../core/format';
import { billOfMaterials, recapSummary } from '../particulier/recap-data';
import { wiringItems } from '../particulier/wiring-diagram';

/** Données nécessaires au PDF (toutes issues du store). */
export interface PdfData {
  input: SimulationInput;
  result: SimulationResult;
  catalog: Catalog;
  params: ParameterSet;
  region?: Region;
  shareUrl?: string;
  date: Date;
}

const INK = '#16181D';
const MUTED = '#5E636B';
const SOLAR = '#F5B301';

const LEVEL_LABEL: Record<SimulationResult['alerts'][number]['level'], string> =
  { critique: 'Critique', attention: 'Attention', info: 'Info' };

/**
 * Les polices standard du PDF (Helvetica, codage WinAnsi) n'ont ni espace
 * fine insécable, ni « ≈ », ni flèches : on les remplace.
 */
export function pdfText(s: string): string {
  return s
    .replace(/[\u202F\u2009]/g, '\u00A0')
    .replace(/\u2248/g, '~')
    .replace(/\u2192/g, '->')
    .replace(/\u2190/g, '<-')
    .replace(/[\u2212\u2011]/g, '-');
}

/** Logo : soleil stylisé (SVG au trait, couleurs de la marque). */
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="4.5" fill="${SOLAR}"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>`;

function sectionTitle(text: string): Content {
  return {
    text: text.toUpperCase(),
    style: 'section',
    margin: [0, 14, 0, 6],
  };
}

function hypotheses(d: PdfData): Content {
  const v = d.params.values;
  const r = d.result;
  const rows: [string, string][] = [
    [
      'Lieu',
      d.region ? `${d.region.name} (${d.region.capital})` : d.input.regionId,
    ],
    [
      'Ensoleillement moyen',
      d.region
        ? `${formatNumber(d.region.irradiationAvg, 1)} kWh/m²/jour`
        : '—',
    ],
    [
      'Consommation estimée',
      `${formatNumber(r.energyWhPerDay.typ)} Wh/jour (de ${formatNumber(r.energyWhPerDay.min)} à ${formatNumber(r.energyWhPerDay.max)})`,
    ],
    [
      'Autonomie demandée',
      `${formatDays(d.input.autonomyDays)} jour · réelle ${formatDays(r.effectiveAutonomyDays)} jour`,
    ],
    [
      'Technologie de batterie',
      d.input.batteryTech === 'lithium' ? 'Lithium' : 'Plomb',
    ],
    ['Tension du système', `${r.systemVoltage} V`],
    ['Couverture solaire', formatPercent(r.pvCoverage)],
    [
      'Paramètres de calcul',
      `version ${r.paramsVersion} · rendement global ${formatPercent(v.performanceRatio)}`,
    ],
  ];
  return {
    table: {
      widths: [150, '*'],
      body: rows.map(([k, val]) => [{ text: k, color: MUTED }, { text: val }]),
    },
    layout: 'lightHorizontalLines',
  };
}

function appliances(d: PdfData): Content | null {
  const loads = d.input.loads ?? [];
  if (!loads.length) return null;
  return {
    table: {
      headerRows: 1,
      widths: ['*', 50, 70],
      body: [
        [
          { text: 'Appareil', style: 'th' },
          { text: 'Qté', style: 'th', alignment: 'right' },
          { text: 'Heures/jour', style: 'th', alignment: 'right' },
        ],
        ...loads.map((l) => [
          {
            text: l.powerW
              ? `${l.label} (${formatNumber(l.powerW)} W)`
              : l.label,
          },
          { text: formatNumber(l.quantity), alignment: 'right' as const },
          {
            text: formatNumber(l.hoursPerDay, 1),
            alignment: 'right' as const,
          },
        ]),
      ],
    },
    layout: 'lightHorizontalLines',
  };
}

function bom(d: PdfData): Content[] {
  const th = (text: string): TableCell => ({ text, style: 'th', colSpan: 2 });
  return billOfMaterials(
    d.result,
    d.catalog,
    d.params,
    d.input.options?.cableLengthsM,
  )
    .filter((g) => g.lines.length)
    .map((g): Content => ({
      margin: [0, 0, 0, 8],
      table: {
        headerRows: 1,
        dontBreakRows: true,
        widths: [60, '*'],
        body: [
          [th(g.title), ''],
          ...g.lines.map((l): TableCell[] => [
            { text: l.qty, bold: true },
            {
              stack: [
                { text: l.name },
                ...(l.note
                  ? [{ text: l.note, color: MUTED, fontSize: 8.5 }]
                  : []),
              ],
            },
          ]),
        ],
      },
      layout: 'lightHorizontalLines',
    }));
}

/** Schéma simplifié : nœuds encadrés reliés par un trait et le câble. */
function wiring(d: PdfData): Content {
  const items = wiringItems(
    d.result,
    d.catalog,
    d.params,
    d.input.options?.cableLengthsM,
  );
  return {
    unbreakable: true,
    stack: items.map((item): Content => {
      if (item.kind === 'node') {
        return {
          table: {
            widths: [220],
            body: [
              [
                {
                  stack: [
                    { text: item.title, bold: true },
                    { text: item.sub, color: MUTED, fontSize: 8.5 },
                  ],
                  fillColor: item.muted ? '#F5F5F1' : undefined,
                  margin: [6, 3, 6, 3],
                },
              ],
            ],
          },
          layout: {
            hLineColor: () => INK,
            vLineColor: () => INK,
          },
        };
      }
      return {
        columns: [
          {
            width: 40,
            canvas: [
              {
                type: 'line',
                x1: 20,
                y1: 0,
                x2: 20,
                y2: 14 + item.notes.length * 10,
                lineWidth: 1.5,
                lineColor: SOLAR,
              },
            ],
          },
          {
            width: '*',
            stack: [
              { text: item.cable, fontSize: 8.5, bold: true },
              ...item.notes.map((n) => ({
                text: n,
                fontSize: 8,
                color: MUTED,
              })),
            ],
            margin: [0, 2, 0, 2],
          },
        ],
      };
    }),
  };
}

function alerts(d: PdfData): Content | null {
  const list = d.result.alerts.filter((a) => a.code !== 'RAINY_SEASON');
  if (!list.length) return null;
  return {
    ul: list.map((a) => ({
      text: [{ text: `${LEVEL_LABEL[a.level]} : `, bold: true }, a.message],
    })),
  };
}

function deepSanitize<T>(value: T): T {
  if (typeof value === 'string') return pdfText(value) as T;
  if (Array.isArray(value)) return value.map(deepSanitize) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        k === 'svg' ? v : deepSanitize(v),
      ]),
    ) as T;
  }
  return value;
}

/** Document pdfmake du récapitulatif (RF-17). */
export function buildPdfDocument(d: PdfData): TDocumentDefinitions {
  const summary = recapSummary(d.result, d.catalog, d.region);
  const date = new Intl.DateTimeFormat('fr-FR').format(d.date);
  const content: (Content | null)[] = [
    {
      columns: [
        { svg: LOGO_SVG, width: 28 },
        {
          width: '*',
          stack: [
            { text: 'Simulateur solaire', bold: true, fontSize: 13 },
            {
              text: `Dimensionnement indicatif · ${date}`,
              color: MUTED,
              fontSize: 9,
            },
          ],
          margin: [8, 2, 0, 0],
        },
      ],
    },
    {
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 4,
          x2: 515,
          y2: 4,
          lineWidth: 2,
          lineColor: SOLAR,
        },
      ],
      margin: [0, 6, 0, 8],
    },
    { text: summary.title, style: 'h1' },
    {
      text: d.region
        ? `${d.region.name} · ${d.region.capital}`
        : d.input.regionId,
      color: MUTED,
      margin: [0, 0, 0, 10],
    },
    {
      columns: summary.keys.map((k) => ({
        stack: [
          { text: k.value, fontSize: 18, bold: true },
          { text: k.label, color: MUTED, fontSize: 9 },
        ],
      })),
    },
    sectionTitle('Hypothèses'),
    hypotheses(d),
    ...(appliances(d) ? [sectionTitle('Appareils'), appliances(d)] : []),
    sectionTitle('Liste du matériel'),
    ...bom(d),
    sectionTitle('Schéma de câblage simplifié'),
    wiring(d),
    ...(alerts(d) ? [sectionTitle('Alertes'), alerts(d)] : []),
    {
      margin: [0, 14, 0, 0],
      table: {
        widths: ['*'],
        body: [
          [
            {
              fillColor: '#EEF0F3',
              margin: [8, 6, 8, 6],
              text: [
                { text: 'Saison des pluies : ', bold: true },
                'la production peut baisser de 20 à 30 %. Le calcul repose sur l’ensoleillement moyen de l’année ; prévoyez une marge ou une source d’appoint.',
              ],
            },
          ],
        ],
      },
      layout: 'noBorders',
    },
    {
      text: 'Simulation indicative : faites valider l’installation par un professionnel qualifié avant achat.',
      color: MUTED,
      fontSize: 8.5,
      margin: [0, 10, 0, 0],
    },
    d.shareUrl
      ? {
          text: [
            'Retrouver cette simulation : ',
            { text: d.shareUrl, link: d.shareUrl, color: INK },
          ],
          fontSize: 8.5,
          margin: [0, 4, 0, 0],
        }
      : null,
  ];
  return deepSanitize({
    info: { title: `Simulation solaire · ${date}` },
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 48],
    defaultStyle: { font: 'Helvetica', fontSize: 10, color: INK },
    styles: {
      h1: { fontSize: 16, bold: true },
      section: { fontSize: 9, bold: true, color: MUTED, characterSpacing: 0.5 },
      th: { bold: true, fontSize: 9, color: MUTED },
    },
    footer: (page: number, count: number) => ({
      text: `Simulateur solaire · page ${page} / ${count}`,
      alignment: 'center',
      fontSize: 8,
      color: MUTED,
    }),
    content: content.filter((c): c is Content => c !== null),
  } satisfies TDocumentDefinitions);
}
