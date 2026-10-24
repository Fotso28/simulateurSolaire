import type { SimulationResult } from '@simulateur/shared-types';
import { DEFAULT_CATALOG, DEFAULT_PARAMETER_SET } from '../data';
import { voltageDropSection } from '../lib/sizing';
import { simulate } from '../lib/simulate';
import { DOUALA, EBOLOWA_LEAD, GAROUA_TOTALS, YAOUNDE_AC } from './fixtures';

/** Égalité à 1 % près (tolérance exigée par le TRD). */
function expectWithin1pct(actual: number | undefined, expected: number): void {
  expect(actual).toBeDefined();
  expect(Math.abs((actual as number) - expected)).toBeLessThanOrEqual(
    Math.abs(expected) * 0.01,
  );
}

const run = (input: typeof DOUALA) =>
  simulate(input, DEFAULT_CATALOG, DEFAULT_PARAMETER_SET);
const cable = (r: Partial<SimulationResult>, segment: string) =>
  r.cables?.find((c) => c.segment === segment);
const protection = (r: SimulationResult, type: string) =>
  r.protections.find((p) => p.type === type);

describe('cas de référence du TRD : maison à Douala', () => {
  const r = run(DOUALA);
  const H = 4.0;
  const PR = 0.7;

  it('énergie journalière : 3 277 Wh', () => {
    expectWithin1pct(r.energyWhPerDay.typ, 3277);
    expectWithin1pct(r.energyWhPerDay.min, 3277);
    expectWithin1pct(r.energyWhPerDay.max, 3277);
  });

  it('puissance de pointe : 435 W installés, 795 W au démarrage', () => {
    expectWithin1pct(r.peakW.installed, 435);
    expectWithin1pct(r.peakW.surge, 795);
  });

  it('champ solaire requis : 1 170 Wc', () => {
    expectWithin1pct(r.energyWhPerDay.typ / (H * PR), 1170);
  });

  it('tension système : 24 V', () => {
    expect(r.systemVoltage).toBe(24);
  });

  it('onduleur : 1 000 W, 24 V', () => {
    expect(r.inverter).toEqual({ modelId: 'inv-sa-24v-1000', nominalW: 1000 });
  });

  it('panneaux : 3 × 450 Wc = 1 350 Wc, 3 en série', () => {
    expect(r.pv).toEqual({
      panelModelId: 'panel-450',
      count: 3,
      series: 3,
      strings: 1,
      totalWp: 1350,
    });
  });

  it('régulateur : 70,3 A → MPPT 80 A / 250 V ; 1,1 × 3 × 49,5 = 163 V', () => {
    expect(r.controller?.modelId).toBe('mppt-80a-250v');
    expectWithin1pct(r.controller?.currentA, 70.3);
    expectWithin1pct(1.1 * r.pv.series * 49.5, 163);
  });

  it('batteries : 4 551 Wh soit 190 Ah → 1 × 24 V 200 Ah', () => {
    expectWithin1pct((r.energyWhPerDay.typ * 1) / (0.8 * 0.9), 4551);
    expectWithin1pct(4551 / 24, 190);
    expect(r.battery).toEqual({
      modelId: 'bat-li-24v-200ah',
      series: 1,
      parallel: 1,
      capacityWh: 4800,
    });
  });

  it('autonomie effective : 1,05 jour', () => {
    expectWithin1pct(r.effectiveAutonomyDays, 1.05);
  });

  it('couverture solaire : 115 %', () => {
    expectWithin1pct(r.pvCoverage, 1.15);
  });

  it('câble panneaux → régulateur : 14,5 A, 124,5 V, 2,6 mm² → 4 mm²', () => {
    const c = cable(r, 'pv_controller');
    expectWithin1pct(c?.currentA, 14.5);
    expectWithin1pct(r.pv.series * 41.5, 124.5);
    expectWithin1pct(voltageDropSection(0.0225, 15, 14.5, 0.03, 124.5), 2.6);
    expect(c?.sectionMm2).toBe(4);
  });

  it('câble régulateur → batteries : 70,3 A, 8,8 mm² → 10 mm²', () => {
    const c = cable(r, 'controller_battery');
    expectWithin1pct(c?.currentA, 70.3);
    expectWithin1pct(voltageDropSection(0.0225, 2, 70.3, 0.03, 24), 8.8);
    expect(c?.sectionMm2).toBe(10);
  });

  it('câble batteries → onduleur : 57,9 A, 7,2 mm² → 10 mm²', () => {
    const c = cable(r, 'battery_inverter');
    expectWithin1pct(c?.currentA, 57.9);
    expectWithin1pct(voltageDropSection(0.0225, 2, 57.9, 0.03, 24), 7.2);
    expect(c?.sectionMm2).toBe(10);
  });

  it('protection batterie : 57,9 A → fusible 63 A', () => {
    expect(protection(r, 'battery_fuse')?.ratingA).toBe(63);
  });

  it('variante 0,5 jour : 95 Ah requis, 1 × 100 Ah, autonomie 0,53 jour', () => {
    expectWithin1pct((3277 * 0.5) / 0.72 / 24, 95);
    expect(r.variants.lower?.battery).toEqual({
      modelId: 'bat-li-24v-100ah',
      series: 1,
      parallel: 1,
      capacityWh: 2400,
    });
    expectWithin1pct(r.variants.lower?.effectiveAutonomyDays, 0.53);
  });

  it('variante 1,5 jour : 284 Ah requis, 3 × 100 Ah, autonomie 1,58 jour', () => {
    expectWithin1pct((3277 * 1.5) / 0.72 / 24, 284);
    expect(r.variants.upper?.battery).toEqual({
      modelId: 'bat-li-24v-100ah',
      series: 1,
      parallel: 3,
      capacityWh: 7200,
    });
    expectWithin1pct(r.variants.upper?.effectiveAutonomyDays, 1.58);
  });

  it('variantes : seules les batteries changent', () => {
    for (const v of [r.variants.lower, r.variants.upper]) {
      expect(v).toBeDefined();
      expect(v?.pv).toBeUndefined();
      expect(v?.inverter).toBeUndefined();
      expect(v?.controller).toBeUndefined();
    }
  });

  it('versions et alertes', () => {
    expect(r.engineVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(r.paramsVersion).toBe(1);
    expect(r.alerts.map((a) => a.code)).toEqual(['RAINY_SEASON']);
  });

  it('même résultat en mode pro par appareils', () => {
    const pro = run({ ...DOUALA, mode: 'pro' });
    expect(pro.pv).toEqual(r.pv);
    expect(pro.battery).toEqual(r.battery);
    expect(pro.inverter).toEqual(r.inverter);
    expect(pro.range).toBeUndefined();
  });

  it('s’exécute en moins de 5 ms', () => {
    run(DOUALA);
    const n = 50;
    const start = performance.now();
    for (let i = 0; i < n; i++) run(DOUALA);
    expect((performance.now() - start) / n).toBeLessThan(5);
  });
});

describe('cas 2 : système 48 V avec climatiseur (Yaoundé)', () => {
  const r = run(YAOUNDE_AC);

  it('énergie, pointe et tension', () => {
    expectWithin1pct(r.energyWhPerDay.typ, 10742);
    expectWithin1pct(r.peakW.installed, 1942);
    expectWithin1pct(r.peakW.surge, 4442);
    expect(r.systemVoltage).toBe(48);
  });

  it('équipements', () => {
    expect(r.inverter).toEqual({ modelId: 'inv-sa-48v-3000', nominalW: 3000 });
    expect(r.pv).toMatchObject({
      count: 8,
      series: 4,
      strings: 2,
      totalWp: 3600,
    });
    expect(r.controller?.modelId).toBe('mppt-100a-250v');
    expectWithin1pct(r.controller?.currentA, 93.75);
    expect(r.battery).toEqual({
      modelId: 'bat-li-48v-200ah',
      series: 1,
      parallel: 2,
      capacityWh: 19200,
    });
    expectWithin1pct(r.effectiveAutonomyDays, 1.287);
    expectWithin1pct(r.pvCoverage, 1.056);
  });

  it('câbles et protections', () => {
    expect(r.cables.map((c) => c.sectionMm2)).toEqual([4, 16, 16, 1.5]);
    expectWithin1pct(cable(r, 'battery_inverter')?.currentA, 86.81);
    expect(protection(r, 'battery_fuse')?.ratingA).toBe(100);
    expect(protection(r, 'controller_battery_fuse')?.ratingA).toBe(100);
    expect(protection(r, 'ac_breaker')?.ratingA).toBe(20);
    expect(protection(r, 'dc_disconnect')?.ratingA).toBe(32);
    expect(protection(r, 'string_fuse')).toBeUndefined();
    expect(protection(r, 'mounting_structure')?.quantity).toBe(8);
  });

  it('variantes 0,5 et 1,5 jour', () => {
    expect(r.variants.lower?.battery).toMatchObject({
      modelId: 'bat-li-48v-200ah',
      parallel: 1,
    });
    expectWithin1pct(r.variants.lower?.effectiveAutonomyDays, 0.643);
    expect(r.variants.upper?.battery).toMatchObject({
      modelId: 'bat-li-48v-100ah',
      parallel: 5,
    });
    expectWithin1pct(r.variants.upper?.effectiveAutonomyDays, 1.609);
  });
});

describe('cas 3 : professionnel en puissance totale (Garoua, hybride)', () => {
  const r = run(GAROUA_TOTALS);

  it('énergie et pointe saisies', () => {
    expect(r.energyWhPerDay).toEqual({ min: 6000, typ: 6000, max: 6000 });
    expect(r.peakW).toEqual({ installed: 1800, surge: 2700 });
    expect(r.systemVoltage).toBe(24);
    expect(r.range).toBeUndefined();
  });

  it('onduleur hybride : pas de régulateur séparé', () => {
    expect(r.inverter).toEqual({ modelId: 'inv-hy-24v-3000', nominalW: 3000 });
    expect(r.controller).toBeUndefined();
    expect(r.pv).toMatchObject({
      count: 4,
      series: 4,
      strings: 1,
      totalWp: 1800,
    });
    expect(r.cables.map((c) => c.segment)).toEqual([
      'pv_controller',
      'battery_inverter',
      'inverter_board',
    ]);
    expect(protection(r, 'controller_battery_fuse')).toBeUndefined();
  });

  it('batteries, autonomie, couverture', () => {
    expect(r.battery).toEqual({
      modelId: 'bat-li-24v-100ah',
      series: 1,
      parallel: 7,
      capacityWh: 16800,
    });
    expectWithin1pct(r.effectiveAutonomyDays, 2.016);
    expectWithin1pct(r.pvCoverage, 1.176);
  });

  it('câble batterie → onduleur et fusible', () => {
    expectWithin1pct(cable(r, 'battery_inverter')?.currentA, 173.6);
    expect(cable(r, 'battery_inverter')?.sectionMm2).toBe(50);
    expect(protection(r, 'battery_fuse')?.ratingA).toBe(200);
  });

  it('variantes 1,5 et 3 jours', () => {
    expect(r.variants.lower?.battery).toMatchObject({
      modelId: 'bat-li-24v-200ah',
      parallel: 3,
    });
    expectWithin1pct(r.variants.lower?.effectiveAutonomyDays, 1.728);
    expect(r.variants.upper?.battery).toMatchObject({
      modelId: 'bat-li-24v-100ah',
      parallel: 11,
    });
    expectWithin1pct(r.variants.upper?.effectiveAutonomyDays, 3.168);
  });
});

describe('cas 4 : plomb / gel (Ebolowa, particulier)', () => {
  const r = run(EBOLOWA_LEAD);

  it('énergie min / typ / max', () => {
    expectWithin1pct(r.energyWhPerDay.min, 1428);
    expectWithin1pct(r.energyWhPerDay.typ, 2364);
    expectWithin1pct(r.energyWhPerDay.max, 3300);
    expect(r.peakW).toEqual({ installed: 310, surge: 730 });
  });

  it('proposition typique en 12 V', () => {
    expect(r.systemVoltage).toBe(12);
    expect(r.inverter.modelId).toBe('inv-sa-12v-600');
    expect(r.pv).toMatchObject({ count: 2, series: 2, strings: 1 });
    expect(r.controller?.modelId).toBe('mppt-100a-250v');
    expect(r.battery).toEqual({
      modelId: 'bat-pb-12v-150ah',
      series: 1,
      parallel: 3,
      capacityWh: 5400,
    });
    expectWithin1pct(r.effectiveAutonomyDays, 1.028);
    expectWithin1pct(r.pvCoverage, 1.146);
    expect(r.cables.map((c) => c.sectionMm2)).toEqual([4, 25, 25, 1.5]);
    expect(protection(r, 'battery_fuse')?.ratingA).toBe(80);
  });

  it('fourchette : 2 à 3 panneaux, 300 à 1 000 W', () => {
    const { min, max } = r.range ?? {};
    expect(min?.systemVoltage).toBe(12);
    expect(min?.inverter?.nominalW).toBe(300);
    expect(min?.pv?.count).toBe(2);
    expect(min?.battery).toMatchObject({
      modelId: 'bat-pb-12v-150ah',
      parallel: 2,
    });
    expectWithin1pct(min?.effectiveAutonomyDays, 1.134);
    expect(max?.systemVoltage).toBe(24);
    expect(max?.inverter?.nominalW).toBe(1000);
    expect(max?.pv?.count).toBe(3);
    expect(max?.battery).toMatchObject({
      modelId: 'bat-pb-12v-200ah',
      series: 2,
      parallel: 2,
    });
    expectWithin1pct(max?.effectiveAutonomyDays, 1.309);
  });

  it('variantes 0,5 et 1,5 jour', () => {
    expect(r.variants.lower?.battery).toMatchObject({
      modelId: 'bat-pb-12v-250ah',
      parallel: 1,
    });
    expectWithin1pct(r.variants.lower?.effectiveAutonomyDays, 0.571);
    expect(r.variants.upper?.battery).toMatchObject({
      modelId: 'bat-pb-12v-100ah',
      parallel: 7,
    });
    expectWithin1pct(r.variants.upper?.effectiveAutonomyDays, 1.599);
  });
});
