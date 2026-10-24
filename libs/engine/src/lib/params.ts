import type { EngineParameters } from '@simulateur/shared-types';
import { DEFAULT_ENGINE_PARAMETERS } from '../data/parameters';

export type ResolvedParameters = Required<EngineParameters>;

/** Complète un jeu de paramètres stocké avec les valeurs par défaut du TRD. */
export function resolveParameters(
  values: Partial<EngineParameters> | undefined,
): ResolvedParameters {
  const merged = { ...DEFAULT_ENGINE_PARAMETERS };
  for (const [key, value] of Object.entries(values ?? {})) {
    if (value !== undefined && value !== null) {
      (merged as Record<string, unknown>)[key] = value;
    }
  }
  merged.defaultCableLengthsM = {
    ...DEFAULT_ENGINE_PARAMETERS.defaultCableLengthsM,
    ...(values?.defaultCableLengthsM ?? {}),
  };
  return merged;
}
