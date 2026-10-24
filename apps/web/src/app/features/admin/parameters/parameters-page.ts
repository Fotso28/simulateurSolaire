import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { AdminApiService } from '../core/admin-api.service';
import { errorMessage, toApiError } from '../core/api-error';
import { ConfirmService } from '../core/confirm.service';
import { Loader } from '../core/loader';
import { ParameterSetRow } from '../core/models';
import { formatDateTime, parseDecimal } from '../ui/format';
import { Icon } from '../ui/icon';
import { PageHeader, UI } from '../ui/page-header';
import { FormMessage, ListState } from '../ui/state';
import { decimalRange, fieldError } from '../ui/validators';
import {
  ParamEntry,
  flattenValues,
  formatParam,
  paramLabel,
  parseList,
  sameValue,
  unflattenValues,
} from './parameter-values';

function numberList(control: AbstractControl): ValidationErrors | null {
  return parseList(String(control.value ?? '')) ? null : { numberList: true };
}

/** Clé de contrôle sans point (un point serait lu comme un chemin par `form.get`). */
const controlKey = (path: string) => path.replace(/\./g, '__');

/**
 * Paramètres de calcul versionnés (RF-21) : jamais d'édition en place.
 * Nouvelle version à partir de l'active, comparaison de deux versions, activation.
 */
@Component({
  selector: 'app-parameters-page',
  imports: [ReactiveFormsModule, PageHeader, Icon, ListState, FormMessage],
  template: `
    <app-page-header
      title="Paramètres de calcul"
      subtitle="Chaque modification crée une nouvelle version, inactive tant qu'elle n'est pas activée. Les simulations enregistrent la version utilisée."
    >
      @if (!editor()) {
        <button
          type="button"
          [class]="ui.primary"
          [disabled]="!activeSet()"
          (click)="startNewVersion()"
        >
          <app-icon name="plus" [stroke]="2" />
          Nouvelle version à partir de l'active
        </button>
      }
    </app-page-header>

    <app-form-message [message]="actionError()" />
    <app-form-message kind="success" [message]="actionSuccess()" />

    @if (editor(); as edit) {
      <section
        class="rounded-xl border border-line bg-surface"
        aria-labelledby="new-version-title"
      >
        <div class="border-b border-[#ECECE6] px-[18px] pt-4 pb-3">
          <span class="font-mono text-[11px] tracking-[0.04em] text-muted"
            >NOUVELLE VERSION</span
          >
          <h2
            id="new-version-title"
            class="text-[17px] leading-[22px] font-semibold"
          >
            À partir de la version {{ edit.base.version }} (active)
          </h2>
        </div>
        <form [formGroup]="edit.form" (ngSubmit)="createVersion()" novalidate>
          <div
            class="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3 px-[18px] py-4 text-small"
          >
            @for (entry of edit.entries; track entry.path) {
              <label [class]="ui.fieldLabel">
                <span class="font-semibold">{{ label(entry.path) }}</span>
                <input
                  [formControlName]="key(entry.path)"
                  [class]="ui.numInput"
                  inputmode="decimal"
                  [attr.aria-invalid]="
                    !!err(edit.form.controls[key(entry.path)])
                  "
                  [class.!border-solar]="isChanged(entry)"
                />
                <span class="flex justify-between gap-2 text-[12px] leading-4">
                  <span [class]="ui.error">{{
                    err(edit.form.controls[key(entry.path)])
                  }}</span>
                  @if (isChanged(entry)) {
                    <span class="font-mono text-solar-ink"
                      >avant : {{ fmt(entry.value) }}</span
                    >
                  }
                </span>
              </label>
            }
          </div>
          <div
            class="flex flex-wrap items-center gap-2 border-t border-[#ECECE6] px-[18px] pt-3 pb-4"
          >
            <p class="mr-auto text-[13px] text-muted" aria-live="polite">
              {{ changedCount() }} valeur(s) modifiée(s). Listes : nombres
              séparés par « ; ».
            </p>
            <app-form-message [message]="editorError()" />
            <button
              type="button"
              [class]="ui.secondary"
              (click)="editor.set(null)"
            >
              Annuler
            </button>
            <button type="submit" [class]="ui.primary" [disabled]="busy()">
              {{ busy() ? 'Création…' : 'Créer la version (inactive)' }}
            </button>
          </div>
        </form>
      </section>
    }

    <section class="flex flex-col gap-3" aria-labelledby="versions-title">
      <h2 id="versions-title" class="text-h2">Versions</h2>
      <div [class]="ui.card">
        <table class="w-full min-w-[620px] border-collapse text-small">
          <thead>
            <tr>
              <th scope="col" [class]="ui.th">Version</th>
              <th scope="col" [class]="ui.th">Statut</th>
              <th scope="col" [class]="ui.th">Active depuis</th>
              <th scope="col" [class]="ui.th">Créée le</th>
              <th scope="col" [class]="ui.th">
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            @for (set of sets(); track set.id) {
              <tr [class]="set.active ? 'bg-solar-soft' : 'bg-white'">
                <td [class]="ui.td + ' font-mono font-medium'">
                  v{{ set.version }}
                </td>
                <td [class]="ui.td">
                  @if (set.active) {
                    <span
                      class="rounded-sm bg-ok-soft px-2 py-0.5 text-[12px] font-semibold text-ok-ink"
                      >Active</span
                    >
                  } @else {
                    <span class="text-muted">{{
                      set.activeSince ? 'Ancienne' : 'Jamais activée'
                    }}</span>
                  }
                </td>
                <td [class]="ui.td">{{ date(set.activeSince) }}</td>
                <td [class]="ui.td">{{ date(set.createdAt) }}</td>
                <td [class]="ui.td + ' text-right whitespace-nowrap'">
                  <button
                    type="button"
                    class="min-h-11 rounded-sm px-2 font-semibold text-solar-ink underline"
                    (click)="compareWithActive(set)"
                  >
                    Comparer<span class="sr-only">
                      la version {{ set.version }}</span
                    >
                  </button>
                  @if (!set.active) {
                    <button
                      type="button"
                      class="ml-1 h-11 rounded-md border border-line-strong bg-white px-3 font-semibold"
                      (click)="activate(set)"
                    >
                      Activer<span class="sr-only">
                        la version {{ set.version }}</span
                      >
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
          [empty]="!loader.loading() && sets().length === 0"
          emptyText="Aucune version."
          (retry)="loader.load()"
        />
      </div>
    </section>

    @if (sets().length > 1) {
      <section class="flex flex-col gap-3" aria-labelledby="compare-title">
        <h2 id="compare-title" class="text-h2">Comparer deux versions</h2>
        <div class="flex flex-wrap items-center gap-3 text-small text-ink-2">
          <label class="flex items-center gap-2">
            Version A
            <select
              class="h-11 rounded-md border border-line-strong bg-surface px-3 text-[15px] text-ink"
              [value]="compareA()"
              (change)="compareAOverride.set($any($event.target).value)"
            >
              @for (set of sets(); track set.id) {
                <option [value]="set.id">
                  v{{ set.version }}{{ set.active ? ' (active)' : '' }}
                </option>
              }
            </select>
          </label>
          <label class="flex items-center gap-2">
            Version B
            <select
              class="h-11 rounded-md border border-line-strong bg-surface px-3 text-[15px] text-ink"
              [value]="compareB()"
              (change)="compareBOverride.set($any($event.target).value)"
            >
              @for (set of sets(); track set.id) {
                <option [value]="set.id">
                  v{{ set.version }}{{ set.active ? ' (active)' : '' }}
                </option>
              }
            </select>
          </label>
          <label class="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              class="size-[18px] accent-ink"
              [checked]="onlyDiff()"
              (change)="onlyDiff.set($any($event.target).checked)"
            />
            Uniquement les différences
          </label>
        </div>
        <div [class]="ui.card">
          <table class="w-full min-w-[620px] border-collapse text-small">
            <thead>
              <tr>
                <th scope="col" [class]="ui.th">Paramètre</th>
                <th scope="col" [class]="ui.th + ' text-right'">A</th>
                <th scope="col" [class]="ui.th + ' text-right'">B</th>
              </tr>
            </thead>
            <tbody>
              @for (row of comparison(); track row.path) {
                <tr [class]="row.differs ? 'bg-solar-soft' : 'bg-white'">
                  <th scope="row" [class]="ui.td + ' text-left font-normal'">
                    {{ label(row.path) }}
                    @if (row.differs) {
                      <span class="sr-only"> (différent)</span>
                    }
                  </th>
                  <td [class]="ui.td + ' text-right font-mono'">
                    {{ fmt(row.a) }}
                  </td>
                  <td
                    [class]="ui.td + ' text-right font-mono'"
                    [class.font-semibold]="row.differs"
                  >
                    {{ fmt(row.b) }}
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="3" class="px-4 py-6 text-center text-muted">
                    Les deux versions sont identiques.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParametersPage {
  private readonly api = inject(AdminApiService);
  private readonly confirm = inject(ConfirmService);
  protected readonly ui = UI;
  protected readonly err = fieldError;
  protected readonly label = paramLabel;
  protected readonly fmt = formatParam;
  protected readonly date = formatDateTime;
  protected readonly key = controlKey;

  protected readonly loader = new Loader(() =>
    this.api.list<ParameterSetRow[]>('parameter-sets'),
  );
  protected readonly sets = computed(() => this.loader.data() ?? []);
  protected readonly activeSet = computed(
    () => this.sets().find((set) => set.active) ?? null,
  );

  protected readonly editor = signal<{
    base: ParameterSetRow;
    entries: ParamEntry[];
    form: FormGroup<Record<string, FormControl<string>>>;
  } | null>(null);
  /** Incrémenté à chaque saisie pour recalculer le nombre de valeurs modifiées. */
  private readonly editTick = signal(0);
  protected readonly busy = signal(false);
  protected readonly editorError = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly actionSuccess = signal<string | null>(null);

  protected readonly compareAOverride = signal<string | null>(null);
  protected readonly compareBOverride = signal<string | null>(null);
  protected readonly compareA = computed(
    () =>
      this.compareAOverride() ?? this.sets()[1]?.id ?? this.sets()[0]?.id ?? '',
  );
  protected readonly compareB = computed(
    () => this.compareBOverride() ?? this.sets()[0]?.id ?? '',
  );
  protected readonly onlyDiff = signal(true);

  protected readonly comparison = computed(() => {
    const byId = new Map(this.sets().map((set) => [set.id, set]));
    const a = new Map(
      flattenValues(byId.get(this.compareA())?.values).map((e) => [
        e.path,
        e.value,
      ]),
    );
    const b = new Map(
      flattenValues(byId.get(this.compareB())?.values).map((e) => [
        e.path,
        e.value,
      ]),
    );
    const paths = [...new Set([...a.keys(), ...b.keys()])];
    return paths
      .map((path) => ({
        path,
        a: a.get(path),
        b: b.get(path),
        differs: !sameValue(a.get(path), b.get(path)),
      }))
      .filter((row) => !this.onlyDiff() || row.differs);
  });

  protected readonly changedCount = computed(() => {
    this.editTick();
    const edit = this.editor();
    return edit
      ? edit.entries.filter((entry) => this.isChanged(entry)).length
      : 0;
  });

  constructor() {
    this.loader.load();
  }

  protected isChanged(entry: ParamEntry): boolean {
    const edit = this.editor();
    if (!edit) return false;
    const parsed = this.parseEntry(
      entry,
      edit.form.controls[controlKey(entry.path)].value,
    );
    return parsed !== null && !sameValue(parsed, entry.value);
  }

  protected startNewVersion(): void {
    const base = this.activeSet();
    if (!base) return;
    this.actionSuccess.set(null);
    this.editorError.set(null);
    const entries = flattenValues(base.values);
    const controls: Record<string, FormControl<string>> = {};
    for (const entry of entries) {
      controls[controlKey(entry.path)] = new FormControl(
        formatParam(entry.value),
        {
          nonNullable: true,
          validators:
            entry.kind === 'list'
              ? [Validators.required, numberList]
              : [Validators.required, decimalRange(0, 1_000_000)],
        },
      );
    }
    const form = new FormGroup(controls);
    form.valueChanges.subscribe(() => this.editTick.update((n) => n + 1));
    this.editor.set({ base, entries, form });
  }

  protected createVersion(): void {
    const edit = this.editor();
    if (!edit || this.busy()) return;
    edit.form.markAllAsTouched();
    if (edit.form.invalid) {
      this.editorError.set('Corrigez les valeurs signalées.');
      return;
    }
    const changed = edit.entries
      .map((entry) => ({
        path: entry.path,
        value: this.parseEntry(
          entry,
          edit.form.controls[controlKey(entry.path)].value,
        ),
        before: entry.value,
      }))
      .filter(
        (
          e,
        ): e is {
          path: string;
          value: number | number[];
          before: number | number[];
        } => e.value !== null && !sameValue(e.value, e.before),
      );
    if (changed.length === 0) {
      this.editorError.set('Aucune valeur modifiée : rien à enregistrer.');
      return;
    }
    this.busy.set(true);
    this.editorError.set(null);
    this.api
      .create<ParameterSetRow>('parameter-sets', {
        values: unflattenValues(changed),
        baseVersion: edit.base.version,
      })
      .subscribe({
        next: (created) => {
          this.busy.set(false);
          this.editor.set(null);
          this.actionSuccess.set(
            `Version ${created.version} créée (inactive). Comparez-la puis activez-la.`,
          );
          this.compareAOverride.set(edit.base.id);
          this.compareBOverride.set(created.id);
          this.loader.load();
        },
        error: (error: unknown) => {
          this.busy.set(false);
          const { field, message } = toApiError(error);
          const path = field?.replace(/^values\./, '');
          const control = path
            ? Object.entries(edit.form.controls).find(
                ([k]) =>
                  k === controlKey(path) ||
                  k.startsWith(`${controlKey(path)}__`),
              )?.[1]
            : undefined;
          control?.setErrors({ server: message });
          this.editorError.set(message);
        },
      });
  }

  protected compareWithActive(set: ParameterSetRow): void {
    const active = this.activeSet();
    this.compareAOverride.set(
      active && active.id !== set.id
        ? active.id
        : (this.sets()[1]?.id ?? set.id),
    );
    this.compareBOverride.set(set.id);
    queueMicrotask(() =>
      document
        .getElementById('compare-title')
        ?.scrollIntoView({ behavior: 'smooth' }),
    );
  }

  protected async activate(set: ParameterSetRow): Promise<void> {
    const ok = await this.confirm.ask({
      title: `Activer la version ${set.version} ?`,
      message:
        'Toutes les nouvelles simulations utiliseront ces paramètres immédiatement. La version active actuelle restera consultable.',
      confirmLabel: 'Activer',
    });
    if (!ok) return;
    this.actionError.set(null);
    this.api
      .create<ParameterSetRow>(`parameter-sets/${set.id}/activate`, {})
      .subscribe({
        next: () => {
          this.actionSuccess.set(`Version ${set.version} activée.`);
          this.loader.load();
        },
        error: (error: unknown) => this.actionError.set(errorMessage(error)),
      });
  }

  private parseEntry(
    entry: ParamEntry,
    text: string,
  ): number | number[] | null {
    return entry.kind === 'list' ? parseList(text) : parseDecimal(text);
  }
}
