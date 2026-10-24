import { PrismaClient } from '@prisma/client';
import { DEFAULT_CATALOG } from '@simulateur/engine';
import { loadSeedData } from '../seed/seed-data';
import { seed } from '../seed/seed';

describe('seed des données de référence (L1)', () => {
  const prisma = new PrismaClient();

  beforeAll(async () => {
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
    await prisma.$executeRawUnsafe(
      `TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} CASCADE`,
    );
  });

  afterAll(() => prisma.$disconnect());

  it('importe le catalogue par défaut et le compte ADMIN, de façon idempotente', async () => {
    const admin = { email: 'Seed@Test.fr', password: 'Seed-pass-2026' };
    const first = await seed(prisma, loadSeedData(), admin);
    expect(first).toMatchObject({
      region: DEFAULT_CATALOG.regions.length,
      device: DEFAULT_CATALOG.devices.length,
      parameter_set: 1,
      admin_user: 1,
    });
    expect(await prisma.region.count()).toBe(19);

    const again = await seed(prisma, loadSeedData(), admin);
    expect(Object.values(again).every((n) => n === 0)).toBe(true);
    const user = await prisma.adminUser.findUniqueOrThrow({
      where: { email: 'seed@test.fr' },
    });
    expect(user.role).toBe('ADMIN');
  });
});
