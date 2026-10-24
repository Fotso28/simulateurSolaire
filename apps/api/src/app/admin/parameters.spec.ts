import { mergeParameters } from './parameters';

describe('mergeParameters', () => {
  const base = {
    dodLithium: 0.9,
    autonomySteps: [0.5, 1, 2],
    lengths: { a: 1, b: 2 },
  };

  it('fusionne des modifications valides sans toucher la base', () => {
    const merged = mergeParameters(base, {
      dodLithium: 0.8,
      lengths: { a: 3, b: 4 },
    });
    expect(merged).toEqual({
      dodLithium: 0.8,
      autonomySteps: [0.5, 1, 2],
      lengths: { a: 3, b: 4 },
    });
    expect(base.dodLithium).toBe(0.9);
  });

  it('refuse une clé inconnue', () => {
    expect(() => mergeParameters(base, { foo: 1 })).toThrow(
      'Paramètre inconnu',
    );
  });

  it('refuse une forme différente', () => {
    expect(() => mergeParameters(base, { dodLithium: '0.8' })).toThrow();
    expect(() => mergeParameters(base, { dodLithium: -1 })).toThrow();
    expect(() => mergeParameters(base, { autonomySteps: [] })).toThrow();
    expect(() => mergeParameters(base, { lengths: { a: 1 } })).toThrow();
  });
});
