import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
  untracked,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { AdminApiService } from '../core/admin-api.service';
import { applyServerError, errorMessage } from '../core/api-error';
import { ConfirmService } from '../core/confirm.service';
import { Loader } from '../core/loader';
import { parseDecimal } from '../ui/format';
import { Icon } from '../ui/icon';
import { MediaUpload } from '../ui/media-upload';
import { UI } from '../ui/page-header';
import { FormMessage, ListState, Switch } from '../ui/state';
import { decimalRange, fieldError } from '../ui/validators';

export interface Option {
  value: string | number;
  label: string;
}

export interface FieldDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'voltages' | 'icon';
  unit?: string;
  required?: boolean;
  min?: number;
  max?: number;
  integer?: boolean;
  maxLength?: number;
  pattern?: RegExp;
  help?: string;
  /** Champ vide envoyé comme `null` (sinon omis). */
  nullable?: boolean;
  options?: Option[];
  /** Pleine largeur dans le formulaire. */
  wide?: boolean;
}

export interface ColumnDef<T> {
  label: string;
  value: (row: T) => string;
  numeric?: boolean;
}

export interface ResourceRow {
  id: string;
  active?: boolean;
}

export interface ResourceConfig<T extends ResourceRow> {
  /** Chemin sous `/api/v1/admin/`. */
  path: string;
  /** Libellés : « Ajouter un panneau », « Modifier le panneau ». */
  addLabel: string;
  editLabel: string;
  rowLabel: (row: T) => string;
  columns: ColumnDef<T>[];
  fields: FieldDef[];
  emptyText: string;
  /** Interrupteur actif / inactif (PATCH `{ active }`). */
  toggleActive?: boolean;
  /** Suppression réelle (catégories vides). */
  deletable?: boolean;
  sort?: (a: T, b: T) => number;
}

type AnyForm = FormGroup<Record<string, FormControl<unknown>>>;

/**
 * Liste + panneau d'édition générique piloté par une configuration, pour les
 * données de référence simples (catégories, pays, régions, matériel).
 */
@Component({
  selector: 'app-resource-table',
  imports: [
    ReactiveFormsModule,
    Icon,
    Switch,
    ListState,
    FormMessage,
    MediaUpload,
  ],
  template: `
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <ng-content />
        <button
          type="button"
          [class]="ui.primary + ' ml-auto'"
          (click)="openNew()"
        >
          <app-icon name="plus" [stroke]="2" />
          {{ config().addLabel }}
        </button>
      </div>
      <app-form-message [message]="actionError()" />
      <div class="flex flex-wrap items-start gap-5">
        <div [class]="ui.card + ' min-w-0 grow-[999] basis-[520px]'">
          <table class="w-full border-collapse text-small">
            <thead>
              <tr>
                @for (column of config().columns; track column.label) {
                  <th
                    scope="col"
                    [class]="ui.th"
                    [class.text-right]="column.numeric"
                  >
                    {{ column.label }}
                  </th>
                }
                @if (config().toggleActive) {
                  <th scope="col" [class]="ui.th">Actif</th>
                }
                <th scope="col" [class]="ui.th">
                  <span class="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track row.id) {
                <tr
                  [class]="
                    selectedId() === row.id
                      ? 'bg-solar-soft'
                      : row.active === false
                        ? 'bg-[#FAFAF7] text-muted'
                        : 'bg-white'
                  "
                >
                  @for (column of config().columns; track column.label) {
                    <td
                      [class]="ui.td"
                      [class.text-right]="column.numeric"
                      [class.font-mono]="column.numeric"
                      [class.whitespace-nowrap]="column.numeric"
                    >
                      {{ column.value(row) }}
                    </td>
                  }
                  @if (config().toggleActive) {
                    <td [class]="ui.td">
                      <app-switch
                        [checked]="row.active !== false"
                        [label]="'Actif : ' + config().rowLabel(row)"
                        (switched)="toggle(row)"
                      />
                    </td>
                  }
                  <td [class]="ui.td + ' whitespace-nowrap'">
                    <button
                      type="button"
                      [class]="ui.ghostIcon"
                      [attr.aria-label]="'Modifier : ' + config().rowLabel(row)"
                      (click)="edit(row)"
                    >
                      <app-icon name="pencil" />
                    </button>
                    @if (config().deletable) {
                      <button
                        type="button"
                        [class]="ui.ghostIcon"
                        [attr.aria-label]="
                          'Supprimer : ' + config().rowLabel(row)
                        "
                        (click)="remove(row)"
                      >
                        <app-icon name="trash" />
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
          <app-list-state
            [loading]="loader.loading()"
            [error]="loader.error()"
            [empty]="!loader.loading() && rows().length === 0"
            [emptyText]="config().emptyText"
            (retry)="loader.load()"
          />
        </div>

        @if (panelOpen()) {
          <aside
            class="flex max-w-[400px] grow basis-[320px] flex-col rounded-xl border border-line bg-surface"
            [attr.aria-label]="
              selected() ? config().editLabel : config().addLabel
            "
          >
            <div
              class="flex items-start justify-between gap-2 border-b border-[#ECECE6] pt-4 pr-3 pb-3 pl-[18px]"
            >
              <div class="flex flex-col">
                <span
                  class="font-mono text-[11px] leading-[14px] tracking-[0.04em] text-muted uppercase"
                >
                  {{ selected() ? config().editLabel : config().addLabel }}
                </span>
                <h2 class="text-[17px] leading-[22px] font-semibold">
                  {{ selected() ? config().rowLabel(selected()!) : 'Nouveau' }}
                </h2>
              </div>
              <button
                type="button"
                [class]="ui.ghostIcon"
                aria-label="Fermer"
                (click)="close()"
              >
                <app-icon name="close" [size]="20" [stroke]="1.75" />
              </button>
            </div>
            <form
              class="flex flex-col"
              [formGroup]="form()"
              (ngSubmit)="save()"
              novalidate
            >
              <div
                class="grid grid-cols-2 gap-x-3 gap-y-3 px-[18px] py-4 text-small"
              >
                @for (field of config().fields; track field.key) {
                  @switch (field.type) {
                    @case ('checkbox') {
                      <label
                        class="col-span-2 flex min-h-11 items-center gap-2"
                      >
                        <input
                          type="checkbox"
                          class="size-[18px] accent-ink"
                          [formControlName]="field.key"
                        />
                        <span class="font-semibold">{{ field.label }}</span>
                      </label>
                    }
                    @case ('icon') {
                      <div class="col-span-2">
                        <app-media-upload
                          kind="icon"
                          [label]="field.label"
                          [url]="$any(form().controls[field.key].value)"
                          (changed)="
                            form().controls[field.key].setValue($event);
                            form().markAsDirty()
                          "
                        />
                      </div>
                    }
                    @case ('voltages') {
                      <fieldset class="col-span-2 flex flex-col gap-1">
                        <legend class="mb-1 font-semibold">
                          {{ field.label }}
                        </legend>
                        <div class="flex gap-4">
                          @for (voltage of voltages; track voltage) {
                            <label class="flex min-h-11 items-center gap-2">
                              <input
                                type="checkbox"
                                class="size-[18px] accent-ink"
                                [checked]="hasVoltage(field.key, voltage)"
                                (change)="
                                  setVoltage(
                                    field.key,
                                    voltage,
                                    $any($event.target).checked
                                  )
                                "
                              />
                              {{ voltage }} V
                            </label>
                          }
                        </div>
                        <span [class]="ui.error">{{
                          err(form().controls[field.key])
                        }}</span>
                      </fieldset>
                    }
                    @default {
                      <div
                        [class]="ui.fieldLabel"
                        [class.col-span-2]="
                          field.wide || field.type !== 'number'
                        "
                      >
                        <label
                          class="font-semibold"
                          [for]="uid + '-' + field.key"
                        >
                          {{ field.label }}
                          @if (field.unit) {
                            <span class="font-normal text-muted"
                              >({{ field.unit }})</span
                            >
                          }
                        </label>
                        @if (field.type === 'select') {
                          <select
                            [id]="uid + '-' + field.key"
                            [class]="ui.input"
                            [formControlName]="field.key"
                            [attr.aria-invalid]="
                              !!err(form().controls[field.key])
                            "
                          >
                            <option value="" disabled>Choisir…</option>
                            @for (
                              option of field.options ?? [];
                              track option.value
                            ) {
                              <option [value]="option.value">
                                {{ option.label }}
                              </option>
                            }
                          </select>
                        } @else {
                          <input
                            [id]="uid + '-' + field.key"
                            [class]="
                              field.type === 'number' ? ui.numInput : ui.input
                            "
                            [formControlName]="field.key"
                            [attr.inputmode]="
                              field.type === 'number' ? 'decimal' : null
                            "
                            [attr.aria-invalid]="
                              !!err(form().controls[field.key])
                            "
                          />
                        }
                        @if (field.help) {
                          <span class="text-[12px] leading-4 text-muted">{{
                            field.help
                          }}</span>
                        }
                        <span [class]="ui.error">{{
                          err(form().controls[field.key])
                        }}</span>
                      </div>
                    }
                  }
                }
                <div class="col-span-2 flex flex-col gap-2">
                  <app-form-message [message]="formError()" />
                  <app-form-message kind="success" [message]="success()" />
                </div>
              </div>
              <div
                class="flex gap-2 border-t border-[#ECECE6] px-[18px] pt-3 pb-4"
              >
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
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourceTable<T extends ResourceRow> {
  private readonly api = inject(AdminApiService);
  private readonly confirm = inject(ConfirmService);

  readonly config = input.required<ResourceConfig<T>>();
  /** Filtre local optionnel (ex. régions d'un pays). */
  readonly filter = input<((row: T) => boolean) | null>(null);
  /** Valeurs initiales d'un nouvel élément (ex. pays sélectionné). */
  readonly defaults = input<Record<string, unknown>>({});

  private static nextId = 0;
  /** Préfixe des identifiants de champs (plusieurs tableaux par écran). */
  protected readonly uid = `rt${ResourceTable.nextId++}`;
  protected readonly ui = UI;
  protected readonly err = fieldError;
  protected readonly voltages = [12, 24, 48];

  protected readonly loader = new Loader(() =>
    this.api.list<T[]>(this.config().path),
  );
  private readonly items = linkedSignal(() => this.loader.data() ?? []);
  protected readonly rows = computed(() => {
    const filter = this.filter();
    const rows = filter ? this.items().filter(filter) : [...this.items()];
    const sort = this.config().sort;
    return sort ? rows.sort(sort) : rows;
  });

  protected readonly panelOpen = signal(false);
  protected readonly selectedId = signal<string | null>(null);
  protected readonly selected = computed(
    () => this.items().find((row) => row.id === this.selectedId()) ?? null,
  );
  protected readonly form = computed<AnyForm>(() =>
    buildForm(this.config().fields),
  );
  protected readonly busy = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);

  constructor() {
    effect(() => {
      this.config();
      untracked(() => {
        this.close();
        this.loader.load();
      });
    });
  }

  /** Recharge la liste (appelé par la page après une action externe). */
  reload(): void {
    this.loader.load();
  }

  protected openNew(): void {
    this.selectedId.set(null);
    this.resetForm(null);
    this.panelOpen.set(true);
  }

  protected edit(row: T): void {
    this.selectedId.set(row.id);
    this.resetForm(row);
    this.panelOpen.set(true);
  }

  protected close(): void {
    this.panelOpen.set(false);
    this.selectedId.set(null);
  }

  protected hasVoltage(key: string, voltage: number): boolean {
    const value = this.form().controls[key].value;
    return Array.isArray(value) && value.includes(voltage);
  }

  protected setVoltage(key: string, voltage: number, checked: boolean): void {
    const control = this.form().controls[key];
    const current = Array.isArray(control.value)
      ? (control.value as number[])
      : [];
    const next = checked
      ? [...new Set([...current, voltage])].sort((a, b) => a - b)
      : current.filter((v) => v !== voltage);
    control.setValue(next);
    control.markAsTouched();
    control.markAsDirty();
  }

  protected save(): void {
    const form = this.form();
    form.markAllAsTouched();
    this.success.set(null);
    if (form.invalid) {
      this.formError.set('Corrigez les champs signalés.');
      return;
    }
    if (this.busy()) return;
    this.busy.set(true);
    this.formError.set(null);
    const body = toPayload(this.config().fields, form);
    const current = this.selected();
    const path = this.config().path;
    const request = current
      ? this.api.update<T>(`${path}/${current.id}`, body)
      : this.api.create<T>(path, body);
    request.subscribe({
      next: (row) => {
        this.busy.set(false);
        this.upsert(row);
        this.selectedId.set(row.id);
        form.markAsPristine();
        this.success.set(
          current ? 'Modifications enregistrées.' : 'Élément ajouté.',
        );
      },
      error: (error: unknown) => {
        this.busy.set(false);
        applyServerError(form, error);
        this.formError.set(errorMessage(error));
      },
    });
  }

  protected async toggle(row: T): Promise<void> {
    const label = this.config().rowLabel(row);
    const activate = row.active === false;
    const ok = await this.confirm.ask(
      activate
        ? {
            title: `Réactiver « ${label} » ?`,
            message:
              'Cet élément sera de nouveau proposé par le moteur de calcul.',
            confirmLabel: 'Réactiver',
          }
        : {
            title: `Désactiver « ${label} » ?`,
            message:
              'Le moteur ne le proposera plus ; les anciennes simulations restent lisibles.',
            confirmLabel: 'Désactiver',
            danger: true,
          },
    );
    if (!ok) return;
    this.actionError.set(null);
    this.api
      .update<T>(`${this.config().path}/${row.id}`, { active: activate })
      .subscribe({
        next: (updated) => this.upsert(updated),
        error: (error: unknown) => this.actionError.set(errorMessage(error)),
      });
  }

  protected async remove(row: T): Promise<void> {
    const label = this.config().rowLabel(row);
    const ok = await this.confirm.ask({
      title: `Supprimer « ${label} » ?`,
      message:
        'La suppression est définitive. Elle est refusée si des appareils y sont rattachés.',
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    this.actionError.set(null);
    this.api.remove<void>(`${this.config().path}/${row.id}`).subscribe({
      next: () => {
        this.items.update((list) => list.filter((item) => item.id !== row.id));
        if (this.selectedId() === row.id) this.close();
      },
      error: (error: unknown) => this.actionError.set(errorMessage(error)),
    });
  }

  private upsert(row: T): void {
    this.items.update((list) =>
      list.some((item) => item.id === row.id)
        ? list.map((item) => (item.id === row.id ? { ...item, ...row } : item))
        : [...list, row],
    );
  }

  private resetForm(row: T | null): void {
    this.formError.set(null);
    this.success.set(null);
    const source = (row ?? this.defaults()) as Record<string, unknown>;
    const value: Record<string, unknown> = {};
    for (const field of this.config().fields) {
      value[field.key] = toControlValue(field, source[field.key]);
    }
    this.form().reset(value);
  }
}

function buildForm(fields: FieldDef[]): AnyForm {
  const controls: Record<string, FormControl<unknown>> = {};
  for (const field of fields) {
    const validators: ValidatorFn[] = [];
    if (field.required) validators.push(Validators.required);
    if (field.type === 'number') {
      validators.push(
        decimalRange(
          field.min ?? -Infinity,
          field.max ?? Infinity,
          field.integer ?? false,
        ),
      );
    }
    if (field.maxLength) validators.push(Validators.maxLength(field.maxLength));
    if (field.pattern) validators.push(Validators.pattern(field.pattern));
    controls[field.key] = new FormControl<unknown>(
      toControlValue(field, undefined),
      validators,
    );
  }
  return new FormGroup(controls);
}

function toControlValue(field: FieldDef, value: unknown): unknown {
  switch (field.type) {
    case 'checkbox':
      return value === undefined ? true : Boolean(value);
    case 'voltages':
      return Array.isArray(value) ? [...value] : [];
    case 'icon':
      return typeof value === 'string' ? value : null;
    case 'number':
      return typeof value === 'number' ? String(value).replace('.', ',') : '';
    default:
      return value === null || value === undefined ? '' : String(value);
  }
}

function toPayload(fields: FieldDef[], form: AnyForm): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = form.controls[field.key].value;
    switch (field.type) {
      case 'number': {
        const value = parseDecimal(raw);
        if (value !== null) body[field.key] = value;
        else if (field.nullable) body[field.key] = null;
        break;
      }
      case 'select': {
        const option = field.options?.find(
          (o) => String(o.value) === String(raw),
        );
        if (option) body[field.key] = option.value;
        break;
      }
      case 'text': {
        const text = String(raw ?? '').trim();
        if (text) body[field.key] = text;
        else if (field.nullable) body[field.key] = null;
        break;
      }
      default:
        body[field.key] = raw;
    }
  }
  return body;
}
