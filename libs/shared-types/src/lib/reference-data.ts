import type { BatteryTech, CableSegment, SystemVoltage } from './simulation';

/** Table `country`. */
export interface Country {
  id: string;
  isoCode: string;
  name: string;
  gridVoltageV: number;
  sortOrder: number;
}

/** Table `region`. Ensoleillement en kWh/m²/j. */
export interface Region {
  id: string;
  countryId: string;
  name: string;
  capital: string;
  latitude: number;
  longitude: number;
  irradiationAvg: number;
  irradiationMinMonth: number;
  source: string;
  updatedAt: string;
}

/** Table `device_category`. */
export interface DeviceCategory {
  id: string;
  name: string;
  iconUrl: string | null;
  sortOrder: number;
}

/** Table `device`. */
export interface Device {
  id: string;
  categoryId: string;
  name: string;
  iconUrl: string | null;
  imageUrl: string | null;
  powerMinW: number;
  powerTypW: number;
  powerMaxW: number;
  defaultHoursPerDay: number;
  /** Taux de fonctionnement (0–1), ex. 0,4 pour un réfrigérateur. */
  dutyCycle: number;
  /** Facteur de démarrage (pointe au démarrage / puissance nominale). */
  surgeFactor: number;
  active: boolean;
  sortOrder: number;
}

/** Table `panel_model`. */
export interface PanelModel {
  id: string;
  label: string;
  powerWp: number;
  vocV: number;
  vmpV: number;
  iscA: number;
  impA: number;
  active: boolean;
  isDefault: boolean;
}

/** Table `battery_model`. */
export interface BatteryModel {
  id: string;
  technology: BatteryTech;
  nominalVoltageV: number;
  capacityAh: number;
  dod: number;
  active: boolean;
}

export type InverterModelType = 'hybride' | 'autonome';

/** Table `inverter_model`. Les champs MPPT ne concernent que les onduleurs hybrides. */
export interface InverterModel {
  id: string;
  type: InverterModelType;
  nominalPowerW: number;
  surgeFactor: number;
  dcVoltageV: SystemVoltage;
  efficiency: number;
  mpptMaxCurrentA: number | null;
  mpptMaxPvVoltageV: number | null;
  active: boolean;
}

export type ControllerModelType = 'MPPT' | 'PWM';

/** Table `controller_model`. */
export interface ControllerModel {
  id: string;
  type: ControllerModelType;
  maxCurrentA: number;
  maxPvVoltageV: number;
  maxInputCurrentA: number;
  supportedVoltages: SystemVoltage[];
  active: boolean;
}

/** Table `cable_section`. */
export interface CableSection {
  sectionMm2: number;
  allowableCurrentA: number;
}

/** Table `protection_rating`. */
export interface ProtectionRating {
  type: string;
  ratingA: number;
}

/** Contenu JSONB `parameter_set.values` : paramètres du moteur. */
export interface EngineParameters {
  dodLithium: number;
  dodLead: number;
  inverterEfficiency: number;
  performanceRatio: number;
  inverterPowerMargin: number;
  inverterSurgeFactor: number;
  controllerMargin: number;
  maxVoltageDrop: number;
  copperResistivity: number;
  autonomySteps: number[];
  defaultCableLengthsM: Record<CableSegment, number>;
}

/** Table `parameter_set`. */
export interface ParameterSet {
  id: string;
  version: number;
  values: EngineParameters;
  activeSince: string;
  createdBy: string | null;
}

/** Données de référence nécessaires au moteur (réponse `GET /catalog`). */
export interface Catalog {
  countries: Country[];
  regions: Region[];
  deviceCategories: DeviceCategory[];
  devices: Device[];
  panels: PanelModel[];
  batteries: BatteryModel[];
  inverters: InverterModel[];
  controllers: ControllerModel[];
  cableSections: CableSection[];
  protectionRatings: ProtectionRating[];
}
