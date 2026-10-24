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
import { RouterLink } from '@angular/router';
import { ShareService } from '../../core/share.service';
import {
  ApiError,
  LeadPayload,
  NetworkError,
  SimulationApi,
} from '../../core/simulation-api';
import { StepHeader } from '../../shared/layout/step-header';

const PHONE = /^\+?[0-9 ().-]{6,25}$/;

/** Demande de recontact pour un devis (RF-18), avec consentement explicite. */
@Component({
  selector: 'app-lead-page',
  imports: [ReactiveFormsModule, RouterLink, StepHeader],
  template: `
    <div class="flex min-h-dvh flex-col">
      <app-step-header
        title="Être recontacté"
        backLink="/recapitulatif"
        backLabel="Retour à la liste du matériel"
      />
      <main
        class="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 py-6"
      >
        @if (sent()) {
          <section class="card flex flex-col gap-3 p-4" role="status">
            <h1 class="m-0 text-h2">Demande envoyée</h1>
            <p class="m-0 text-body text-ink-2">
              Merci&#160;! Un installateur vous rappelle avec votre liste de
              matériel.
            </p>
            <a routerLink="/recapitulatif" class="btn-secondary"
              >Revenir à ma simulation</a
            >
          </section>
        } @else {
          <h1 class="m-0 text-h1">Besoin d'un devis&#160;?</h1>
          <p class="m-0 text-lead text-muted">
            Laissez vos coordonnées&#160;: un installateur vous rappelle avec
            votre simulation.
          </p>
          <form
            class="flex flex-col gap-4"
            [formGroup]="form"
            (ngSubmit)="submit()"
            novalidate
          >
            <label class="flex flex-col gap-1.5">
              <span class="text-small font-medium">Nom *</span>
              <input
                class="field"
                formControlName="name"
                autocomplete="name"
                required
                [attr.aria-invalid]="invalid('name')"
                aria-describedby="name-error"
              />
              @if (invalid('name')) {
                <span id="name-error" class="text-caption text-crit-ink"
                  >Indiquez votre nom.</span
                >
              }
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="text-small font-medium">Téléphone *</span>
              <input
                class="field"
                type="tel"
                inputmode="tel"
                formControlName="phone"
                autocomplete="tel"
                required
                placeholder="+237 6 00 00 00 00"
                [attr.aria-invalid]="invalid('phone')"
                aria-describedby="phone-error"
              />
              @if (invalid('phone')) {
                <span id="phone-error" class="text-caption text-crit-ink"
                  >Le numéro de téléphone est invalide.</span
                >
              }
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="text-small font-medium">E-mail (facultatif)</span>
              <input
                class="field"
                type="email"
                formControlName="email"
                autocomplete="email"
                [attr.aria-invalid]="invalid('email')"
              />
              @if (invalid('email')) {
                <span class="text-caption text-crit-ink"
                  >L'adresse e-mail est invalide.</span
                >
              }
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="text-small font-medium">Ville (facultatif)</span>
              <input
                class="field"
                formControlName="city"
                autocomplete="address-level2"
              />
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="text-small font-medium">Message (facultatif)</span>
              <textarea
                class="field min-h-24"
                formControlName="message"
                maxlength="2000"
              ></textarea>
            </label>
            <label class="flex min-h-11 items-start gap-3">
              <input
                type="checkbox"
                class="mt-1 size-5 shrink-0 accent-action"
                formControlName="consent"
                [attr.aria-invalid]="invalid('consent')"
              />
              <span class="text-small text-ink-2"
                >J'accepte que mes coordonnées et ma simulation soient
                transmises à un installateur pour être recontacté. Elles ne
                servent à rien d'autre.</span
              >
            </label>
            @if (invalid('consent')) {
              <span class="text-caption text-crit-ink"
                >Votre consentement est nécessaire pour être recontacté.</span
              >
            }
            @if (error()) {
              <p
                role="alert"
                class="m-0 rounded-lg bg-crit-soft px-3.5 py-3 text-small text-crit-ink"
              >
                {{ error() }}
              </p>
            }
            <button type="submit" class="btn-primary" [disabled]="sending()">
              {{ sending() ? 'Envoi…' : 'Envoyer ma demande' }}
            </button>
          </form>
        }
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeadPage {
  private readonly api = inject(SimulationApi);
  private readonly share = inject(ShareService);
  protected readonly sending = signal(false);
  protected readonly sent = signal(false);
  protected readonly error = signal('');
  private readonly submitted = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.pattern(PHONE)]],
    email: ['', [Validators.email]],
    city: [''],
    message: [''],
    consent: [false, [Validators.requiredTrue]],
  });

  protected invalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted());
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.error.set('');
    if (this.form.invalid) return;
    this.sending.set(true);
    try {
      const v = this.form.getRawValue();
      const lead: LeadPayload = {
        name: v.name.trim(),
        phone: v.phone.trim(),
        consent: true,
        ...(v.email.trim() ? { email: v.email.trim() } : {}),
        ...(v.city.trim() ? { city: v.city.trim() } : {}),
        ...(v.message.trim() ? { message: v.message.trim() } : {}),
      };
      const token = await this.saveSimulation();
      await this.api.sendLead(token ? { ...lead, shareToken: token } : lead);
      this.sent.set(true);
    } catch (e) {
      this.error.set(
        e instanceof NetworkError
          ? 'Pas de connexion : réessayez dès que vous serez en ligne.'
          : e instanceof ApiError
            ? e.message
            : 'L’envoi a échoué. Réessayez.',
      );
    } finally {
      this.sending.set(false);
    }
  }

  /** Joint la simulation si possible ; la demande part même sans elle. */
  private async saveSimulation(): Promise<string | undefined> {
    if (!this.share.currentPayload()) return undefined;
    try {
      return await this.share.save();
    } catch {
      return undefined;
    }
  }
}
