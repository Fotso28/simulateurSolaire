import { PrismaClient } from '@prisma/client';
import { loadSeedData } from './seed-data';
import { seed, SeedAdmin } from './seed';

/** `npx nx run api:seed` : données de référence + compte ADMIN initial (SEED_ADMIN_*). */
async function main() {
  const { SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD } = process.env;
  const admin: SeedAdmin | undefined =
    SEED_ADMIN_EMAIL && SEED_ADMIN_PASSWORD
      ? { email: SEED_ADMIN_EMAIL, password: SEED_ADMIN_PASSWORD }
      : undefined;
  if (!admin)
    console.warn(
      'SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD absents : aucun compte créé.',
    );
  const prisma = new PrismaClient();
  try {
    const report = await seed(prisma, loadSeedData(), admin);
    console.table(report);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
