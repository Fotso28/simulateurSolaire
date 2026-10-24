import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** En-tête d'écran du back-office : titre, sous-titre, action principale (projetée). */
@Component({
  selector: 'app-page-header',
  template: `
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div class="flex flex-col gap-1">
        <h1 class="text-[26px] leading-8 font-semibold">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="text-[15px] leading-[22px] text-muted">{{ subtitle() }}</p>
        }
      </div>
      <ng-content />
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
}

/** Classes partagées (boutons, champs) pour garder le même langage visuel. */
export const UI = {
  primary:
    'inline-flex h-11 items-center justify-center gap-2 rounded-md bg-action px-4 text-[15px] font-semibold text-white disabled:opacity-60',
  secondary:
    'inline-flex h-11 items-center justify-center gap-2 rounded-md border border-line-strong bg-white px-4 text-[15px] font-semibold text-ink disabled:opacity-60',
  ghostIcon:
    'inline-flex size-11 items-center justify-center rounded-sm text-ink-2 hover:bg-surface-2',
  input:
    'h-11 w-full rounded-md border border-line-strong bg-surface px-3 text-[15px] aria-[invalid=true]:border-crit',
  numInput:
    'h-11 w-full rounded-md border border-line-strong bg-surface px-2.5 text-right font-mono text-[15px] aria-[invalid=true]:border-crit',
  card: 'overflow-x-auto rounded-xl border border-line bg-surface',
  th: 'bg-surface-2 px-2 py-3 text-left font-mono text-[11px] leading-[14px] font-medium tracking-[0.03em] text-ink-2 uppercase first:pl-3.5',
  td: 'border-t border-[#ECECE6] px-2 py-2 first:pl-3.5 last:pr-3.5',
  fieldLabel: 'flex flex-col gap-1.5 text-small',
  error: 'text-[12px] leading-4 text-crit-ink',
} as const;
