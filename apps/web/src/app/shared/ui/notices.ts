import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import type { SimulationResult } from '@simulateur/shared-types';
import { Icon } from '../icons/icon';

/** Avertissement saison des pluies (RF-16). */
@Component({
  selector: 'app-rain-notice',
  imports: [Icon],
  template: `
    <div
      class="flex gap-2.5 rounded-lg bg-info-soft p-3.5 text-small text-info-ink"
    >
      <app-icon name="info" [size]="22" />
      <span
        ><strong class="font-semibold">Saison des pluies&#160;:</strong> la
        production peut baisser de 20 à 30&#160;%.
        @if (detailed()) {
          Le calcul repose sur l'ensoleillement moyen de l'année.
        }
      </span>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RainNotice {
  readonly detailed = input(false);
}

type Alert = SimulationResult['alerts'][number];

const STYLE: Record<
  Alert['level'] | 'ok',
  { cls: string; icon: string; title: string }
> = {
  critique: {
    cls: 'bg-crit-soft text-crit-ink',
    icon: 'alert-octagon',
    title: 'Critique :',
  },
  attention: {
    cls: 'bg-warn-soft text-warn-ink',
    icon: 'alert-triangle',
    title: 'Attention :',
  },
  info: { cls: 'bg-info-soft text-info-ink', icon: 'info', title: 'À noter :' },
  ok: {
    cls: 'bg-ok-soft text-ok-ink',
    icon: 'check-circle',
    title: 'Aucune alerte :',
  },
};

/** Messages courts côté particulier, par code d'alerte du moteur. */
const SIMPLE_MESSAGES: Record<string, string> = {
  INVERTER_UNDERSIZED: 'l’onduleur ne peut pas alimenter tous les appareils.',
  AUTONOMY_BELOW_ONE_NIGHT: 'le stockage ne couvre pas une nuit.',
  PV_COVERAGE_LOW:
    'en moyenne, les panneaux ne rechargent pas complètement les batteries.',
};

/**
 * Liste des alertes du moteur (RF-14). Les alertes « info » (saison des
 * pluies, appareil lourd) sont affichées ailleurs ; `showOk` affiche le
 * message vert quand rien ne bloque.
 */
@Component({
  selector: 'app-alert-list',
  imports: [Icon],
  template: `
    <div class="flex flex-col gap-2" aria-live="polite">
      @for (a of items(); track a.key) {
        <div
          role="status"
          class="flex gap-2.5 rounded-lg px-3.5 py-3"
          [class]="a.cls"
          [class.text-small]="!compact()"
          [class.text-caption]="compact()"
        >
          <app-icon
            [name]="a.icon"
            [size]="compact() ? 18 : 20"
            [strokeWidth]="1.75"
          />
          <span>
            @if (!compact()) {
              <strong class="font-semibold">{{ a.title }}</strong>
            }
            {{ a.message }}</span
          >
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertList {
  readonly alerts = input.required<readonly Alert[]>();
  readonly showOk = input(true);
  readonly compact = input(false);

  protected readonly items = computed(() => {
    const blocking = this.alerts().filter((a) => a.level !== 'info');
    const list = blocking.map((a, i) => {
      const s = STYLE[a.level];
      const msg = SIMPLE_MESSAGES[a.code] ?? a.message;
      return {
        key: `${a.code}-${i}`,
        ...s,
        message: this.compact() ? capitalize(msg) : msg,
      };
    });
    if (!list.length && this.showOk()) {
      const msg =
        'tous vos appareils sont alimentés et les batteries se rechargent.';
      list.push({
        key: 'ok',
        ...STYLE.ok,
        message: this.compact() ? capitalize(msg) : msg,
      });
    }
    return list;
  });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
