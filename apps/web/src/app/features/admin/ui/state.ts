import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { Icon } from './icon';

/** Bloc d'état d'une liste : chargement, erreur (avec « Réessayer ») ou vide. */
@Component({
  selector: 'app-list-state',
  imports: [Icon],
  template: `
    @if (loading()) {
      <p
        class="px-4 py-8 text-center text-small text-muted"
        role="status"
        aria-live="polite"
      >
        Chargement…
      </p>
    } @else if (error()) {
      <div
        class="m-3 flex flex-wrap items-center gap-2 rounded-md bg-crit-soft px-3 py-2.5 text-[13px] leading-[18px] text-crit-ink"
        role="alert"
      >
        <app-admin-icon name="alert" />
        <span><strong>Erreur :</strong> {{ error() }}</span>
        <button
          type="button"
          class="ml-auto min-h-11 rounded-sm px-3 font-semibold underline"
          (click)="retry.emit()"
        >
          Réessayer
        </button>
      </div>
    } @else if (empty()) {
      <p class="px-4 py-8 text-center text-small text-muted">
        {{ emptyText() }}
      </p>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListState {
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly empty = input(false);
  readonly emptyText = input('Aucun élément.');
  readonly retry = output<void>();
}

/** Message d'erreur ou de succès d'un formulaire. */
@Component({
  selector: 'app-form-message',
  imports: [Icon],
  template: `
    @if (message()) {
      <div
        class="flex items-start gap-2 rounded-md px-3 py-2.5 text-[13px] leading-[18px]"
        [class]="
          kind() === 'error'
            ? 'bg-crit-soft text-crit-ink'
            : 'bg-ok-soft text-ok-ink'
        "
        [attr.role]="kind() === 'error' ? 'alert' : 'status'"
      >
        @if (kind() === 'error') {
          <app-admin-icon name="alert" />
        }
        <span>{{ message() }}</span>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormMessage {
  readonly message = input<string | null>(null);
  readonly kind = input<'error' | 'success'>('error');
}

/** Interrupteur accessible (rôle switch, cible 44 px). */
@Component({
  selector: 'app-switch',
  template: `
    <button
      type="button"
      role="switch"
      class="inline-flex size-11 items-center justify-center rounded-sm disabled:opacity-50"
      [attr.aria-checked]="checked()"
      [attr.aria-label]="label()"
      [disabled]="disabled()"
      (click)="switched.emit()"
    >
      <span
        class="flex h-5 w-9 items-center rounded-[10px] p-0.5 transition-colors"
        [class.bg-ok]="checked()"
        [class.bg-[#8a8d86]]="!checked()"
        [class.justify-end]="checked()"
      >
        <span
          class="size-4 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.25)]"
        ></span>
      </span>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Switch {
  readonly checked = input(false);
  readonly label = input.required<string>();
  readonly disabled = input(false);
  readonly switched = output<void>();
}
