import { Injectable, signal } from '@angular/core';

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  /** Action destructive (désactivation) : bouton rouge. */
  danger?: boolean;
}

interface PendingConfirm extends ConfirmRequest {
  resolve: (ok: boolean) => void;
}

/** Demande de confirmation affichée par `<app-confirm-dialog>` (dans la coque). */
@Injectable()
export class ConfirmService {
  readonly pending = signal<PendingConfirm | null>(null);

  ask(request: ConfirmRequest): Promise<boolean> {
    this.pending()?.resolve(false);
    return new Promise<boolean>((resolve) =>
      this.pending.set({ ...request, resolve }),
    );
  }

  answer(ok: boolean): void {
    const current = this.pending();
    if (!current) return;
    this.pending.set(null);
    current.resolve(ok);
  }
}
