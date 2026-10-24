import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { SimulationResult } from '@simulateur/shared-types';
import { RESULT_ACTIONS } from '../../core/extensions';
import { NBSP, formatNumber, formatPercent } from '../../core/format';
import { SimulationStore } from '../../core/simulation.store';
import { Breakpoint } from '../../core/breakpoint';
import { Icon } from '../../shared/icons/icon';
import { StepHeader } from '../../shared/layout/step-header';
import { ConfiguratorPanel } from '../particulier/configurator-panel';
import { batteryModel } from '../particulier/result-view';
import {
  ProContext,
  TECH_NAMES,
  cableRows,
  dodOf,
  protectionRows,
  techCards,
} from './pro-view';

const LEVEL_CLASS: Record<string, string> = {
  critique: 'bg-crit-soft text-crit-ink',
  attention: 'bg-warn-soft text-warn-ink',
  info: 'bg-info-soft text-info-ink',
};

/** Dimensionnement exact du mode professionnel (maquette ProResultat), sur `/resultat`. */
@Component({
  selector: 'app-pro-result-page',
  imports: [StepHeader, Icon, RouterLink, NgTemplateOutlet, ConfiguratorPanel],
  template: `
    <div class="flex min-h-dvh flex-col bg-bg">
      <app-step-header
        title="Dimensionnement"
        [step]="4"
        backLink="/besoins"
        backLabel="Retour à la saisie"
      />
      @switch (store.outcome().status) {
        @case ('empty') {
          <main class="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
            <p class="card m-0 p-4">Aucune charge saisie.</p>
            <a routerLink="/besoins" class="btn-primary">Revenir à la saisie</a>
          </main>
        }
        @case ('error') {
          <main class="mx-auto flex w-full max-w-xl flex-col gap-4 p-4">
            <p
              class="m-0 rounded-lg bg-crit-soft p-4 text-crit-ink"
              role="alert"
            >
              {{ errorMessage() }}
            </p>
            <a routerLink="/besoins" class="btn-primary">Modifier la saisie</a>
          </main>
        }
        @default {
          @if (view(); as v) {
            @if (isDesktop()) {
              <main
                class="mx-auto flex w-full max-w-[1280px] flex-col gap-6 p-8"
              >
                <div>
                  <h1
                    class="m-0 text-[28px]/[34px] font-semibold tracking-[-0.01em]"
                  >
                    Dimensionnement
                  </h1>
                  <p class="m-0 mt-1 text-body text-muted">
                    {{ v.subtitle }}
                  </p>
                </div>
                <div class="flex flex-wrap items-start gap-6">
                  <div class="flex min-w-0 flex-[999_1_600px] flex-col gap-5">
                    <ng-container
                      *ngTemplateOutlet="body; context: { $implicit: v }"
                    />
                  </div>
                  <aside
                    class="sticky top-4 flex max-w-[420px] flex-[1_1_340px] flex-col gap-4 rounded-2xl border border-line bg-surface p-5"
                  >
                    <app-configurator-panel [compact]="true" />
                    <ng-container *ngTemplateOutlet="actionsBlock" />
                  </aside>
                </div>
              </main>
            } @else {
              <main class="flex flex-1 flex-col gap-5 px-4 pt-4 pb-6">
                <ng-container
                  *ngTemplateOutlet="body; context: { $implicit: v }"
                />
              </main>
              <div class="action-bar gap-2">
                <ng-container *ngTemplateOutlet="actionsBlock" />
              </div>
            }
          }
        }
      }
    </div>

    <ng-template #actionsBlock>
      <button type="button" class="btn-primary w-full" (click)="exportPdf()">
        <app-icon name="download" [size]="20" /> Exporter la nomenclature (PDF)
      </button>
      <div class="grid grid-cols-2 gap-2">
        <button type="button" class="btn-secondary" (click)="share()">
          <app-icon name="share" [size]="20" /> Partager le lien
        </button>
        @if (!isDesktop()) {
          <a routerLink="/configurateur" class="btn-secondary">
            <app-icon name="sliders" [size]="20" /> Configurateur
          </a>
        } @else {
          <a routerLink="/recapitulatif" class="btn-secondary"
            >Liste du matériel</a
          >
        }
      </div>
      @if (!isDesktop()) {
        <a routerLink="/recapitulatif" class="btn-secondary">
          Liste du matériel et schéma de câblage
        </a>
      }
      @if (shareMessage(); as m) {
        <p class="m-0 text-caption text-muted" aria-live="polite">{{ m }}</p>
      }
    </ng-template>

    <ng-template #body let-v>
      <!-- Hypothèses -->
      <section class="card p-4" aria-labelledby="pro-hyp">
        <h2
          id="pro-hyp"
          class="m-0 mb-3 font-mono text-mono tracking-[.04em] text-muted"
        >
          HYPOTHÈSES
        </h2>
        <dl
          class="m-0 grid grid-cols-2 gap-x-3 gap-y-2.5 text-caption lg:grid-cols-4"
        >
          @for (h of v.hypotheses; track h.label) {
            <div class="flex min-w-0 flex-col">
              <dt class="text-muted">{{ h.label }}</dt>
              <dd class="m-0 font-mono font-medium">{{ h.value }}</dd>
            </div>
          }
        </dl>
      </section>

      <!-- Indicateurs -->
      <div class="grid grid-cols-3 gap-1.5" aria-live="polite">
        @for (i of v.indicators; track i.label) {
          <div
            class="flex min-w-0 flex-col gap-0.5 rounded-lg p-2.5"
            [class]="i.ok ? 'bg-ok-soft' : 'bg-warn-soft'"
          >
            <span
              class="font-mono text-[11px]"
              [class]="i.ok ? 'text-ok-ink' : 'text-warn-ink'"
              >{{ i.label }}</span
            >
            <span class="tnum text-lg/6 font-semibold">{{ i.value }}</span>
            <span
              class="text-[11px] font-semibold"
              [class]="i.ok ? 'text-ok-ink' : 'text-warn-ink'"
              >{{ i.threshold }}</span
            >
          </div>
        }
      </div>

      @if (v.alerts.length) {
        <ul class="m-0 flex list-none flex-col gap-2 p-0" aria-label="Alertes">
          @for (a of v.alerts; track a.code + $index) {
            <li
              class="flex gap-2 rounded-lg p-3 text-small"
              [class]="levelClass(a.level)"
            >
              <app-icon
                [name]="
                  a.level === 'critique'
                    ? 'alert-octagon'
                    : a.level === 'info'
                      ? 'info'
                      : 'alert-triangle'
                "
                [size]="20"
              />
              <span
                ><span class="font-mono text-[11px] uppercase">{{
                  a.code
                }}</span>
                — {{ a.message }}</span
              >
            </li>
          }
        </ul>
      }

      <!-- Équipements -->
      <section class="flex flex-col gap-2" aria-labelledby="pro-eq">
        <h2 id="pro-eq" class="m-0 text-lg font-semibold">Équipements</h2>
        <div class="grid gap-2 lg:grid-cols-2">
          @for (c of v.cards; track c.key) {
            <article
              class="card flex flex-col gap-2 p-3.5"
              [attr.data-testid]="'card-' + c.key"
            >
              <div class="flex items-center gap-2 text-caption text-muted">
                <app-icon [name]="c.icon" [size]="20" /> {{ c.title }}
              </div>
              <p class="m-0 text-xl/6 font-semibold">{{ c.value }}</p>
              <dl
                class="m-0 flex flex-col gap-1 font-mono text-mono font-normal"
              >
                @for (row of c.rows; track row.label) {
                  <div class="flex justify-between gap-3">
                    <dt class="text-muted">{{ row.label }}</dt>
                    <dd class="m-0 text-right">
                      {{ row.value }}
                      @if (row.ok !== undefined) {
                        <span
                          [class]="row.ok ? 'text-ok-ink' : 'text-crit-ink'"
                          [attr.aria-label]="
                            row.ok ? 'conforme' : 'non conforme'
                          "
                          >{{ row.ok ? '✓' : '✗' }}</span
                        >
                      }
                    </dd>
                  </div>
                }
              </dl>
            </article>
          }
        </div>
      </section>

      <div
        class="flex flex-col gap-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4"
      >
        <!-- Câbles -->
        <section class="flex flex-col gap-2" aria-labelledby="pro-cab">
          <h2 id="pro-cab" class="m-0 text-lg font-semibold">Câbles</h2>
          <div class="card overflow-hidden">
            <ul class="m-0 list-none p-0">
              @for (c of v.cables; track c.segment; let first = $first) {
                <li
                  class="px-3.5 py-2.5"
                  [class.border-t]="!first"
                  [class.border-divider]="!first"
                >
                  <div class="flex justify-between text-small font-semibold">
                    <span>{{ c.route }}</span
                    ><span>{{ c.section }}</span>
                  </div>
                  <p class="m-0 font-mono text-mono font-normal text-muted">
                    {{ c.detail }}
                  </p>
                </li>
              }
            </ul>
            <p class="m-0 bg-[#FAFAF7] px-3.5 py-2.5 text-xs text-muted">
              ρ {{ v.rho }} Ω·mm²/m · ε {{ v.epsilon }} · aller + retour ;
              section normalisée supérieure, puis contrôle de l’intensité
              admissible.
            </p>
          </div>
        </section>

        <!-- Protections -->
        <section class="flex flex-col gap-2" aria-labelledby="pro-prot">
          <h2 id="pro-prot" class="m-0 text-lg font-semibold">Protections</h2>
          <ul class="card m-0 list-none p-0 text-small">
            @for (p of v.protections; track p.type; let first = $first) {
              <li
                class="flex justify-between gap-3 px-3.5 py-2.5"
                [class.border-t]="!first"
                [class.border-divider]="!first"
              >
                <span>{{ p.name }}</span>
                <span class="font-mono font-medium"
                  >{{ p.value }}
                  <span class="text-muted">× {{ p.quantity }}</span></span
                >
              </li>
            }
          </ul>
        </section>
      </div>

      <!-- Variantes -->
      <section class="flex flex-col gap-2" aria-labelledby="pro-var">
        <h2 id="pro-var" class="m-0 text-lg font-semibold">
          Variantes d’autonomie
        </h2>
        <div class="card overflow-hidden font-mono text-[13px]">
          <div
            class="grid grid-cols-[56px_1fr_72px] bg-surface-2 px-3.5 py-2 text-[11px] text-ink-2"
          >
            <span>Palier</span><span>Batteries</span
            ><span class="text-right">A_eff</span>
          </div>
          @for (row of v.variants; track row.days) {
            <div
              class="grid grid-cols-[56px_1fr_72px] border-t border-divider px-3.5 py-2"
              [class.bg-solar-soft]="row.current"
              [class.font-medium]="row.current"
              [attr.aria-current]="row.current ? 'true' : null"
            >
              <span>{{ row.label }}</span
              ><span>{{ row.battery }}</span
              ><span class="text-right">{{ row.autonomy }}</span>
            </div>
          }
          <p
            class="m-0 border-t border-divider px-3.5 py-2 font-sans text-xs text-muted"
          >
            Champ PV, régulateur et onduleur inchangés.
          </p>
        </div>
      </section>

      <p
        class="m-0 flex gap-2 rounded-lg bg-info-soft p-3 text-small text-info-ink"
      >
        <app-icon name="info" [size]="20" />
        <span
          ><strong>Saison des pluies :</strong> production réduite de 20 à 30 %
          par rapport à la moyenne annuelle.</span
        >
      </p>

      <p class="m-0 font-mono text-[11px] text-muted">
        Moteur {{ v.engineVersion }} · paramètres v{{ v.paramsVersion }}
      </p>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProResultPage {
  protected readonly store = inject(SimulationStore);
  protected readonly isDesktop = inject(Breakpoint).isDesktop;
  private readonly actions = inject(RESULT_ACTIONS);
  protected readonly shareMessage = signal<string | null>(null);

  protected readonly errorMessage = computed(() => {
    const o = this.store.outcome();
    return o.status === 'error' ? o.message : '';
  });

  protected readonly view = computed(() => {
    const r = this.store.result();
    const input = this.store.input();
    if (!r || !input) return null;
    const ctx: ProContext = {
      catalog: this.store.catalog(),
      params: this.store.params(),
      region: this.store.region(),
      input,
    };
    const p = ctx.params.values;
    const tech = batteryModel(ctx.catalog, r)?.technology ?? input.batteryTech;
    const f = formatNumber;
    const hybrid = !r.controller;
    const minAutonomy = p.minAutonomyDays ?? 0.5;
    const needW = p.inverterPowerMargin * r.peakW.installed;
    return {
      subtitle: `${ctx.region?.name ?? ''} · ${f(r.energyWhPerDay.typ)}${NBSP}Wh/j · ${r.systemVoltage}${NBSP}V · ${input.totals ? 'saisie en puissance totale' : 'saisie par appareil'}`,
      hypotheses: [
        {
          label: 'Région',
          value: `${ctx.region?.name ?? '—'} · H ${f(ctx.region?.irradiationAvg ?? 0, 1)}`,
        },
        {
          label: 'Énergie E_j',
          value: `${f(r.energyWhPerDay.typ)}${NBSP}Wh/j`,
        },
        {
          label: 'P_inst / P_dem',
          value: `${f(r.peakW.installed)} / ${f(r.peakW.surge)}${NBSP}W`,
        },
        { label: 'Autonomie', value: `${f(input.autonomyDays, 1)}${NBSP}j` },
        {
          label: 'Batterie',
          value: `${TECH_NAMES[tech]} · DoD ${f(dodOf(tech, ctx.params), 2)}`,
        },
        {
          label: 'η / PR',
          value: `${f(p.inverterEfficiency, 2)} / ${f(p.performanceRatio, 2)}`,
        },
        {
          label: 'Tension système',
          value: `${r.systemVoltage}${NBSP}V · ${input.options?.systemVoltage ? 'imposée' : 'auto'}`,
        },
        {
          label: 'Architecture',
          value: hybrid ? 'Onduleur hybride' : 'MPPT séparé',
        },
        {
          label: 'Simultanéité c_s',
          value: f(input.options?.simultaneity ?? p.simultaneity ?? 1, 2),
        },
      ],
      indicators: [
        {
          label: 'A_eff',
          value: `${f(r.effectiveAutonomyDays, 2)}${NBSP}j`,
          threshold: `≥ ${f(minAutonomy, 1)}${NBSP}j`,
          ok: r.effectiveAutonomyDays + 1e-9 >= minAutonomy,
        },
        {
          label: 'C_PV',
          value: formatPercent(r.pvCoverage),
          threshold: '≥ 100 %',
          ok: r.pvCoverage + 1e-9 >= 1,
        },
        {
          label: 'Onduleur',
          value: `${f(r.inverter.nominalW)}${NBSP}W`,
          threshold: `≥ ${f(needW)}${NBSP}W`,
          ok: r.inverter.nominalW + 1e-6 >= needW,
        },
      ],
      alerts: r.alerts,
      cards: techCards(r, ctx),
      cables: cableRows(r, ctx),
      protections: protectionRows(r),
      variants: this.variants(r, input.autonomyDays),
      rho: f(p.copperResistivity, 4),
      epsilon: `${f(p.maxVoltageDrop * 100, 1)}${NBSP}%`,
      engineVersion: r.engineVersion,
      paramsVersion: r.paramsVersion,
    };
  });

  protected levelClass(level: string): string {
    return LEVEL_CLASS[level] ?? LEVEL_CLASS['info'];
  }

  private variants(r: SimulationResult, days: number) {
    const steps = this.store.params().values.autonomySteps;
    const i = steps.indexOf(days);
    const rows: {
      days: number;
      variant: Partial<SimulationResult> | undefined;
      current: boolean;
    }[] = [
      { days: steps[i - 1], variant: r.variants.lower, current: false },
      { days, variant: r, current: true },
      { days: steps[i + 1], variant: r.variants.upper, current: false },
    ];
    const catalog = this.store.catalog();
    return rows
      .filter((row) => row.days !== undefined && row.variant?.battery)
      .map((row) => {
        const v = row.variant as Partial<SimulationResult>;
        const b = v.battery as SimulationResult['battery'];
        const m = batteryModel(catalog, v);
        return {
          days: row.days,
          label: `${formatNumber(row.days, row.days % 1 ? 1 : 0)}${NBSP}j`,
          battery: `${b.series * b.parallel} × ${m?.nominalVoltageV ?? ''}${NBSP}V ${m?.capacityAh ?? ''}${NBSP}Ah`,
          autonomy:
            v.effectiveAutonomyDays !== undefined
              ? `${formatNumber(v.effectiveAutonomyDays, 2)}${NBSP}j`
              : '—',
          current: row.current,
        };
      });
  }

  protected async share(): Promise<void> {
    try {
      const url = this.actions.share
        ? await this.actions.share()
        : (globalThis.location?.origin ?? '');
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: 'Dimensionnement solaire', url });
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        this.shareMessage.set('Lien copié.');
      }
    } catch {
      // Partage annulé par l'utilisateur.
    }
  }

  protected async exportPdf(): Promise<void> {
    if (this.actions.exportPdf) await this.actions.exportPdf();
    else globalThis.print?.();
  }
}
