import type { NestExpressApplication } from '@nestjs/platform-express';
import sharp from 'sharp';
import request from 'supertest';
import { PrismaService } from '../app/prisma/prisma.service';
import {
  ADMIN,
  API,
  createTestApp,
  EDITOR,
  login,
  resetDatabase,
} from './helpers';

describe('Back-office', () => {
  let app: NestExpressApplication;
  let http: ReturnType<typeof request>;
  let prisma: PrismaService;
  let admin: string;
  let editor: string;
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
    http = request(app.getHttpServer());
    prisma = app.get(PrismaService);
    admin = (await login(app, ADMIN)).token;
    editor = (await login(app, EDITOR)).token;
  });

  afterAll(() => app.close());

  describe('catégories et appareils (EDITEUR)', () => {
    let categoryId: string;
    let deviceId: string;

    it('crée une catégorie et la journalise', async () => {
      const res = await http
        .post(`${API}/admin/device-categories`)
        .set(as(editor))
        .send({ name: 'Multimédia', sortOrder: 3 })
        .expect(201);
      categoryId = res.body.id;
      const log = await prisma.auditLog.findFirstOrThrow({
        where: { entity: 'device_category', entityId: categoryId },
        include: { adminUser: true },
      });
      expect(log).toMatchObject({
        action: 'create',
        before: null,
        after: { name: 'Multimédia' },
      });
      expect(log.adminUser?.email).toBe(EDITOR.email);
    });

    it('valide les DTO (champ inconnu, plage de puissance, catégorie)', async () => {
      const base = {
        categoryId: 'x',
        name: 'Télévision',
        powerMinW: 50,
        powerTypW: 80,
        powerMaxW: 120,
        defaultHoursPerDay: 5,
      };
      await http
        .post(`${API}/admin/devices`)
        .set(as(editor))
        .send({ ...base, foo: 1 })
        .expect(400);
      const range = await http
        .post(`${API}/admin/devices`)
        .set(as(editor))
        .send({ ...base, categoryId, powerTypW: 200 })
        .expect(400);
      expect(range.body.code).toBe('INVALID_POWER_RANGE');
      const unknown = await http
        .post(`${API}/admin/devices`)
        .set(as(editor))
        .send(base)
        .expect(400);
      expect(unknown.body).toMatchObject({
        code: 'UNKNOWN_CATEGORY',
        field: 'categoryId',
      });

      const ok = await http
        .post(`${API}/admin/devices`)
        .set(as(editor))
        .send({ ...base, categoryId })
        .expect(201);
      deviceId = ok.body.id;
      expect(ok.body).toMatchObject({
        active: true,
        dutyCycle: 1,
        surgeFactor: 1,
      });
    });

    it('modifie un appareil avec avant/après dans le journal', async () => {
      await http
        .patch(`${API}/admin/devices/${deviceId}`)
        .set(as(editor))
        .send({ powerTypW: 100 })
        .expect(200);
      const log = await prisma.auditLog.findFirstOrThrow({
        where: { entityId: deviceId, action: 'update' },
      });
      expect(log.before).toMatchObject({ powerTypW: 80 });
      expect(log.after).toMatchObject({ powerTypW: 100 });
    });

    it('désactive logiquement un appareil (visible côté admin, absent du catalogue)', async () => {
      await http
        .delete(`${API}/admin/devices/${deviceId}`)
        .set(as(editor))
        .expect(200);
      expect(
        (await prisma.device.findUniqueOrThrow({ where: { id: deviceId } }))
          .active,
      ).toBe(false);
      const catalog = await http.get(`${API}/catalog`).expect(200);
      expect(
        catalog.body.devices.some((d: { id: string }) => d.id === deviceId),
      ).toBe(false);
      const all = await http
        .get(
          `${API}/admin/devices?includeInactive=true&categoryId=${categoryId}`,
        )
        .set(as(editor))
        .expect(200);
      expect(all.body).toHaveLength(1);
      expect(
        await prisma.auditLog.count({
          where: { entityId: deviceId, action: 'deactivate' },
        }),
      ).toBe(1);
    });

    it('refuse de supprimer une catégorie non vide', async () => {
      const res = await http
        .delete(`${API}/admin/device-categories/${categoryId}`)
        .set(as(editor))
        .expect(409);
      expect(res.body.code).toBe('CATEGORY_NOT_EMPTY');
      await http
        .get(`${API}/admin/device-categories/inexistant`)
        .set(as(editor))
        .expect(404);
    });
  });

  describe('médias', () => {
    it('nettoie une icône SVG et la stocke', async () => {
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script><path d="M0 0h24v24H0z"/></svg>';
      const res = await http
        .post(`${API}/admin/media`)
        .set(as(editor))
        .field('kind', 'icon')
        .attach('file', Buffer.from(svg), {
          filename: 'icone.svg',
          contentType: 'image/svg+xml',
        })
        .expect(201);
      expect(res.body).toMatchObject({
        kind: 'icon',
        contentType: 'image/svg+xml',
      });
      expect(res.body.url).toMatch(
        /^http:\/\/localhost:3000\/media\/icons\/.+\.svg$/,
      );
      const served = await http
        .get(`/media/${res.body.key}`)
        .buffer(true)
        .parse((r, cb) => {
          let data = '';
          r.on('data', (chunk: Buffer) => (data += chunk.toString()));
          r.on('end', () => cb(null, data));
        })
        .expect(200);
      expect(served.body).toContain('<svg');
      expect(served.body).not.toMatch(/script|onload/);
      expect(
        await prisma.auditLog.count({
          where: { entity: 'media', action: 'upload' },
        }),
      ).toBe(1);
    });

    it('convertit une image en WebP et refuse un faux type', async () => {
      const png = await sharp({
        create: { width: 900, height: 600, channels: 3, background: '#1a7f37' },
      })
        .png()
        .toBuffer();
      const res = await http
        .post(`${API}/admin/media`)
        .set(as(editor))
        .field('kind', 'image')
        .attach('file', png, {
          filename: 'frigo.png',
          contentType: 'image/png',
        })
        .expect(201);
      expect(res.body.contentType).toBe('image/webp');
      expect(res.body.size).toBeLessThanOrEqual(80 * 1024);

      const fake = await http
        .post(`${API}/admin/media`)
        .set(as(editor))
        .field('kind', 'image')
        .attach('file', Buffer.from('<?php echo 1; ?>'), {
          filename: 'x.png',
          contentType: 'image/png',
        })
        .expect(415);
      expect(fake.body.code).toBe('UNSUPPORTED_FILE_TYPE');
      await http
        .post(`${API}/admin/media`)
        .set(as(editor))
        .field('kind', 'image')
        .expect(400);
    });
  });

  describe('référentiels (ADMIN)', () => {
    it('crée et modifie pays, région et matériel', async () => {
      const country = await http
        .post(`${API}/admin/countries`)
        .set(as(admin))
        .send({ isoCode: 'CG', name: 'Congo', gridVoltageV: 220 })
        .expect(201);
      await http
        .post(`${API}/admin/countries`)
        .set(as(admin))
        .send({ isoCode: 'CG', name: 'Doublon', gridVoltageV: 220 })
        .expect(409);
      const region = await http
        .post(`${API}/admin/regions`)
        .set(as(admin))
        .send({
          countryId: country.body.id,
          name: 'Pool',
          capital: 'Kinkala',
          latitude: -4.36,
          longitude: 14.76,
          irradiationAvg: 4.3,
          irradiationMinMonth: 3.4,
          source: 'PVGIS',
        })
        .expect(201);
      await http
        .patch(`${API}/admin/regions/${region.body.id}`)
        .set(as(admin))
        .send({ irradiationAvg: 4.4 })
        .expect(200);
      const countries = await http.get(`${API}/countries`).expect(200);
      expect(
        countries.body.find((c: { isoCode: string }) => c.isoCode === 'CG')
          .regions[0].irradiationAvg,
      ).toBe(4.4);

      const inverter = await http
        .post(`${API}/admin/equipment/inverters`)
        .set(as(admin))
        .send({
          type: 'autonome',
          nominalPowerW: 1000,
          surgeFactor: 2,
          dcVoltageV: 12,
          efficiency: 0.9,
        })
        .expect(201);
      await http
        .patch(`${API}/admin/equipment/inverters/${inverter.body.id}`)
        .set(as(admin))
        .send({ active: false })
        .expect(200);
      const bad = await http
        .post(`${API}/admin/equipment/batteries`)
        .set(as(admin))
        .send({
          technology: 'nickel',
          nominalVoltageV: 12,
          capacityAh: 100,
          dod: 0.5,
        })
        .expect(400);
      expect(bad.body.field).toBe('technology');
      await http
        .get(`${API}/admin/equipment/inconnu`)
        .set(as(admin))
        .expect(404);
      const sections = await http
        .get(`${API}/admin/equipment/cable-sections`)
        .set(as(admin))
        .expect(200);
      expect(sections.body).toHaveLength(5);
    });

    it('versionne les paramètres sans modification en place, puis active', async () => {
      const etag = (await http.get(`${API}/catalog`)).headers['etag'];
      const created = await http
        .post(`${API}/admin/parameter-sets`)
        .set(as(admin))
        .send({ values: { performanceRatio: 0.7 } })
        .expect(201);
      expect(created.body).toMatchObject({ version: 2, activeSince: null });
      expect(created.body.values).toMatchObject({
        performanceRatio: 0.7,
        dodLithium: 0.9,
      });
      const v1 = await prisma.parameterSet.findUniqueOrThrow({
        where: { version: 1 },
      });
      expect((v1.values as { performanceRatio: number }).performanceRatio).toBe(
        0.75,
      );

      await http
        .post(`${API}/admin/parameter-sets`)
        .set(as(admin))
        .send({ values: { inconnu: 1 } })
        .expect(400);
      expect((await http.get(`${API}/catalog`)).body.parameterSet.version).toBe(
        1,
      );

      await http
        .post(`${API}/admin/parameter-sets/${created.body.id}/activate`)
        .set(as(admin))
        .expect(200);
      const catalog = await http
        .get(`${API}/catalog`)
        .set('If-None-Match', etag)
        .expect(200);
      expect(catalog.body.parameterSet.version).toBe(2);
      const list = await http
        .get(`${API}/admin/parameter-sets`)
        .set(as(admin))
        .expect(200);
      expect(
        list.body.map((s: { version: number; active: boolean }) => [
          s.version,
          s.active,
        ]),
      ).toEqual([
        [2, true],
        [1, false],
      ]);
    });
  });

  describe('comptes, statistiques et journal (ADMIN)', () => {
    it('gère les comptes sans exposer les hachages', async () => {
      const weak = await http
        .post(`${API}/admin/users`)
        .set(as(admin))
        .send({ email: 'x@test.fr', role: 'EDITEUR', password: 'court' })
        .expect(400);
      expect(weak.body.field).toBe('password');
      const res = await http
        .post(`${API}/admin/users`)
        .set(as(admin))
        .send({
          email: 'Nouveau@Test.fr',
          role: 'EDITEUR',
          password: 'Nouveau-pass-2026',
        })
        .expect(201);
      expect(res.body).not.toHaveProperty('passwordHash');
      expect(res.body.email).toBe('nouveau@test.fr');
      await login(app, {
        email: 'nouveau@test.fr',
        password: 'Nouveau-pass-2026',
      });

      await http
        .patch(`${API}/admin/users/${res.body.id}`)
        .set(as(admin))
        .send({ active: false })
        .expect(200);
      const me = await prisma.adminUser.findUniqueOrThrow({
        where: { email: ADMIN.email },
      });
      const self = await http
        .patch(`${API}/admin/users/${me.id}`)
        .set(as(admin))
        .send({ role: 'EDITEUR' })
        .expect(400);
      expect(self.body.code).toBe('SELF_LOCKOUT');
      const users = await http
        .get(`${API}/admin/users`)
        .set(as(admin))
        .expect(200);
      expect(JSON.stringify(users.body)).not.toContain('argon2');
      const logs = await prisma.auditLog.findMany({
        where: { entity: 'admin_user' },
      });
      expect(JSON.stringify(logs)).not.toContain('argon2');
    });

    it('calcule les statistiques de simulations', async () => {
      await prisma.simulation.create({
        data: {
          mode: 'particulier',
          regionId: 'cm-littoral',
          autonomyDays: 1,
          batteryTech: 'lithium',
          inputs: {
            loads: [
              {
                deviceId: 'dev-fridge',
                label: 'Frigo',
                quantity: 2,
                hoursPerDay: 24,
              },
            ],
          },
          result: {},
          engineVersion: '0.0.0',
          paramsVersion: 1,
          shareToken: 'stat-0000000000000000000',
        },
      });
      const res = await http
        .get(`${API}/admin/stats/simulations`)
        .set(as(admin))
        .expect(200);
      expect(res.body).toMatchObject({
        total: 1,
        byMode: { particulier: 1 },
        byRegion: [{ regionId: 'cm-littoral', name: 'Littoral', count: 1 }],
        topDevices: [
          {
            deviceId: 'dev-fridge',
            name: 'Réfrigérateur',
            count: 1,
            quantity: 2,
          },
        ],
      });
      expect(res.body.perDay).toHaveLength(1);
    });

    it('pagine et filtre le journal', async () => {
      const res = await http
        .get(`${API}/admin/audit-log?entity=parameter_set&pageSize=1`)
        .set(as(admin))
        .expect(200);
      expect(res.body).toMatchObject({ total: 2, page: 1, pageSize: 1 });
      expect(res.body.items[0]).toMatchObject({
        action: 'activate',
        adminUser: { email: ADMIN.email },
      });
    });
  });
});
