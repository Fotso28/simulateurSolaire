import type { Catalog } from '@simulateur/shared-types';
import { DEFAULT_DEVICE_CATEGORIES, DEFAULT_DEVICES } from './devices';
import {
  DEFAULT_BATTERIES,
  DEFAULT_CABLE_SECTIONS,
  DEFAULT_CONTROLLERS,
  DEFAULT_INVERTERS,
  DEFAULT_PANELS,
  DEFAULT_PROTECTION_RATINGS,
} from './equipment';
import { DEFAULT_COUNTRIES, DEFAULT_REGIONS } from './geography';

export * from './devices';
export * from './equipment';
export * from './geography';
export * from './parameters';

/** Catalogue de référence complet : seed de l'API et mode hors-ligne du front. */
export const DEFAULT_CATALOG: Catalog = {
  countries: DEFAULT_COUNTRIES,
  regions: DEFAULT_REGIONS,
  deviceCategories: DEFAULT_DEVICE_CATEGORIES,
  devices: DEFAULT_DEVICES,
  panels: DEFAULT_PANELS,
  batteries: DEFAULT_BATTERIES,
  inverters: DEFAULT_INVERTERS,
  controllers: DEFAULT_CONTROLLERS,
  cableSections: DEFAULT_CABLE_SECTIONS,
  protectionRatings: DEFAULT_PROTECTION_RATINGS,
};
