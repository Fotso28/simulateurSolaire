import { DEFAULT_CATALOG, DEFAULT_PARAMETER_SET } from '@simulateur/engine';
import type { SeedData } from './seed';

/** Données de référence par défaut du moteur (`libs/engine/src/data`, lot L1). */
export function loadSeedData(): SeedData {
  return { ...DEFAULT_CATALOG, parameters: DEFAULT_PARAMETER_SET.values };
}
