import type {
  Catalog,
  ParameterSet,
  SimulationInput,
  SimulationResult,
} from '@simulateur/shared-types';

export const ENGINE_VERSION = '0.0.0';

/** Dimensionne une installation solaire autonome. Implémentation : lot L1. */
export function simulate(
  input: SimulationInput,
  catalog: Catalog,
  params: ParameterSet,
): SimulationResult {
  void input;
  void catalog;
  void params;
  throw new Error('simulate : non implémenté');
}
