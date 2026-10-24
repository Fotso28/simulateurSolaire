import { FIXTURE_DATA } from '../test/fixtures';
import type { SeedData } from './seed';

/**
 * Source des données du seed.
 * TODO(L2) : remplacer par les données de référence de `@simulateur/engine` (L1) dès leur publication.
 */
export function loadSeedData(): SeedData {
  return FIXTURE_DATA;
}
