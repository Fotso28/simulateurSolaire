import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { RESULT_ACTIONS, shareResult } from '../../core/extensions';
import { SimulationStore } from '../../core/simulation.store';
import { formatNumber, NBSP } from '../../core/format';
import { Icon } from '../icons/icon';

export const STEPS = [
  { label: 'Lieu', link: '/' },
  { label: 'Profil', link: '/mode' },
  { label: 'Appareils', link: '/besoins' },
  { label: 'Autonomie', link: '/autonomie' },
  { label: 'Résultat', link: '/resultat' },
] as const;

/** Parcours professionnel : l'autonomie se règle sur l'écran de saisie. */
export const PRO_STEPS = [
  { label: 'Lieu', link: '/' },
  { label: 'Profil', link: '/mode' },
  { label: 'Saisie', link: '/besoins' },
  { label: 'Résultat', link: '/resultat' },
] as const;

/**
 * En-tête du parcours. Mobile : titre, retour, « ÉTAPE n / 5 » et barre
 * d'étapes. Desktop (≥ 1024 px) : logo, étapes numérotées, lieu choisi et,
 * sur le résultat, bouton « Partager ».
 */
@Component({
  selector: 'app-step-header',
  imports: [RouterLink, Icon],
  template: `
    <!-- Mobile -->
    <div class="lg:hidden">
      <header
        class="flex h-14 items-center gap-1 border-b border-line bg-surface pr-4"
        [class]="backLink() ? 'pl-1.5' : 'gap-2.5 pl-4'"
      >
        @if (backLink(); as link) {
          <a
            [routerLink]="link"
            [attr.aria-label]="backLabel()"
            class="flex size-11 items-center justify-center rounded-md text-ink"
          >
            <app-icon name="arrow-left" />
          </a>
        } @else {
          <span
            class="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-solar text-ink"
          >
            <app-icon name="sun" [size]="20" [strokeWidth]="1.75" />
          </span>
        }
        <span class="flex-1 text-base/5 font-semibold">{{
          title() || 'Simulateur solaire'
        }}</span>
        @if (isPro()) {
          <span
            class="mr-2 rounded-[5px] bg-ink px-1.5 py-0.5 font-mono text-[11px]/4 tracking-[.04em] text-white"
            >PRO</span
          >
        }
        @if (step(); as s) {
          <span class="font-mono text-mono font-normal text-muted"
            >ÉTAPE {{ s }} / {{ steps().length }}</span
          >
        }
      </header>
      @if (step(); as s) {
        <div class="flex gap-1 bg-surface px-4 py-2.5" aria-hidden="true">
          @for (st of steps(); track st.label; let i = $index) {
            <span
              class="h-1 flex-1 rounded-sm"
              [class.bg-solar]="i < s"
              [class.bg-track]="i >= s"
            ></span>
          }
        </div>
      }
    </div>

    <!-- Desktop -->
    <header class="hidden border-b border-line bg-surface lg:block">
      <div
        class="mx-auto flex min-h-18 max-w-[1280px] flex-wrap items-center gap-x-8 gap-y-3 px-8 py-3"
      >
        <a
          routerLink="/"
          class="flex items-center gap-2.5 text-ink no-underline"
          aria-label="Simulateur solaire, accueil"
        >
          <span
            class="flex size-9 items-center justify-center rounded-md bg-solar"
          >
            <app-icon name="sun" [size]="22" [strokeWidth]="1.75" />
          </span>
          <span class="text-[17px]/[22px] font-semibold"
            >Simulateur solaire</span
          >
          @if (isPro()) {
            <span
              class="rounded-[5px] bg-ink px-1.5 py-0.5 font-mono text-[11px]/4 tracking-[.04em] text-white"
              >PRO</span
            >
          }
        </a>
        <ol
          class="m-0 flex flex-1 list-none flex-wrap items-center justify-center gap-x-5 gap-y-2 p-0 text-small"
          aria-label="Étapes"
        >
          @for (st of steps(); track st.label; let i = $index) {
            @let n = i + 1;
            <li
              class="flex items-center gap-2"
              [attr.aria-current]="n === step() ? 'step' : null"
              [class.font-semibold]="n === step()"
              [class.text-ink-2]="n < (step() ?? 0)"
              [class.text-muted]="n > (step() ?? 0)"
            >
              @if (n < (step() ?? 0)) {
                <span
                  class="flex size-6 items-center justify-center rounded-full bg-ink text-white"
                >
                  <app-icon name="check" [size]="14" [strokeWidth]="2.5" />
                </span>
                <a
                  [routerLink]="st.link"
                  class="text-ink-2 no-underline hover:underline"
                  >{{ st.label }}</a
                >
              } @else if (n === step()) {
                <span
                  class="flex size-6 items-center justify-center rounded-full bg-solar font-mono text-mono text-ink"
                  >{{ n }}</span
                >{{ st.label }}
              } @else {
                <span
                  class="flex size-6 items-center justify-center rounded-full border-[1.5px] border-ring font-mono text-mono"
                  >{{ n }}</span
                >{{ st.label }}
              }
            </li>
          }
        </ol>
        @if (place(); as p) {
          <span
            class="flex items-center gap-1.5 rounded-md bg-surface-2 px-3 py-2 text-small"
          >
            <app-icon name="pin" [size]="18" />
            {{ p }}
          </span>
        }
        @if (shareable()) {
          <div class="flex items-center gap-3">
            @if (shareMessage()) {
              <span role="status" class="text-small text-ok-ink">{{
                shareMessage()
              }}</span>
            }
            <button
              type="button"
              class="btn-secondary !min-h-11 gap-2 px-4 text-sm"
              (click)="share()"
            >
              <app-icon name="share" [size]="18" />
              Partager
            </button>
          </div>
        }
      </div>
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepHeader {
  private readonly store = inject(SimulationStore);
  readonly title = input<string>();
  readonly step = input<number | null>(null);
  readonly backLink = input<string>();
  readonly backLabel = input('Retour');
  /** Bouton « Partager » dans l'en-tête desktop (écran Résultat). */
  readonly shareable = input(false);

  private readonly actions = inject(RESULT_ACTIONS);
  protected readonly shareMessage = signal('');

  protected async share(): Promise<void> {
    this.shareMessage.set('');
    this.shareMessage.set(await shareResult(this.actions));
  }

  protected readonly isPro = computed(() => this.store.mode() === 'pro');
  protected readonly steps = computed(() => (this.isPro() ? PRO_STEPS : STEPS));
  protected readonly place = computed(() => {
    const r = this.store.region();
    return r
      ? `${r.name} · ${formatNumber(r.irradiationAvg, 1)}${NBSP}h de soleil`
      : null;
  });
}
