import { Injectable, computed, effect, inject, signal } from '@angular/core';
import {
  EngineError,
  computeDailyEnergy,
  inverterNeighbors,
  panelCountNeighbors,
  simulate,
  storageNeighbors,
} from '@simulateur/engine';
import type {
  BatteryTech,
  Device,
  SimulationInput,
  SimulationMode,
  SimulationResult,
} from '@simulateur/shared-types';
import { CatalogService } from './catalog.service';

/** Une ligne de besoins : appareil du catalogue ou « Autre appareil ». */
export interface LoadEntry {
  /** Clé stable : `deviceId` pour le catalogue, `custom-…` sinon. */
  key: string;
  deviceId?: string;
  label: string;
  /** Puissance saisie (W) ; remplace la fourchette du catalogue. */
  powerW?: number;
  quantity: number;
  hoursPerDay: number;
  /** Facteur de démarrage k saisi (mode pro). */
  surgeFactor?: number;
}

export type Overrides = NonNullable<SimulationInput['overrides']>;

/** État persisté en sessionStorage (version du schéma : `v`). */
interface PersistedState {
  v: 1;
  countryId: string;
  regionId: string | null;
  mode: SimulationMode | null;
  loads: LoadEntry[];
  autonomyDays: number;
  batteryTech: BatteryTech;
  overrides: Overrides;
  options?: SimulationInput['options'];
  totals?: SimulationInput['totals'];
  /** Modèle de panneau choisi en mode pro. */
  panelModelId?: string;
}

export type SimulationOutcome =
  | { status: 'empty' }
  | { status: 'ok'; result: SimulationResult }
  | { status: 'error'; code: string; message: string };

/**
 * Puissance retenue pour un « Autre appareil » saisi sans puissance (RF-06) :
 * le moteur exige une puissance hors catalogue ; on l'indique à l'utilisateur.
 */
export const CUSTOM_DEFAULT_POWER_W = 100;

export const STORAGE_KEY = 'simulateur.state.v1';
/** Temporisation de la saisie des quantités avant recalcul (TRD). */
export const LOADS_DEBOUNCE_MS = 150;
/** Pas de durée d'usage proposés par les boutons − / +. */
export const HOUR_STEPS = [
  0.1, 0.2, 0.3, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24,
] as const;

/** Lignes saisies → `input.loads` du moteur (quantités nulles retirées). */
export function toEngineLoads(
  loads: readonly LoadEntry[],
): NonNullable<SimulationInput['loads']> {
  return loads
    .filter((l) => l.quantity > 0)
    .map(({ deviceId, label, powerW, quantity, hoursPerDay, surgeFactor }) => ({
      ...(deviceId ? { deviceId } : {}),
      label: label.trim() || 'Appareil',
      ...(powerW
        ? { powerW }
        : deviceId
          ? {}
          : { powerW: CUSTOM_DEFAULT_POWER_W }),
      quantity,
      hoursPerDay,
      ...(surgeFactor !== undefined && surgeFactor !== 1
        ? { surgeFactor }
        : {}),
    }));
}

const DEFAULTS: PersistedState = {
  v: 1,
  countryId: 'cm',
  regionId: 'cm-littoral',
  mode: null,
  loads: [],
  autonomyDays: 1,
  batteryTech: 'lithium',
  overrides: {},
};

/**
 * Store de la simulation (signals). Le résultat est un `computed` qui appelle
 * le moteur localement : aucun aller-retour serveur.
 *
 * Points d'extension :
 * - L4 (pro) : `mode = 'pro'`, `setOptions()` / `setTotals()` alimentent
 *   `input.options` et `input.totals` ; `loads[].powerW` porte la puissance exacte.
 * - L5 (partage, PDF) : `input()` et `outcome()` sont la source à sérialiser ;
 *   `restore()` recharge un état complet (simulation partagée `/s/:token`).
 */
@Injectable({ providedIn: 'root' })
export class SimulationStore {
  private readonly catalogService = inject(CatalogService);
  readonly catalog = this.catalogService.catalog;
  readonly params = this.catalogService.params;

  // ——— État saisi ———
  readonly countryId = signal(DEFAULTS.countryId);
  readonly regionId = signal<string | null>(DEFAULTS.regionId);
  readonly mode = signal<SimulationMode | null>(DEFAULTS.mode);
  /** Saisie immédiate (affichage, récapitulatif en direct). */
  readonly loads = signal<LoadEntry[]>([]);
  /** Copie temporisée de `loads`, seule lue par le calcul complet. */
  private readonly settledLoads = signal<LoadEntry[]>([]);
  readonly autonomyDays = signal(DEFAULTS.autonomyDays);
  readonly batteryTech = signal<BatteryTech>(DEFAULTS.batteryTech);
  readonly overrides = signal<Overrides>({});
  readonly options = signal<SimulationInput['options']>(undefined);
  readonly totals = signal<SimulationInput['totals']>(undefined);
  /** Modèle de panneau imposé (mode pro) ; reste valable après les forçages. */
  readonly panelModelId = signal<string | undefined>(undefined);

  private settleTimer?: ReturnType<typeof setTimeout>;

  // ——— Dérivés ———
  readonly countries = computed(() =>
    [...this.catalog().countries].sort((a, b) => a.sortOrder - b.sortOrder),
  );
  readonly country = computed(() =>
    this.catalog().countries.find((c) => c.id === this.countryId()),
  );
  readonly regions = computed(() =>
    this.catalog()
      .regions.filter((r) => r.countryId === this.countryId())
      .sort((a, b) => a.name.localeCompare(b.name, 'fr')),
  );
  readonly region = computed(() =>
    this.catalog().regions.find((r) => r.id === this.regionId()),
  );
  readonly activeLoads = computed(() =>
    this.loads().filter((l) => l.quantity > 0),
  );
  readonly deviceCount = computed(() =>
    this.activeLoads().reduce((n, l) => n + l.quantity, 0),
  );
  /** Quantité par `deviceId` (appareils du catalogue). */
  readonly quantities = computed(() => {
    const map = new Map<string, number>();
    for (const l of this.loads()) {
      if (l.deviceId) map.set(l.deviceId, l.quantity);
    }
    return map;
  });

  /** Récapitulatif en direct : énergie min / typique / max (Wh/j). */
  readonly dailyEnergy = computed(() => {
    const loads = this.activeLoads();
    const empty = { min: 0, typ: 0, max: 0, perLoad: [] };
    if (!loads.length) return empty;
    try {
      return computeDailyEnergy(
        toEngineLoads(this.usable(loads)),
        this.catalog(),
        this.engineMode(),
      );
    } catch {
      return empty;
    }
  });

  private readonly engineMode = computed<SimulationMode>(() =>
    this.mode() === 'pro' ? 'pro' : 'particulier',
  );

  /** Entrée du moteur sans les forçages du configurateur. */
  readonly baseInput = computed<SimulationInput | null>(() => {
    const regionId = this.region()?.id;
    const loads = toEngineLoads(this.usable(this.settledLoads()));
    const totals = this.totals();
    if (!regionId || (!loads.length && !totals)) return null;
    const options = this.options();
    const panelModelId = this.panelModelId();
    return {
      mode: this.engineMode(),
      regionId,
      autonomyDays: this.autonomyDays(),
      batteryTech: this.batteryTech(),
      ...(loads.length ? { loads } : {}),
      ...(totals ? { totals } : {}),
      ...(options ? { options } : {}),
      ...(panelModelId ? { overrides: { panelModelId } } : {}),
    };
  });

  /** Entrée complète (avec forçages). */
  readonly input = computed<SimulationInput | null>(() => {
    const base = this.baseInput();
    if (!base) return null;
    const overrides = this.overrides();
    return Object.keys(overrides).length
      ? { ...base, overrides: { ...base.overrides, ...overrides } }
      : base;
  });

  readonly hasOverrides = computed(
    () => Object.keys(this.overrides()).length > 0,
  );

  /** Résultat affiché (avec forçages). */
  readonly outcome = computed<SimulationOutcome>(() => this.run(this.input()));
  readonly result = computed(() => {
    const o = this.outcome();
    return o.status === 'ok' ? o.result : undefined;
  });

  /** Proposition automatique, sans forçages (référence du configurateur). */
  readonly proposal = computed<SimulationResult | undefined>(() => {
    if (!this.hasOverrides()) return this.result();
    const o = this.run(this.baseInput());
    return o.status === 'ok' ? o.result : undefined;
  });

  /** Tailles voisines pour les boutons ‹ › du configurateur. */
  readonly neighbors = computed(() => {
    const input = this.input();
    const result = this.result();
    if (!input || !result) return null;
    const catalog = this.catalog();
    const params = this.params();
    const safe = <T>(fn: () => T): T | Record<string, never> => {
      try {
        return fn();
      } catch {
        return {};
      }
    };
    return {
      inverter: safe(() => inverterNeighbors(input, catalog, params, result)),
      storage: safe(() => storageNeighbors(input, catalog, params, result)),
      panels: safe(() => panelCountNeighbors(input, catalog, params, result)),
    };
  });

  constructor() {
    this.hydrate();
    effect(() => this.persist(this.snapshot()));
  }

  // ——— Localisation et mode ———
  setCountry(countryId: string): void {
    if (countryId === this.countryId()) return;
    this.countryId.set(countryId);
    this.regionId.set(this.regions()[0]?.id ?? null);
    this.overrides.set({});
  }

  setRegion(regionId: string): void {
    this.regionId.set(regionId);
    this.overrides.set({});
  }

  setMode(mode: SimulationMode): void {
    if (mode !== this.mode()) this.overrides.set({});
    this.mode.set(mode);
    if (mode === 'particulier') {
      // Les réglages techniques du mode pro ne s'appliquent pas au particulier.
      this.options.set(undefined);
      this.totals.set(undefined);
      this.panelModelId.set(undefined);
    }
  }

  // ——— Besoins ———
  quantityOf(deviceId: string): number {
    return this.quantities().get(deviceId) ?? 0;
  }

  hoursOf(device: Device): number {
    return (
      this.loads().find((l) => l.deviceId === device.id)?.hoursPerDay ??
      device.defaultHoursPerDay
    );
  }

  setQuantity(device: Device, quantity: number): void {
    const q = Math.max(0, Math.min(999, Math.round(quantity)));
    const loads = this.loads();
    const existing = loads.find((l) => l.deviceId === device.id);
    if (existing) {
      this.commitLoads(
        q === 0
          ? loads.filter((l) => l !== existing)
          : loads.map((l) => (l === existing ? { ...l, quantity: q } : l)),
      );
    } else if (q > 0) {
      this.commitLoads([
        ...loads,
        {
          key: device.id,
          deviceId: device.id,
          label: device.name,
          quantity: q,
          hoursPerDay: device.defaultHoursPerDay,
        },
      ]);
    }
  }

  setHours(key: string, hoursPerDay: number): void {
    const h = Math.max(0.1, Math.min(24, hoursPerDay));
    this.commitLoads(
      this.loads().map((l) => (l.key === key ? { ...l, hoursPerDay: h } : l)),
    );
  }

  /** Avance ou recule la durée d'usage d'un cran de `HOUR_STEPS`. */
  stepHours(key: string, direction: 1 | -1): void {
    const load = this.loads().find((l) => l.key === key);
    if (!load) return;
    const next =
      direction > 0
        ? HOUR_STEPS.find((h) => h > load.hoursPerDay + 1e-9)
        : [...HOUR_STEPS].reverse().find((h) => h < load.hoursPerDay - 1e-9);
    if (next !== undefined) this.setHours(key, next);
  }

  /** « Autre appareil » (RF-06), avec sa puissance si elle est connue. */
  addCustom(entry: {
    label: string;
    powerW?: number;
    quantity?: number;
    hoursPerDay: number;
  }): void {
    const key = `custom-${Date.now().toString(36)}-${this.loads().length}`;
    this.commitLoads([
      ...this.loads(),
      {
        key,
        label: entry.label.trim() || 'Autre appareil',
        ...(entry.powerW && entry.powerW > 0
          ? { powerW: Math.round(entry.powerW) }
          : {}),
        quantity: Math.max(1, entry.quantity ?? 1),
        hoursPerDay: entry.hoursPerDay,
      },
    ]);
  }

  setLoadQuantity(key: string, quantity: number): void {
    const q = Math.max(0, Math.round(quantity));
    this.commitLoads(
      q === 0
        ? this.loads().filter((l) => l.key !== key)
        : this.loads().map((l) => (l.key === key ? { ...l, quantity: q } : l)),
    );
  }

  removeLoad(key: string): void {
    this.commitLoads(this.loads().filter((l) => l.key !== key));
  }

  /** Applique tout de suite la saisie temporisée (avant navigation, tests). */
  flush(): void {
    clearTimeout(this.settleTimer);
    this.settleTimer = undefined;
    this.settledLoads.set(this.loads());
  }

  // ——— Autonomie ———
  setAutonomy(days: number): void {
    this.autonomyDays.set(days);
    this.clearStorageOverrides();
  }

  setBatteryTech(tech: BatteryTech): void {
    this.batteryTech.set(tech);
    this.clearStorageOverrides();
  }

  // ——— Pro (L4) ———
  setOptions(options: SimulationInput['options']): void {
    this.options.set(options);
    this.overrides.set({});
  }

  setTotals(totals: SimulationInput['totals']): void {
    this.totals.set(totals);
    this.overrides.set({});
  }

  setPanelModel(panelModelId: string | undefined): void {
    this.panelModelId.set(panelModelId);
    this.overrides.set({});
  }

  /** Ligne pro : appareil du catalogue (puissance typique) ou ligne libre. */
  addProLoad(device?: Device): string {
    const key = `${device ? 'pro-' + device.id : 'custom'}-${Date.now().toString(36)}-${this.loads().length}`;
    this.commitLoads([
      ...this.loads(),
      device
        ? {
            key,
            deviceId: device.id,
            label: device.name,
            powerW: device.powerTypW,
            quantity: 1,
            hoursPerDay: device.defaultHoursPerDay,
            ...(device.surgeFactor && device.surgeFactor !== 1
              ? { surgeFactor: device.surgeFactor }
              : {}),
          }
        : { key, label: '', quantity: 1, hoursPerDay: 1 },
    ]);
    return key;
  }

  /** Modifie une ligne (mode pro : désignation, puissance, k…). */
  updateLoad(key: string, patch: Partial<Omit<LoadEntry, 'key'>>): void {
    this.commitLoads(
      this.loads().map((l) => (l.key === key ? { ...l, ...patch } : l)),
    );
  }

  // ——— Configurateur ———
  applyOverride(patch: Overrides): void {
    this.overrides.update((o) => ({ ...o, ...patch }));
  }

  resetOverrides(): void {
    this.overrides.set({});
  }

  /** Simulation sans la ligne `loadIndex` de l'entrée (« comparer sans »). */
  simulateWithout(loadIndex: number): SimulationResult | undefined {
    const input = this.baseInput();
    if (!input?.loads || input.loads.length < 2) return undefined;
    const loads = input.loads.filter((_, i) => i !== loadIndex);
    const o = this.run({ ...input, loads });
    return o.status === 'ok' ? o.result : undefined;
  }

  /** Recharge un état complet (simulation partagée, L5). */
  restore(state: Partial<Omit<PersistedState, 'v'>>): void {
    this.apply({ ...DEFAULTS, ...state, v: 1 });
  }

  /** Remet la simulation à zéro. */
  reset(): void {
    this.apply(DEFAULTS);
  }

  // ——— Interne ———
  /** En mode pro, une ligne libre sans puissance n'est pas encore calculable. */
  private usable(loads: LoadEntry[]): LoadEntry[] {
    return this.mode() === 'pro'
      ? loads.filter((l) => (l.powerW ?? 0) > 0 || l.deviceId)
      : loads;
  }

  private run(input: SimulationInput | null): SimulationOutcome {
    if (!input) return { status: 'empty' };
    try {
      return {
        status: 'ok',
        result: simulate(input, this.catalog(), this.params()),
      };
    } catch (error) {
      if (error instanceof EngineError) {
        return { status: 'error', code: error.code, message: error.message };
      }
      return {
        status: 'error',
        code: 'UNKNOWN',
        message: 'Le calcul a échoué. Vérifiez votre saisie.',
      };
    }
  }

  private commitLoads(loads: LoadEntry[]): void {
    this.loads.set(loads);
    this.overrides.set({});
    clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => {
      this.settleTimer = undefined;
      this.settledLoads.set(this.loads());
    }, LOADS_DEBOUNCE_MS);
  }

  private clearStorageOverrides(): void {
    const { batteryModelId, batteryParallel, ...rest } = this.overrides();
    if (batteryModelId !== undefined || batteryParallel !== undefined) {
      this.overrides.set(rest);
    }
  }

  private snapshot(): PersistedState {
    return {
      v: 1,
      countryId: this.countryId(),
      regionId: this.regionId(),
      mode: this.mode(),
      loads: this.loads(),
      autonomyDays: this.autonomyDays(),
      batteryTech: this.batteryTech(),
      overrides: this.overrides(),
      options: this.options(),
      totals: this.totals(),
      panelModelId: this.panelModelId(),
    };
  }

  private apply(s: PersistedState): void {
    clearTimeout(this.settleTimer);
    this.countryId.set(s.countryId);
    this.regionId.set(s.regionId);
    this.mode.set(s.mode);
    this.loads.set(s.loads);
    this.settledLoads.set(s.loads);
    this.autonomyDays.set(s.autonomyDays);
    this.batteryTech.set(s.batteryTech);
    this.overrides.set(s.overrides ?? {});
    this.options.set(s.options);
    this.totals.set(s.totals);
    this.panelModelId.set(s.panelModelId);
  }

  private hydrate(): void {
    try {
      const raw = globalThis.sessionStorage?.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      if (parsed?.v !== 1 || !Array.isArray(parsed.loads)) return;
      this.apply({ ...DEFAULTS, ...parsed, v: 1 });
    } catch {
      // Stockage indisponible ou corrompu : on repart des valeurs par défaut.
    }
  }

  private persist(state: PersistedState): void {
    try {
      globalThis.sessionStorage?.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Navigation privée ou quota : la persistance est facultative.
    }
  }
}
