import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SimulationStore } from '../../core/simulation.store';
import { formatNumber } from '../../core/format';
import { Icon } from '../../shared/icons/icon';
import { StepHeader } from '../../shared/layout/step-header';

/** Étape 1 : pays puis région (RF-01). */
@Component({
  selector: 'app-location-page',
  imports: [RouterLink, Icon, StepHeader],
  template: `
    <div class="flex min-h-dvh flex-col">
      <app-step-header [step]="1" />
      <main
        class="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-6 lg:py-10"
      >
        <div class="flex flex-col gap-2">
          <h1 class="m-0 text-h1 tracking-[-0.01em]">
            Où sera installé votre système&#160;?
          </h1>
          <p class="m-0 text-lead text-muted">
            L'ensoleillement moyen de votre région sert de base au calcul du
            nombre de panneaux.
          </p>
        </div>

        <section class="flex flex-col gap-2" aria-labelledby="country-title">
          <h2 id="country-title" class="m-0 text-small font-semibold">Pays</h2>
          <div
            class="grid gap-1 rounded-lg bg-[#E9E9E3] p-1"
            [style.grid-template-columns]="
              'repeat(' + store.countries().length + ', minmax(0, 1fr))'
            "
          >
            @for (c of store.countries(); track c.id) {
              @let on = c.id === store.countryId();
              <button
                type="button"
                class="h-11 rounded-[9px] border-0 text-[15px] font-semibold text-ink"
                [class.bg-surface]="on"
                [class.shadow-sm]="on"
                [class.bg-transparent]="!on"
                [attr.aria-pressed]="on"
                (click)="store.setCountry(c.id)"
              >
                {{ c.name }}
              </button>
            }
          </div>
        </section>

        <section class="flex flex-col gap-2" aria-labelledby="region-title">
          <div class="flex items-baseline justify-between">
            <h2 id="region-title" class="m-0 text-small font-semibold">
              Région
            </h2>
            <span class="text-mono font-normal text-muted"
              >Soleil moyen par jour</span
            >
          </div>
          <div class="overflow-hidden rounded-lg border border-line bg-surface">
            @for (r of store.regions(); track r.id; let first = $first) {
              @let on = r.id === store.regionId();
              <button
                type="button"
                class="flex min-h-14 w-full items-center gap-3 border-0 px-3.5 py-2 text-left text-inherit"
                [class.border-t]="!first"
                [class.border-divider]="!first"
                [class.bg-solar-soft]="on"
                [class.bg-surface]="!on"
                [attr.aria-pressed]="on"
                (click)="store.setRegion(r.id)"
              >
                <span class="radio-dot"></span>
                <span class="flex min-w-0 flex-1 flex-col">
                  <span class="text-base/[22px]" [class.font-semibold]="on">{{
                    r.name
                  }}</span>
                  <span class="text-caption text-muted">{{ r.capital }}</span>
                </span>
                <span class="tnum flex items-baseline gap-[3px]">
                  <span class="text-base/[22px] font-semibold">{{
                    fmt(r.irradiationAvg)
                  }}</span>
                  <span class="text-caption text-muted">h</span>
                </span>
              </button>
            }
          </div>
          <p class="m-0 text-caption text-muted">
            Heures équivalentes de plein soleil, en moyenne sur l'année. La
            saison des pluies est signalée dans le résultat.
          </p>
        </section>
      </main>

      <div
        class="action-bar lg:static lg:mx-auto lg:w-full lg:max-w-xl lg:rounded-t-xl"
      >
        @if (store.region(); as r) {
          <div class="flex items-center justify-between gap-2 text-small">
            <span class="flex items-center gap-1.5 text-muted">
              <app-icon name="pin" [size]="18" />
              {{ r.name }}, {{ store.country()?.name }}
            </span>
            <span class="tnum font-semibold"
              >{{ fmt(r.irradiationAvg) }}&#160;h de soleil / jour</span
            >
          </div>
          <a routerLink="/mode" class="btn-primary">
            Continuer
            <app-icon name="arrow-right" [size]="20" [strokeWidth]="1.75" />
          </a>
        } @else {
          <button type="button" class="btn-primary" disabled>
            Choisissez votre région
          </button>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationPage {
  protected readonly store = inject(SimulationStore);
  protected readonly fmt = (v: number) => formatNumber(v, 1);
}
