import {
  autonomyLabel,
  formatDays,
  formatHours,
  formatKwh,
  formatNumber,
  formatPercent,
  formatW,
  plural,
} from './format';

describe('formatage français', () => {
  it('sépare les milliers par une espace fine et utilise la virgule', () => {
    expect(formatNumber(1000)).toBe('1\u202f000');
    expect(formatNumber(3277.4)).toBe('3\u202f277');
    expect(formatNumber(4, 1)).toBe('4,0');
    expect(formatDays(1.05)).toBe('1,05');
  });

  it('place une espace insécable avant l’unité', () => {
    expect(formatW(1000)).toBe('1\u202f000\u00a0W');
    expect(formatKwh(3277)).toBe('3,3\u00a0kWh');
    expect(formatPercent(1.15)).toBe('115\u00a0%');
  });

  it('écrit les durées d’usage comme les maquettes', () => {
    expect(formatHours(0.5)).toBe('30\u00a0min');
    expect(formatHours(6)).toBe('6\u00a0h');
    expect(formatHours(1.5)).toBe('1\u00a0h\u00a030');
  });

  it('accorde au pluriel et nomme les paliers', () => {
    expect(plural(1, 'appareil')).toBe('1\u00a0appareil');
    expect(plural(15, 'appareil')).toBe('15\u00a0appareils');
    expect(plural(3, 'panneau', 'panneaux')).toBe('3\u00a0panneaux');
    expect(autonomyLabel(0.5)).toBe('Une nuit');
    expect(autonomyLabel(4)).toBe('4 jours');
  });
});
