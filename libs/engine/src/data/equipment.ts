import type {
  BatteryModel,
  BatteryTech,
  CableSection,
  ControllerModel,
  InverterModel,
  PanelModel,
  ProtectionRating,
  SystemVoltage,
} from '@simulateur/shared-types';

/** Matériel de référence générique (ordres de grandeur du marché, pas de marque). */
export const DEFAULT_PANELS: PanelModel[] = [
  {
    id: 'panel-450',
    label: 'Panneau monocristallin 450 Wc',
    powerWp: 450,
    vocV: 49.5,
    vmpV: 41.5,
    iscA: 11.6,
    impA: 10.85,
    active: true,
    isDefault: true,
  },
  {
    id: 'panel-550',
    label: 'Panneau monocristallin 550 Wc',
    powerWp: 550,
    vocV: 49.9,
    vmpV: 42.0,
    iscA: 14.0,
    impA: 13.1,
    active: true,
    isDefault: false,
  },
  {
    id: 'panel-300',
    label: 'Panneau 300 Wc (60 cellules)',
    powerWp: 300,
    vocV: 39.8,
    vmpV: 32.6,
    iscA: 9.8,
    impA: 9.2,
    active: true,
    isDefault: false,
  },
];

const TECH_LABEL: Record<BatteryTech, string> = {
  lithium: 'Lithium LiFePO4',
  plomb: 'Plomb / gel',
};

function battery(
  technology: BatteryTech,
  voltage: number,
  ah: number,
): BatteryModel {
  const prefix = technology === 'lithium' ? 'li' : 'pb';
  return {
    id: `bat-${prefix}-${voltage}v-${ah}ah`,
    label: `${TECH_LABEL[technology]} ${voltage} V ${ah} Ah`,
    technology,
    nominalVoltageV: voltage,
    capacityAh: ah,
    dod: technology === 'lithium' ? 0.8 : 0.5,
    active: true,
  };
}

/** Le plomb / gel est proposé en blocs 12 V, montés en série pour 24 et 48 V. */
export const DEFAULT_BATTERIES: BatteryModel[] = [
  battery('lithium', 12, 100),
  battery('lithium', 12, 200),
  battery('lithium', 24, 100),
  battery('lithium', 24, 200),
  battery('lithium', 48, 100),
  battery('lithium', 48, 200),
  battery('plomb', 12, 100),
  battery('plomb', 12, 150),
  battery('plomb', 12, 200),
  battery('plomb', 12, 250),
];

function standalone(voltage: SystemVoltage, watts: number): InverterModel {
  return {
    id: `inv-sa-${voltage}v-${watts}`,
    label: `Onduleur autonome ${watts} W ${voltage} V`,
    type: 'autonome',
    nominalPowerW: watts,
    surgeFactor: 2,
    dcVoltageV: voltage,
    efficiency: 0.9,
    mpptMaxCurrentA: null,
    mpptMaxPvVoltageV: null,
    active: true,
  };
}

function hybrid(
  voltage: SystemVoltage,
  watts: number,
  mpptA: number,
  mpptV: number,
): InverterModel {
  return {
    id: `inv-hy-${voltage}v-${watts}`,
    label: `Onduleur hybride ${watts} W ${voltage} V (MPPT ${mpptA} A / ${mpptV} V)`,
    type: 'hybride',
    nominalPowerW: watts,
    surgeFactor: 2,
    dcVoltageV: voltage,
    efficiency: 0.9,
    mpptMaxCurrentA: mpptA,
    mpptMaxPvVoltageV: mpptV,
    active: true,
  };
}

export const DEFAULT_INVERTERS: InverterModel[] = [
  standalone(12, 300),
  standalone(12, 600),
  standalone(12, 1000),
  standalone(12, 1500),
  standalone(24, 1000),
  standalone(24, 1500),
  standalone(24, 2000),
  standalone(24, 3000),
  standalone(48, 3000),
  standalone(48, 4000),
  standalone(48, 5000),
  standalone(48, 6000),
  standalone(48, 8000),
  standalone(48, 10000),
  hybrid(12, 1000, 50, 100),
  hybrid(24, 1500, 60, 145),
  hybrid(24, 2000, 80, 145),
  hybrid(24, 3000, 100, 450),
  hybrid(48, 3000, 80, 450),
  hybrid(48, 5000, 100, 450),
  hybrid(48, 6000, 120, 500),
  hybrid(48, 8000, 150, 500),
  hybrid(48, 10000, 160, 500),
];

function controller(
  type: 'MPPT' | 'PWM',
  amps: number,
  pvVolts: number,
  inputA: number,
  voltages: SystemVoltage[],
): ControllerModel {
  return {
    id: `${type.toLowerCase()}-${amps}a-${pvVolts}v`,
    label: `Régulateur ${type} ${amps} A / ${pvVolts} V`,
    type,
    maxCurrentA: amps,
    maxPvVoltageV: pvVolts,
    maxInputCurrentA: inputA,
    supportedVoltages: voltages,
    active: true,
  };
}

/** Le moteur n'utilise que les MPPT ; les PWM servent au catalogue et au back-office. */
export const DEFAULT_CONTROLLERS: ControllerModel[] = [
  controller('MPPT', 20, 100, 20, [12, 24]),
  controller('MPPT', 30, 100, 30, [12, 24]),
  controller('MPPT', 40, 150, 40, [12, 24, 48]),
  controller('MPPT', 60, 150, 50, [12, 24, 48]),
  controller('MPPT', 80, 250, 70, [12, 24, 48]),
  controller('MPPT', 100, 250, 70, [12, 24, 48]),
  controller('MPPT', 150, 250, 100, [12, 24, 48]),
  controller('MPPT', 200, 450, 120, [48]),
  controller('PWM', 10, 50, 10, [12, 24]),
  controller('PWM', 20, 50, 20, [12, 24]),
  controller('PWM', 30, 50, 30, [12, 24]),
  controller('PWM', 60, 50, 60, [12, 24]),
];

/** Intensités admissibles : cuivre isolé PR (XLPE), 2 conducteurs chargés, pose C (IEC 60364-5-52). */
export const DEFAULT_CABLE_SECTIONS: CableSection[] = [
  { sectionMm2: 1.5, allowableCurrentA: 24 },
  { sectionMm2: 2.5, allowableCurrentA: 33 },
  { sectionMm2: 4, allowableCurrentA: 45 },
  { sectionMm2: 6, allowableCurrentA: 58 },
  { sectionMm2: 10, allowableCurrentA: 80 },
  { sectionMm2: 16, allowableCurrentA: 107 },
  { sectionMm2: 25, allowableCurrentA: 138 },
  { sectionMm2: 35, allowableCurrentA: 171 },
  { sectionMm2: 50, allowableCurrentA: 209 },
  { sectionMm2: 70, allowableCurrentA: 269 },
  { sectionMm2: 95, allowableCurrentA: 328 },
];

/** Types de calibres utilisés par le moteur (`ProtectionRating.type`). */
export const PROTECTION_RATING_TYPES = {
  pvFuse: 'fuse_pv',
  dcDisconnect: 'disconnect_dc',
  dcFuse: 'fuse_dc',
  acBreaker: 'breaker_ac',
  rcd: 'rcd_ac',
} as const;

const RATINGS: Record<string, number[]> = {
  fuse_pv: [10, 12, 15, 16, 20, 25, 30, 32],
  disconnect_dc: [16, 25, 32, 40, 50, 63, 80, 100, 125],
  fuse_dc: [
    10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500,
    630,
  ],
  breaker_ac: [2, 6, 10, 16, 20, 25, 32, 40, 50, 63],
  rcd_ac: [25, 40, 63],
};

export const DEFAULT_PROTECTION_RATINGS: ProtectionRating[] = Object.entries(
  RATINGS,
).flatMap(([type, values]) => values.map((ratingA) => ({ type, ratingA })));
