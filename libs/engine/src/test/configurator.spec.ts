import { DEFAULT_CATALOG, DEFAULT_PARAMETER_SET } from '../data';
import {
  inverterNeighbors,
  panelCountNeighbors,
  storageNeighbors,
} from '../lib/configurator';
import { computeDailyEnergy } from '../lib/energy';
import { simulate } from '../lib/simulate';
import { DOUALA, EBOLOWA_LEAD } from './fixtures';

const C = DEFAULT_CATALOG;
const P = DEFAULT_PARAMETER_SET;

describe('configurateur : tailles voisines', () => {
  it('onduleurs voisins (même tension, même type)', () => {
    expect(inverterNeighbors(DOUALA, C, P)).toEqual({
      lower: undefined,
      upper: { inverterId: 'inv-sa-24v-1500', nominalW: 1500 },
    });
    const forced = { ...DOUALA, overrides: { inverterId: 'inv-sa-24v-1500' } };
    expect(inverterNeighbors(forced, C, P)).toEqual({
      lower: { inverterId: 'inv-sa-24v-1000', nominalW: 1000 },
      upper: { inverterId: 'inv-sa-24v-2000', nominalW: 2000 },
    });
  });

  it('stockages voisins, applicables comme forçage', () => {
    const n = storageNeighbors(DOUALA, C, P);
    expect(n.lower).toEqual({
      batteryModelId: 'bat-li-24v-100ah',
      batteryParallel: 1,
      capacityWh: 2400,
    });
    expect(n.upper).toEqual({
      batteryModelId: 'bat-li-24v-100ah',
      batteryParallel: 3,
      capacityWh: 7200,
    });
    const r = simulate({ ...DOUALA, overrides: { ...n.upper } }, C, P);
    expect(r.battery.capacityWh).toBe(7200);
    expect(r.effectiveAutonomyDays).toBeCloseTo(1.582, 2);
  });

  it('stockage minimal : pas de voisin inférieur', () => {
    const input = {
      ...DOUALA,
      overrides: { batteryModelId: 'bat-li-24v-100ah', batteryParallel: 1 },
    };
    expect(storageNeighbors(input, C, P).lower).toBeUndefined();
  });

  it('nombres de panneaux voisins', () => {
    expect(panelCountNeighbors(DOUALA, C, P)).toEqual({
      lower: { panelCount: 2 },
      upper: { panelCount: 4 },
    });
    const one = { ...DOUALA, overrides: { panelCount: 1 } };
    expect(panelCountNeighbors(one, C, P).lower).toBeUndefined();
  });

  it('nombre de panneaux sans voisin supérieur réalisable', () => {
    const catalog = {
      ...C,
      controllers: C.controllers.filter((c) => c.maxCurrentA <= 80),
    };
    expect(panelCountNeighbors(DOUALA, catalog, P).upper).toBeUndefined();
  });
});

describe('récapitulatif : énergie journalière', () => {
  it('total min / typ / max et détail par ligne', () => {
    const e = computeDailyEnergy(EBOLOWA_LEAD.loads ?? [], C);
    expect([e.min, e.typ, e.max]).toEqual([1428, 2132, 3300]);
    expect(e.perLoad[4]).toEqual({
      index: 4,
      label: 'Réfrigérateur',
      min: 768,
      typ: 1152,
      max: 1920,
    });
  });

  it('mode pro : puissance typique', () => {
    const e = computeDailyEnergy(EBOLOWA_LEAD.loads ?? [], C, 'pro');
    expect([e.min, e.typ, e.max]).toEqual([2132, 2132, 2132]);
  });

  it('liste vide : zéro', () => {
    expect(computeDailyEnergy([], C)).toEqual({
      min: 0,
      typ: 0,
      max: 0,
      perLoad: [],
    });
  });
});
