import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AdminApiService } from '../core/admin-api.service';
import { AdminAuthService } from '../core/admin-auth.service';
import { applyServerError, errorMessage } from '../core/api-error';
import { ConfirmService } from '../core/confirm.service';
import { Loader } from '../core/loader';
import { AdminAccountRow, AdminRole } from '../core/models';
import { formatDateTime } from '../ui/format';
import { Icon } from '../ui/icon';
import { PageHeader, UI } from '../ui/page-header';
import { FormMessage, ListState, Switch } from '../ui/state';
import { fieldError } from '../ui/validators';

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{10,128}$/;
const ROLE_LABEL: Record<AdminRole, string> = {
  ADMIN: 'Administrateur',
  EDITEUR: 'Éditeur du catalogue',
};

/** Comptes administrateurs et éditeurs (RF-22, ADMIN seulement). */
@Component({
  selector: 'app-users-page',
  imports: [
    ReactiveFormsModule,
    PageHeader,
    Icon,
    Switch,
    ListState,
    FormMessage,
  ],
  template: `
    <app-page-header
      title="Comptes"
      subtitle="L'administrateur gère tout ; l'éditeur ne gère que les catégories et les appareils."
    >
      <button type="button" [class]="ui.primary" (click)="openNew()">
        <app-admin-icon name="plus" [stroke]="2" />
        Ajouter un compte
      </button>
    </app-page-header>
    <app-form-message [message]="actionError()" />

    <div class="flex flex-wrap items-start gap-5">
      <div [class]="ui.card + ' min-w-0 grow-[999] basis-[520px]'">
        <table class="w-full min-w-[640px] border-collapse text-small">
          <thead>
            <tr>
              <th scope="col" [class]="ui.th">E-mail</th>
              <th scope="col" [class]="ui.th">Rôle</th>
              <th scope="col" [class]="ui.th">Dernière connexion</th>
              <th scope="col" [class]="ui.th">Actif</th>
              <th scope="col" [class]="ui.th">
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            @for (user of users(); track user.id) {
              <tr
                [class]="
                  selectedId() === user.id
                    ? 'bg-solar-soft'
                    : user.active
                      ? 'bg-white'
                      : 'bg-[#FAFAF7] text-muted'
                "
              >
                <td [class]="ui.td + ' font-medium'">
                  {{ user.email }}
                  @if (user.id === me()?.id) {
                    <span class="ml-1 text-[12px] text-muted">(vous)</span>
                  }
                  @if (isLocked(user)) {
                    <span
                      class="ml-1 rounded-sm bg-warn-soft px-1.5 py-0.5 text-[12px] font-semibold text-warn-ink"
                      >Verrouillé</span
                    >
                  }
                </td>
                <td [class]="ui.td">{{ roleLabel[user.role] }}</td>
                <td [class]="ui.td">{{ date(user.lastLoginAt) }}</td>
                <td [class]="ui.td">
                  <app-switch
                    [checked]="user.active"
                    [label]="'Actif : ' + user.email"
                    [disabled]="user.id === me()?.id"
                    (switched)="toggleActive(user)"
                  />
                </td>
                <td [class]="ui.td">
                  <button
                    type="button"
                    [class]="ui.ghostIcon"
                    [attr.aria-label]="'Modifier : ' + user.email"
                    (click)="edit(user)"
                  >
                    <app-admin-icon name="pencil" />
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
        <app-list-state
          [loading]="loader.loading()"
          [error]="loader.error()"
          [empty]="!loader.loading() && users().length === 0"
          emptyText="Aucun compte."
          (retry)="loader.load()"
        />
      </div>

      @if (panelOpen()) {
        <aside
          class="flex max-w-[400px] grow basis-[320px] flex-col rounded-xl border border-line bg-surface"
          [attr.aria-label]="
            selected() ? 'Modifier le compte' : 'Ajouter un compte'
          "
        >
          <div
            class="flex items-start justify-between gap-2 border-b border-[#ECECE6] pt-4 pr-3 pb-3 pl-[18px]"
          >
            <div class="flex flex-col">
              <span class="font-mono text-[11px] tracking-[0.04em] text-muted">
                {{ selected() ? 'MODIFIER LE COMPTE' : 'NOUVEAU COMPTE' }}
              </span>
              <h2 class="text-[17px] leading-[22px] font-semibold">
                {{ selected()?.email ?? 'Ajouter un compte' }}
              </h2>
            </div>
            <button
              type="button"
              [class]="ui.ghostIcon"
              aria-label="Fermer"
              (click)="close()"
            >
              <app-admin-icon name="close" [size]="20" [stroke]="1.75" />
            </button>
          </div>
          <form
            class="flex flex-col gap-4 px-[18px] py-4 text-small"
            [formGroup]="form"
            (ngSubmit)="save()"
            novalidate
          >
            @if (!selected()) {
              <label [class]="ui.fieldLabel">
                <span class="font-semibold">Adresse e-mail</span>
                <input
                  type="email"
                  formControlName="email"
                  autocomplete="off"
                  [class]="ui.input"
                  [attr.aria-invalid]="!!err(form.controls.email)"
                />
                <span [class]="ui.error">{{ err(form.controls.email) }}</span>
              </label>
            }
            <label [class]="ui.fieldLabel">
              <span class="font-semibold">Rôle</span>
              <select formControlName="role" [class]="ui.input">
                <option value="EDITEUR">{{ roleLabel.EDITEUR }}</option>
                <option value="ADMIN">{{ roleLabel.ADMIN }}</option>
              </select>
              @if (selected()?.id === me()?.id) {
                <span class="text-[12px] leading-4 text-muted"
                  >Vous ne pouvez pas modifier votre propre rôle.</span
                >
              }
            </label>
            <label [class]="ui.fieldLabel">
              <span class="font-semibold">{{
                selected()
                  ? 'Nouveau mot de passe (facultatif)'
                  : 'Mot de passe'
              }}</span>
              <input
                type="password"
                formControlName="password"
                autocomplete="new-password"
                [class]="ui.input"
                [attr.aria-invalid]="!!err(form.controls.password)"
                aria-describedby="password-help"
              />
              <span id="password-help" class="text-[12px] leading-4 text-muted">
                10 caractères au moins, dont une lettre et un chiffre.
                @if (selected()) {
                  Le changer déconnecte le compte et lève un verrouillage.
                }
              </span>
              <span [class]="ui.error">{{ err(form.controls.password) }}</span>
            </label>
            <app-form-message [message]="formError()" />
            <app-form-message kind="success" [message]="success()" />
            <div class="flex gap-2">
              <button
                type="button"
                [class]="ui.secondary + ' flex-1'"
                (click)="close()"
              >
                Annuler
              </button>
              <button
                type="submit"
                [class]="ui.primary + ' flex-1'"
                [disabled]="busy()"
              >
                {{ busy() ? 'Enregistrement…' : 'Enregistrer' }}
              </button>
            </div>
          </form>
        </aside>
      }
    </div>
  `,
  host: { class: 'flex flex-col gap-5' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersPage {
  private readonly api = inject(AdminApiService);
  private readonly confirm = inject(ConfirmService);
  protected readonly me = inject(AdminAuthService).user;
  protected readonly ui = UI;
  protected readonly err = fieldError;
  protected readonly date = formatDateTime;
  protected readonly roleLabel = ROLE_LABEL;

  protected readonly loader = new Loader(() =>
    this.api.list<AdminAccountRow[]>('users'),
  );
  protected readonly users = linkedSignal(() => this.loader.data() ?? []);
  protected readonly panelOpen = signal(false);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly selected = computed(
    () => this.users().find((u) => u.id === this.selectedId()) ?? null,
  );
  protected readonly busy = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: [
      '',
      [Validators.required, Validators.email, Validators.maxLength(254)],
    ],
    role: ['EDITEUR' as AdminRole, Validators.required],
    password: ['', [Validators.pattern(PASSWORD_PATTERN)]],
  });

  constructor() {
    this.loader.load();
  }

  protected isLocked(user: AdminAccountRow): boolean {
    return (
      !!user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()
    );
  }

  protected openNew(): void {
    this.selectedId.set(null);
    this.form.reset({ email: '', role: 'EDITEUR', password: '' });
    this.form.controls.email.enable();
    this.form.controls.role.enable();
    this.form.controls.password.setValidators([
      Validators.required,
      Validators.pattern(PASSWORD_PATTERN),
    ]);
    this.form.controls.password.updateValueAndValidity();
    this.formError.set(null);
    this.success.set(null);
    this.panelOpen.set(true);
  }

  protected edit(user: AdminAccountRow): void {
    this.selectedId.set(user.id);
    this.form.reset({ email: user.email, role: user.role, password: '' });
    this.form.controls.email.disable();
    if (user.id === this.me()?.id) this.form.controls.role.disable();
    else this.form.controls.role.enable();
    this.form.controls.password.setValidators([
      Validators.pattern(PASSWORD_PATTERN),
    ]);
    this.form.controls.password.updateValueAndValidity();
    this.formError.set(null);
    this.success.set(null);
    this.panelOpen.set(true);
  }

  protected close(): void {
    this.panelOpen.set(false);
    this.selectedId.set(null);
  }

  protected save(): void {
    this.form.markAllAsTouched();
    this.success.set(null);
    if (this.form.invalid) {
      this.formError.set('Corrigez les champs signalés.');
      return;
    }
    if (this.busy()) return;
    const { email, role, password } = this.form.getRawValue();
    const current = this.selected();
    let body: Record<string, unknown>;
    if (current) {
      body = {};
      if (role !== current.role && current.id !== this.me()?.id)
        body['role'] = role;
      if (password) body['password'] = password;
      if (Object.keys(body).length === 0) {
        this.formError.set('Aucune modification à enregistrer.');
        return;
      }
    } else {
      body = { email: email.trim(), role, password };
    }
    this.busy.set(true);
    this.formError.set(null);
    const request = current
      ? this.api.update<AdminAccountRow>(`users/${current.id}`, body)
      : this.api.create<AdminAccountRow>('users', body);
    request.subscribe({
      next: (row) => {
        this.busy.set(false);
        this.upsert(row);
        // Après création, le panneau passe en mode modification du nouveau compte.
        this.edit(row);
        this.success.set(current ? 'Compte mis à jour.' : 'Compte créé.');
      },
      error: (error: unknown) => {
        this.busy.set(false);
        applyServerError(this.form, error);
        this.formError.set(errorMessage(error));
      },
    });
  }

  protected async toggleActive(user: AdminAccountRow): Promise<void> {
    const activate = !user.active;
    const ok = await this.confirm.ask(
      activate
        ? {
            title: `Réactiver ${user.email} ?`,
            message: 'Le compte pourra de nouveau se connecter.',
            confirmLabel: 'Réactiver',
          }
        : {
            title: `Désactiver ${user.email} ?`,
            message:
              'Le compte ne pourra plus se connecter et ses sessions en cours sont fermées.',
            confirmLabel: 'Désactiver',
            danger: true,
          },
    );
    if (!ok) return;
    this.actionError.set(null);
    this.api
      .update<AdminAccountRow>(`users/${user.id}`, { active: activate })
      .subscribe({
        next: (row) => this.upsert(row),
        error: (error: unknown) => this.actionError.set(errorMessage(error)),
      });
  }

  private upsert(row: AdminAccountRow): void {
    this.users.update((list) =>
      list.some((u) => u.id === row.id)
        ? list.map((u) => (u.id === row.id ? row : u))
        : [...list, row],
    );
  }
}
