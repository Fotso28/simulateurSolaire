import { Injectable, inject } from '@angular/core';
import type { Catalog, SimulationInput } from '@simulateur/shared-types';
import { OfflineQueue } from './offline-queue';
import { LoadEntry, SimulationStore } from './simulation.store';
import {
  NetworkError,
  SharedSimulation,
  SimulationApi,
  SimulationPayload,
} from './simulation-api';

/** La simulation est en file d'attente : elle partira au retour du réseau. */
export class QueuedOfflineError extends Error {
  constructor() {
    super(
      'Vous êtes hors ligne : la simulation sera enregistrée dès le retour du réseau.',
    );
    this.name = 'QueuedOfflineError';
  }
}

/** Convertit l'entrée moteur d'une simulation partagée en état du store. */
export function stateFromInput(input: SimulationInput, catalog: Catalog) {
  const region = catalog.regions.find((r) => r.id === input.regionId);
  const loads: LoadEntry[] = (input.loads ?? []).map((l, i) => ({
    key: l.deviceId ?? `custom-${i + 1}`,
    deviceId: l.deviceId,
    label: l.label,
    powerW: l.powerW,
    quantity: l.quantity,
    hoursPerDay: l.hoursPerDay,
  }));
  return {
    countryId: region?.countryId ?? catalog.countries[0]?.id ?? 'cm',
    regionId: input.regionId,
    mode: input.mode,
    loads,
    autonomyDays: input.autonomyDays,
    batteryTech: input.batteryTech,
    overrides: input.overrides ?? {},
    options: input.options,
    totals: input.totals,
  };
}

/**
 * Enregistrement et partage des simulations (RF-17) : `POST /simulations`
 * renvoie un jeton, l'URL publique est `/s/:token`. Hors-ligne, la simulation
 * part dans la file IndexedDB.
 */
@Injectable({ providedIn: 'root' })
export class ShareService {
  private readonly api = inject(SimulationApi);
  private readonly queue = inject(OfflineQueue);
  private readonly store = inject(SimulationStore);
  /** Jetons déjà obtenus, par simulation : pas de doublon en base. */
  private readonly tokens = new Map<string, string>();

  /** Charge utile de la simulation courante, ou `null` si incomplète. */
  currentPayload(): SimulationPayload | null {
    this.store.flush();
    const input = this.store.input();
    const result = this.store.result();
    return input && result ? { input, result } : null;
  }

  /** Enregistre la simulation courante et renvoie son jeton de partage. */
  async save(): Promise<string> {
    const payload = this.currentPayload();
    if (!payload) throw new Error('Simulation incomplète.');
    const key = JSON.stringify(payload.input);
    const known = this.tokens.get(key);
    if (known) return known;
    try {
      const token = await this.api.saveSimulation(payload);
      this.tokens.set(key, token);
      return token;
    } catch (error) {
      if (error instanceof NetworkError) {
        await this.queue.enqueue(payload);
        throw new QueuedOfflineError();
      }
      throw error;
    }
  }

  /** Enregistre la simulation et renvoie l'URL publique `/s/:token`. */
  async shareUrl(): Promise<string> {
    return this.urlFor(await this.save());
  }

  /** URL déjà obtenue pour la simulation courante, sans appel réseau. */
  knownUrl(): string | undefined {
    const payload = this.currentPayload();
    const token = payload && this.tokens.get(JSON.stringify(payload.input));
    return token ? this.urlFor(token) : undefined;
  }

  urlFor(token: string): string {
    const origin = globalThis.location?.origin ?? '';
    return `${origin}/s/${encodeURIComponent(token)}`;
  }

  /** Charge une simulation partagée et la recharge dans le store. */
  async open(token: string): Promise<SharedSimulation> {
    const shared = await this.api.getSimulation(token);
    this.store.restore(stateFromInput(shared.input, this.store.catalog()));
    this.tokens.set(JSON.stringify(shared.input), shared.shareToken);
    return shared;
  }
}
