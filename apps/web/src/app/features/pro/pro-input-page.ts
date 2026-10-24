import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router } from '@angular/router';
import type {
  BatteryTech,
  CableSegment,
  Device,
  SimulationInput,
} from '@simulateur/shared-types';
import { CABLE_SEGMENTS } from '@simulateur/shared-types';
import { NBSP, formatNumber } from '../../core/format';
import { LoadEntry, SimulationStore } from '../../core/simulation.store';
import { Icon } from '../../shared/icons/icon';
import { StepHeader } from '../../shared/layout/step-header';
import { ROUTES, TECH_NAMES, dodOf } from './pro-view';
import { NumberRule, RULES, parseField, toField } from './pro-validation';

type Entry = 'loads' | 'totals';
type LoadField = 'powerW' | 'quantity' | 'hoursPerDay' | 'surgeFactor';

const LOAD_FIELDS: { field: LoadField; label: string; mode: string }[] = [
  { field: 'powerW', label: 'P (W)', mode: 'decimal' },
  { field: 'quantity', label: 'Qté', mode: 'numeric' },
  { field: 'hoursPerDay', label: 'h / jour', mode: 'decimal' },
  { field: 'surgeFactor', label: 'k démar.', mode: 'decimal' },
];

/** Saisie technique du mode professionnel (RF-07 à RF-10), sur `/besoins`. */
@Component({
  selector: 'app-pro-input-page',
  imports: [StepHeader, Icon, NgTemplateOutlet],
  template: `
    <div class="flex min-h-dvh flex-col bg-bg">
      <app-step-header
        title="Saisie technique"
        [step]="3"
        backLink="/mode"
        backLabel="Retour au choix du profil"
      />
      <main
        class="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 pt-4 pb-6 lg:max-w-[1280px] lg:p-8"
      >
        <div class="hidden lg:block">
          <h1 class="m-0 text-[28px]/[34px] font-semibold tracking-[-0.01em]">
            Saisie technique
          </h1>
          <p class="m-0 mt-1 text-body text-muted">
            Puissances exactes ou totaux, paramètres du système :
            dimensionnement exact et nomenclature complète.
          </p>
        </div>
        @if (store.region(); as r) {
          <p
            class="m-0 flex items-center gap-1.5 font-mono text-[13px] text-ink-2"
          >
            <app-icon name="pin" [size]="18" />
            {{ r.name }} · H = {{ fmt(r.irradiationAvg, 1) }}&nbsp;kWh/m²/j
          </p>
        }

        <div
          class="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:gap-6"
        >
          <!-- Charges -->
          <section class="flex min-w-0 flex-col gap-3" aria-label="Charges">
            <div
              class="grid grid-cols-2 gap-1 rounded-lg bg-[#E9E9E3] p-1"
              role="group"
              aria-label="Mode de saisie"
            >
              @for (e of entries; track e.id) {
                <button
                  type="button"
                  class="min-h-11 rounded-md text-small font-semibold"
                  [class]="
                    entry() === e.id
                      ? 'bg-surface shadow-[0_1px_2px_rgba(22,24,29,.12)]'
                      : 'bg-transparent text-ink-2'
                  "
                  [attr.aria-pressed]="entry() === e.id"
                  (click)="setEntry(e.id)"
                >
                  {{ e.label }}
                </button>
              }
            </div>

            @if (entry() === 'loads') {
              @if (!store.loads().length) {
                <p class="card m-0 p-4 text-small text-muted">
                  Aucune charge. Ajoutez une ligne libre ou un appareil du
                  catalogue (puissance typique pré-remplie).
                </p>
              }
              <ul
                class="m-0 flex list-none flex-col gap-2 p-0"
                aria-live="polite"
              >
                @for (l of store.loads(); track l.key; let i = $index) {
                  <li
                    class="card flex flex-col gap-2 p-3"
                    data-testid="pro-load"
                  >
                    <div class="flex items-center gap-2">
                      <label class="sr-only" [for]="id(l, 'label')"
                        >Désignation</label
                      >
                      <input
                        [id]="id(l, 'label')"
                        type="text"
                        class="min-h-11 min-w-0 flex-1 rounded-sm border border-transparent bg-transparent px-1 text-[15px] font-semibold focus:border-line-strong"
                        placeholder="Désignation"
                        maxlength="120"
                        [value]="l.label"
                        (change)="setLabel(l, $any($event.target).value)"
                      />
                      <button
                        type="button"
                        class="flex size-11 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-2"
                        [attr.aria-label]="
                          'Supprimer la ligne ' + (l.label || i + 1)
                        "
                        (click)="remove(l)"
                      >
                        <app-icon name="trash" [size]="20" />
                      </button>
                    </div>
                    <div class="grid grid-cols-4 gap-2">
                      @for (f of loadFields; track f.field) {
                        @let fid = id(l, f.field);
                        <div class="flex min-w-0 flex-col gap-1">
                          <label
                            [for]="fid"
                            class="font-mono text-[11px] text-muted"
                            >{{ f.label }}</label
                          >
                          <input
                            [id]="fid"
                            type="text"
                            [attr.inputmode]="f.mode"
                            class="h-11 w-full min-w-0 rounded-sm border bg-surface px-2 text-right font-mono text-[15px]"
                            [class]="
                              error(fid) ? 'border-crit' : 'border-line-strong'
                            "
                            [attr.aria-invalid]="!!error(fid)"
                            [attr.aria-describedby]="
                              error(fid) ? fid + '-err' : null
                            "
                            [value]="value(fid, l[f.field])"
                            (input)="
                              editLoad(l, f.field, $any($event.target).value)
                            "
                            (blur)="settle(fid)"
                          />
                        </div>
                      }
                    </div>
                    @for (f of loadFields; track f.field) {
                      @let fid = id(l, f.field);
                      @if (error(fid); as msg) {
                        <p
                          [id]="fid + '-err'"
                          class="m-0 text-caption text-crit-ink"
                        >
                          {{ msg }}
                        </p>
                      }
                    }
                    <div
                      class="flex justify-between font-mono text-mono font-normal text-muted"
                    >
                      <span
                        >τ {{ fmt(duty(l), 1)
                        }}{{ duty(l) !== 1 ? ' · catalogue' : '' }}</span
                      >
                      <span class="font-medium text-ink"
                        >{{ fmt(lineEnergy(l)) }}&nbsp;Wh/j</span
                      >
                    </div>
                  </li>
                }
              </ul>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  class="min-h-12 rounded-lg border-[1.5px] border-dashed border-ring bg-transparent text-small font-semibold"
                  (click)="addFree()"
                >
                  + Ligne libre
                </button>
                <button
                  type="button"
                  class="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-line-strong bg-surface text-small font-semibold"
                  [attr.aria-expanded]="catalogOpen()"
                  aria-controls="pro-catalog"
                  (click)="catalogOpen.set(!catalogOpen())"
                >
                  <app-icon name="plus" [size]="18" /> Catalogue
                </button>
              </div>
              @if (catalogOpen()) {
                <div id="pro-catalog" class="card flex flex-col gap-2 p-3">
                  <label for="pro-catalog-q" class="text-small font-semibold"
                    >Ajouter depuis le catalogue</label
                  >
                  <input
                    id="pro-catalog-q"
                    type="search"
                    class="h-11 rounded-sm border border-line-strong px-3"
                    placeholder="Réfrigérateur, pompe, climatiseur…"
                    [value]="query()"
                    (input)="query.set($any($event.target).value)"
                  />
                  <ul
                    class="m-0 flex max-h-80 list-none flex-col overflow-y-auto p-0"
                  >
                    @for (d of matches(); track d.id) {
                      <li>
                        <button
                          type="button"
                          class="flex min-h-11 w-full items-center gap-3 rounded-sm px-2 text-left hover:bg-surface-2"
                          (click)="addDevice(d)"
                        >
                          <app-icon [name]="d.iconKey ?? d.id" [size]="20" />
                          <span class="flex-1 text-small">{{ d.name }}</span>
                          <span
                            class="font-mono text-mono font-normal text-muted"
                            >{{ fmt(d.powerTypW) }}&nbsp;W</span
                          >
                        </button>
                      </li>
                    } @empty {
                      <li class="p-2 text-small text-muted">
                        Aucun appareil. Utilisez une ligne libre.
                      </li>
                    }
                  </ul>
                </div>
              }
            } @else {
              <div class="card flex flex-col gap-3.5 p-3.5">
                @for (t of totalFields; track t.id) {
                  <div class="flex flex-col gap-1.5">
                    <label [for]="t.id" class="text-small font-semibold"
                      >{{ t.label }}
                      <span
                        class="font-mono text-mono font-normal text-muted"
                        >{{ t.unit }}</span
                      ></label
                    >
                    <input
                      [id]="t.id"
                      type="text"
                      inputmode="decimal"
                      class="h-12 rounded-md border bg-surface px-3 text-right font-mono text-base"
                      [class]="
                        error(t.id) ? 'border-crit' : 'border-line-strong'
                      "
                      [attr.aria-invalid]="!!error(t.id)"
                      [attr.aria-describedby]="t.id + '-help'"
                      [placeholder]="t.placeholder"
                      [value]="value(t.id, totalValue(t.id), true)"
                      (input)="editTotals(t.id, $any($event.target).value)"
                      (blur)="settle(t.id)"
                    />
                    <p
                      [id]="t.id + '-help'"
                      class="m-0 text-caption"
                      [class]="error(t.id) ? 'text-crit-ink' : 'text-muted'"
                    >
                      {{ error(t.id) ?? t.help }}
                    </p>
                  </div>
                }
              </div>
            }

            <!-- Bandeau de synthèse -->
            <div
              class="grid grid-cols-3 gap-2 rounded-lg bg-ink p-3.5 text-white"
              aria-live="polite"
              data-testid="pro-summary"
            >
              @for (s of summary(); track s.label) {
                <div class="flex min-w-0 flex-col gap-0.5">
                  <span class="font-mono text-[11px] text-line-strong">{{
                    s.label
                  }}</span>
                  <span
                    class="tnum text-lg/6 font-semibold"
                    [class.text-solar]="s.solar"
                    >{{ s.value
                    }}<span class="text-xs text-white"
                      >&nbsp;{{ s.unit }}</span
                    ></span
                  >
                </div>
              }
            </div>
            @if (store.outcome(); as o) {
              @if (o.status === 'error') {
                <p
                  class="m-0 rounded-lg bg-crit-soft p-3 text-small text-crit-ink"
                  role="alert"
                >
                  {{ o.message }}
                </p>
              }
            }
          </section>

          <!-- Paramètres -->
          <aside
            class="flex min-w-0 flex-col gap-3"
            aria-labelledby="pro-params"
          >
            <h2 id="pro-params" class="m-0 text-lg font-semibold">
              Paramètres du système
            </h2>
            <div class="card flex flex-col gap-4.5 p-3.5">
              <fieldset class="m-0 flex flex-col gap-2 border-0 p-0">
                <legend class="mb-2 p-0 text-small font-semibold">
                  Autonomie
                </legend>
                <div class="grid grid-cols-5 gap-1.5">
                  @for (d of autonomySteps(); track d) {
                    <button
                      type="button"
                      [class]="chip(store.autonomyDays() === d)"
                      [attr.aria-pressed]="store.autonomyDays() === d"
                      (click)="store.setAutonomy(d)"
                    >
                      {{ fmt(d, d % 1 ? 1 : 0) }}&nbsp;j
                    </button>
                  }
                </div>
              </fieldset>

              <fieldset class="m-0 flex flex-col border-0 p-0">
                <legend class="mb-2 p-0 text-small font-semibold">
                  Technologie de batterie
                </legend>
                <div class="grid grid-cols-2 gap-1.5">
                  @for (t of techs; track t) {
                    <button
                      type="button"
                      [class]="chip(store.batteryTech() === t, true)"
                      [attr.aria-pressed]="store.batteryTech() === t"
                      (click)="store.setBatteryTech(t)"
                    >
                      <span class="font-semibold">{{ techName[t] }}</span>
                      <span class="font-mono text-[11px] opacity-80"
                        >DoD {{ fmt(dod(t), 2) }}</span
                      >
                    </button>
                  }
                </div>
              </fieldset>

              <fieldset class="m-0 flex flex-col border-0 p-0">
                <legend class="mb-2 p-0 text-small font-semibold">
                  Tension système
                </legend>
                <div class="grid grid-cols-[1.6fr_1fr_1fr_1fr] gap-1.5">
                  <button
                    type="button"
                    [class]="chip(!voltage())"
                    [attr.aria-pressed]="!voltage()"
                    (click)="setOption({ systemVoltage: undefined })"
                  >
                    {{ autoLabel() }}
                  </button>
                  @for (v of voltages; track v) {
                    <button
                      type="button"
                      [class]="chip(voltage() === v)"
                      [attr.aria-pressed]="voltage() === v"
                      (click)="setOption({ systemVoltage: v })"
                    >
                      {{ v }}&nbsp;V
                    </button>
                  }
                </div>
              </fieldset>

              <fieldset class="m-0 flex flex-col border-0 p-0">
                <legend class="mb-2 p-0 text-small font-semibold">
                  Architecture
                </legend>
                <div class="grid grid-cols-2 gap-1.5">
                  @for (a of architectures; track a.id) {
                    <button
                      type="button"
                      [class]="chip(inverterType() === a.id, true)"
                      [attr.aria-pressed]="inverterType() === a.id"
                      (click)="setOption({ inverterType: a.id })"
                    >
                      <span class="font-semibold">{{ a.label }}</span>
                      <span class="font-mono text-[11px] opacity-80">{{
                        a.sub
                      }}</span>
                    </button>
                  }
                </div>
              </fieldset>

              <div class="flex items-center justify-between gap-3">
                <div class="flex flex-col">
                  <span class="text-small font-semibold" id="pro-cs"
                    >Simultanéité c_s</span
                  >
                  <span class="text-xs text-muted"
                    >Part des appareils allumés ensemble</span
                  >
                </div>
                <div
                  class="flex items-center rounded-md border border-line-strong"
                  role="group"
                  aria-labelledby="pro-cs"
                >
                  <button
                    type="button"
                    class="flex size-11 items-center justify-center text-lg disabled:opacity-40"
                    aria-label="Réduire la simultanéité"
                    [disabled]="simultaneity() <= 0.5 + 1e-9"
                    (click)="stepSimultaneity(-1)"
                  >
                    −
                  </button>
                  <output
                    class="w-12 text-center font-mono text-[15px]"
                    aria-live="polite"
                    >{{ fmt(simultaneity(), 2) }}</output
                  >
                  <button
                    type="button"
                    class="flex size-11 items-center justify-center text-lg disabled:opacity-40"
                    aria-label="Augmenter la simultanéité"
                    [disabled]="simultaneity() >= 1 - 1e-9"
                    (click)="stepSimultaneity(1)"
                  >
                    +
                  </button>
                </div>
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="pro-panel" class="text-small font-semibold"
                  >Panneau de référence</label
                >
                <select
                  id="pro-panel"
                  class="h-12 rounded-md border border-line-strong bg-surface px-3 text-small"
                  (change)="setPanel($any($event.target).value)"
                >
                  <option value="" [selected]="!store.panelModelId()">
                    Automatique (panneau par défaut)
                  </option>
                  @for (p of panels(); track p.id) {
                    <option
                      [value]="p.id"
                      [selected]="store.panelModelId() === p.id"
                    >
                      {{ fmt(p.powerWp) }} Wc · Voc {{ fmt(p.vocV, 1) }} V · Vmp
                      {{ fmt(p.vmpV, 1) }} V · Isc {{ fmt(p.iscA, 1) }} A
                    </option>
                  }
                </select>
              </div>

              <fieldset class="m-0 flex flex-col border-0 p-0">
                <legend class="mb-2 p-0 text-small font-semibold">
                  Longueurs de câbles
                  <span class="font-mono text-mono font-normal text-muted"
                    >m</span
                  >
                </legend>
                <div class="grid grid-cols-2 gap-2.5">
                  @for (s of segments; track s) {
                    @let fid = 'cable-' + s;
                    <div class="flex min-w-0 flex-col gap-1">
                      <label [for]="fid" class="text-xs text-muted">{{
                        routes[s]
                      }}</label>
                      <input
                        [id]="fid"
                        type="text"
                        inputmode="decimal"
                        class="h-11 w-full rounded-sm border bg-surface px-2 text-right font-mono text-[15px]"
                        [class]="
                          error(fid) ? 'border-crit' : 'border-line-strong'
                        "
                        [attr.aria-invalid]="!!error(fid)"
                        [attr.aria-describedby]="
                          error(fid) ? fid + '-err' : null
                        "
                        [value]="value(fid, cableLength(s))"
                        (input)="editCable(s, $any($event.target).value)"
                        (blur)="settle(fid)"
                      />
                      @if (error(fid); as msg) {
                        <span
                          [id]="fid + '-err'"
                          class="text-xs text-crit-ink"
                          >{{ msg }}</span
                        >
                      }
                    </div>
                  }
                </div>
              </fieldset>
            </div>
            <div class="hidden lg:block">
              <ng-container *ngTemplateOutlet="submitBlock" />
            </div>
          </aside>
        </div>
      </main>
      <div class="action-bar gap-2 lg:hidden">
        <ng-container *ngTemplateOutlet="submitBlock" />
      </div>
    </div>

    <ng-template #submitBlock>
      @if (blocker(); as b) {
        <p class="m-0 mb-2 text-caption text-muted" id="pro-blocker">{{ b }}</p>
      }
      <button
        type="button"
        class="btn-primary w-full"
        [disabled]="!!blocker()"
        [attr.aria-describedby]="blocker() ? 'pro-blocker' : null"
        (click)="submit()"
      >
        Dimensionner →
      </button>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProInputPage {
  protected readonly store = inject(SimulationStore);
  private readonly router = inject(Router);

  protected readonly fmt = formatNumber;
  protected readonly loadFields = LOAD_FIELDS;
  protected readonly segments = CABLE_SEGMENTS;
  protected readonly routes = ROUTES;
  protected readonly techs: BatteryTech[] = ['lithium', 'plomb'];
  protected readonly techName = TECH_NAMES;
  protected readonly voltages = [12, 24, 48] as const;
  protected readonly entries: { id: Entry; label: string }[] = [
    { id: 'loads', label: 'Par appareil' },
    { id: 'totals', label: 'Puissance totale' },
  ];
  protected readonly architectures = [
    { id: 'separe', label: 'Séparée', sub: 'Régulateur MPPT + onduleur' },
    { id: 'hybride', label: 'Hybride', sub: 'MPPT intégré' },
  ] as const;
  protected readonly totalFields = [
    {
      id: 'tot-p',
      label: 'Puissance totale installée',
      unit: 'W',
      placeholder: '435',
      help: 'Somme des puissances des appareils (P_inst).',
    },
    {
      id: 'tot-e',
      label: 'Énergie journalière',
      unit: 'Wh/j',
      placeholder: '3 277',
      help: 'Consommation sur 24 h (E_j).',
    },
    {
      id: 'tot-k',
      label: 'Facteur de pointe global',
      unit: '× P',
      placeholder: '1',
      help: '1 par défaut. Augmentez-le si des moteurs démarrent sur l’installation.',
    },
  ] as const;

  protected readonly entry = signal<Entry>(
    this.store.totals() ? 'totals' : 'loads',
  );
  protected readonly catalogOpen = signal(false);
  protected readonly query = signal('');
  /** Texte saisi tant qu'il n'est pas normalisé (clé = id du champ). */
  private readonly drafts = signal<Record<string, string>>({});
  private readonly rules = new Map<string, NumberRule>();

  protected readonly matches = computed(() => {
    const q = this.normalize(this.query());
    return this.store
      .catalog()
      .devices.filter(
        (d) => d.active && (!q || this.normalize(d.name).includes(q)),
      )
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .slice(0, 30);
  });
  protected readonly panels = computed(() =>
    this.store.catalog().panels.filter((p) => p.active),
  );
  protected readonly autonomySteps = computed(
    () => this.store.params().values.autonomySteps,
  );
  protected readonly voltage = computed(
    () => this.store.options()?.systemVoltage,
  );
  protected readonly inverterType = computed(
    () => this.store.options()?.inverterType ?? 'separe',
  );
  protected readonly simultaneity = computed(
    () => this.store.options()?.simultaneity ?? 1,
  );
  protected readonly autoLabel = computed(() => {
    const v = this.voltage() ? undefined : this.store.result()?.systemVoltage;
    return v ? `Auto · ${v}${NBSP}V` : 'Auto';
  });

  protected readonly summary = computed(() => {
    const r = this.store.result();
    const show = (v: number | undefined) =>
      v === undefined ? '—' : formatNumber(v);
    return [
      {
        label: 'P_inst',
        value: show(r?.peakW.installed),
        unit: 'W',
        solar: false,
      },
      { label: 'P_dem', value: show(r?.peakW.surge), unit: 'W', solar: false },
      {
        label: 'E_j',
        value: show(r?.energyWhPerDay.typ),
        unit: 'Wh/j',
        solar: true,
      },
    ];
  });

  /** Raison qui empêche de dimensionner, ou `null`. */
  protected readonly blocker = computed<string | null>(() => {
    const drafts = this.drafts();
    const invalid = Object.keys(drafts).some((id) => this.errorOf(id, drafts));
    if (invalid) return 'Corrigez les champs signalés en rouge.';
    if (this.entry() === 'totals') {
      return this.store.totals()
        ? null
        : 'Saisissez la puissance totale et l’énergie journalière.';
    }
    const loads = this.store.loads();
    if (!loads.length) return 'Ajoutez au moins une charge.';
    if (loads.some((l) => !(l.powerW && l.powerW > 0))) {
      return 'Chaque ligne doit avoir une puissance (W).';
    }
    return null;
  });

  constructor() {
    for (const f of this.totalFields) {
      this.rules.set(
        f.id,
        f.id === 'tot-p'
          ? RULES.totalPowerW
          : f.id === 'tot-e'
            ? RULES.dailyEnergyWh
            : RULES.peakFactor,
      );
    }
    for (const s of CABLE_SEGMENTS)
      this.rules.set('cable-' + s, RULES.cableLengthM);
  }

  // ——— Champs ———
  protected id(l: LoadEntry, field: string): string {
    return `load-${l.key}-${field}`;
  }

  protected value(
    id: string,
    stored: number | undefined,
    grouped = false,
  ): string {
    return this.drafts()[id] ?? toField(stored, grouped);
  }

  protected error(id: string): string | null {
    return this.errorOf(id, this.drafts());
  }

  private errorOf(id: string, drafts: Record<string, string>): string | null {
    const raw = drafts[id];
    const rule = this.rules.get(id);
    if (raw === undefined || !rule) return null;
    const res = parseField(raw, rule);
    return res.ok ? null : res.error;
  }

  /** Champ quitté : une valeur valide est normalisée, une erreur reste affichée. */
  protected settle(id: string): void {
    if (this.error(id)) return;
    // Les totaux ne sont enregistrés qu'à deux : leur texte reste la référence,
    // reformaté avec le séparateur de milliers.
    if (id.startsWith('tot-')) {
      const raw = this.drafts()[id];
      const rule = this.rules.get(id);
      const res = raw !== undefined && rule ? parseField(raw, rule) : null;
      if (res?.ok && res.value !== undefined) {
        const text = toField(res.value, true);
        this.drafts.update((d) => ({ ...d, [id]: text }));
      }
      return;
    }
    this.drafts.update((d) => {
      const rest = { ...d };
      delete rest[id];
      return rest;
    });
  }

  private draft(id: string, raw: string, rule: NumberRule) {
    this.rules.set(id, rule);
    this.drafts.update((d) => ({ ...d, [id]: raw }));
    return parseField(raw, rule);
  }

  // ——— Charges ———
  protected setEntry(entry: Entry): void {
    if (entry === this.entry()) return;
    this.entry.set(entry);
    if (entry === 'loads') this.store.setTotals(undefined);
    else this.commitTotals();
  }

  protected addFree(): void {
    this.store.addProLoad();
  }

  protected addDevice(d: Device): void {
    this.store.addProLoad(d);
    this.catalogOpen.set(false);
    this.query.set('');
  }

  protected remove(l: LoadEntry): void {
    this.drafts.update((d) =>
      Object.fromEntries(
        Object.entries(d).filter(([k]) => !k.startsWith(`load-${l.key}-`)),
      ),
    );
    this.store.removeLoad(l.key);
  }

  protected setLabel(l: LoadEntry, label: string): void {
    this.store.updateLoad(l.key, { label: label.trim().slice(0, 120) });
  }

  protected editLoad(l: LoadEntry, field: LoadField, raw: string): void {
    const res = this.draft(this.id(l, field), raw, RULES[field]);
    if (res.ok) this.store.updateLoad(l.key, { [field]: res.value });
  }

  protected duty(l: LoadEntry): number {
    return this.device(l)?.dutyCycle ?? 1;
  }

  protected lineEnergy(l: LoadEntry): number {
    return (l.powerW ?? 0) * l.quantity * l.hoursPerDay * this.duty(l);
  }

  private device(l: LoadEntry): Device | undefined {
    return l.deviceId
      ? this.store.catalog().devices.find((d) => d.id === l.deviceId)
      : undefined;
  }

  // ——— Totaux ———
  protected totalValue(id: string): number | undefined {
    const t = this.store.totals();
    if (id === 'tot-p') return t?.powerW;
    if (id === 'tot-e') return t?.dailyEnergyWh;
    return t?.surgeFactor;
  }

  protected editTotals(id: string, raw: string): void {
    this.draft(id, raw, this.rules.get(id) as NumberRule);
    this.commitTotals();
  }

  private commitTotals(): void {
    const read = (id: string) => {
      const raw = this.drafts()[id] ?? toField(this.totalValue(id));
      return parseField(raw, this.rules.get(id) as NumberRule);
    };
    const p = read('tot-p');
    const e = read('tot-e');
    const k = read('tot-k');
    if (p.ok && e.ok && k.ok && p.value && e.value) {
      this.store.setTotals({
        powerW: p.value,
        dailyEnergyWh: e.value,
        ...(k.value !== undefined ? { surgeFactor: k.value } : {}),
      });
    } else if (this.store.totals() && (!p.ok || !e.ok)) {
      this.store.setTotals(undefined);
    }
  }

  // ——— Paramètres ———
  protected dod(t: BatteryTech): number {
    return dodOf(t, this.store.params());
  }

  protected setOption(
    patch: Partial<NonNullable<SimulationInput['options']>>,
  ): void {
    const next = { ...this.store.options(), ...patch };
    for (const k of Object.keys(next) as (keyof typeof next)[]) {
      if (next[k] === undefined) delete next[k];
    }
    this.store.setOptions(Object.keys(next).length ? next : undefined);
  }

  protected stepSimultaneity(direction: 1 | -1): void {
    const v = Math.round((this.simultaneity() + direction * 0.05) * 100) / 100;
    const cs = Math.min(1, Math.max(0.5, v));
    this.setOption({ simultaneity: cs === 1 ? undefined : cs });
  }

  protected setPanel(id: string): void {
    this.store.setPanelModel(id || undefined);
  }

  protected cableLength(s: CableSegment): number {
    return (
      this.store.options()?.cableLengthsM?.[s] ??
      this.store.params().values.defaultCableLengthsM[s]
    );
  }

  protected editCable(s: CableSegment, raw: string): void {
    const res = this.draft('cable-' + s, raw, RULES.cableLengthM);
    if (!res.ok || res.value === undefined) return;
    const lengths = { ...this.store.options()?.cableLengthsM, [s]: res.value };
    this.setOption({ cableLengthsM: lengths });
  }

  protected chip(active: boolean, stacked = false): string {
    const base = stacked
      ? 'flex min-h-13 flex-col items-center justify-center gap-0.5 rounded-md border px-2 text-small'
      : 'min-h-11 rounded-md border px-1 font-mono text-[13px]';
    return `${base} ${active ? 'border-ink bg-ink text-white' : 'border-line-strong bg-surface text-ink'}`;
  }

  protected submit(): void {
    if (this.blocker()) return;
    this.store.flush();
    void this.router.navigateByUrl('/resultat');
  }

  private normalize(s: string): string {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }
}
