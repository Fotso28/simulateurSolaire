import { CABLE_SEGMENTS } from './simulation';

describe('CABLE_SEGMENTS', () => {
  it('liste les quatre tronçons dans l’ordre du schéma', () => {
    expect(CABLE_SEGMENTS).toEqual([
      'pv_controller',
      'controller_battery',
      'battery_inverter',
      'inverter_board',
    ]);
  });
});
