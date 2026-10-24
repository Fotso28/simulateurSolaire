import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import type {
  CableSegment,
  Catalog,
  ParameterSet,
  SimulationResult,
} from '@simulateur/shared-types';
import { formatNumber, NBSP } from '../../core/format';
import { ICON_PATHS, IconName } from '../../shared/icons/icon-paths';
import {
  batteryModel,
  controllerModel,
  formatSection,
  inverterModel,
  panelLayout,
  panelModel,
  protectionLabel,
  segmentLength,
} from './result-view';

interface DiagramNode {
  kind: 'node';
  icon: IconName;
  title: string;
  sub: string;
  muted?: boolean;
}
interface DiagramLink {
  kind: 'link';
  cable: string;
  notes: string[];
}
type DiagramItem = (DiagramNode | DiagramLink) & { y: number; h: number };

const NODE_H = 52;
const LINE_H = 18;

/** Protections affichées le long de chaque tronçon. */
const SEGMENT_PROTECTIONS: Record<CableSegment, string[]> = {
  pv_controller: ['dc_disconnect', 'dc_surge_arrester', 'string_fuse'],
  controller_battery: ['controller_battery_fuse'],
  battery_inverter: ['battery_fuse'],
  inverter_board: ['ac_breaker', 'rcd_30ma', 'ac_surge_arrester'],
};

/** Construit la chaîne du schéma : nœuds (équipements) et liaisons (câbles). */
export function wiringItems(
  r: SimulationResult,
  catalog: Catalog,
  params: ParameterSet,
  cableLengthsM?: Partial<Record<CableSegment, number>>,
): (DiagramNode | DiagramLink)[] {
  const panel = panelModel(catalog, r);
  const battery = batteryModel(catalog, r);
  const controller = controllerModel(catalog, r);
  const inverter = inverterModel(catalog, r);
  const link = (segment: CableSegment): DiagramLink | null => {
    const cable = r.cables.find((c) => c.segment === segment);
    if (!cable) return null;
    const len = segmentLength(segment, params, cableLengthsM);
    const notes = SEGMENT_PROTECTIONS[segment]
      .map((t) => r.protections.find((p) => p.type === t))
      .filter((p): p is NonNullable<typeof p> => !!p)
      .flatMap((p) =>
        p.type === 'battery_fuse'
          ? [protectionLabel(p).name, 'au plus près de la batterie']
          : [protectionLabel(p).name],
      );
    return {
      kind: 'link',
      cable: `${segment === 'pv_controller' ? 'Câble solaire' : 'Câble'} ${formatSection(cable.sectionMm2)} · ${formatNumber(len)}${NBSP}m`,
      notes,
    };
  };
  const units = r.battery.series * r.battery.parallel;
  const items: (DiagramNode | DiagramLink | null)[] = [
    {
      kind: 'node',
      icon: 'panel',
      title: 'Panneaux solaires',
      sub: `${r.pv.count} × ${panel ? `${formatNumber(panel.powerWp)}${NBSP}Wc` : ''} ${panelLayout(r)}`,
    },
    link('pv_controller'),
  ];
  const batteryNode: DiagramNode = {
    kind: 'node',
    icon: 'battery',
    title: units > 1 ? `Batteries (${units})` : 'Batterie',
    sub: battery
      ? `${battery.technology === 'lithium' ? 'Lithium' : 'Plomb'} ${formatNumber(battery.nominalVoltageV)}${NBSP}V · ${formatNumber(battery.capacityAh)}${NBSP}Ah`
      : '',
  };
  const inverterNode: DiagramNode = {
    kind: 'node',
    icon: 'inverter',
    title: inverter?.type === 'hybride' ? 'Onduleur hybride' : 'Onduleur',
    sub: `${formatNumber(r.inverter.nominalW)}${NBSP}W · ${r.systemVoltage}${NBSP}V → 230${NBSP}V`,
  };
  if (r.controller && controller) {
    items.push(
      {
        kind: 'node',
        icon: 'controller',
        title: `Régulateur ${controller.type}`,
        sub: `${formatNumber(controller.maxCurrentA)}${NBSP}A · ${formatNumber(controller.maxPvVoltageV)}${NBSP}V`,
      },
      link('controller_battery'),
      batteryNode,
      link('battery_inverter'),
      inverterNode,
    );
  } else {
    // Hybride : panneaux sur le MPPT intégré, batteries sur l'onduleur.
    items.push(inverterNode, link('battery_inverter'), batteryNode);
  }
  items.push(link('inverter_board'), {
    kind: 'node',
    icon: 'board',
    title: 'Tableau électrique',
    sub: 'Vos prises et éclairages',
    muted: true,
  });
  return items.filter((i): i is DiagramNode | DiagramLink => !!i);
}

/** Schéma de câblage simple, en SVG (réutilisable par l'export PDF, L5). */
@Component({
  selector: 'app-wiring-diagram',
  template: `
    <svg
      class="mx-auto block w-full max-w-[420px]"
      [attr.viewBox]="'0 0 296 ' + height()"
      role="img"
      [attr.aria-label]="ariaLabel()"
      font-family="'IBM Plex Sans', system-ui, sans-serif"
    >
      @for (it of laidOut(); track $index) {
        @if (it.kind === 'node') {
          <rect
            x="0"
            [attr.y]="it.y + 4"
            width="44"
            height="44"
            rx="10"
            [attr.fill]="it.muted ? '#EFEFEA' : '#FFF5D6'"
          />
          <svg
            x="8"
            [attr.y]="it.y + 12"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#16181D"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            @for (d of paths[it.icon]; track $index) {
              <path [attr.d]="d" />
            }
          </svg>
          <text
            x="56"
            [attr.y]="it.y + 23"
            font-size="15"
            font-weight="600"
            fill="#16181D"
          >
            {{ it.title }}
          </text>
          <text x="56" [attr.y]="it.y + 41" font-size="13" fill="#5E636B">
            {{ it.sub }}
          </text>
        } @else {
          <line
            x1="22"
            x2="22"
            [attr.y1]="it.y"
            [attr.y2]="it.y + it.h"
            stroke="#16181D"
            stroke-width="2"
          />
          <text
            x="56"
            [attr.y]="it.y + 22"
            font-size="12"
            font-family="'IBM Plex Mono', ui-monospace, monospace"
            fill="#16181D"
          >
            {{ it.cable }}
          </text>
          @for (n of it.notes; track $index) {
            <text
              x="56"
              [attr.y]="it.y + 40 + $index * 18"
              font-size="13"
              fill="#5E636B"
            >
              {{ n }}
            </text>
          }
        }
      }
    </svg>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WiringDiagram {
  readonly result = input.required<SimulationResult>();
  readonly catalog = input.required<Catalog>();
  readonly params = input.required<ParameterSet>();
  readonly cableLengthsM = input<Partial<Record<CableSegment, number>>>();

  protected readonly paths = ICON_PATHS as Record<IconName, readonly string[]>;

  protected readonly laidOut = computed<DiagramItem[]>(() => {
    let y = 0;
    return wiringItems(
      this.result(),
      this.catalog(),
      this.params(),
      this.cableLengthsM(),
    ).map((it) => {
      const h =
        it.kind === 'node'
          ? NODE_H
          : Math.max(56, 30 + it.notes.length * LINE_H);
      const item = { ...it, y, h };
      y += h;
      return item;
    });
  });

  protected readonly height = computed(() => {
    const items = this.laidOut();
    const last = items[items.length - 1];
    return last ? last.y + last.h : 0;
  });

  protected readonly ariaLabel = computed(
    () =>
      'Schéma de câblage : ' +
      this.laidOut()
        .map((it) =>
          it.kind === 'node'
            ? `${it.title} (${it.sub})`
            : `${it.cable}${it.notes.length ? ', ' + it.notes.join(', ') : ''}`,
        )
        .join(' ; puis '),
  );
}
