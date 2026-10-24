import { HttpStatus, Injectable } from '@nestjs/common';
import type { Catalog, ParameterSet } from '@simulateur/shared-types';
import { createHash } from 'node:crypto';
import { ApiError } from '../common/api-error';
import { PrismaService } from '../prisma/prisma.service';
import * as map from './mappers';

/** Réponse de `GET /catalog` : agrégat `Catalog` + jeu de paramètres actif. */
export type CatalogResponse = Catalog & { parameterSet: ParameterSet };

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Agrégat des données de référence.
   * `includeInactiveDevices` sert au rejeu serveur : un appareil désactivé depuis
   * reste résoluble dans une simulation construite avant sa désactivation.
   */
  async getCatalog(includeInactiveDevices = false): Promise<Catalog> {
    const p = this.prisma;
    const [
      countries,
      regions,
      deviceCategories,
      devices,
      panels,
      batteries,
      inverters,
      controllers,
      cableSections,
      protectionRatings,
    ] = await Promise.all([
      p.country.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
      p.region.findMany({ orderBy: [{ countryId: 'asc' }, { name: 'asc' }] }),
      p.deviceCategory.findMany({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      p.device.findMany({
        where: includeInactiveDevices ? {} : { active: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      p.panelModel.findMany({
        where: { active: true },
        orderBy: { powerWp: 'asc' },
      }),
      p.batteryModel.findMany({
        where: { active: true },
        orderBy: [
          { technology: 'asc' },
          { nominalVoltageV: 'asc' },
          { capacityAh: 'asc' },
        ],
      }),
      p.inverterModel.findMany({
        where: { active: true },
        orderBy: [{ nominalPowerW: 'asc' }, { dcVoltageV: 'asc' }],
      }),
      p.controllerModel.findMany({
        where: { active: true },
        orderBy: { maxCurrentA: 'asc' },
      }),
      p.cableSection.findMany({ orderBy: { sectionMm2: 'asc' } }),
      p.protectionRating.findMany({
        orderBy: [{ type: 'asc' }, { ratingA: 'asc' }],
      }),
    ]);
    return {
      countries: countries.map(map.toCountry),
      regions: regions.map(map.toRegion),
      deviceCategories: deviceCategories.map(map.toDeviceCategory),
      devices: devices.map(map.toDevice),
      panels: panels.map(map.toPanel),
      batteries: batteries.map(map.toBattery),
      inverters: inverters.map(map.toInverter),
      controllers: controllers.map(map.toController),
      cableSections: cableSections.map(map.toCableSection),
      protectionRatings: protectionRatings.map(map.toProtectionRating),
    };
  }

  async getActiveParameterSet(): Promise<ParameterSet> {
    const active = await this.prisma.parameterSet.findFirst({
      where: { activeSince: { not: null, lte: new Date() } },
      orderBy: { activeSince: 'desc' },
    });
    if (!active) {
      throw new ApiError(
        HttpStatus.SERVICE_UNAVAILABLE,
        'NO_ACTIVE_PARAMETERS',
        'Aucun jeu de paramètres de calcul n’est actif.',
      );
    }
    return map.toParameterSet(active);
  }

  async getParameterSetByVersion(
    version: number,
  ): Promise<ParameterSet | null> {
    const found = await this.prisma.parameterSet.findUnique({
      where: { version },
    });
    return found ? map.toParameterSet(found) : null;
  }

  /** Catalogue public sérialisé et son ETag (empreinte du contenu). */
  async getPublicCatalog(): Promise<{ body: string; etag: string }> {
    const [catalog, parameterSet] = await Promise.all([
      this.getCatalog(),
      this.getActiveParameterSet(),
    ]);
    const response: CatalogResponse = { ...catalog, parameterSet };
    const body = JSON.stringify(response);
    const etag = `"${createHash('sha256').update(body).digest('base64url').slice(0, 32)}"`;
    return { body, etag };
  }
}
