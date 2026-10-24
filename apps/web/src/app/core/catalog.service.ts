import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { DEFAULT_CATALOG, DEFAULT_PARAMETER_SET } from '@simulateur/engine';
import type { Catalog, ParameterSet } from '@simulateur/shared-types';

/** Réponse de `GET /api/v1/catalog` (contrat L2). */
export type CatalogResponse = Catalog & { parameterSet: ParameterSet };

export const CATALOG_URL = new InjectionToken<string>('CATALOG_URL', {
  providedIn: 'root',
  factory: () => '/api/v1/catalog',
});

export type CatalogSource = 'default' | 'api';

/**
 * Catalogue et paramètres de calcul.
 * Démarre sur les données embarquées du moteur (`DEFAULT_CATALOG`,
 * `DEFAULT_PARAMETER_SET`) pour que la simulation marche tout de suite, même
 * hors-ligne, puis les remplace par la réponse de l'API si elle arrive.
 * Point d'extension L5 : le service worker met cette réponse en cache (ETag).
 */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly url = inject(CATALOG_URL);

  private readonly _catalog = signal<Catalog>(DEFAULT_CATALOG);
  private readonly _params = signal<ParameterSet>(DEFAULT_PARAMETER_SET);
  private readonly _source = signal<CatalogSource>('default');

  readonly catalog = this._catalog.asReadonly();
  readonly params = this._params.asReadonly();
  readonly source = this._source.asReadonly();

  private pending?: Promise<void>;

  /** Charge le catalogue de l'API une seule fois ; garde le repli en cas d'échec. */
  load(): Promise<void> {
    this.pending ??= this.fetchCatalog();
    return this.pending;
  }

  private async fetchCatalog(): Promise<void> {
    if (typeof fetch !== 'function') return;
    try {
      const res = await fetch(this.url, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return;
      const body = (await res.json()) as Partial<CatalogResponse>;
      if (!isCatalogResponse(body)) return;
      const { parameterSet, ...catalog } = body;
      this._catalog.set(catalog);
      this._params.set(parameterSet);
      this._source.set('api');
    } catch {
      // API indisponible : on garde les données embarquées.
    }
  }
}

function isCatalogResponse(
  body: Partial<CatalogResponse> | null,
): body is CatalogResponse {
  return (
    !!body &&
    Array.isArray(body.countries) &&
    Array.isArray(body.regions) &&
    body.regions.length > 0 &&
    Array.isArray(body.devices) &&
    Array.isArray(body.deviceCategories) &&
    Array.isArray(body.panels) &&
    Array.isArray(body.batteries) &&
    Array.isArray(body.inverters) &&
    Array.isArray(body.controllers) &&
    Array.isArray(body.cableSections) &&
    Array.isArray(body.protectionRatings) &&
    !!body.parameterSet?.values
  );
}
