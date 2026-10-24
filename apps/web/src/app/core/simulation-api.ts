import { Injectable, InjectionToken, inject } from '@angular/core';
import type {
  SimulationInput,
  SimulationResult,
} from '@simulateur/shared-types';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => '/api/v1',
});

/** Corps de `POST /simulations` (contrat L2). */
export interface SimulationPayload {
  input: SimulationInput;
  result: SimulationResult;
}

/** Réponse de `GET /simulations/:shareToken` (contrat L2). */
export interface SharedSimulation extends SimulationPayload {
  shareToken: string;
  engineVersion: string;
  paramsVersion: string;
  createdAt: string;
}

/** Corps de `POST /leads` (RF-18, contrat L2). */
export interface LeadPayload {
  name: string;
  phone: string;
  email?: string;
  city?: string;
  message?: string;
  shareToken?: string;
  consent: true;
}

/** Le serveur n'a pas pu être joint (hors-ligne, coupure, DNS…). */
export class NetworkError extends Error {
  constructor() {
    super('Pas de connexion au serveur.');
    this.name = 'NetworkError';
  }
}

/** Réponse d'erreur de l'API : `{ code, message, field? }`. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Accès HTTP aux routes publiques `/simulations` et `/leads` (fetch). */
@Injectable({ providedIn: 'root' })
export class SimulationApi {
  private readonly base = inject(API_BASE_URL);

  async saveSimulation(payload: SimulationPayload): Promise<string> {
    const body = await this.request<{ shareToken: string }>('/simulations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return body.shareToken;
  }

  getSimulation(shareToken: string): Promise<SharedSimulation> {
    return this.request<SharedSimulation>(
      `/simulations/${encodeURIComponent(shareToken)}`,
      { method: 'GET' },
    );
  }

  sendLead(lead: LeadPayload): Promise<{ id: string; createdAt: string }> {
    return this.request('/leads', {
      method: 'POST',
      body: JSON.stringify(lead),
    });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.base}${path}`, {
        ...init,
        headers: {
          Accept: 'application/json',
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        },
      });
    } catch {
      throw new NetworkError();
    }
    const body = (await res.json().catch(() => null)) as
      (T & { code?: string; message?: string; field?: string }) | null;
    if (!res.ok) {
      // 5xx d'une passerelle (Vercel, service worker sans réseau) : réseau.
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        throw new NetworkError();
      }
      throw new ApiError(
        res.status,
        body?.code ?? 'HTTP_ERROR',
        body?.message ?? 'Le serveur a refusé la demande.',
        body?.field,
      );
    }
    return body as T;
  }
}
