import {
  Injectable,
  InjectionToken,
  effect,
  inject,
  signal,
} from '@angular/core';
import { NetworkStatus } from './network-status';
import {
  ApiError,
  NetworkError,
  SimulationApi,
  SimulationPayload,
} from './simulation-api';

/** Simulation faite hors connexion, en attente d'envoi. */
export interface PendingSimulation {
  id?: number;
  queuedAt: string;
  payload: SimulationPayload;
}

/** Stockage de la file (IndexedDB en production, mémoire en test). */
export interface QueueStorage {
  all(): Promise<PendingSimulation[]>;
  add(item: PendingSimulation): Promise<void>;
  remove(id: number): Promise<void>;
}

const DB_NAME = 'simulateur';
const STORE = 'pending-simulations';

/** File persistée dans IndexedDB (base `simulateur`, magasin à clé auto). */
export class IndexedDbQueueStorage implements QueueStorage {
  private db?: Promise<IDBDatabase>;

  constructor(private readonly idb: IDBFactory) {}

  async all(): Promise<PendingSimulation[]> {
    return this.run<PendingSimulation[]>('readonly', (s) => s.getAll());
  }

  async add(item: PendingSimulation): Promise<void> {
    await this.run('readwrite', (s) => s.add(item));
  }

  async remove(id: number): Promise<void> {
    await this.run('readwrite', (s) => s.delete(id));
  }

  private open(): Promise<IDBDatabase> {
    this.db ??= new Promise((resolve, reject) => {
      const req = this.idb.open(DB_NAME, 1);
      req.onupgradeneeded = () =>
        req.result.createObjectStore(STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this.db;
  }

  private async run<T>(
    mode: IDBTransactionMode,
    op: (store: IDBObjectStore) => IDBRequest,
  ): Promise<T> {
    const db = await this.open();
    return new Promise<T>((resolve, reject) => {
      const req = op(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
    });
  }
}

/** File en mémoire : repli sans IndexedDB (tests, navigation privée). */
export class MemoryQueueStorage implements QueueStorage {
  private items: PendingSimulation[] = [];
  private nextId = 1;

  async all(): Promise<PendingSimulation[]> {
    return this.items.map((i) => ({ ...i }));
  }

  async add(item: PendingSimulation): Promise<void> {
    this.items.push({ ...item, id: this.nextId++ });
  }

  async remove(id: number): Promise<void> {
    this.items = this.items.filter((i) => i.id !== id);
  }
}

export const QUEUE_STORAGE = new InjectionToken<QueueStorage>('QUEUE_STORAGE', {
  providedIn: 'root',
  factory: () =>
    globalThis.indexedDB
      ? new IndexedDbQueueStorage(globalThis.indexedDB)
      : new MemoryQueueStorage(),
});

/**
 * File des simulations enregistrées sans réseau : stockées dans IndexedDB,
 * envoyées à `POST /simulations` dès le retour de la connexion.
 */
@Injectable({ providedIn: 'root' })
export class OfflineQueue {
  private readonly storage = inject(QUEUE_STORAGE);
  private readonly api = inject(SimulationApi);
  private readonly network = inject(NetworkStatus);

  private readonly _pending = signal(0);
  private readonly _lastSentToken = signal<string | null>(null);
  /** Nombre de simulations en attente d'envoi. */
  readonly pending = this._pending.asReadonly();
  /** Jeton de la dernière simulation envoyée depuis la file. */
  readonly lastSentToken = this._lastSentToken.asReadonly();

  private flushing?: Promise<number>;

  constructor() {
    effect(() => {
      if (this.network.online()) void this.flush();
    });
  }

  /** Masque l'avis « Simulation enregistrée ». */
  clearLastSent(): void {
    this._lastSentToken.set(null);
  }

  async enqueue(payload: SimulationPayload): Promise<void> {
    await this.storage.add({ queuedAt: new Date().toISOString(), payload });
    await this.refresh();
  }

  /** Envoie les simulations en attente ; renvoie le nombre d'envois réussis. */
  flush(): Promise<number> {
    this.flushing ??= this.send().finally(() => (this.flushing = undefined));
    return this.flushing;
  }

  private async send(): Promise<number> {
    let sent = 0;
    try {
      for (const item of await this.storage.all()) {
        try {
          const token = await this.api.saveSimulation(item.payload);
          this._lastSentToken.set(token);
          sent++;
        } catch (error) {
          // Toujours hors-ligne : on garde la file pour plus tard.
          if (error instanceof NetworkError) break;
          // Refus définitif (4xx) : la simulation ne passera jamais, on l'écarte.
          if (!(error instanceof ApiError) || error.status >= 500) break;
        }
        if (item.id !== undefined) await this.storage.remove(item.id);
      }
    } finally {
      await this.refresh();
    }
    return sent;
  }

  private async refresh(): Promise<void> {
    try {
      this._pending.set((await this.storage.all()).length);
    } catch {
      this._pending.set(0);
    }
  }
}
