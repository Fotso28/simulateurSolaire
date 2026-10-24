import type * as Db from '@prisma/client';
import type {
  BatteryModel,
  BatteryTech,
  CableSection,
  ControllerModel,
  ControllerModelType,
  Country,
  Device,
  DeviceCategory,
  EngineParameters,
  InverterModel,
  InverterModelType,
  PanelModel,
  ParameterSet,
  ProtectionRating,
  Region,
  SystemVoltage,
} from '@simulateur/shared-types';

/** Conversion des lignes Prisma vers les types partagés (contrat du front et du moteur). */
export const toCountry = (c: Db.Country): Country => ({
  id: c.id,
  isoCode: c.isoCode,
  name: c.name,
  gridVoltageV: c.gridVoltageV,
  sortOrder: c.sortOrder,
});

export const toRegion = (r: Db.Region): Region => ({
  id: r.id,
  countryId: r.countryId,
  name: r.name,
  capital: r.capital,
  latitude: r.latitude,
  longitude: r.longitude,
  irradiationAvg: r.irradiationAvg,
  irradiationMinMonth: r.irradiationMinMonth,
  source: r.source,
  updatedAt: r.updatedAt.toISOString(),
});

export const toDeviceCategory = (c: Db.DeviceCategory): DeviceCategory => ({
  id: c.id,
  name: c.name,
  ...(c.iconKey ? { iconKey: c.iconKey } : {}),
  iconUrl: c.iconUrl,
  sortOrder: c.sortOrder,
});

export const toDevice = (d: Db.Device): Device => ({
  id: d.id,
  categoryId: d.categoryId,
  name: d.name,
  ...(d.iconKey ? { iconKey: d.iconKey } : {}),
  iconUrl: d.iconUrl,
  imageUrl: d.imageUrl,
  powerMinW: d.powerMinW,
  powerTypW: d.powerTypW,
  powerMaxW: d.powerMaxW,
  defaultHoursPerDay: d.defaultHoursPerDay,
  dutyCycle: d.dutyCycle,
  surgeFactor: d.surgeFactor,
  active: d.active,
  sortOrder: d.sortOrder,
});

export const toPanel = (p: Db.PanelModel): PanelModel => ({
  id: p.id,
  label: p.label,
  powerWp: p.powerWp,
  vocV: p.vocV,
  vmpV: p.vmpV,
  iscA: p.iscA,
  impA: p.impA,
  active: p.active,
  isDefault: p.isDefault,
});

export const toBattery = (b: Db.BatteryModel): BatteryModel => ({
  id: b.id,
  ...(b.label ? { label: b.label } : {}),
  technology: b.technology as BatteryTech,
  nominalVoltageV: b.nominalVoltageV,
  capacityAh: b.capacityAh,
  dod: b.dod,
  active: b.active,
});

export const toInverter = (i: Db.InverterModel): InverterModel => ({
  id: i.id,
  ...(i.label ? { label: i.label } : {}),
  type: i.type as InverterModelType,
  nominalPowerW: i.nominalPowerW,
  surgeFactor: i.surgeFactor,
  dcVoltageV: i.dcVoltageV as SystemVoltage,
  efficiency: i.efficiency,
  mpptMaxCurrentA: i.mpptMaxCurrentA,
  mpptMaxPvVoltageV: i.mpptMaxPvVoltageV,
  active: i.active,
});

export const toController = (c: Db.ControllerModel): ControllerModel => ({
  id: c.id,
  ...(c.label ? { label: c.label } : {}),
  type: c.type as ControllerModelType,
  maxCurrentA: c.maxCurrentA,
  maxPvVoltageV: c.maxPvVoltageV,
  maxInputCurrentA: c.maxInputCurrentA,
  supportedVoltages: c.supportedVoltages as SystemVoltage[],
  active: c.active,
});

export const toCableSection = (c: Db.CableSection): CableSection => ({
  sectionMm2: c.sectionMm2,
  allowableCurrentA: c.allowableCurrentA,
});

export const toProtectionRating = (
  p: Db.ProtectionRating,
): ProtectionRating => ({
  type: p.type,
  ratingA: p.ratingA,
});

export const toParameterSet = (p: Db.ParameterSet): ParameterSet => ({
  id: p.id,
  version: p.version,
  values: p.values as unknown as EngineParameters,
  activeSince: (p.activeSince ?? p.createdAt).toISOString(),
  createdBy: p.createdById,
});
