import { TestBed } from '@angular/core/testing';
import {
  LOADS_DEBOUNCE_MS,
  SimulationStore,
  STORAGE_KEY,
} from './simulation.store';
import { enterDouala } from './test-helpers';

function setup(): SimulationStore {
  TestBed.configureTestingModule({});
  return TestBed.inject(SimulationStore);
}

describe('SimulationStore', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => jest.useRealTimers());

  it('démarre sur le Littoral, sans appareil ni résultat', () => {
    const store = setup();
    expect(store.region()?.name).toBe('Littoral');
    expect(store.outcome().status).toBe('empty');
  });

  it('retrouve le cas de référence de Douala', () => {
    const store = setup();
    enterDouala(store);
    const r = store.result();
    expect(r).toBeDefined();
    expect(Math.abs((r?.energyWhPerDay.typ ?? 0) - 3277) / 3277).toBeLessThan(
      0.01,
    );
    expect(r?.pv.count).toBe(3);
    expect(r?.pv.totalWp).toBe(1350);
    expect(r?.inverter.nominalW).toBe(1000);
    expect(r?.battery.modelId).toBe('bat-li-24v-200ah');
    expect((r?.battery.series ?? 0) * (r?.battery.parallel ?? 0)).toBe(1);
  });

  it('temporise la saisie des quantités de 150 ms', () => {
    jest.useFakeTimers();
    const store = setup();
    const led = store.catalog().devices.find((d) => d.id === 'led-bulb');
    if (!led) throw new Error('led');
    store.setQuantity(led, 2);
    expect(store.deviceCount()).toBe(2);
    expect(store.dailyEnergy().typ).toBeGreaterThan(0);
    expect(store.outcome().status).toBe('empty');
    jest.advanceTimersByTime(LOADS_DEBOUNCE_MS);
    expect(store.outcome().status).toBe('ok');
  });

  it('pré-remplit les heures et les fait varier par crans', () => {
    const store = setup();
    const tv = store.catalog().devices.find((d) => d.id === 'tv-32');
    if (!tv) throw new Error('tv');
    store.setQuantity(tv, 1);
    expect(store.hoursOf(tv)).toBe(tv.defaultHoursPerDay);
    store.stepHours('tv-32', 1);
    expect(store.hoursOf(tv)).toBe(6);
    store.setQuantity(tv, 0);
    expect(store.loads()).toHaveLength(0);
  });

  it('accepte un « Autre appareil » sans puissance (puissance estimée)', () => {
    const store = setup();
    store.addCustom({ label: 'Machine à coudre', hoursPerDay: 2 });
    store.flush();
    expect(store.input()?.loads?.[0]).toMatchObject({ powerW: 100 });
    expect(store.outcome().status).toBe('ok');
  });

  it('applique les forçages du configurateur et revient à la proposition', () => {
    const store = setup();
    enterDouala(store);
    const upper = store.neighbors()?.inverter.upper;
    expect(upper).toBeDefined();
    store.applyOverride(upper ?? {});
    expect(store.result()?.inverter.nominalW).toBeGreaterThan(1000);
    expect(store.proposal()?.inverter.nominalW).toBe(1000);
    store.resetOverrides();
    expect(store.hasOverrides()).toBe(false);
    expect(store.result()?.inverter.nominalW).toBe(1000);
  });

  it('change d’autonomie sans garder le stockage forcé', () => {
    const store = setup();
    enterDouala(store);
    store.applyOverride(store.neighbors()?.storage.upper ?? {});
    store.setAutonomy(2);
    expect(store.overrides().batteryModelId).toBeUndefined();
    expect(store.result()?.battery.capacityWh).toBeGreaterThan(4800);
  });

  it('persiste l’état en sessionStorage et le recharge', () => {
    const store = setup();
    enterDouala(store);
    store.setBatteryTech('plomb');
    TestBed.tick();
    const raw = sessionStorage.getItem(STORAGE_KEY);
    expect(raw).toContain('"batteryTech":"plomb"');
    TestBed.resetTestingModule();
    const again = setup();
    expect(again.batteryTech()).toBe('plomb');
    expect(again.deviceCount()).toBe(15);
    expect(again.outcome().status).toBe('ok');
  });

  it('ignore un état stocké corrompu', () => {
    sessionStorage.setItem(STORAGE_KEY, '{oops');
    expect(setup().loads()).toEqual([]);
  });

  it('signale une erreur du moteur sans planter', () => {
    const store = setup();
    store.regionId.set('inconnue');
    store.addCustom({ label: 'x', powerW: 10, hoursPerDay: 1 });
    store.flush();
    expect(store.outcome().status).toBe('empty');
  });
});
