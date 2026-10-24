import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminAuthService } from '../core/admin-auth.service';
import { toApiError } from '../core/api-error';
import { Icon } from '../ui/icon';
import { FormMessage } from '../ui/state';
import { fieldError } from '../ui/validators';

/** Connexion au back-office (`/admin/login`). */
@Component({
  selector: 'app-admin-login-page',
  imports: [ReactiveFormsModule, Icon, FormMessage],
  template: `
    <main
      class="flex min-h-screen items-center justify-center bg-bg px-4 py-10 text-ink"
    >
      <div class="w-full max-w-sm">
        <div class="mb-6 flex items-center gap-2.5">
          <span
            class="flex size-8 items-center justify-center rounded-sm bg-solar text-ink"
          >
            <app-admin-icon name="sun" [size]="20" [stroke]="1.75" />
          </span>
          <span class="flex flex-col">
            <span class="text-[15px] leading-5 font-semibold"
              >Simulateur solaire</span
            >
            <span
              class="font-mono text-[11px] leading-[14px] tracking-[0.04em] text-muted"
              >BACK-OFFICE</span
            >
          </span>
        </div>
        <form
          class="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6"
          [formGroup]="form"
          (ngSubmit)="submit()"
          novalidate
        >
          <h1 class="text-h1">Connexion</h1>
          @if (expired()) {
            <app-form-message
              kind="error"
              message="Votre session a expiré. Reconnectez-vous."
            />
          }
          <app-form-message [message]="error()" />
          @if (locked()) {
            <p class="text-[13px] leading-[18px] text-ink-2">
              Après 5 essais infructueux, le compte est verrouillé pendant 15
              minutes. Réessayez plus tard ou demandez à un administrateur de
              réinitialiser votre mot de passe.
            </p>
          }
          <label class="flex flex-col gap-1.5 text-small">
            <span class="font-semibold">Adresse e-mail</span>
            <input
              type="email"
              formControlName="email"
              autocomplete="username"
              class="h-11 rounded-md border border-line-strong bg-surface px-3 text-[15px]"
              [attr.aria-invalid]="!!emailError()"
              aria-describedby="email-error"
            />
            <span
              id="email-error"
              class="text-[12px] leading-4 text-crit-ink"
              >{{ emailError() }}</span
            >
          </label>
          <label class="flex flex-col gap-1.5 text-small">
            <span class="font-semibold">Mot de passe</span>
            <input
              type="password"
              formControlName="password"
              autocomplete="current-password"
              class="h-11 rounded-md border border-line-strong bg-surface px-3 text-[15px]"
              [attr.aria-invalid]="!!passwordError()"
              aria-describedby="password-error"
            />
            <span
              id="password-error"
              class="text-[12px] leading-4 text-crit-ink"
              >{{ passwordError() }}</span
            >
          </label>
          <button
            type="submit"
            class="h-11 rounded-md bg-action text-[15px] font-semibold text-white disabled:opacity-60"
            [disabled]="busy()"
          >
            {{ busy() ? 'Connexion…' : 'Se connecter' }}
          </button>
        </form>
      </div>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: [
      '',
      [Validators.required, Validators.email, Validators.maxLength(254)],
    ],
    password: ['', [Validators.required, Validators.maxLength(128)]],
  });
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly locked = signal(false);
  protected readonly expired = signal(
    this.route.snapshot.queryParamMap.get('expired') === '1',
  );
  protected readonly emailError = signal<string | null>(null);
  protected readonly passwordError = signal<string | null>(null);

  protected submit(): void {
    this.form.markAllAsTouched();
    this.emailError.set(fieldError(this.form.controls.email));
    this.passwordError.set(fieldError(this.form.controls.password));
    if (this.form.invalid || this.busy()) return;
    const { email, password } = this.form.getRawValue();
    this.busy.set(true);
    this.error.set(null);
    this.locked.set(false);
    this.expired.set(false);
    this.auth.login(email, password).subscribe({
      next: () => {
        this.busy.set(false);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const target =
          returnUrl &&
          returnUrl.startsWith('/admin') &&
          !returnUrl.startsWith('/admin/login')
            ? returnUrl
            : '/admin';
        void this.router.navigateByUrl(target);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        const apiError = toApiError(err);
        this.locked.set(apiError.code === 'ACCOUNT_LOCKED');
        this.error.set(apiError.message);
        this.form.controls.password.reset();
      },
    });
  }
}
