import { TestBed } from '@angular/core/testing';
import { DEFAULT_CATALOG, DEFAULT_PARAMETER_SET } from '@simulateur/engine';
import { CatalogService } from './catalog.service';

describe('CatalogService', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  function setup(fetchImpl: jest.Mock): CatalogService {
    globalThis.fetch = fetchImpl as unknown as typeof fetch;
    TestBed.configureTestingModule({});
    return TestBed.inject(CatalogService);
  }

  it('utilise les données du moteur tant que l’API ne répond pas', async () => {
    const service = setup(jest.fn().mockRejectedValue(new Error('offline')));
    expect(service.catalog()).toBe(DEFAULT_CATALOG);
    await service.load();
    expect(service.source()).toBe('default');
    expect(service.params()).toBe(DEFAULT_PARAMETER_SET);
  });

  it('garde le repli sur une réponse en erreur ou invalide', async () => {
    const service = setup(
      jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
    );
    await service.load();
    expect(service.source()).toBe('default');
  });

  it('adopte le catalogue de l’API (GET /api/v1/catalog)', async () => {
    const parameterSet = { ...DEFAULT_PARAMETER_SET, version: 7 };
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...DEFAULT_CATALOG, parameterSet }),
    });
    const service = setup(fetchMock);
    await service.load();
    await service.load();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/catalog');
    expect(service.source()).toBe('api');
    expect(service.params().version).toBe(7);
    expect(service.catalog().regions).toHaveLength(
      DEFAULT_CATALOG.regions.length,
    );
  });
});
