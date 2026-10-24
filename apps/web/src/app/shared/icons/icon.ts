import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { ICON_PATHS, resolveIcon } from './icon-paths';

/**
 * Icône SVG au trait (grille 24, trait 1,5, `currentColor`).
 * `name` accepte un glyphe ou une `iconKey` du catalogue (appareil, catégorie).
 * Décorative par défaut (`aria-hidden`) : le texte voisin porte le sens.
 */
@Component({
  selector: 'app-icon',
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth()"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      @for (d of paths(); track $index) {
        <path [attr.d]="d" />
      }
    </svg>
  `,
  host: { class: 'inline-flex shrink-0' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Icon {
  readonly name = input.required<string | null | undefined>();
  readonly size = input(24);
  readonly strokeWidth = input(1.5);
  protected readonly paths = computed(
    () => ICON_PATHS[resolveIcon(this.name())],
  );
}
