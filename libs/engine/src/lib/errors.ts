export type EngineErrorCode =
  | 'INVALID_INPUT'
  | 'REGION_NOT_FOUND'
  | 'DEVICE_NOT_FOUND'
  | 'OVERRIDE_NOT_FOUND'
  | 'NO_LOADS'
  | 'ZERO_ENERGY'
  | 'NO_PANEL'
  | 'NO_COMPATIBLE_INVERTER'
  | 'NO_COMPATIBLE_CONTROLLER'
  | 'NO_COMPATIBLE_BATTERY'
  | 'NO_CABLE_SECTION'
  | 'NO_PROTECTION_RATING';

/** Erreur explicite du moteur : `code` stable, `message` en français affichable. */
export class EngineError extends Error {
  constructor(
    readonly code: EngineErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'EngineError';
  }
}

/** Erreurs « pas de matériel à cette tension » : en tension automatique, le moteur essaie la tension supérieure. */
export const HARDWARE_ERROR_CODES: readonly EngineErrorCode[] = [
  'NO_COMPATIBLE_INVERTER',
  'NO_COMPATIBLE_CONTROLLER',
  'NO_COMPATIBLE_BATTERY',
];
