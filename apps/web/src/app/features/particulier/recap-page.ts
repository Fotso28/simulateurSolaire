import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { RESULT_ACTIONS, shareResult } from '../../core/extensions';
import { SimulationStore } from '../../core/simulation.store';
import { Icon } from '../../shared/icons/icon';
import { StepHeader } from '../../shared/layout/step-header';
import { RainNotice } from '../../shared/ui/notices';
import { proBillOfMaterials, proRecapSummary } from '../pro/pro-view';
import { billOfMaterials, recapSummary } from './recap-data';
import { WiringDiagram } from './wiring-diagram';

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

  /** Mode pro : synthèse et nomenclature en vocabulaire technique. */
  private readonly proContext = computed(() => {
    const input = this.store.input();
    if (this.store.mode() !== 'pro' || !input) return null;
    return {
      catalog: this.store.catalog(),
      params: this.store.params(),
      region: this.store.region(),
      input,
    };
  });

  protected readonly summary = computed(() => {
    const r = this.store.result();
    if (!r) return { title: '', keys: [], facts: [] };
    const pro = this.proContext();
    if (pro) return proRecapSummary(r, pro);
    return recapSummary(r, this.store.catalog(), this.store.region());
  });

  protected readonly bom = computed(() => {
    const r = this.store.result();
    if (!r) return [];
    const pro = this.proContext();
    if (pro) return proBillOfMaterials(r, pro);
    return billOfMaterials(
      r,
      this.store.catalog(),
      this.store.params(),
      this.store.options()?.cableLengthsM,
    );
  });

  protected async share(): Promise<void> {
    this.shareMessage.set('');
    this.shareMessage.set(await shareResult(this.actions));
  }

  protected requestCallback(): void {
    void this.actions.requestCallback?.();
  }

  protected async exportPdf(): Promise<void> {
    if (this.actions.exportPdf) await this.actions.exportPdf();
    else globalThis.print?.();
  }
}
