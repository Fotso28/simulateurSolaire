import type { Catalog, SimulationInput } from '@simulateur/shared-types';
import {
  DEFAULT_CATALOG,
  DEFAULT_PARAMETER_SET,
  DEFAULT_ENGINE_PARAMETERS,
} from '../data';
import { EngineError } from '../lib/errors';
import { resolveParameters } from '../lib/params';
import { selectSystemVoltage } from '../lib/sizing';
import { neighborAutonomySteps, simulate } from '../lib/simulate';
import { DOUALA, EBOLOWA_LEAD, GAROUA_TOTALS } from './fixtures';

const run = (input: SimulationInput, catalog: Catalog = DEFAULT_CATALOG) =>
  simulate(input, catalog, DEFAULT_PARAMETER_SET);

function expectEngineError(fn: () => unknown, code: string): void {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(EngineError);
    expect((error as EngineError).code).toBe(code);
    expect((error as EngineError).message.length).toBeGreaterThan(0);
    return;
  }
  throw new Error(`EngineError ${code} attendue`);
}

const codes = (input: SimulationInput) => run(input).alerts.map((a) => a.code);

describe('alertes', () => {
  it('onduleur forcé trop petit → critique, en tête de liste', () => {
    const r = run({ ...DOUALA, overrides: { inverterId: 'inv-sa-12v-300' } });
    expect(r.systemVoltage).toBe(12);
    expect(r.alerts[0]).toEqual({
      level: 'critique',
      code: 'INVERTER_UNDERSIZED',
      message: "L'onduleur ne peut pas alimenter tous les appareils.",
    });
  });

  it('stockage sous une nuit → attention', () => {
    const r = run({ ...GAROUA_TOTALS, overrides: { batteryParallel: 1 } });
    expect(r.effectiveAutonomyDays).toBeLessThan(0.5);
    expect(
      r.alerts.find((a) => a.code === 'AUTONOMY_BELOW_ONE_NIGHT'),
    ).toMatchObject({
      level: 'attention',
      message: 'Le stockage ne couvre pas une nuit.',
    });
  });

  it('couverture solaire < 100 % → attention', () => {
    const r = run({ ...DOUALA, overrides: { panelCount: 2 } });
    expect(r.pv.count).toBe(2);
    expect(r.pvCoverage).toBeCloseTo(0.769, 2);
    expect(r.alerts.find((a) => a.code === 'PV_COVERAGE_LOW')?.level).toBe(
      'attention',
    );
  });

  it('appareil de plus de 1 500 W → information avec l’index de la ligne', () => {
    const loads = [
      ...(DOUALA.loads ?? []),
      {
        deviceId: 'iron',
        label: 'Fer à repasser',
        quantity: 1,
        hoursPerDay: 0.5,
      },
      {
        deviceId: 'kettle',
        label: 'Bouilloire',
        powerW: 1200,
        quantity: 1,
        hoursPerDay: 0.2,
      },
    ];
    const r = run({ ...DOUALA, loads });
    const heavy = r.alerts.filter((a) => a.code === 'HEAVY_DEVICE');
    expect(heavy).toEqual([
      {
        level: 'info',
        code: 'HEAVY_DEVICE',
        message: 'Cet appareil pèse lourd : comparez sans lui.',
        loadIndex: 7,
      },
    ]);
  });

  it('saison des pluies : toujours présente, en dernier', () => {
    const list = codes(GAROUA_TOTALS);
    expect(list[list.length - 1]).toBe('RAINY_SEASON');
  });

  it('les variantes recalculent les alertes', () => {
    const r = run({
      ...DOUALA,
      autonomyDays: 0.5,
      overrides: { batteryModelId: 'bat-li-24v-100ah' },
    });
    expect(r.variants.lower).toBeUndefined();
    expect(r.variants.upper?.alerts?.map((a) => a.code)).toEqual([
      'RAINY_SEASON',
    ]);
  });
});

describe('forçages du configurateur', () => {
  it('onduleur imposé', () => {
    const r = run({ ...DOUALA, overrides: { inverterId: 'inv-sa-24v-2000' } });
    expect(r.inverter).toEqual({ modelId: 'inv-sa-24v-2000', nominalW: 2000 });
    expect(r.alerts.map((a) => a.code)).toEqual(['RAINY_SEASON']);
    expect(r.protections.find((p) => p.type === 'battery_fuse')?.ratingA).toBe(
      125,
    );
  });

  it('onduleur hybride imposé : MPPT intégré, pas de régulateur', () => {
    const r = run({ ...DOUALA, overrides: { inverterId: 'inv-hy-24v-2000' } });
    expect(r.controller).toBeUndefined();
    expect(r.pv).toMatchObject({ count: 3, series: 1, strings: 3 });
    expect(r.protections.find((p) => p.type === 'string_fuse')).toEqual({
      type: 'string_fuse',
      ratingA: 15,
      quantity: 3,
    });
  });

  it('modèle de batterie imposé, branches recalculées', () => {
    const r = run({
      ...DOUALA,
      overrides: { batteryModelId: 'bat-li-12v-200ah' },
    });
    expect(r.battery).toEqual({
      modelId: 'bat-li-12v-200ah',
      series: 2,
      parallel: 1,
      capacityWh: 4800,
    });
  });

  it('batterie imposée d’une autre technologie : DoD de sa technologie', () => {
    const r = run({
      ...DOUALA,
      overrides: { batteryModelId: 'bat-pb-12v-200ah' },
    });
    expect(r.battery).toMatchObject({ series: 2, parallel: 2 });
    expect(r.effectiveAutonomyDays).toBeCloseTo(
      (400 * 24 * 0.5 * 0.9) / 3277,
      3,
    );
  });

  it('nombre de branches imposé', () => {
    const r = run({ ...DOUALA, overrides: { batteryParallel: 2 } });
    expect(r.battery.parallel).toBe(2);
    expect(r.effectiveAutonomyDays).toBeCloseTo(2.109, 2);
  });

  it('modèle de panneau imposé', () => {
    const r = run({ ...DOUALA, overrides: { panelModelId: 'panel-550' } });
    expect(r.pv).toMatchObject({
      panelModelId: 'panel-550',
      count: 3,
      totalWp: 1650,
    });
  });

  it('nombre de panneaux imposé : répartition valide, fusibles de chaîne', () => {
    const r = run({ ...DOUALA, overrides: { panelCount: 5 } });
    expect(r.pv).toMatchObject({ count: 5, series: 1, strings: 5 });
    expect(r.controller?.modelId).toBe('mppt-150a-250v');
    expect(r.protections.find((p) => p.type === 'string_fuse')?.quantity).toBe(
      5,
    );
  });

  it('batterie incompatible avec la tension → erreur explicite', () => {
    expectEngineError(
      () =>
        run({ ...DOUALA, overrides: { batteryModelId: 'bat-li-48v-100ah' } }),
      'NO_COMPATIBLE_BATTERY',
    );
  });

  it('identifiants inconnus → OVERRIDE_NOT_FOUND', () => {
    for (const overrides of [
      { inverterId: 'x' },
      { batteryModelId: 'x' },
      { panelModelId: 'x' },
    ]) {
      expectEngineError(
        () => run({ ...DOUALA, overrides }),
        'OVERRIDE_NOT_FOUND',
      );
    }
  });

  it('hybride imposé dont le MPPT ne suffit pas → erreur explicite', () => {
    expectEngineError(
      () => run({ ...DOUALA, overrides: { inverterId: 'inv-hy-12v-1000' } }),
      'NO_COMPATIBLE_CONTROLLER',
    );
  });
});

describe('options', () => {
  it('tension imposée', () => {
    const r = run({ ...DOUALA, options: { systemVoltage: 48 } });
    expect(r.systemVoltage).toBe(48);
    expect(r.inverter.nominalW).toBe(3000);
  });

  it('tension imposée sans matériel → erreur explicite', () => {
    expectEngineError(
      () =>
        run({
          ...GAROUA_TOTALS,
          options: { inverterType: 'hybride', systemVoltage: 12 },
        }),
      'NO_COMPATIBLE_INVERTER',
    );
  });

  it('tension automatique : passe à la tension supérieure si le matériel manque', () => {
    const r = run({
      ...GAROUA_TOTALS,
      totals: { powerW: 2000, dailyEnergyWh: 8000 },
    });
    expect(r.systemVoltage).toBe(48);
    expect(r.inverter.modelId).toBe('inv-hy-48v-3000');
    expect(r.peakW.surge).toBe(2000);
  });

  it('coefficient de simultanéité', () => {
    const r = run({ ...DOUALA, options: { simultaneity: 0.5 } });
    expect(r.peakW).toEqual({ installed: 217.5, surge: 577.5 });
  });

  it('longueurs de câbles personnalisées', () => {
    const r = run({
      ...DOUALA,
      options: { cableLengthsM: { inverter_board: 200 } },
    });
    expect(
      r.cables.find((c) => c.segment === 'inverter_board')?.sectionMm2,
    ).toBe(10);
    expect(
      r.cables.find((c) => c.segment === 'pv_controller')?.sectionMm2,
    ).toBe(4);
  });

  it('câble trop long → erreur explicite', () => {
    expectEngineError(
      () =>
        run({ ...DOUALA, options: { cableLengthsM: { pv_controller: 5000 } } }),
      'NO_CABLE_SECTION',
    );
  });

  it('mode pro sans puissance saisie : puissance typique du catalogue', () => {
    const r = run({ ...EBOLOWA_LEAD, mode: 'pro' });
    expect(r.energyWhPerDay).toEqual({ min: 2364, typ: 2364, max: 2364 });
  });

  it('appareil libre (sans deviceId) : taux et facteur de démarrage à 1', () => {
    const r = run({
      ...DOUALA,
      loads: [{ label: 'Machine', powerW: 200, quantity: 2, hoursPerDay: 5 }],
    });
    expect(r.energyWhPerDay.typ).toBe(2000);
    expect(r.peakW).toEqual({ installed: 400, surge: 400 });
  });

  it('les lignes à quantité nulle sont ignorées', () => {
    const loads = [
      ...(DOUALA.loads ?? []),
      { deviceId: 'ac-2hp', label: 'Clim', quantity: 0, hoursPerDay: 6 },
    ];
    expect(run({ ...DOUALA, loads }).peakW.surge).toBe(795);
  });
});

describe('cas limites et erreurs', () => {
  it('liste vide → NO_LOADS', () => {
    expectEngineError(() => run({ ...DOUALA, loads: [] }), 'NO_LOADS');
    expectEngineError(() => run({ ...DOUALA, loads: undefined }), 'NO_LOADS');
    expectEngineError(
      () =>
        run({
          ...DOUALA,
          loads: [
            {
              deviceId: 'fan',
              label: 'Ventilateur',
              quantity: 0,
              hoursPerDay: 8,
            },
          ],
        }),
      'NO_LOADS',
    );
  });

  it('énergie nulle → ZERO_ENERGY', () => {
    expectEngineError(
      () =>
        run({ ...GAROUA_TOTALS, totals: { powerW: 500, dailyEnergyWh: 0 } }),
      'ZERO_ENERGY',
    );
    expectEngineError(
      () =>
        run({
          ...DOUALA,
          loads: [
            {
              deviceId: 'fan',
              label: 'Ventilateur',
              quantity: 1,
              hoursPerDay: 0,
            },
          ],
        }),
      'ZERO_ENERGY',
    );
  });

  it('région ou appareil inconnus', () => {
    expectEngineError(
      () => run({ ...DOUALA, regionId: 'nope' }),
      'REGION_NOT_FOUND',
    );
    expectEngineError(
      () =>
        run({
          ...DOUALA,
          loads: [
            { deviceId: 'nope', label: 'X', quantity: 1, hoursPerDay: 1 },
          ],
        }),
      'DEVICE_NOT_FOUND',
    );
  });

  it.each<[string, Partial<SimulationInput>]>([
    ['mode', { mode: 'autre' as never }],
    ['autonomie', { autonomyDays: 0 }],
    ['technologie', { batteryTech: 'nickel' as never }],
    ['simultanéité', { options: { simultaneity: 0 } }],
    ['totaux négatifs', { totals: { powerW: -1, dailyEnergyWh: 100 } }],
    [
      'facteur de démarrage < 1',
      { totals: { powerW: 100, dailyEnergyWh: 100, surgeFactor: 0.5 } },
    ],
    ['panneaux forcés', { overrides: { panelCount: 0 } }],
    ['branches forcées', { overrides: { batteryParallel: 1.5 } }],
    [
      'longueur de câble',
      { options: { cableLengthsM: { inverter_board: -1 } } },
    ],
    [
      'puissance manquante',
      { loads: [{ label: 'X', quantity: 1, hoursPerDay: 1 }] },
    ],
    [
      'puissance négative',
      { loads: [{ label: 'X', powerW: -5, quantity: 1, hoursPerDay: 1 }] },
    ],
    [
      'quantité négative',
      { loads: [{ label: 'X', powerW: 5, quantity: -1, hoursPerDay: 1 }] },
    ],
    [
      'plus de 24 h',
      { loads: [{ label: 'X', powerW: 5, quantity: 1, hoursPerDay: 25 }] },
    ],
  ])('entrée invalide (%s) → INVALID_INPUT', (_, patch) => {
    expectEngineError(() => run({ ...DOUALA, ...patch }), 'INVALID_INPUT');
  });

  it('région sans ensoleillement → INVALID_INPUT', () => {
    const catalog = {
      ...DEFAULT_CATALOG,
      regions: DEFAULT_CATALOG.regions.map((r) => ({
        ...r,
        irradiationAvg: 0,
      })),
    };
    expectEngineError(() => run(DOUALA, catalog), 'INVALID_INPUT');
  });

  it.each<[string, Partial<Catalog>, string]>([
    ['panneaux', { panels: [] }, 'NO_PANEL'],
    ['onduleurs', { inverters: [] }, 'NO_COMPATIBLE_INVERTER'],
    ['régulateurs', { controllers: [] }, 'NO_COMPATIBLE_CONTROLLER'],
    ['batteries', { batteries: [] }, 'NO_COMPATIBLE_BATTERY'],
    ['sections de câble', { cableSections: [] }, 'NO_CABLE_SECTION'],
    ['calibres', { protectionRatings: [] }, 'NO_PROTECTION_RATING'],
  ])('aucun matériel compatible (%s) → erreur explicite', (_, patch, code) => {
    expectEngineError(
      () => run(DOUALA, { ...DEFAULT_CATALOG, ...patch }),
      code,
    );
  });

  it('besoin hors catalogue → NO_COMPATIBLE_INVERTER', () => {
    expectEngineError(
      () =>
        run({
          ...GAROUA_TOTALS,
          options: {},
          totals: { powerW: 100000, dailyEnergyWh: 5000 },
        }),
      'NO_COMPATIBLE_INVERTER',
    );
  });

  it('pays absent : sortie à 230 V', () => {
    const r = run(DOUALA, { ...DEFAULT_CATALOG, countries: [] });
    expect(
      r.cables.find((c) => c.segment === 'inverter_board')?.currentA,
    ).toBeCloseTo(5.43, 2);
  });

  it('borne de fourchette sans matériel : seule l’énergie est renseignée', () => {
    const catalog = {
      ...DEFAULT_CATALOG,
      inverters: DEFAULT_CATALOG.inverters.filter((i) => i.dcVoltageV === 12),
    };
    const r = run(EBOLOWA_LEAD, catalog);
    expect(r.inverter.nominalW).toBe(600);
    expect(r.range?.max).toEqual({
      energyWhPerDay: { min: 3300, typ: 3300, max: 3300 },
    });
    expect(r.range?.min.inverter?.nominalW).toBe(300);
  });
});

describe('paramètres', () => {
  it('complète un jeu partiel avec les valeurs par défaut', () => {
    const p = resolveParameters({
      performanceRatio: 0.75,
      defaultCableLengthsM: { pv_controller: 20 } as never,
    });
    expect(p.performanceRatio).toBe(0.75);
    expect(p.dodLithium).toBe(0.8);
    expect(p.defaultCableLengthsM).toEqual({
      ...DEFAULT_ENGINE_PARAMETERS.defaultCableLengthsM,
      pv_controller: 20,
    });
    expect(resolveParameters(undefined)).toEqual(DEFAULT_ENGINE_PARAMETERS);
  });

  it('paramsVersion reprend la version du jeu', () => {
    const r = simulate(DOUALA, DEFAULT_CATALOG, {
      ...DEFAULT_PARAMETER_SET,
      version: 7,
    });
    expect(r.paramsVersion).toBe(7);
  });

  it('seuils de tension système', () => {
    const p = DEFAULT_ENGINE_PARAMETERS;
    expect(selectSystemVoltage(960, 1000, p)).toBe(12);
    expect(selectSystemVoltage(961, 900, p)).toBe(24);
    expect(selectSystemVoltage(500, 1001, p)).toBe(24);
    expect(selectSystemVoltage(2400, 2500, p)).toBe(24);
    expect(selectSystemVoltage(2401, 2000, p)).toBe(48);
    expect(selectSystemVoltage(100, 2501, p)).toBe(48);
  });

  it('paliers d’autonomie voisins', () => {
    const steps = DEFAULT_ENGINE_PARAMETERS.autonomySteps;
    expect(neighborAutonomySteps(1, steps)).toEqual({ lower: 0.5, upper: 1.5 });
    expect(neighborAutonomySteps(2.5, steps)).toEqual({ lower: 2, upper: 3 });
    expect(neighborAutonomySteps(0.5, steps)).toEqual({
      lower: undefined,
      upper: 1,
    });
    expect(neighborAutonomySteps(3, steps)).toEqual({
      lower: 2,
      upper: undefined,
    });
  });
});
