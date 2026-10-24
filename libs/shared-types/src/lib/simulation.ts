/** Tronçons de câblage dimensionnés par le moteur. */
export type CableSegment =
  | 'pv_controller'
  | 'controller_battery'
  | 'battery_inverter'
  | 'inverter_board';

export const CABLE_SEGMENTS: readonly CableSegment[] = [
  'pv_controller',
  'controller_battery',
  'battery_inverter',
  'inverter_board',
];

export type SimulationMode = 'particulier' | 'pro';
export type BatteryTech = 'lithium' | 'plomb';
export type SystemVoltage = 12 | 24 | 48;
export type AlertLevel = 'critique' | 'attention' | 'info';

export interface SimulationInput {
  mode: 'particulier' | 'pro';
  regionId: string;
  autonomyDays: number;
  batteryTech: 'lithium' | 'plomb';
  loads?: {
    deviceId?: string;
    label: string;
    powerW?: number;
    quantity: number;
    hoursPerDay: number;
  }[];
  totals?: { powerW: number; dailyEnergyWh: number; surgeFactor?: number };
  options?: {
    systemVoltage?: 12 | 24 | 48;
    inverterType?: 'hybride' | 'separe';
    simultaneity?: number;
    cableLengthsM?: Partial<Record<CableSegment, number>>;
  };
  overrides?: {
    inverterId?: string;
    batteryModelId?: string;
    batteryParallel?: number;
    panelModelId?: string;
    panelCount?: number;
  };
}

export interface SimulationResult {
  energyWhPerDay: { min: number; typ: number; max: number };
  peakW: { installed: number; surge: number };
  systemVoltage: 12 | 24 | 48;
  pv: {
    panelModelId: string;
    count: number;
    series: number;
    strings: number;
    totalWp: number;
  };
  controller?: { modelId: string; currentA: number };
  battery: {
    modelId: string;
    series: number;
    parallel: number;
    capacityWh: number;
  };
  inverter: { modelId: string; nominalW: number };
  cables: { segment: CableSegment; currentA: number; sectionMm2: number }[];
  protections: { type: string; ratingA: number; quantity: number }[];
  effectiveAutonomyDays: number;
  pvCoverage: number;
  range?: { min: Partial<SimulationResult>; max: Partial<SimulationResult> };
  variants: {
    lower?: Partial<SimulationResult>;
    upper?: Partial<SimulationResult>;
  };
  alerts: {
    level: 'critique' | 'attention' | 'info';
    code: string;
    message: string;
    /** Index dans `input.loads` de l'appareil concerné, le cas échéant. */
    loadIndex?: number;
  }[];
  engineVersion: string;
  paramsVersion: number;
}
