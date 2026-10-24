import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { AdminApiService } from '../core/admin-api.service';
import { AdminAuthService } from '../core/admin-auth.service';
import { applyServerError, errorMessage } from '../core/api-error';
import {
  AuditLogItem,
  DeviceCategoryRow,
  DeviceRow,
  Page,
} from '../core/models';
import { formatDateTime, formatNumber, parseDecimal } from '../ui/format';
import { Icon } from '../ui/icon';
import { MediaUpload } from '../ui/media-upload';
import { UI } from '../ui/page-header';
import { FormMessage, Switch } from '../ui/state';
import { decimalRange, fieldError } from '../ui/validators';

/** Corps envoyé à `POST/PATCH /admin/devices`. */
export interface DevicePayload {
  name: string;
  categoryId: string;
  iconUrl: string | null;
  imageUrl: string | null;
  powerMinW: number;
  powerTypW: number;
  powerMaxW: number;
  defaultHoursPerDay: number;
  dutyCycle: number;
  surgeFactor: number;
  sortOrder: number;
  active: boolean;
}

/** min ≤ typique ≤ max (typique vide = moyenne de min et max). */
function powerOrder(group: AbstractControl): ValidationErrors | null {
  const min = parseDecimal(group.get('powerMinW')?.value);
  const max = parseDecimal(group.get('powerMaxW')?.value);
  const typ = parseDecimal(group.get('powerTypW')?.value);
  if (min === null || max === null) return null;
  if (min > max) return { powerOrder: true };
  if (typ !== null && (typ < min || typ > max)) return { powerOrder: true };
  return null;
}

/** Panneau latéral d'ajout / modification d'un appareil (maquette AdminCatalogue). */
@Component({
  selector: 'app-device-form',
  imports: [ReactiveFormsModule, Icon, MediaUpload, Switch, FormMessage],
  template: `
    <aside
      class="flex max-w-[400px] grow basis-[340px] flex-col rounded-xl border border-line bg-surface"
      [attr.aria-label]="panelLabel()"
    >
      <div
        class="flex items-start justify-between gap-2 border-b border-[#ECECE6] pt-4 pr-3 pb-3 pl-[18px]"
      >
        <div class="flex flex-col">
          <span
            class="font-mono text-[11px] leading-[14px] tracking-[0.04em] text-muted"
          >
            {{ device() ? "MODIFIER L'APPAREIL" : 'NOUVEL APPAREIL' }}
          </span>
          <h2 class="text-[17px] leading-[22px] font-semibold">
            {{ device()?.name || 'Ajouter un appareil' }}
          </h2>
        </div>
        <button
          type="button"
          [class]="ui.ghostIcon"
          aria-label="Fermer"
          (click)="closed.emit()"
        >
          <app-icon name="close" [size]="20" [stroke]="1.75" />
        </button>
      </div>

      <form
        class="flex flex-1 flex-col"
        [formGroup]="form"
        (ngSubmit)="save()"
        novalidate
      >
        <div class="flex flex-col gap-4 px-[18px] py-4 text-small">
          <label [class]="ui.fieldLabel">
            <span class="font-semibold">Nom</span>
            <input
              formControlName="name"
              [class]="ui.input"
              [attr.aria-invalid]="!!err(form.controls.name)"
              aria-describedby="device-name-error"
            />
            <span id="device-name-error" [class]="ui.error">{{
              err(form.controls.name)
            }}</span>
          </label>

          <label [class]="ui.fieldLabel">
            <span class="font-semibold">Catégorie</span>
            <select
              formControlName="categoryId"
              [class]="ui.input"
              [attr.aria-invalid]="!!err(form.controls.categoryId)"
              aria-describedby="device-category-error"
            >
              <option value="" disabled>Choisir…</option>
              @for (category of categories(); track category.id) {
                <option [value]="category.id">{{ category.name }}</option>
              }
            </select>
            <span id="device-category-error" [class]="ui.error">{{
              err(form.controls.categoryId)
            }}</span>
          </label>

          <div class="grid grid-cols-2 gap-3">
            <app-media-upload
              kind="icon"
              label="Icône"
              [url]="form.controls.iconUrl.value"
              (changed)="setMedia('iconUrl', $event)"
            />
            <app-media-upload
              kind="image"
              label="Image réaliste"
              [url]="form.controls.imageUrl.value"
              (changed)="setMedia('imageUrl', $event)"
            />
          </div>

          <fieldset
            class="flex flex-col gap-1.5"
            aria-describedby="device-power-help device-power-error"
          >
            <legend class="mb-1.5 font-semibold">Puissance (W)</legend>
            <div class="grid grid-cols-3 gap-2">
              @for (field of powerFields; track field.key) {
                <label class="flex flex-col gap-1">
                  <span class="font-mono text-[11px] text-muted">{{
                    field.label
                  }}</span>
                  <input
                    [formControlName]="field.key"
                    inputmode="decimal"
                    [class]="ui.numInput"
                    [placeholder]="
                      field.key === 'powerTypW' ? typPlaceholder() : ''
                    "
                    [attr.aria-invalid]="
                      !!err(form.controls[field.key]) || hasPowerOrderError()
                    "
                  />
                </label>
              }
            </div>
            <span
              id="device-power-help"
              class="text-[12px] leading-4 text-muted"
            >
              Typique vide : moyenne de min et max.
            </span>
            <span id="device-power-error" [class]="ui.error">{{
              powerError()
            }}</span>
          </fieldset>

          <div class="grid grid-cols-3 gap-2">
            @for (field of usageFields; track field.key) {
              <label class="flex flex-col gap-1.5">
                <span class="text-[13px] font-semibold">{{ field.label }}</span>
                <input
                  [formControlName]="field.key"
                  inputmode="decimal"
                  [class]="ui.numInput"
                  [attr.aria-invalid]="!!err(form.controls[field.key])"
                  [attr.aria-describedby]="'device-' + field.key + '-error'"
                />
                <span
                  [id]="'device-' + field.key + '-error'"
                  [class]="ui.error"
                >
                  {{ err(form.controls[field.key]) }}
                </span>
              </label>
            }
          </div>

          <div
            class="flex items-center justify-between gap-3 rounded-md bg-bg px-3 py-2.5"
          >
            <div class="flex flex-col">
              <span class="font-semibold">Actif</span>
              <span class="text-[12px] leading-4 text-muted">
                Désactivé, il disparaît des listes mais reste lisible dans les
                anciennes simulations.
              </span>
            </div>
            <app-switch
              label="Appareil actif"
              [checked]="form.controls.active.value"
              (switched)="
                form.controls.active.setValue(!form.controls.active.value);
                form.markAsDirty()
              "
            />
          </div>

          <app-form-message [message]="error()" />
          <app-form-message kind="success" [message]="success()" />
        </div>

        <div
          class="mt-auto flex flex-col gap-2.5 border-t border-[#ECECE6] px-[18px] pt-3 pb-4"
        >
          @if (lastChange(); as change) {
            <p class="text-[12px] leading-4 text-muted">
              Dernière modification : {{ change }}
            </p>
          }
          <div class="flex gap-2">
            <button
              type="button"
              [class]="ui.secondary + ' flex-1'"
              (click)="closed.emit()"
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
        </div>
      </form>
    </aside>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceForm {
  private readonly api = inject(AdminApiService);
  private readonly auth = inject(AdminAuthService);

  readonly device = input<DeviceRow | null>(null);
  readonly categories = input<DeviceCategoryRow[]>([]);
  /** Catégorie présélectionnée pour un nouvel appareil (filtre courant). */
  readonly defaultCategoryId = input<string>('');
  readonly saved = output<DeviceRow>();
  readonly closed = output<void>();

  protected readonly ui = UI;
  protected readonly err = fieldError;
  protected readonly powerFields = [
    { key: 'powerMinW', label: 'MIN' },
    { key: 'powerTypW', label: 'TYPIQUE' },
    { key: 'powerMaxW', label: 'MAX' },
  ] as const;
  protected readonly usageFields = [
    { key: 'defaultHoursPerDay', label: 'Heures / jour' },
    { key: 'dutyCycle', label: 'Taux' },
    { key: 'surgeFactor', label: 'Démarrage k' },
    { key: 'sortOrder', label: 'Ordre' },
  ] as const;

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      name: ['', [Validators.required, Validators.maxLength(120)]],
      categoryId: ['', Validators.required],
      iconUrl: [null as string | null],
      imageUrl: [null as string | null],
      powerMinW: ['', [Validators.required, decimalRange(0, 1_000_000)]],
      powerTypW: ['', decimalRange(0, 1_000_000)],
      powerMaxW: ['', [Validators.required, decimalRange(0, 1_000_000)]],
      defaultHoursPerDay: ['', [Validators.required, decimalRange(0, 24)]],
      dutyCycle: ['1', [Validators.required, decimalRange(0, 1)]],
      surgeFactor: ['1', [Validators.required, decimalRange(1, 10)]],
      sortOrder: ['0', [Validators.required, decimalRange(0, 100_000, true)]],
      active: [true],
    },
    { validators: powerOrder },
  );

  protected readonly panelLabel = computed(() =>
    this.device() ? "Modifier l'appareil" : 'Ajouter un appareil',
  );
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);
  protected readonly lastChange = signal<string | null>(null);
  /** Valeurs min/max saisies, pour l'indication « typique » calculée. */
  private readonly powerInputs = signal<{ min: unknown; max: unknown }>({
    min: '',
    max: '',
  });
  protected readonly typPlaceholder = computed(() => {
    const min = parseDecimal(this.powerInputs().min);
    const max = parseDecimal(this.powerInputs().max);
    return min !== null && max !== null ? formatNumber((min + max) / 2) : '';
  });

  constructor() {
    this.form.valueChanges.subscribe((value) =>
      this.powerInputs.set({ min: value.powerMinW, max: value.powerMaxW }),
    );
    effect(() => {
      const device = this.device();
      const defaultCategory = this.defaultCategoryId();
      untracked(() => this.reset(device, defaultCategory));
    });
  }

  protected hasPowerOrderError(): boolean {
    return (
      this.form.hasError('powerOrder') && this.form.controls.powerMaxW.touched
    );
  }

  protected powerError(): string | null {
    for (const key of ['powerMinW', 'powerTypW', 'powerMaxW'] as const) {
      const message = fieldError(this.form.controls[key]);
      if (message) return message;
    }
    return this.hasPowerOrderError() ? 'Il faut min ≤ typique ≤ max.' : null;
  }

  protected setMedia(key: 'iconUrl' | 'imageUrl', url: string | null): void {
    this.form.controls[key].setValue(url);
    this.form.markAsDirty();
  }

  /** Corps de requête typé à partir du formulaire valide. */
  payload(): DevicePayload {
    const raw = this.form.getRawValue();
    const min = parseDecimal(raw.powerMinW) ?? 0;
    const max = parseDecimal(raw.powerMaxW) ?? 0;
    return {
      name: raw.name.trim(),
      categoryId: raw.categoryId,
      iconUrl: raw.iconUrl,
      imageUrl: raw.imageUrl,
      powerMinW: min,
      powerTypW:
        parseDecimal(raw.powerTypW) ??
        Math.round(((min + max) / 2) * 100) / 100,
      powerMaxW: max,
      defaultHoursPerDay: parseDecimal(raw.defaultHoursPerDay) ?? 0,
      dutyCycle: parseDecimal(raw.dutyCycle) ?? 1,
      surgeFactor: parseDecimal(raw.surgeFactor) ?? 1,
      sortOrder: parseDecimal(raw.sortOrder) ?? 0,
      active: raw.active,
    };
  }

  protected save(): void {
    this.form.markAllAsTouched();
    this.success.set(null);
    if (this.form.invalid) {
      this.error.set('Corrigez les champs signalés.');
      return;
    }
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set(null);
    const current = this.device();
    const request = current
      ? this.api.update<DeviceRow>(`devices/${current.id}`, this.payload())
      : this.api.create<DeviceRow>('devices', this.payload());
    request.subscribe({
      next: (row) => {
        this.busy.set(false);
        this.form.markAsPristine();
        this.success.set(
          current ? 'Modifications enregistrées.' : 'Appareil ajouté.',
        );
        this.saved.emit(row);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        applyServerError(this.form, err);
        this.error.set(errorMessage(err));
      },
    });
  }

  private reset(device: DeviceRow | null, defaultCategory: string): void {
    this.error.set(null);
    this.lastChange.set(null);
    if (!device) {
      this.success.set(null);
      this.form.reset({
        name: '',
        categoryId: defaultCategory,
        iconUrl: null,
        imageUrl: null,
        powerMinW: '',
        powerTypW: '',
        powerMaxW: '',
        defaultHoursPerDay: '',
        dutyCycle: '1',
        surgeFactor: '1',
        sortOrder: '0',
        active: true,
      });
      return;
    }
    const text = (value: number) => String(value).replace('.', ',');
    this.form.reset({
      name: device.name,
      categoryId: device.categoryId,
      iconUrl: device.iconUrl,
      imageUrl: device.imageUrl,
      powerMinW: text(device.powerMinW),
      powerTypW: text(device.powerTypW),
      powerMaxW: text(device.powerMaxW),
      defaultHoursPerDay: text(device.defaultHoursPerDay),
      dutyCycle: text(device.dutyCycle),
      surgeFactor: text(device.surgeFactor),
      sortOrder: String(device.sortOrder),
      active: device.active,
    });
    if (this.auth.isAdmin()) this.loadLastChange(device.id);
  }

  private loadLastChange(id: string): void {
    this.api
      .list<Page<AuditLogItem>>('audit-log', {
        entity: 'device',
        entityId: id,
        pageSize: 1,
      })
      .subscribe({
        next: (page) => {
          const item = page.items[0];
          if (item && this.device()?.id === id) {
            this.lastChange.set(
              `${item.adminUser?.email ?? 'inconnu'} · ${formatDateTime(item.createdAt)}`,
            );
          }
        },
        error: () => undefined,
      });
  }
}
