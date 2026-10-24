import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Accueil : choix du pays et de la région (lot L3). */
@Component({
  selector: 'app-home-page',
  template: `
    <main class="mx-auto max-w-3xl px-4 py-8">
      <p class="font-mono text-mono uppercase tracking-wider text-muted">
        Simulateur solaire
      </p>
      <h1 class="mt-2 text-h1">Dimensionnez votre installation solaire</h1>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {}
