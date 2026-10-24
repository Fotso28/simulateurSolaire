import { TestBed } from '@angular/core/testing';
import { SimulationStore } from '../../core/simulation.store';
import { enterDouala } from '../../core/test-helpers';
import { parseField, RULES, toField } from './pro-validation';
import {
  acVoltageOf,
  cableRows,
  dodOf,
  formatDrop,
  type ProContext,
  protectionRows,
  techCards,
} from './pro-view';

function douala() {
  sessionStorage.clear();
  TestBed.configureTestingModule({});
  const store = TestBed.inject(SimulationStore);
  enterDouala(store);
  store.setMode('pro');
  const r = store.result()!;
  const ctx: ProContext = {
    catalog: store.catalog(),
    params: store.params(),
    region: store.region(),
    input: store.input()!,
  };
  return { store, r, ctx };
}

describe('pro-validation', () => {
  it('lit les nombres à la française', () => {
    expect(parseField('1 250,5', RULES.powerW)).toEqual({
      ok: true,
      value: 1250.5,
    });
    expect(parseField('1 000', RULES.totalPowerW)).toEqual({
      ok: true,
      value: 1000,
    });
    expect(parseField('12.', RULES.hoursPerDay)).toEqual({
      ok: true,
      value: 12,
    });
  });

  it('refuse le texte, les bornes et les décimales interdites', () => {
    expect(parseField('abc', RULES.powerW).ok).toBe(false);
    expect(parseField('1,2,3', RULES.powerW).ok).toBe(false);
    expect(parseField('-5', RULES.powerW).ok).toBe(false);
    expect(parseField('25', RULES.hoursPerDay)).toEqual({
      ok: false,
      error: RULES.hoursPerDay.message,
    });
    expect(parseField('2,5', RULES.quantity).ok).toBe(false);
    expect(parseField('0,2', RULES.cableLengthM).ok).toBe(false);
  });

  it('vide : erreur si requis, undefined si facultatif', () => {
    expect(parseField('', RULES.powerW).ok).toBe(false);
    expect(parseField(' ', RULES.surgeFactor)).toEqual({
      ok: true,
      value: undefined,
    });
  });

  it('formate pour le champ', () => {
    expect(toField(undefined)).toBe('');
    expect(toField(1.8)).toBe('1,8');
    expect(toField(1 / 3)).toBe('0,333');
  });
});

describe('pro-view', () => {
  it('fiches techniques : 4 équipements avec contrôles', () => {
    const { r, ctx } = douala();
    const cards = techCards(r, ctx);
    expect(cards.map((c) => c.key)).toEqual([
      'pv',
      'controller',
      'battery',
      'inverter',
    ]);
    expect(cards[0].value).toContain('Wc');
    const checks = cards.flatMap((c) => c.rows).filter((x) => x.ok !== undefined);
    expect(checks.length).toBeGreaterThan(0);
    expect(checks.every((x) => x.ok)).toBe(true);
  });

  it('câbles : une ligne par tronçon, section ≥ section calculée, ΔU ≤ max', () => {
    const { r, ctx } = douala();
    const rows = cableRows(r, ctx);
    expect(rows).toHaveLength(r.cables.length);
    const maxDrop = ctx.params.values.maxVoltageDrop;
    for (const row of rows) {
      const c = r.cables.find((x) => x.segment === row.segment)!;
      expect(c.sectionMm2).toBeGreaterThanOrEqual(row.rawSectionMm2 - 1e-9);
      expect(row.dropRatio).toBeLessThanOrEqual(maxDrop + 1e-9);
      expect(row.detail).toContain('ΔU');
    }
    const board = rows.find((x) => x.segment === 'inverter_board');
    if (board) expect(board.voltageV).toBe(acVoltageOf(ctx));
  });

  it('protections, DoD et format de chute', () => {
    const { r, ctx } = douala();
    const rows = protectionRows(r);
    expect(rows).toHaveLength(r.protections.length);
    for (const row of rows) {
      expect(row.quantity).toBeGreaterThan(0);
      if (row.type === 'rcd_30ma') expect(row.value).toBe('30 mA');
    }
    expect(dodOf('lithium', ctx.params)).toBe(ctx.params.values.dodLithium);
    expect(dodOf('plomb', ctx.params)).toBe(ctx.params.values.dodLead);
    expect(formatDrop(0.018)).toBe('1,8 %');
  });
});
