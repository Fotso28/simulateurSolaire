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

  it('borne la quantité d’un « Autre appareil » à 999', () => {
    const store = setup();
    store.addCustom({ label: 'Machine à coudre', powerW: 50, hoursPerDay: 2 });
    store.setLoadQuantity(store.loads()[0].key, 5000);
    expect(store.loads()[0].quantity).toBe(999);
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

  describe('mode pro', () => {
    it('addProLoad : ligne du catalogue (puissance typique, k) ou ligne libre', () => {
      const store = setup();
      store.reset();
      store.setMode('pro');
      const fridge = store.catalog().devices.find((d) => d.id === 'fridge')!;
      const k1 = store.addProLoad(fridge);
      const k2 = store.addProLoad();
      expect(k1).not.toBe(k2);
      const [a, b] = store.loads();
      expect(a).toMatchObject({
        deviceId: 'fridge',
        powerW: fridge.powerTypW,
        quantity: 1,
        hoursPerDay: fridge.defaultHoursPerDay,
      });
      if (fridge.surgeFactor && fridge.surgeFactor !== 1) {
        expect(a.surgeFactor).toBe(fridge.surgeFactor);
      }
      expect(b).toMatchObject({ label: '', quantity: 1, hoursPerDay: 1 });
      expect(b.powerW).toBeUndefined();
      store.flush();
      // La ligne libre sans puissance est ignorée par le moteur.
      expect(store.input()?.loads).toHaveLength(1);
      store.updateLoad(k2, { powerW: 50, surgeFactor: 3 });
      store.flush();
      const loads = store.input()?.loads ?? [];
      expect(loads).toHaveLength(2);
      expect(loads[1]).toMatchObject({ powerW: 50, surgeFactor: 3 });
      expect(loads[1].label).toBe('Appareil');
    });

    it('panelModelId : fusionné dans les forçages, persisté, efface le configurateur', () => {
      const store = setup();
      enterDouala(store);
      store.setMode('pro');
      const panel = store
        .catalog()
        .panels.filter((p) => p.active)
        .at(-1)!;
      store.applyOverride({ panelCount: 9 });
      store.setPanelModel(panel.id);
      expect(store.hasOverrides()).toBe(false);
      expect(store.input()?.overrides).toEqual({ panelModelId: panel.id });
      TestBed.tick();
      TestBed.resetTestingModule();
      const again = setup();
      expect(again.panelModelId()).toBe(panel.id);
    });

    it('setMode(particulier) efface options, totaux et panneau', () => {
      const store = setup();
      enterDouala(store);
      store.setMode('pro');
      store.setOptions({ systemVoltage: 48, simultaneity: 0.8 });
      store.setTotals({ powerW: 500, dailyEnergyWh: 3000 });
      store.setPanelModel(store.catalog().panels[0].id);
      expect(store.input()?.totals).toBeDefined();
      store.setMode('pro');
      expect(store.options()).toBeDefined();
      store.setMode('particulier');
      expect(store.options()).toBeUndefined();
      expect(store.totals()).toBeUndefined();
      expect(store.panelModelId()).toBeUndefined();
      expect(store.input()?.overrides).toBeUndefined();
    });
  });
});
