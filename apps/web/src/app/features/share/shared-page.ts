import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ShareService } from '../../core/share.service';
import { ApiError, NetworkError } from '../../core/simulation-api';
import { RecapPage } from '../particulier/recap-page';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; createdAt: string }
  | { status: 'error'; message: string };

/**
 * Simulation partagée `/s/:shareToken`, en lecture (RF-17) : charge la
 * simulation enregistrée, la recharge dans le store et affiche le
 * récapitulatif (matériel, schéma, PDF).
 */
@Component({
  selector: 'app-shared-page',
  imports: [RouterLink, RecapPage],
  template: `
    @switch (state().status) {
      @case ('loading') {
        <main
          class="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-3 px-4"
          aria-busy="true"
        >
          <p class="m-0 text-lead text-muted" role="status">
            Chargement de la simulation partagée…
          </p>
        </main>
      }
      @case ('ready') {
        <p
          class="m-0 border-b border-line bg-solar-soft px-4 py-2 text-center text-small text-solar-ink"
          role="note"
        >
          Simulation partagée du {{ createdAt() }} — vous pouvez l'ajuster
          depuis le résultat.
        </p>
        <app-recap-page />
      }
      @case ('error') {
        <main
          class="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-4 px-4"
        >
          <h1 class="m-0 text-h1">Simulation introuvable</h1>
          <p class="m-0 text-lead text-muted" role="alert">
            {{ errorMessage() }}
          </p>
          <a routerLink="/" class="btn-primary">Faire ma simulation</a>
        </main>
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SharedPage {
  readonly shareToken = input.required<string>();
  private readonly share = inject(ShareService);
  protected readonly state = signal<LoadState>({ status: 'loading' });

  constructor() {
    effect(() => void this.load(this.shareToken()));
  }

  protected createdAt(): string {
    const s = this.state();
    return s.status === 'ready'
      ? new Intl.DateTimeFormat('fr-FR').format(new Date(s.createdAt))
      : '';
  }

  protected errorMessage(): string {
    const s = this.state();
    return s.status === 'error' ? s.message : '';
  }

  private async load(token: string): Promise<void> {
    this.state.set({ status: 'loading' });
    try {
      const shared = await this.share.open(token);
      this.state.set({ status: 'ready', createdAt: shared.createdAt });
    } catch (e) {
      this.state.set({
        status: 'error',
        message:
          e instanceof NetworkError
            ? 'Pas de connexion : ce lien s’ouvrira dès le retour du réseau.'
            : e instanceof ApiError && e.status === 404
              ? 'Ce lien ne correspond à aucune simulation enregistrée.'
              : 'Impossible de charger cette simulation pour le moment.',
      });
    }
  }
}
