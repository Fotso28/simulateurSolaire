import type { AlertLevel } from '@simulateur/shared-types';

export type AlertCode =
  | 'INVERTER_UNDERSIZED'
  | 'AUTONOMY_BELOW_ONE_NIGHT'
  | 'PV_COVERAGE_LOW'
  | 'HEAVY_DEVICE'
  | 'RAINY_SEASON';

/** Codes stables et messages du TRD (section « Alertes »). */
export const ALERTS: Record<AlertCode, { level: AlertLevel; message: string }> =
  {
    INVERTER_UNDERSIZED: {
      level: 'critique',
      message: "L'onduleur ne peut pas alimenter tous les appareils.",
    },
    AUTONOMY_BELOW_ONE_NIGHT: {
      level: 'attention',
      message: 'Le stockage ne couvre pas une nuit.',
    },
    PV_COVERAGE_LOW: {
      level: 'attention',
      message:
        'En moyenne, les panneaux ne rechargent pas complètement les batteries.',
    },
    HEAVY_DEVICE: {
      level: 'info',
      message: 'Cet appareil pèse lourd : comparez sans lui.',
    },
    RAINY_SEASON: {
      level: 'info',
      message: 'En saison des pluies, la production peut baisser de 20 à 30 %.',
    },
  };
