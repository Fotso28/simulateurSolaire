import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { RESULT_ACTIONS } from '../../core/extensions';
import { SimulationStore } from '../../core/simulation.store';
import {
  formatDays,
  formatKwh,
  formatNumber,
  formatPercent,
  kwh,
  NBSP,
} from '../../core/format';
import { Icon } from '../../shared/icons/icon';
import { StepHeader } from '../../shared/layout/step-header';
import { RainNotice } from '../../shared/ui/notices';
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
import { WiringDiagram } from './wiring-diagram';

function batteryMounting(series: number, parallel: number): string {
  if (series > 1 && parallel > 1)
    return `${parallel} branches de ${series} en série`;
  return series > 1 ? `${series} en série` : `${parallel} en parallèle`;
}

interface BomLine {
  qty: string;
  name: string;
  note: string;
}

/** Récapitulatif final : nomenclature (RF-15), schéma, avertissement (RF-16). */
@Component({
  selector: 'app-recap-page',
  imports: [RouterLink, Icon, StepHeader, RainNotice, WiringDiagram],
  template: `
    <div class="flex min-h-dvh flex-col">
      <app-step-header
        title="Liste du matériel"
        backLink="/resultat"
        backLabel="Retour au résultat"
      />
      @if (store.result(); as r) {
        <main
          class="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 pt-4 pb-6 lg:max-w-[1280px] lg:p-8"
        >
          <h1 class="sr-only">Liste du matériel</h1>
          <div
            class="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-start lg:gap-8"
          >
            <div class="flex flex-col gap-6">
              <section
                class="flex flex-col gap-3.5 rounded-xl bg-ink p-4 text-white"
                aria-label="Synthèse"
              >
                <div class="flex flex-col gap-0.5">
                  <span
                    class="font-mono text-mono font-normal tracking-[0.04em] text-line-strong"
                    >SIMULATION DU {{ today }}</span
                  >
                  <span class="text-h2">{{ summary().title }}</span>
                </div>
                <div class="grid grid-cols-3 gap-2">
                  @for (k of summary().keys; track k.label) {
                    <div class="flex flex-col gap-0.5">
                      <span class="tnum text-h2 text-solar">{{ k.value }}</span>
                      <span class="text-mono font-normal text-line-strong">{{
                        k.label
                      }}</span>
                    </div>
                  }
                </div>
                <dl
                  class="m-0 flex flex-col gap-1.5 border-t border-ink-2 pt-3 text-small"
                >
                  @for (d of summary().facts; track d.label) {
                    <div class="flex justify-between gap-2">
                      <dt class="text-line-strong">{{ d.label }}</dt>
                      <dd class="tnum m-0 text-right">{{ d.value }}</dd>
                    </div>
                  }
                </dl>
              </section>

              <section
                class="flex flex-col gap-2.5"
                aria-labelledby="wiring-title"
              >
                <h2 id="wiring-title" class="m-0 text-h2">Schéma de câblage</h2>
                <div class="card p-3.5">
                  <app-wiring-diagram
                    [result]="r"
                    [catalog]="store.catalog()"
                    [params]="store.params()"
                    [cableLengthsM]="store.options()?.cableLengthsM"
                  />
                </div>
              </section>
            </div>

            <div class="flex flex-col gap-6">
              <section
                class="flex flex-col gap-2.5"
                aria-labelledby="bom-title"
              >
                <h2 id="bom-title" class="m-0 text-h2">Nomenclature</h2>
                <div class="card overflow-hidden">
                  @for (g of bom(); track g.title) {
                    <h3
                      class="m-0 bg-surface-2 px-3.5 py-2.5 font-mono text-mono tracking-[0.04em] text-ink-2"
                    >
                      {{ g.title }}
                    </h3>
                    <ul class="m-0 list-none p-0">
                      @for (l of g.lines; track $index) {
                        <li
                          class="flex gap-3 border-t border-divider px-3.5 py-2.5"
                        >
                          <span
                            class="w-11 shrink-0 font-mono text-small font-medium"
                            >{{ l.qty }}</span
                          >
                          <span class="flex flex-col">
                            <span class="text-[15px]/5 font-medium">{{
                              l.name
                            }}</span>
                            @if (l.note) {
                              <span class="text-caption text-muted">{{
                                l.note
                              }}</span>
                            }
                          </span>
                        </li>
                      }
                    </ul>
                  }
                </div>
              </section>

              <app-rain-notice />

              @if (actions.requestCallback) {
                <section class="card flex flex-col gap-3 p-4">
                  <div class="flex gap-3">
                    <span
                      class="flex size-11 shrink-0 items-center justify-center rounded-md bg-surface-2"
                    >
                      <app-icon name="phone" />
                    </span>
                    <span class="flex flex-col gap-0.5">
                      <span class="text-base/[22px] font-semibold"
                        >Besoin d'un devis&#160;?</span
                      >
                      <span class="text-small text-ink-2"
                        >Laissez votre numéro, un installateur vous rappelle
                        avec cette liste.</span
                      >
                    </span>
                  </div>
                  <button
                    type="button"
                    class="btn-secondary"
                    (click)="requestCallback()"
                  >
                    Être recontacté
                  </button>
                </section>
              }

              <div class="hidden gap-2 lg:flex">
                <button
                  type="button"
                  class="btn-secondary w-[52px] shrink-0 !min-h-[52px] p-0"
                  aria-label="Partager le lien"
                  (click)="share()"
                >
                  <app-icon name="share" [size]="22" />
                </button>
                <button
                  type="button"
                  class="btn-primary flex-1"
                  (click)="exportPdf()"
                >
                  <app-icon name="download" [size]="20" [strokeWidth]="1.75" />
                  Télécharger le PDF
                </button>
              </div>
              @if (shareMessage()) {
                <p role="status" class="m-0 text-center text-small text-ok-ink">
                  {{ shareMessage() }}
                </p>
              }
            </div>
          </div>
        </main>
        <div class="action-bar flex-row gap-2 lg:hidden">
          <button
            type="button"
            class="btn-secondary w-[52px] shrink-0 !min-h-[52px] p-0"
            aria-label="Partager le lien"
            (click)="share()"
          >
            <app-icon name="share" [size]="22" />
          </button>
          <button
            type="button"
            class="btn-primary flex-1"
            (click)="exportPdf()"
          >
            <app-icon name="download" [size]="20" [strokeWidth]="1.75" />
            Télécharger le PDF
          </button>
        </div>
      } @else {
        <main
          class="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 py-8"
        >
          <h1 class="m-0 text-h1">Pas encore de matériel</h1>
          <p class="m-0 text-lead text-muted">
            Complétez votre simulation pour obtenir la liste du matériel.
          </p>
          <a routerLink="/besoins" class="btn-primary">Choisir mes appareils</a>
        </main>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecapPage {
  protected readonly store = inject(SimulationStore);
  protected readonly actions = inject(RESULT_ACTIONS);
  protected readonly shareMessage = signal('');
  protected readonly today = new Intl.DateTimeFormat('fr-FR').format(
    new Date(),
  );

  protected readonly summary = computed(() => {
    const r = this.store.result();
    if (!r) return { title: '', keys: [], facts: [] };
    const inverter = inverterModel(this.store.catalog(), r);
    const region = this.store.region();
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
  });

  protected readonly bom = computed(() => {
    const r = this.store.result();
    if (!r) return [];
    const catalog = this.store.catalog();
    const params = this.store.params();
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
          r.pv.strings > 1
            ? panelLayout(r)
            : `Montés en série, une seule chaîne`,
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
      const len = segmentLength(
        c.segment,
        params,
        this.store.options()?.cableLengthsM,
      );
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
  });

  protected async share(): Promise<void> {
    try {
      const url = this.actions.share
        ? await this.actions.share()
        : (globalThis.location?.origin ?? '');
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: 'Ma simulation solaire', url });
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        this.shareMessage.set('Lien copié.');
      }
    } catch {
      // Partage annulé par l'utilisateur.
    }
  }

  protected requestCallback(): void {
    void this.actions.requestCallback?.();
  }

  protected async exportPdf(): Promise<void> {
    if (this.actions.exportPdf) await this.actions.exportPdf();
    else globalThis.print?.();
  }
}
