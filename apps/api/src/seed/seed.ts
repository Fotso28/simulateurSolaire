import { Prisma, PrismaClient } from '@prisma/client';
import type { Catalog, EngineParameters } from '@simulateur/shared-types';
import { hashPassword } from '../app/auth/password';

/** Données de référence à importer : agrégat `Catalog` + paramètres du moteur (version 1). */
export interface SeedData extends Catalog {
  parameters: EngineParameters;
}

export interface SeedAdmin {
  email: string;
  password: string;
}

export type SeedReport = Record<string, number>;

/**
 * Import idempotent : n'insère que les lignes absentes (par identifiant ou clé unique),
 * sans jamais écraser ce que l'administrateur a modifié depuis.
 */
export async function seed(
  prisma: PrismaClient,
  data: SeedData,
  admin?: SeedAdmin,
): Promise<SeedReport> {
  const report: SeedReport = {};
  const run = async (table: string, op: Promise<{ count: number }>) => {
    report[table] = (await op).count;
  };
  const opts = { skipDuplicates: true } as const;

  await run(
    'country',
    prisma.country.createMany({ data: data.countries, ...opts }),
  );
  await run(
    'region',
    prisma.region.createMany({
      data: data.regions.map(({ updatedAt, ...r }) => ({
        ...r,
        updatedAt: updatedAt ? new Date(updatedAt) : new Date(),
      })),
      ...opts,
    }),
  );
  await run(
    'device_category',
    prisma.deviceCategory.createMany({ data: data.deviceCategories, ...opts }),
  );
  await run(
    'device',
    prisma.device.createMany({ data: data.devices, ...opts }),
  );
  await run(
    'panel_model',
    prisma.panelModel.createMany({ data: data.panels, ...opts }),
  );
  await run(
    'battery_model',
    prisma.batteryModel.createMany({ data: data.batteries, ...opts }),
  );
  await run(
    'inverter_model',
    prisma.inverterModel.createMany({ data: data.inverters, ...opts }),
  );
  await run(
    'controller_model',
    prisma.controllerModel.createMany({ data: data.controllers, ...opts }),
  );
  await run(
    'cable_section',
    prisma.cableSection.createMany({ data: data.cableSections, ...opts }),
  );
  await run(
    'protection_rating',
    prisma.protectionRating.createMany({
      data: data.protectionRatings,
      ...opts,
    }),
  );

  report['parameter_set'] = 0;
  if ((await prisma.parameterSet.count()) === 0) {
    await prisma.parameterSet.create({
      data: {
        version: 1,
        values: data.parameters as unknown as Prisma.InputJsonValue,
        activeSince: new Date(),
      },
    });
    report['parameter_set'] = 1;
  }

  report['admin_user'] = 0;
  if (admin) {
    const email = admin.email.toLowerCase();
    if (!(await prisma.adminUser.findUnique({ where: { email } }))) {
      await prisma.adminUser.create({
        data: {
          email,
          role: 'ADMIN',
          passwordHash: await hashPassword(admin.password),
        },
      });
      report['admin_user'] = 1;
    }
  }
  return report;
}
