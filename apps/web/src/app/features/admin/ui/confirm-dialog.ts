import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { ConfirmService } from '../core/confirm.service';

/** Boîte de confirmation modale (élément `<dialog>` natif : focus piégé, Échap). */
@Component({
  selector: 'app-confirm-dialog',
  template: `
    <dialog
      #dialog
      class="m-auto w-[min(92vw,420px)] rounded-xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-ink/40"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      (cancel)="$event.preventDefault(); confirm.answer(false)"
    >
      @if (confirm.pending(); as request) {
        <div class="flex flex-col gap-3 p-5">
          <h2
            id="confirm-title"
            class="text-[17px] leading-[22px] font-semibold"
          >
            {{ request.title }}
          </h2>
          <p id="confirm-message" class="text-small text-ink-2">
            {{ request.message }}
          </p>
          <div class="mt-2 flex gap-2">
            <button
              type="button"
              class="h-11 flex-1 rounded-md border border-line-strong bg-white text-[15px] font-semibold"
              (click)="confirm.answer(false)"
            >
              Annuler
            </button>
            <button
              type="button"
              class="h-11 flex-1 rounded-md text-[15px] font-semibold text-white"
              [class.bg-crit]="request.danger"
              [class.bg-action]="!request.danger"
              (click)="confirm.answer(true)"
            >
              {{ request.confirmLabel }}
            </button>
          </div>
        </div>
      }
    </dialog>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  protected readonly confirm = inject(ConfirmService);
  private readonly dialog =
    viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const element = this.dialog().nativeElement;
      const open = this.confirm.pending() !== null;
      // jsdom n'implémente pas showModal : on bascule l'attribut à la main.
      if (open && !element.open) {
        if (typeof element.showModal === 'function') element.showModal();
        else element.setAttribute('open', '');
      } else if (!open && element.open) {
        if (typeof element.close === 'function') element.close();
        else element.removeAttribute('open');
      }
    });
  }
}
