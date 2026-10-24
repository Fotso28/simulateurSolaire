import type { Country, Region } from '@simulateur/shared-types';

const SOURCE = 'Valeur indicative PRD v1 — à remplacer par PVGIS / NASA POWER';
const UPDATED_AT = '2026-10-24';

export const DEFAULT_COUNTRIES: Country[] = [
  {
    id: 'cm',
    isoCode: 'CM',
    name: 'Cameroun',
    gridVoltageV: 230,
    sortOrder: 1,
  },
  { id: 'ga', isoCode: 'GA', name: 'Gabon', gridVoltageV: 230, sortOrder: 2 },
];

/** [id, pays, nom, chef-lieu, latitude, longitude, ensoleillement moyen, mois le plus faible] */
type RegionRow = [
  string,
  string,
  string,
  string,
  number,
  number,
  number,
  number,
];

const REGION_ROWS: RegionRow[] = [
  ['cm-extreme-nord', 'cm', 'Extrême-Nord', 'Maroua', 10.59, 14.32, 5.8, 4.9],
  ['cm-nord', 'cm', 'Nord', 'Garoua', 9.3, 13.4, 5.6, 4.7],
  ['cm-adamaoua', 'cm', 'Adamaoua', 'Ngaoundéré', 7.32, 13.58, 5.2, 4.1],
  ['cm-nord-ouest', 'cm', 'Nord-Ouest', 'Bamenda', 5.96, 10.15, 4.8, 3.6],
  ['cm-ouest', 'cm', 'Ouest', 'Bafoussam', 5.48, 10.42, 4.7, 3.6],
  ['cm-est', 'cm', 'Est', 'Bertoua', 4.58, 13.68, 4.6, 3.7],
  ['cm-centre', 'cm', 'Centre', 'Yaoundé', 3.87, 11.52, 4.5, 3.5],
  ['cm-sud', 'cm', 'Sud', 'Ebolowa', 2.9, 11.15, 4.3, 3.4],
  ['cm-littoral', 'cm', 'Littoral', 'Douala', 4.05, 9.77, 4.0, 2.9],
  ['cm-sud-ouest', 'cm', 'Sud-Ouest', 'Buea', 4.16, 9.24, 4.0, 2.8],
  [
    'ga-haut-ogooue',
    'ga',
    'Haut-Ogooué',
    'Franceville',
    -1.63,
    13.58,
    4.4,
    3.5,
  ],
  ['ga-woleu-ntem', 'ga', 'Woleu-Ntem', 'Oyem', 1.6, 11.58, 4.3, 3.4],
  ['ga-ngounie', 'ga', 'Ngounié', 'Mouila', -1.87, 11.06, 4.2, 3.3],
  ['ga-nyanga', 'ga', 'Nyanga', 'Tchibanga', -2.85, 11.03, 4.2, 3.3],
  ['ga-ogooue-ivindo', 'ga', 'Ogooué-Ivindo', 'Makokou', 0.57, 12.86, 4.2, 3.3],
  [
    'ga-ogooue-lolo',
    'ga',
    'Ogooué-Lolo',
    'Koulamoutou',
    -1.13,
    12.47,
    4.2,
    3.3,
  ],
  ['ga-moyen-ogooue', 'ga', 'Moyen-Ogooué', 'Lambaréné', -0.7, 10.24, 4.1, 3.2],
  [
    'ga-ogooue-maritime',
    'ga',
    'Ogooué-Maritime',
    'Port-Gentil',
    -0.72,
    8.78,
    4.1,
    3.1,
  ],
  ['ga-estuaire', 'ga', 'Estuaire', 'Libreville', 0.39, 9.45, 4.0, 3.0],
];

export const DEFAULT_REGIONS: Region[] = REGION_ROWS.map(
  ([id, countryId, name, capital, latitude, longitude, avg, minMonth]) => ({
    id,
    countryId,
    name,
    capital,
    latitude,
    longitude,
    irradiationAvg: avg,
    irradiationMinMonth: minMonth,
    source: SOURCE,
    updatedAt: UPDATED_AT,
  }),
);
