import type { EngineParameters, ParameterSet } from '@simulateur/shared-types';

/** Paramètres par défaut du TRD (« Paramètres par défaut »), tous renseignés. */
export const DEFAULT_ENGINE_PARAMETERS: Required<EngineParameters> = {
  dodLithium: 0.8,
  dodLead: 0.5,
  inverterEfficiency: 0.9,
  performanceRatio: 0.7,
  inverterPowerMargin: 1.25,
  inverterSurgeFactor: 2,
  controllerMargin: 1.25,
  maxVoltageDrop: 0.03,
  copperResistivity: 0.0225,
  autonomySteps: [0.5, 1, 1.5, 2, 3],
  defaultCableLengthsM: {
    pv_controller: 15,
    controller_battery: 2,
    battery_inverter: 2,
    inverter_board: 5,
  },
  simultaneity: 1,
  totalsSurgeFactor: 1,
  pvVocSafetyFactor: 1.1,
  pvMinVoltageFactor: 1.25,
  voltageThresholds: {
    max12V: { inverterW: 1200, pvWp: 1000 },
    max24V: { inverterW: 3000, pvWp: 2500 },
  },
  pvCableMinSectionMm2: 4,
  heavyDeviceThresholdW: 1500,
  minAutonomyDays: 0.5,
};

/** Jeu de paramètres v1. */
export const DEFAULT_PARAMETER_SET: ParameterSet = {
  id: 'params-v1',
  version: 1,
  values: DEFAULT_ENGINE_PARAMETERS,
  activeSince: '2026-10-24T00:00:00.000Z',
  createdBy: null,
};
