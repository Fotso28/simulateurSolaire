import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import type { BatteryTech } from '@simulateur/shared-types';
import { SimulationStore } from '../../core/simulation.store';
import { autonomyLabel, formatNumber, kwh } from '../../core/format';
import { Icon } from '../../shared/icons/icon';
import { StepHeader } from '../../shared/layout/step-header';

const SUBTITLES: Record<number, string> = {
  0.5: '12 h sans soleil, jusqu’au matin',
  1: '24 h sans soleil',
  1.5: '36 h sans soleil',
  2: '48 h sans soleil',
  3: '72 h sans soleil',
};

/** Étape 4 : palier d'autonomie (RF-11) et technologie de batterie. */
@Component({
  selector: 'app-autonomy-page',
  imports: [Icon, StepHeader],
  template: `
    <div class="flex min-h-dvh flex-col">
      <app-step-header
        [step]="4"
        title="Autonomie"
        backLink="/besoins"
        backLabel="Retour aux appareils"
      />
      <main
        class="mx-auto flex w-full max-w-xl flex-1 flex-col gap-7 px-4 py-6 lg:py-10"
      >
        <div class="flex flex-col gap-2">
          <h1 class="m-0 text-h1 tracking-[-0.01em]">
            Combien de temps sans soleil&#160;?
          </h1>
          <p class="m-0 text-lead text-muted">
            Vos batteries prennent le relais quand les panneaux ne produisent
            pas&#160;: la nuit, ou pendant des jours couverts. Plus d'autonomie
            demande plus de stockage.
          </p>
        </div>

        <section class="flex flex-col gap-2" aria-label="Autonomie souhaitée">
          @for (t of tiers(); track t.days) {
            <button
              type="button"
              class="choice flex w-full flex-col gap-2.5 rounded-lg p-3.5"
              [attr.aria-pressed]="t.on"
              (click)="store.setAutonomy(t.days)"
            >
              <span class="flex w-full items-center gap-3">
                <span class="radio-dot"></span>
                <span class="flex flex-1 flex-col">
                  <span class="text-base/[22px] font-semibold">{{
                    t.label
                  }}</span>
                  <span class="text-caption text-muted">{{ t.sub }}</span>
                </span>
                <span class="flex flex-col items-end">
                  <span class="tnum text-base/[22px] font-semibold"
                    >≈&#160;{{ t.kwh }}&#160;kWh</span
                  >
                  <span class="text-mono font-normal text-muted"
                    >de stockage</span
                  >
                </span>
              </span>
              <span
                class="h-1.5 w-full overflow-hidden rounded-[3px] bg-track-soft"
                aria-hidden="true"
              >
                <span
                  class="block h-1.5 rounded-[3px]"
                  [class]="t.on ? 'bg-ink' : 'bg-[#B9BBB3]'"
                  [style.width.%]="t.bar"
                ></span>
              </span>
            </button>
          }
        </section>

        <section class="flex flex-col gap-2.5" aria-labelledby="tech-title">
          <h2 id="tech-title" class="m-0 text-[17px]/6 font-semibold">
            Type de batterie
          </h2>
          <div class="grid grid-cols-2 gap-2">
            @for (o of techs; track o.tech) {
              <button
                type="button"
                class="choice flex flex-col gap-1.5 rounded-lg p-3.5"
                [attr.aria-pressed]="store.batteryTech() === o.tech"
                (click)="store.setBatteryTech(o.tech)"
              >
                <span class="text-base/[22px] font-semibold">{{
                  o.label
                }}</span>
                <span class="text-caption text-ink-2">{{ o.text() }}</span>
              </button>
            }
          </div>
        </section>
      </main>

      <div
        class="action-bar lg:static lg:mx-auto lg:w-full lg:max-w-xl lg:rounded-t-xl"
      >
        <div class="flex items-center justify-between gap-2 text-small">
          <span class="text-muted"
            >{{ selected()?.label }} · {{ techLabel() }}</span
          >
          <span class="tnum font-semibold"
            >≈&#160;{{ selected()?.kwh }}&#160;kWh</span
          >
        </div>
        <button type="button" class="btn-primary" (click)="next()">
          Voir ma proposition
          <app-icon name="arrow-right" [size]="20" [strokeWidth]="1.75" />
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutonomyPage {
  protected readonly store = inject(SimulationStore);
  private readonly router = inject(Router);

  private readonly dod = computed(() => {
    const v = this.store.params().values;
    return this.store.batteryTech() === 'lithium' ? v.dodLithium : v.dodLead;
  });

  /** Stockage indicatif (Wh) : E × a / (DoD × η), comme le moteur. */
  private storageWh(days: number): number {
    const v = this.store.params().values;
    return (
      (this.store.dailyEnergy().typ * days) /
      (this.dod() * v.inverterEfficiency)
    );
  }

  protected readonly tiers = computed(() => {
    const steps = this.store.params().values.autonomySteps;
    const max = this.storageWh(Math.max(...steps)) || 1;
    return steps.map((days) => {
      const wh = this.storageWh(days);
      return {
        days,
        label: autonomyLabel(days),
        sub: SUBTITLES[days] ?? `${formatNumber(days * 24)} h sans soleil`,
        kwh: kwh(wh),
        bar: Math.round((wh / max) * 100),
        on: days === this.store.autonomyDays(),
      };
    });
  });

  protected readonly selected = computed(() => this.tiers().find((t) => t.on));

  protected readonly techLabel = computed(() =>
    this.store.batteryTech() === 'lithium' ? 'lithium' : 'plomb ou gel',
  );

  protected readonly techs: {
    tech: BatteryTech;
    label: string;
    text: () => string;
  }[] = [
    {
      tech: 'lithium',
      label: 'Lithium',
      text: () =>
        `Utilisable jusqu'à ${formatNumber(this.store.params().values.dodLithium * 100)}\u00a0% de sa capacité.`,
    },
    {
      tech: 'plomb',
      label: 'Plomb ou gel',
      text: () =>
        `Utilisable à ${formatNumber(this.store.params().values.dodLead * 100)}\u00a0%\u00a0: il faut plus de capacité.`,
    },
  ];

  protected next(): void {
    void this.router.navigateByUrl('/resultat');
  }
}
