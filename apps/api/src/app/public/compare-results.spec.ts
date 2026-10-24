import { findDivergence } from './compare-results';

describe('findDivergence', () => {
  const base = {
    energyWhPerDay: { min: 1000, typ: 1500, max: 2000 },
    systemVoltage: 24,
    pv: { panelModelId: 'pv-400', count: 4 },
    alerts: [{ level: 'info', code: 'A', message: 'm' }],
    engineVersion: '1.0.0',
  };

  it('accepte un résultat identique ou à moins de 1 %', () => {
    expect(findDivergence(base, structuredClone(base))).toBeNull();
    const close = structuredClone(base);
    close.energyWhPerDay.typ = 1514;
    expect(findDivergence(base, close)).toBeNull();
  });

  it('ignore la version du moteur', () => {
    expect(
      findDivergence(base, { ...base, engineVersion: '2.0.0' }),
    ).toBeNull();
  });

  it('signale un écart numérique au-delà de 1 % avec son chemin', () => {
    const far = structuredClone(base);
    far.energyWhPerDay.typ = 1530;
    expect(findDivergence(base, far)).toBe('energyWhPerDay.typ');
  });

  it('signale un identifiant, une longueur de liste ou un champ manquant différent', () => {
    expect(
      findDivergence(base, { ...base, pv: { panelModelId: 'x', count: 4 } }),
    ).toBe('pv.panelModelId');
    expect(findDivergence(base, { ...base, alerts: [] })).toBe('alerts.length');
    const missing: Partial<typeof base> = { ...base };
    delete missing.systemVoltage;
    expect(findDivergence(base, missing)).toBe('systemVoltage');
  });

  it('traite zéro sans division', () => {
    expect(findDivergence({ a: 0 }, { a: 0 })).toBeNull();
    expect(findDivergence({ a: 0 }, { a: 0.5 })).toBe('a');
  });
});
