import { TestBed } from '@angular/core/testing';
import { MemoryQueueStorage, QUEUE_STORAGE } from './offline-queue';
import {
  QueuedOfflineError,
  ShareService,
  stateFromInput,
} from './share.service';
import { ApiError, NetworkError, SimulationApi } from './simulation-api';
import { SimulationStore } from './simulation.store';
import { enterDouala } from './test-helpers';

function setup(api: Partial<Record<keyof SimulationApi, jest.Mock>>) {
  const storage = new MemoryQueueStorage();
  TestBed.configureTestingModule({
    providers: [
      { provide: QUEUE_STORAGE, useValue: storage },
      { provide: SimulationApi, useValue: api },
    ],
  });
  const store = TestBed.inject(SimulationStore);
  return { share: TestBed.inject(ShareService), store, storage };
}

describe('ShareService', () => {
  beforeEach(() => sessionStorage.clear());

  it('enregistre la simulation une seule fois et renvoie l’URL /s/:token', async () => {
    const saveSimulation = jest.fn().mockResolvedValue('abc_123');
    const { share, store } = setup({ saveSimulation });
    enterDouala(store);
    const url = await share.shareUrl();
    expect(url).toBe(`${location.origin}/s/abc_123`);
    expect(await share.shareUrl()).toBe(url);
    expect(saveSimulation).toHaveBeenCalledTimes(1);
    const body = saveSimulation.mock.calls[0][0];
    expect(body.input.regionId).toBe('cm-littoral');
    expect(body.result.pv.count).toBe(3);
    expect(share.knownUrl()).toBe(url);
  });

  it('met la simulation en file hors-ligne', async () => {
    const saveSimulation = jest.fn().mockRejectedValue(new NetworkError());
    const { share, store, storage } = setup({ saveSimulation });
    enterDouala(store);
    await expect(share.save()).rejects.toBeInstanceOf(QueuedOfflineError);
    const queued = await storage.all();
    expect(queued).toHaveLength(1);
    expect(queued[0].payload.input.regionId).toBe('cm-littoral');
  });

  it('propage les refus de l’API sans mettre en file', async () => {
    const saveSimulation = jest
      .fn()
      .mockRejectedValue(new ApiError(422, 'RESULT_MISMATCH', 'Divergence'));
    const { share, store, storage } = setup({ saveSimulation });
    enterDouala(store);
    await expect(share.save()).rejects.toBeInstanceOf(ApiError);
    expect(await storage.all()).toHaveLength(0);
  });

  it('refuse une simulation incomplète', async () => {
    const { share } = setup({ saveSimulation: jest.fn() });
    await expect(share.save()).rejects.toThrow('incomplète');
  });

  it('ouvre une simulation partagée et la recharge dans le store', async () => {
    const source = setup({ saveSimulation: jest.fn() });
    enterDouala(source.store);
    const input = source.store.input();
    const result = source.store.result();
    TestBed.resetTestingModule();
    sessionStorage.clear();

    const getSimulation = jest.fn().mockResolvedValue({
      shareToken: 'tok',
      input,
      result,
      engineVersion: '1',
      paramsVersion: '1',
      createdAt: '2026-10-01T10:00:00Z',
    });
    const { share, store } = setup({ getSimulation });
    expect(store.result()).toBeUndefined();
    await share.open('tok');
    expect(getSimulation).toHaveBeenCalledWith('tok');
    expect(store.regionId()).toBe('cm-littoral');
    expect(store.result()?.pv.count).toBe(result?.pv.count);
    expect(store.result()?.battery.capacityWh).toBe(result?.battery.capacityWh);
    expect(share.knownUrl()).toBe(`${location.origin}/s/tok`);
  });

  it('convertit l’entrée moteur en état du store', () => {
    const { store } = setup({});
    const state = stateFromInput(
      {
        mode: 'particulier',
        regionId: 'cm-centre',
        autonomyDays: 2,
        batteryTech: 'plomb',
        loads: [
          { deviceId: 'fridge', label: 'Frigo', quantity: 1, hoursPerDay: 24 },
          { label: 'Pompe', powerW: 500, quantity: 1, hoursPerDay: 2 },
        ],
      },
      store.catalog(),
    );
    expect(state.countryId).toBe('cm');
    expect(state.loads.map((l) => l.key)).toEqual(['fridge', 'custom-2']);
    expect(state.overrides).toEqual({});
  });
});
