import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SimulationStore } from '../../core/simulation.store';
import { Icon } from '../../shared/icons/icon';
import { StepHeader } from '../../shared/layout/step-header';
import { RainNotice } from '../../shared/ui/notices';
import { ConfiguratorPanel } from './configurator-panel';

/** Configurateur plein écran (mobile) ; sur desktop il est aussi dans `/resultat`. */
@Component({
  selector: 'app-configurator-page',
  imports: [RouterLink, Icon, StepHeader, RainNotice, ConfiguratorPanel],
  template: `
    <div class="flex min-h-dvh flex-col">
      <app-step-header
        title="Ajuster l'installation"
        backLink="/resultat"
        backLabel="Retour au résultat"
      />
      <main
        class="mx-auto flex w-full max-w-xl flex-1 flex-col gap-3 px-4 pt-4 pb-6 lg:py-10"
      >
        <h1 class="sr-only">Ajuster l'installation</h1>
        @if (store.result()) {
          <p class="m-0 mb-1 text-lead text-ink-2">
            Montez ou descendez chaque élément d'une taille standard. Les
            indicateurs se recalculent à chaque clic.
          </p>
          <app-configurator-panel />
          <app-rain-notice />
        } @else {
          <p class="m-0 text-lead text-muted">
            Aucune proposition à ajuster pour l'instant.
          </p>
          <a routerLink="/besoins" class="btn-secondary"
            >Choisir mes appareils</a
          >
        }
      </main>
      @if (store.result()) {
        <div
          class="action-bar lg:static lg:mx-auto lg:w-full lg:max-w-xl lg:rounded-t-xl"
        >
          <a routerLink="/recapitulatif" class="btn-primary">
            Valider et voir le matériel
            <app-icon name="arrow-right" [size]="20" [strokeWidth]="1.75" />
          </a>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfiguratorPage {
  protected readonly store = inject(SimulationStore);
}
