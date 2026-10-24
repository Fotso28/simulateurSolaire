import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/** Seuil des mises en page desktop (maquettes DesktopBesoins / DesktopResultat). */
export const DESKTOP_QUERY = '(min-width: 1024px)';

/** `isDesktop()` suit la largeur de la fenêtre. */
@Injectable({ providedIn: 'root' })
export class Breakpoint {
  private readonly query =
    typeof matchMedia === 'function' ? matchMedia(DESKTOP_QUERY) : null;
  private readonly _isDesktop = signal(this.query?.matches ?? false);
  readonly isDesktop = this._isDesktop.asReadonly();

  constructor() {
    const q = this.query;
    if (!q) return;
    const onChange = (e: MediaQueryListEvent) => this._isDesktop.set(e.matches);
    q.addEventListener?.('change', onChange);
    inject(DestroyRef).onDestroy(() =>
      q.removeEventListener?.('change', onChange),
    );
  }
}
