import { TestBed } from '@angular/core/testing';
import {
  MemoryQueueStorage,
  OfflineQueue,
  QUEUE_STORAGE,
} from './offline-queue';
import {
  ApiError,
  NetworkError,
  SimulationApi,
  SimulationPayload,
} from './simulation-api';

const payload = (regionId: string) =>
  ({
    input: {
      mode: 'particulier',
      regionId,
      autonomyDays: 1,
      batteryTech: 'lithium',
    },
    result: {},
  }) as unknown as SimulationPayload;

function setup(save: jest.Mock) {
  const storage = new MemoryQueueStorage();
  TestBed.configureTestingModule({
    providers: [
      { provide: QUEUE_STORAGE, useValue: storage },
      { provide: SimulationApi, useValue: { saveSimulation: save } },
    ],
  });
  return { queue: TestBed.inject(OfflineQueue), storage };
}

describe('OfflineQueue', () => {
  it('met en file puis envoie au retour du réseau', async () => {
    const save = jest.fn().mockRejectedValue(new NetworkError());
    const { queue, storage } = setup(save);
    await queue.enqueue(payload('cm-littoral'));
    await queue.enqueue(payload('cm-centre'));
    expect(queue.pending()).toBe(2);

    // Toujours hors-ligne : la file est conservée, on s'arrête au premier échec.
    expect(await queue.flush()).toBe(0);
    expect(save).toHaveBeenCalledTimes(1);
    expect(queue.pending()).toBe(2);

    save
      .mockReset()
      .mockResolvedValueOnce('tok-1')
      .mockResolvedValueOnce('tok-2');
    expect(await queue.flush()).toBe(2);
    expect(save.mock.calls.map((c) => c[0].input.regionId)).toEqual([
      'cm-littoral',
      'cm-centre',
    ]);
    expect(queue.pending()).toBe(0);
    expect(queue.lastSentToken()).toBe('tok-2');
    expect(await storage.all()).toEqual([]);
    queue.clearLastSent();
    expect(queue.lastSentToken()).toBeNull();
  });

  it('écarte une simulation refusée (4xx) et garde celles en erreur serveur', async () => {
    const save = jest
      .fn()
      .mockRejectedValueOnce(new ApiError(422, 'RESULT_MISMATCH', 'Divergence'))
      .mockRejectedValueOnce(new ApiError(500, 'INTERNAL', 'Erreur'));
    const { queue } = setup(save);
    await queue.enqueue(payload('a'));
    await queue.enqueue(payload('b'));
    expect(await queue.flush()).toBe(0);
    expect(queue.pending()).toBe(1);
  });

  it('ne lance pas deux envois en parallèle', async () => {
    let resolve!: (t: string) => void;
    const save = jest.fn(() => new Promise<string>((r) => (resolve = r)));
    const { queue } = setup(save);
    await queue.enqueue(payload('a'));
    const first = queue.flush();
    const second = queue.flush();
    expect(second).toBe(first);
    await Promise.resolve();
    await Promise.resolve();
    resolve('tok');
    expect(await first).toBe(1);
    expect(save).toHaveBeenCalledTimes(1);
  });
});
