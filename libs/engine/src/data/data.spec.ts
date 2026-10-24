import { CABLE_SEGMENTS } from '@simulateur/shared-types';
import { DEFAULT_CATALOG, DEFAULT_PARAMETER_SET } from '.';

const C = DEFAULT_CATALOG;
const unique = (ids: string[]) => new Set(ids).size === ids.length;

describe('données de référence', () => {
  it('pays et 19 régions', () => {
    expect(C.countries.map((c) => [c.isoCode, c.gridVoltageV])).toEqual([
      ['CM', 230],
      ['GA', 230],
    ]);
    expect(C.regions).toHaveLength(19);
    expect(C.regions.filter((r) => r.countryId === 'cm')).toHaveLength(10);
    expect(unique(C.regions.map((r) => r.id))).toBe(true);
    const douala = C.regions.find((r) => r.capital === 'Douala');
    expect(douala).toMatchObject({
      id: 'cm-littoral',
      name: 'Littoral',
      irradiationAvg: 4.0,
    });
    for (const r of C.regions) {
      expect(r.irradiationMinMonth).toBeLessThan(r.irradiationAvg);
      expect(Math.abs(r.latitude)).toBeLessThan(13);
    }
  });

  it('8 catégories et 36 appareils, p_typ = (min + max) / 2, iconKey stables', () => {
    expect(C.deviceCategories).toHaveLength(8);
    expect(C.devices).toHaveLength(36);
    expect(unique(C.devices.map((d) => d.id))).toBe(true);
    const categoryIds = new Set(C.deviceCategories.map((c) => c.id));
    for (const d of C.devices) {
      expect(categoryIds.has(d.categoryId)).toBe(true);
      expect(d.powerTypW).toBe((d.powerMinW + d.powerMaxW) / 2);
      expect(d.iconKey).toMatch(/^[a-z0-9-]+$/);
    }
    const heavy = C.devices.filter((d) => d.powerTypW > 1500).map((d) => d.id);
    expect(heavy.sort()).toEqual(['ac-2hp', 'iron', 'kettle', 'water-heater']);
  });

  it('matériel de référence du cas de Douala', () => {
    expect(C.panels.find((p) => p.isDefault)).toMatchObject({
      powerWp: 450,
      vocV: 49.5,
      vmpV: 41.5,
      iscA: 11.6,
    });
    const li24 = C.batteries.filter(
      (b) => b.technology === 'lithium' && b.nominalVoltageV === 24,
    );
    expect(li24.map((b) => b.capacityAh)).toEqual([100, 200]);
    const sa24 = C.inverters.filter(
      (i) => i.type === 'autonome' && i.dcVoltageV === 24,
    );
    expect(sa24.map((i) => i.nominalPowerW)).toEqual([1000, 1500, 2000, 3000]);
    const sa48 = C.inverters
      .filter((i) => i.dcVoltageV === 48)
      .map((i) => i.nominalPowerW);
    expect(Math.max(...sa48)).toBe(10000);
    expect(C.controllers.find((c) => c.id === 'mppt-80a-250v')).toMatchObject({
      maxCurrentA: 80,
      maxPvVoltageV: 250,
    });
    expect(C.controllers.some((c) => c.type === 'PWM')).toBe(true);
    for (const tech of ['lithium', 'plomb'] as const) {
      expect(C.batteries.some((b) => b.technology === tech)).toBe(true);
    }
    for (const list of [C.panels, C.batteries, C.inverters, C.controllers]) {
      expect(unique(list.map((i) => i.id))).toBe(true);
    }
  });

  it('sections normalisées et calibres', () => {
    expect(C.cableSections.map((s) => s.sectionMm2)).toEqual([
      1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95,
    ]);
    const ampacities = C.cableSections.map((s) => s.allowableCurrentA);
    expect([...ampacities].sort((a, b) => a - b)).toEqual(ampacities);
    expect(
      C.protectionRatings.some((r) => r.type === 'fuse_dc' && r.ratingA === 63),
    ).toBe(true);
  });

  it('jeu de paramètres v1 = valeurs du TRD', () => {
    expect(DEFAULT_PARAMETER_SET.version).toBe(1);
    expect(DEFAULT_PARAMETER_SET.values).toMatchObject({
      dodLithium: 0.8,
      dodLead: 0.5,
      inverterEfficiency: 0.9,
      performanceRatio: 0.7,
      inverterPowerMargin: 1.25,
      inverterSurgeFactor: 2,
      controllerMargin: 1.25,
      maxVoltageDrop: 0.03,
      copperResistivity: 0.0225,
      autonomySteps: [0.5, 1, 1.5, 2, 3],
      defaultCableLengthsM: {
        pv_controller: 15,
        controller_battery: 2,
        battery_inverter: 2,
        inverter_board: 5,
      },
    });
    expect(
      Object.keys(DEFAULT_PARAMETER_SET.values.defaultCableLengthsM),
    ).toEqual([...CABLE_SEGMENTS]);
  });
});
