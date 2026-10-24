import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/** Écran provisoire affiché par les routes pas encore implémentées. */
@Component({
  selector: 'app-placeholder-page',
  template: `
    <main class="mx-auto max-w-3xl px-4 py-8">
      <h1 class="text-h1">{{ title }}</h1>
      <p class="mt-2 text-small text-muted">Écran en cours de construction.</p>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceholderPage {
  protected readonly title = inject(ActivatedRoute).snapshot.title ?? '';
}
