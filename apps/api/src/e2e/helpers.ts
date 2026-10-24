import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../app/app.module';
import { configureApp } from '../app/bootstrap';
import { hashPassword } from '../app/auth/password';
import { PrismaService } from '../app/prisma/prisma.service';
import { seed } from '../seed/seed';
import { FIXTURE_DATA } from '../test/fixtures';

export const ADMIN = { email: 'admin@test.fr', password: 'Admin-pass-2026' };
export const EDITOR = {
  email: 'editeur@test.fr',
  password: 'Editeur-pass-2026',
};
export const API = '/api/v1';

export async function createTestApp(): Promise<NestExpressApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({
    bodyParser: false,
    logger: ['error'],
  });
  configureApp(app);
  await app.init();
  return app;
}

/** Vide toutes les tables puis recharge les données de test et deux comptes. */
export async function resetDatabase(
  app: NestExpressApplication,
): Promise<void> {
  const prisma = app.get(PrismaService);
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(
    `TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`,
  );
  await seed(prisma, FIXTURE_DATA, ADMIN);
  await prisma.adminUser.create({
    data: {
      email: EDITOR.email,
      role: 'EDITEUR',
      passwordHash: await hashPassword(EDITOR.password),
    },
  });
}

export async function login(
  app: NestExpressApplication,
  user: { email: string; password: string },
): Promise<{ token: string; cookie: string }> {
  const res = await request(app.getHttpServer())
    .post(`${API}/auth/login`)
    .send(user)
    .expect(200);
  const cookies = res.headers['set-cookie'] as unknown as string[];
  return { token: res.body.accessToken, cookie: cookies[0].split(';')[0] };
}
