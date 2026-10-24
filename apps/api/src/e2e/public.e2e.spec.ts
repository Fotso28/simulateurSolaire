import type { NestExpressApplication } from '@nestjs/platform-express';
import { simulate } from '@simulateur/engine';
import type {
  ParameterSet,
  SimulationInput,
  SimulationResult,
} from '@simulateur/shared-types';
import request from 'supertest';
import { PrismaService } from '../app/prisma/prisma.service';
import { CatalogResponse } from '../app/catalog/catalog.service';
import { FIXTURE_DATA } from '../test/fixtures';
import { API, createTestApp, resetDatabase } from './helpers';

const INPUT: SimulationInput = {
  mode: 'particulier',
  regionId: 'cm-littoral',
  autonomyDays: 1,
  batteryTech: 'lithium',
  loads: [
    { deviceId: 'dev-led', label: 'Ampoule LED', quantity: 6, hoursPerDay: 6 },
    {
      deviceId: 'dev-fridge',
      label: 'Réfrigérateur',
      quantity: 1,
      hoursPerDay: 24,
    },
  ],
};

/** Le rejeu n'est testable qu'une fois `simulate()` implémenté par L1. */
const engineReady = (() => {
  try {
    const params: ParameterSet = {
      id: 'p',
      version: 1,
      values: FIXTURE_DATA.parameters,
      activeSince: new Date().toISOString(),
      createdBy: null,
    };
    simulate(INPUT, FIXTURE_DATA, params);
    return true;
  } catch {
    return false;
  }
})();
const itEngine = (name: string, fn: () => Promise<void>) =>
  engineReady ? it(name, fn) : it.todo(name);

describe('API publique', () => {
  let app: NestExpressApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
    http = request(app.getHttpServer());
  });

  afterAll(() => app.close());

  it('GET /health', () => http.get(`${API}/health`).expect(200));

  it('GET /countries renvoie pays et régions triés', async () => {
    const res = await http.get(`${API}/countries`).expect(200);
    expect(res.body.map((c: { isoCode: string }) => c.isoCode)).toEqual([
      'CM',
      'GA',
    ]);
    expect(res.body[0].regions[0]).toMatchObject({
      id: 'cm-littoral',
      irradiationAvg: 4,
    });
  });

  it('GET /catalog renvoie l’agrégat avec un ETag, puis 304', async () => {
    const res = await http.get(`${API}/catalog`).expect(200);
    const body = res.body as CatalogResponse;
    expect(Object.keys(body).sort()).toEqual(
      [
        'batteries',
        'cableSections',
        'controllers',
        'countries',
        'deviceCategories',
        'devices',
        'inverters',
        'panels',
        'parameterSet',
        'protectionRatings',
        'regions',
      ].sort(),
    );
    expect(body.parameterSet.version).toBe(1);
    expect(body.cableSections[0]).toEqual({
      sectionMm2: 4,
      allowableCurrentA: 32,
    });
    const etag = res.headers['etag'];
    expect(etag).toMatch(/^".+"$/);
    expect(res.headers['content-security-policy']).toBeDefined();

    const cached = await http
      .get(`${API}/catalog`)
      .set('If-None-Match', etag)
      .expect(304);
    expect(cached.text).toBe('');
  });

  it('GET /catalog change d’ETag quand un appareil est désactivé et le masque', async () => {
    const before = (await http.get(`${API}/catalog`)).headers['etag'];
    await app
      .get(PrismaService)
      .device.update({ where: { id: 'dev-led' }, data: { active: false } });
    const res = await http
      .get(`${API}/catalog`)
      .set('If-None-Match', before)
      .expect(200);
    expect(res.headers['etag']).not.toBe(before);
    expect(res.body.devices.map((d: { id: string }) => d.id)).toEqual([
      'dev-fridge',
    ]);
    await app
      .get(PrismaService)
      .device.update({ where: { id: 'dev-led' }, data: { active: true } });
  });

  describe('POST /simulations', () => {
    it('valide l’entrée (format d’erreur unique)', async () => {
      const res = await http
        .post(`${API}/simulations`)
        .send({ input: { ...INPUT, autonomyDays: 'x' }, result: {} })
        .expect(400);
      expect(res.body).toEqual({
        code: 'VALIDATION_ERROR',
        message: expect.stringContaining('autonomyDays'),
        field: 'input.autonomyDays',
      });
      await http
        .post(`${API}/simulations`)
        .send({
          input: {
            ...INPUT,
            loads: [{ label: 'x', quantity: 0, hoursPerDay: 2 }],
          },
          result: {},
        })
        .expect(400)
        .expect((r) => expect(r.body.field).toBe('input.loads.0.quantity'));
      await http
        .post(`${API}/simulations`)
        .send({ input: { ...INPUT, hack: true }, result: {} })
        .expect(400);
    });

    it('exige des appareils ou des totaux, une région et une version connues', async () => {
      await http
        .post(`${API}/simulations`)
        .send({ input: { ...INPUT, loads: [] }, result: { paramsVersion: 1 } })
        .expect(400);
      const region = await http
        .post(`${API}/simulations`)
        .send({
          input: { ...INPUT, regionId: 'inconnue' },
          result: { paramsVersion: 1 },
        })
        .expect(400);
      expect(region.body.code).toBe('UNKNOWN_REGION');
      const version = await http
        .post(`${API}/simulations`)
        .send({ input: INPUT, result: { paramsVersion: 99 } })
        .expect(400);
      expect(version.body.code).toBe('UNKNOWN_PARAMS_VERSION');
    });

    itEngine(
      'rejoue le moteur, stocke la simulation et refuse un résultat divergent',
      async () => {
        const catalog = (await http.get(`${API}/catalog`))
          .body as CatalogResponse;
        const result: SimulationResult = simulate(
          INPUT,
          catalog,
          catalog.parameterSet,
        );

        const tampered = structuredClone(result);
        tampered.pv.totalWp *= 1.05;
        const refused = await http
          .post(`${API}/simulations`)
          .send({ input: INPUT, result: tampered })
          .expect(422);
        expect(refused.body).toMatchObject({
          code: 'RESULT_MISMATCH',
          field: 'result.pv.totalWp',
        });

        const res = await http
          .post(`${API}/simulations`)
          .send({ input: INPUT, result })
          .expect(201);
        expect(res.body.shareToken).toMatch(/^[A-Za-z0-9_-]{24}$/);
        const shared = await http
          .get(`${API}/simulations/${res.body.shareToken}`)
          .expect(200);
        expect(shared.body.input).toEqual(INPUT);
        expect(shared.body.paramsVersion).toBe(1);
      },
    );
  });

  it('GET /simulations/:shareToken ouvre une simulation stockée, 404 sinon', async () => {
    await app.get(PrismaService).simulation.create({
      data: {
        mode: 'pro',
        regionId: 'ga-estuaire',
        autonomyDays: 2,
        batteryTech: 'plomb',
        inputs: {
          mode: 'pro',
          regionId: 'ga-estuaire',
          autonomyDays: 2,
          batteryTech: 'plomb',
        },
        overrides: { panelCount: 6 },
        result: { engineVersion: '0.0.0', paramsVersion: 1 },
        engineVersion: '0.0.0',
        paramsVersion: 1,
        shareToken: 'jeton-de-test-0123456789',
      },
    });
    const res = await http
      .get(`${API}/simulations/jeton-de-test-0123456789`)
      .expect(200);
    expect(res.body.input).toEqual({
      mode: 'pro',
      regionId: 'ga-estuaire',
      autonomyDays: 2,
      batteryTech: 'plomb',
      overrides: { panelCount: 6 },
    });
    expect(res.body).not.toHaveProperty('id');
    const missing = await http.get(`${API}/simulations/inexistant`).expect(404);
    expect(missing.body.code).toBe('NOT_FOUND');
  });

  it('POST /leads exige le consentement et ne stocke pas l’IP en clair', async () => {
    const lead = {
      name: 'Awa Ngono',
      phone: '+237 6 99 00 00 00',
      city: 'Douala',
    };
    const refused = await http
      .post(`${API}/leads`)
      .send({ ...lead, consent: false })
      .expect(400);
    expect(refused.body).toMatchObject({
      code: 'VALIDATION_ERROR',
      field: 'consent',
    });
    await http.post(`${API}/leads`).send(lead).expect(400);

    const res = await http
      .post(`${API}/leads`)
      .set('X-Forwarded-For', '203.0.113.7')
      .send({ ...lead, consent: true, shareToken: 'jeton-de-test-0123456789' })
      .expect(201);
    const stored = await app
      .get(PrismaService)
      .lead.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(stored.ipHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(stored)).not.toContain('203.0.113.7');
    expect(stored.simulationId).not.toBeNull();
  });

  it('CORS limité aux origines configurées', async () => {
    const ok = await http
      .get(`${API}/countries`)
      .set('Origin', 'http://localhost:4200');
    expect(ok.headers['access-control-allow-origin']).toBe(
      'http://localhost:4200',
    );
    const ko = await http
      .get(`${API}/countries`)
      .set('Origin', 'https://evil.example');
    expect(ko.headers['access-control-allow-origin']).toBeUndefined();
  });
});
