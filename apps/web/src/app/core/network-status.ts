import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/** État de la connexion du navigateur (`online` / `offline`). */
@Injectable({ providedIn: 'root' })
export class NetworkStatus {
  private readonly _online = signal(globalThis.navigator?.onLine ?? true);
  readonly online = this._online.asReadonly();

  constructor() {
    const target = globalThis.window;
    if (!target?.addEventListener) return;
    const up = () => this._online.set(true);
    const down = () => this._online.set(false);
    target.addEventListener('online', up);
    target.addEventListener('offline', down);
    inject(DestroyRef).onDestroy(() => {
      target.removeEventListener('online', up);
      target.removeEventListener('offline', down);
    });
  }
}
