import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NetworkStatus } from '../../core/network-status';
import { OfflineQueue } from '../../core/offline-queue';

/** Bandeau discret : hors-ligne, simulations en attente, envoi réussi. */
@Component({
  selector: 'app-offline-indicator',
  imports: [RouterLink],
  template: `
    @if (message(); as m) {
      <div
        role="status"
        aria-live="polite"
        class="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-2 pointer-events-none"
      >
        <span
          class="pointer-events-auto rounded-full bg-ink px-3.5 py-1.5 text-caption text-white shadow"
        >
          {{ m }}
          @if (!offline() && queue.lastSentToken(); as token) {
            <a
              [routerLink]="['/s', token]"
              class="ml-1 inline-flex min-h-11 items-center text-white underline"
              >Voir le lien</a
            >
            <button
              type="button"
              class="ml-2 inline-flex min-h-11 min-w-11 items-center justify-center text-white"
              aria-label="Fermer"
              (click)="queue.clearLastSent()"
            >
              ×
            </button>
          }
        </span>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfflineIndicator {
  private readonly network = inject(NetworkStatus);
  protected readonly queue = inject(OfflineQueue);
  protected readonly offline = computed(() => !this.network.online());

  protected readonly message = computed(() => {
    const pending = this.queue.pending();
    if (this.offline()) {
      return pending
        ? `Hors ligne · ${pending} simulation${pending > 1 ? 's' : ''} en attente d’envoi`
        : 'Hors ligne · la simulation reste disponible';
    }
    if (pending) return 'Envoi des simulations en attente…';
    return this.queue.lastSentToken() ? 'Simulation enregistrée.' : '';
  });
}
