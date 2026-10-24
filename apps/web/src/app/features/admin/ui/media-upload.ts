import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { AdminApiService } from '../core/admin-api.service';
import { errorMessage } from '../core/api-error';
import { Icon } from './icon';

const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Téléversement d'une icône SVG ou d'une image (convertie en WebP 512 px par
 * l'API, `/admin/media`) avec aperçu. Émet l'URL publique du fichier stocké.
 */
@Component({
  selector: 'app-media-upload',
  imports: [Icon],
  template: `
    <div class="flex flex-col gap-1.5">
      <span class="font-semibold" [id]="labelId()">{{ label() }}</span>
      <div
        class="flex h-22 items-center justify-center rounded-md bg-bg"
        [class]="
          url()
            ? 'border border-line'
            : 'border-[1.5px] border-dashed border-[#8a8d86]'
        "
      >
        @if (url(); as src) {
          <img
            [src]="src"
            [alt]="'Aperçu : ' + label()"
            [class]="
              kind() === 'icon'
                ? 'size-10'
                : 'max-h-20 max-w-full object-contain'
            "
          />
        } @else {
          <span class="text-[12px] leading-4 text-muted">Aucun fichier</span>
        }
      </div>
      <span class="font-mono text-[11px] text-muted">{{ hint() }}</span>
      <input
        #file
        type="file"
        class="sr-only"
        tabindex="-1"
        [accept]="accept()"
        [attr.aria-labelledby]="labelId()"
        (change)="onFile($event)"
      />
      <div class="flex gap-2">
        <button
          type="button"
          class="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-md border border-line-strong bg-white px-2 text-[13px] font-semibold disabled:opacity-60"
          [disabled]="busy()"
          (click)="fileInput().nativeElement.click()"
        >
          <app-admin-icon name="upload" [size]="16" />
          {{ busy() ? 'Envoi…' : url() ? 'Remplacer' : 'Téléverser' }}
          <span class="sr-only">{{ label() }}</span>
        </button>
        @if (url() && !busy()) {
          <button
            type="button"
            class="inline-flex size-11 items-center justify-center rounded-md border border-line-strong bg-white text-ink-2"
            [attr.aria-label]="'Retirer : ' + label()"
            (click)="changed.emit(null)"
          >
            <app-admin-icon name="trash" [size]="16" />
          </button>
        }
      </div>
      @if (error()) {
        <p class="text-[12px] leading-4 text-crit-ink" role="alert">
          {{ error() }}
        </p>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaUpload {
  private readonly api = inject(AdminApiService);
  private static nextId = 0;

  readonly kind = input.required<'icon' | 'image'>();
  readonly label = input.required<string>();
  readonly url = input<string | null>(null);
  readonly changed = output<string | null>();

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly labelId = signal(`media-label-${MediaUpload.nextId++}`);
  protected readonly fileInput =
    viewChild.required<ElementRef<HTMLInputElement>>('file');
  protected readonly accept = computed(() =>
    this.kind() === 'icon'
      ? 'image/svg+xml,.svg'
      : 'image/png,image/jpeg,image/webp,image/gif',
  );
  protected readonly hint = computed(() =>
    this.kind() === 'icon' ? 'SVG au trait · 24 px' : 'WebP 512 px · 80 Ko',
  );

  protected onFile(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    inputEl.value = '';
    if (!file) return;
    if (file.size > MAX_BYTES) {
      this.error.set('Fichier trop volumineux (2 Mo au maximum).');
      return;
    }
    this.error.set(null);
    this.busy.set(true);
    this.api.uploadMedia(file, this.kind()).subscribe({
      next: (response) => {
        this.busy.set(false);
        this.changed.emit(response.url);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(errorMessage(err));
      },
    });
  }
}
