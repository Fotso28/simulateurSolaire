import type { SimulationInput } from '@simulateur/shared-types';

/** Cas de référence du TRD : maison à Douala, 3 277 Wh/j, lithium, 1 jour. */
export const DOUALA: SimulationInput = {
  mode: 'particulier',
  regionId: 'cm-littoral',
  autonomyDays: 1,
  batteryTech: 'lithium',
  loads: [
    {
      deviceId: 'led-bulb',
      label: 'Ampoule LED',
      powerW: 10,
      quantity: 6,
      hoursPerDay: 6,
    },
    {
      deviceId: 'tv-43-55',
      label: 'Télévision 43 pouces',
      powerW: 80,
      quantity: 1,
      hoursPerDay: 5,
    },
    {
      deviceId: 'tv-decoder',
      label: 'Décodeur TV',
      powerW: 15,
      quantity: 1,
      hoursPerDay: 5,
    },
    {
      deviceId: 'fridge',
      label: 'Réfrigérateur',
      powerW: 120,
      quantity: 1,
      hoursPerDay: 24,
    },
    {
      deviceId: 'fan',
      label: 'Ventilateur',
      powerW: 60,
      quantity: 2,
      hoursPerDay: 8,
    },
    {
      deviceId: 'phone-charger',
      label: 'Chargeur de téléphone',
      powerW: 10,
      quantity: 3,
      hoursPerDay: 3,
    },
    {
      deviceId: 'wifi-router',
      label: 'Box internet',
      powerW: 10,
      quantity: 1,
      hoursPerDay: 24,
    },
  ],
};

/** Cas 2 : 48 V avec climatiseur, Yaoundé, pro par appareils. */
export const YAOUNDE_AC: SimulationInput = {
  mode: 'pro',
  regionId: 'cm-centre',
  autonomyDays: 1,
  batteryTech: 'lithium',
  loads: [
    {
      deviceId: 'ac-1-5hp',
      label: 'Climatiseur 1,5 CV',
      powerW: 1250,
      quantity: 1,
      hoursPerDay: 6,
    },
    {
      deviceId: 'fridge-freezer',
      label: 'Réfrigérateur-congélateur',
      powerW: 180,
      quantity: 1,
      hoursPerDay: 24,
    },
    {
      deviceId: 'led-bulb',
      label: 'Ampoule LED',
      powerW: 10,
      quantity: 10,
      hoursPerDay: 6,
    },
    {
      deviceId: 'tv-43-55',
      label: 'Télévision',
      powerW: 100,
      quantity: 1,
      hoursPerDay: 5,
    },
    {
      deviceId: 'laptop',
      label: 'Ordinateur portable',
      powerW: 60,
      quantity: 2,
      hoursPerDay: 6,
    },
    {
      deviceId: 'fan',
      label: 'Ventilateur',
      powerW: 60,
      quantity: 3,
      hoursPerDay: 8,
    },
    {
      deviceId: 'wifi-router',
      label: 'Box internet',
      powerW: 12,
      quantity: 1,
      hoursPerDay: 24,
    },
  ],
};

/** Cas 3 : professionnel en puissance totale, Garoua, onduleur hybride, 2 jours. */
export const GAROUA_TOTALS: SimulationInput = {
  mode: 'pro',
  regionId: 'cm-nord',
  autonomyDays: 2,
  batteryTech: 'lithium',
  totals: { powerW: 1800, dailyEnergyWh: 6000, surgeFactor: 1.5 },
  options: { inverterType: 'hybride' },
};

/** Cas 4 : plomb / gel, Ebolowa, particulier avec les puissances du catalogue. */
export const EBOLOWA_LEAD: SimulationInput = {
  mode: 'particulier',
  regionId: 'cm-sud',
  autonomyDays: 1,
  batteryTech: 'plomb',
  loads: [
    { deviceId: 'led-bulb', label: 'Ampoule LED', quantity: 4, hoursPerDay: 6 },
    {
      deviceId: 'tv-32',
      label: 'Télévision 32 pouces',
      quantity: 1,
      hoursPerDay: 5,
    },
    { deviceId: 'fan', label: 'Ventilateur', quantity: 1, hoursPerDay: 8 },
    {
      deviceId: 'phone-charger',
      label: 'Chargeur de téléphone',
      quantity: 2,
      hoursPerDay: 3,
    },
    {
      deviceId: 'fridge',
      label: 'Réfrigérateur',
      quantity: 1,
      hoursPerDay: 24,
    },
  ],
};
