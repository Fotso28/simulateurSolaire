import type {
  Catalog,
  ParameterSet,
  SimulationInput,
} from '@simulateur/shared-types';
import { simulate } from './simulate';

describe('simulate', () => {
  it('lève « non implémenté » tant que le moteur n’est pas écrit', () => {
    expect(() =>
      simulate({} as SimulationInput, {} as Catalog, {} as ParameterSet),
    ).toThrow('non implémenté');
  });
});
