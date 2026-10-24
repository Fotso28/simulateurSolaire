import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { SimulationMode } from '@simulateur/shared-types';
import { SimulationStore } from '../../core/simulation.store';
import { formatNumber } from '../../core/format';
import { Icon } from '../../shared/icons/icon';
import { StepHeader } from '../../shared/layout/step-header';

/** Étape 2 : particulier ou professionnel. */
@Component({
  selector: 'app-mode-page',
  imports: [RouterLink, Icon, StepHeader],
  template: `
    <div class="flex min-h-dvh flex-col">
      <app-step-header
        [step]="2"
        title="Votre profil"
        backLink="/"
        backLabel="Retour à la localisation"
      />
      <main
        class="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 pt-5 pb-6 lg:py-10"
      >
        @if (store.region(); as r) {
          <div
            class="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-3 py-2.5 text-small"
          >
            <app-icon name="pin" [size]="20" class="text-muted" />
            <span class="flex-1"
              >{{ r.name }}, {{ store.country()?.name }} ·
              <span class="tnum">{{ fmt(r.irradiationAvg) }}&#160;h</span> de
              soleil</span
            >
            <a
              routerLink="/"
              class="-my-2.5 flex min-h-11 items-center font-semibold"
              >Modifier</a
            >
          </div>
        }
        <div class="flex flex-col gap-2">
          <h1 class="m-0 text-h1 tracking-[-0.01em]">
            Connaissez-vous la puissance de vos appareils&#160;?
          </h1>
          <p class="m-0 text-lead text-muted">
            Le calcul s'adapte à ce que vous savez.
          </p>
        </div>
        <div class="flex flex-col gap-3">
          @for (o of options; track o.mode) {
            @let on =
              store.mode() === o.mode ||
              (!store.mode() && o.mode === 'particulier');
            <button
              type="button"
              class="flex flex-col gap-3.5 rounded-xl bg-surface p-[18px] text-left text-ink"
              [class]="
                on
                  ? 'border-[1.5px] border-ink shadow-[0_2px_6px_rgb(22_24_29/0.06)]'
                  : 'border border-line'
              "
              (click)="choose(o.mode)"
            >
              <span class="flex w-full items-center gap-3">
                <span
                  class="flex size-12 shrink-0 items-center justify-center rounded-lg"
                  [class]="on ? 'bg-solar-soft' : 'bg-surface-2'"
                >
                  <app-icon [name]="o.icon" [size]="26" />
                </span>
                <span class="flex flex-1 flex-col gap-0.5">
                  <span
                    class="font-mono text-mono font-normal tracking-[0.04em]"
                    [class]="on ? 'text-solar-ink' : 'text-muted'"
                    >{{ o.kicker }}</span
                  >
                  <span class="text-[18px]/6 font-semibold">{{ o.title }}</span>
                </span>
                <app-icon
                  name="chevron-right"
                  [size]="22"
                  [strokeWidth]="1.75"
                />
              </span>
              <span class="text-lead text-ink-2">{{ o.text }}</span>
            </button>
          }
        </div>
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModePage {
  protected readonly store = inject(SimulationStore);
  private readonly router = inject(Router);
  protected readonly fmt = (v: number) => formatNumber(v, 1);

  protected readonly options = [
    {
      mode: 'particulier' as const,
      icon: 'home',
      kicker: 'PARTICULIER',
      title: 'Non, je liste mes appareils',
      text: 'Choisissez vos appareils dans un catalogue illustré et indiquez leur nombre. Vous obtenez une estimation en fourchette et une proposition de matériel.',
    },
    {
      mode: 'pro' as const,
      icon: 'briefcase',
      kicker: 'PROFESSIONNEL',
      title: 'Oui, je connais mes puissances',
      text: 'Saisissez la puissance de chaque appareil, ou la puissance totale et l’énergie journalière. Vous obtenez la nomenclature complète : câblage, sections de câbles, protections.',
    },
  ];

  protected choose(mode: SimulationMode): void {
    this.store.setMode(mode);
    void this.router.navigateByUrl('/besoins');
  }
}
