import { DestroyRef, inject, signal } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { errorMessage } from './api-error';

/**
 * État chargement / erreur / données d'un appel HTTP, en signals.
 * À créer dans un contexte d'injection (champ de composant).
 */
export class Loader<T> {
  readonly data = signal<T | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  private subscription: Subscription | null = null;

  constructor(private readonly source: () => Observable<T>) {
    inject(DestroyRef).onDestroy(() => this.subscription?.unsubscribe());
  }

  load(): void {
    this.subscription?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);
    this.subscription = this.source().subscribe({
      next: (value) => {
        this.data.set(value);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.error.set(errorMessage(error));
        this.loading.set(false);
      },
    });
  }
}
