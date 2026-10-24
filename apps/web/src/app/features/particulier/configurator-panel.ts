import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Overrides, SimulationStore } from '../../core/simulation.store';
import {
  formatDays,
  formatKwp,
  formatNumber,
  formatW,
  kwh,
  NBSP,
  plural,
} from '../../core/format';
import { Icon } from '../../shared/icons/icon';
import { AlertList } from '../../shared/ui/notices';
import {
  batteryKind,
  batteryUnits,
  controllerModel,
  panelModel,
} from './result-view';

interface Row {
  key: string;
  icon: string;
  title: string;
  value: string;
  sub: string;
  note?: string;
  changed: boolean;
  lower?: Overrides;
  upper?: Overrides;
  downLabel: string;
  upLabel: string;
}

/**
 * Configurateur (RF-13, RF-14) : ‹ › sur onduleur, stockage et panneaux via
 * les fonctions de voisinage du moteur ; indicateurs et alertes recalculés à
 * chaque clic. `compact` = colonne latérale desktop (maquette DesktopResultat).
 */
@Component({
  selector: 'app-configurator-panel',
  imports: [NgTemplateOutlet, Icon, AlertList],
  template: `
    @if (store.result(); as r) {
      <div class="flex flex-col" [class]="compact() ? 'gap-4' : 'gap-3'">
        <div class="grid grid-cols-2 gap-2" aria-live="polite">
          @for (k of indicators(); track k.label) {
            <div
              class="flex flex-col gap-0.5 rounded-lg px-3 py-2.5"
              [class]="k.ok ? 'bg-ok-soft' : 'bg-warn-soft'"
            >
              <span class="text-mono font-normal text-ink-2">{{
                k.label
              }}</span>
              <span class="tnum text-[22px]/7 font-semibold"
                >{{ k.value }}
                <span class="text-small font-medium">{{ k.unit }}</span></span
              >
              <span
                class="text-mono font-semibold"
                [class]="k.ok ? 'text-ok-ink' : 'text-warn-ink'"
                >{{ k.state }}</span
              >
            </div>
          }
        </div>

        <app-alert-list [alerts]="r.alerts" [compact]="compact()" />

        @if (compact()) {
          <div class="flex flex-col">
            @for (row of rows(); track row.key) {
              <div
                class="flex items-center gap-2.5 border-t border-divider py-3"
              >
                <app-icon [name]="row.icon" />
                <span class="flex min-w-0 flex-1 flex-col">
                  <span class="text-caption text-muted"
                    >{{ row.title }}
                    @if (row.changed) {
                      <span class="sr-only">(modifié)</span>
                    }
                  </span>
                  <span class="tnum text-base/[22px] font-semibold">{{
                    row.value
                  }}</span>
                  <span class="text-mono font-normal text-muted">{{
                    row.sub
                  }}</span>
                </span>
                <ng-container
                  *ngTemplateOutlet="
                    stepper;
                    context: { $implicit: row, size: 44 }
                  "
                />
              </div>
            }
          </div>
        } @else {
          @for (row of rows(); track row.key) {
            <section
              class="flex flex-col gap-3 rounded-xl border bg-surface p-3.5"
              [class]="row.changed ? 'border-ink' : 'border-line'"
              [attr.aria-label]="row.title"
            >
              <div class="flex items-center gap-2.5">
                <span
                  class="flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-solar-soft"
                >
                  <app-icon [name]="row.icon" />
                </span>
                <h2 class="m-0 flex-1 text-base/[22px] font-semibold">
                  {{ row.title }}
                </h2>
                @if (row.changed) {
                  <span
                    class="rounded-[6px] bg-ink px-2 py-0.5 text-mono/[18px] font-semibold text-white"
                    >Modifié</span
                  >
                }
              </div>
              <div class="flex items-center gap-2">
                <ng-container
                  *ngTemplateOutlet="
                    downBtn;
                    context: { $implicit: row, size: 48 }
                  "
                />
                <div
                  class="flex flex-1 flex-col items-center gap-0.5 text-center"
                >
                  <span class="tnum text-[22px]/7 font-semibold">{{
                    row.value
                  }}</span>
                  <span class="text-caption text-muted">{{ row.sub }}</span>
                </div>
                <ng-container
                  *ngTemplateOutlet="
                    upBtn;
                    context: { $implicit: row, size: 48 }
                  "
                />
              </div>
              @if (row.note) {
                <span class="text-center text-caption text-ink-2">{{
                  row.note
                }}</span>
              }
            </section>
          }
        }

        <button
          type="button"
          class="flex min-h-12 items-center justify-center gap-2 border-0 bg-transparent text-[15px] font-semibold"
          [class]="store.hasOverrides() ? 'text-solar-ink' : 'text-ring'"
          [disabled]="!store.hasOverrides()"
          (click)="store.resetOverrides()"
        >
          <app-icon name="reset" [size]="18" [strokeWidth]="1.75" />
          Revenir à la proposition
        </button>
      </div>

      <ng-template #stepper let-row let-size="size">
        <ng-container
          *ngTemplateOutlet="downBtn; context: { $implicit: row, size: size }"
        />
        <ng-container
          *ngTemplateOutlet="upBtn; context: { $implicit: row, size: size }"
        />
      </ng-template>
      <ng-template #downBtn let-row let-size="size">
        <button
          type="button"
          class="flex shrink-0 items-center justify-center rounded-lg border border-line-strong disabled:bg-[#F0F0EC] disabled:text-ring"
          [class]="
            size === 48
              ? 'size-12 bg-surface text-ink'
              : 'size-11 bg-surface text-ink'
          "
          [disabled]="!row.lower"
          [attr.aria-label]="row.downLabel"
          (click)="apply(row.lower)"
        >
          <app-icon name="chevron-left" [size]="22" [strokeWidth]="2" />
        </button>
      </ng-template>
      <ng-template #upBtn let-row let-size="size">
        <button
          type="button"
          class="flex shrink-0 items-center justify-center rounded-lg border border-line-strong disabled:bg-[#F0F0EC] disabled:text-ring"
          [class]="
            size === 48
              ? 'size-12 bg-surface text-ink'
              : 'size-11 bg-surface text-ink'
          "
          [disabled]="!row.upper"
          [attr.aria-label]="row.upLabel"
          (click)="apply(row.upper)"
        >
          <app-icon name="chevron-right" [size]="22" [strokeWidth]="2" />
        </button>
      </ng-template>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfiguratorPanel {
  protected readonly store = inject(SimulationStore);
  readonly compact = input(false);

  protected readonly indicators = computed(() => {
    const r = this.store.result();
    if (!r) return [];
    const minDays = this.store.params().values.minAutonomyDays ?? 0.5;
    const aOk = r.effectiveAutonomyDays >= minDays - 1e-9;
    const cOk = r.pvCoverage >= 1 - 1e-9;
    return [
      {
        label: 'Autonomie réelle',
        value: formatDays(r.effectiveAutonomyDays),
        unit: this.compact() ? 'j' : 'jour',
        ok: aOk,
        state: aOk ? 'Couvre au moins une nuit' : 'Moins d’une nuit',
      },
      {
        label: 'Couverture solaire',
        value: formatNumber(Math.round(r.pvCoverage * 100)),
        unit: '%',
        ok: cOk,
        state: cOk ? 'Recharge complète' : 'Recharge incomplète',
      },
    ];
  });

  protected readonly rows = computed<Row[]>(() => {
    const r = this.store.result();
    const n = this.store.neighbors();
    if (!r || !n) return [];
    const p = this.store.proposal() ?? r;
    const catalog = this.store.catalog();
    const surge = this.store.params().values.inverterSurgeFactor;
    const panel = panelModel(catalog, r);
    const controller = controllerModel(catalog, r);
    return [
      {
        key: 'inverter',
        icon: 'inverter',
        title: 'Onduleur',
        value: formatW(r.inverter.nominalW),
        sub: `Supporte ${formatW(r.inverter.nominalW * surge)} en pointe`,
        note: n.inverter.lower
          ? undefined
          : 'Plus petite taille disponible au catalogue.',
        changed: r.inverter.modelId !== p.inverter.modelId,
        lower: n.inverter.lower,
        upper: n.inverter.upper,
        downLabel: 'Onduleur plus petit',
        upLabel: 'Onduleur plus puissant',
      },
      {
        key: 'storage',
        icon: 'battery',
        title: 'Stockage',
        value: `${kwh(r.battery.capacityWh)}${NBSP}kWh`,
        sub: `${batteryUnits(catalog, r)} · ${batteryKind(r, catalog)}`,
        changed:
          r.battery.modelId !== p.battery.modelId ||
          r.battery.capacityWh !== p.battery.capacityWh,
        lower: n.storage.lower,
        upper: n.storage.upper,
        downLabel: 'Moins de stockage',
        upLabel: 'Plus de stockage',
      },
      {
        key: 'panels',
        icon: 'panel',
        title: 'Panneaux solaires',
        value: plural(r.pv.count, 'panneau', 'panneaux'),
        sub: `${panel ? `${formatNumber(panel.powerWp)}${NBSP}Wc chacun · ` : ''}${formatKwp(r.pv.totalWp)}`,
        note: controller
          ? `Régulateur ajusté automatiquement : ${controller.type} ${formatNumber(controller.maxCurrentA)}${NBSP}A`
          : undefined,
        changed: r.pv.count !== p.pv.count,
        lower: n.panels.lower,
        upper: n.panels.upper,
        downLabel: 'Un panneau de moins',
        upLabel: 'Un panneau de plus',
      },
    ];
  });

  protected apply(patch: Overrides | undefined): void {
    if (patch) this.store.applyOverride(patch);
  }
}
