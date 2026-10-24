import type { NestExpressApplication } from '@nestjs/platform-express';
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

describe('Authentification et rôles', () => {
  let app: NestExpressApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
    http = request(app.getHttpServer());
  });

  afterAll(() => app.close());

  it('login : jeton d’accès + cookie httpOnly de renouvellement', async () => {
    const res = await http.post(`${API}/auth/login`).send(ADMIN).expect(200);
    expect(res.body).toMatchObject({
      expiresIn: 900,
      user: { email: ADMIN.email, role: 'ADMIN' },
    });
    const cookie = (res.headers['set-cookie'] as unknown as string[])[0];
    expect(cookie).toMatch(/^refresh_token=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
    expect(cookie).toMatch(/Path=\/api\/v1\/auth/);
  });

  it('refus générique en cas d’identifiants invalides', async () => {
    const res = await http
      .post(`${API}/auth/login`)
      .send({ email: 'inconnu@test.fr', password: 'x' })
      .expect(401);
    expect(res.body).toEqual({
      code: 'INVALID_CREDENTIALS',
      message: 'Adresse e-mail ou mot de passe incorrect.',
    });
  });

  it('refresh fait tourner le jeton ; rejouer l’ancien révoque la session', async () => {
    const { cookie } = await login(app, ADMIN);
    const first = await http
      .post(`${API}/auth/refresh`)
      .set('Cookie', cookie)
      .expect(200);
    expect(first.body.accessToken).toBeTruthy();
    const next = (first.headers['set-cookie'] as unknown as string[])[0].split(
      ';',
    )[0];
    expect(next).not.toBe(cookie);

    await http.post(`${API}/auth/refresh`).set('Cookie', cookie).expect(401);
    // La réutilisation a révoqué toute la famille, y compris le nouveau jeton.
    await http.post(`${API}/auth/refresh`).set('Cookie', next).expect(401);
  });

  it('logout révoque le jeton de renouvellement', async () => {
    const { cookie } = await login(app, ADMIN);
    await http.post(`${API}/auth/logout`).set('Cookie', cookie).expect(204);
    await http.post(`${API}/auth/refresh`).set('Cookie', cookie).expect(401);
  });

  it('verrouille le compte après 5 échecs', async () => {
    for (let i = 0; i < 5; i++) {
      await http
        .post(`${API}/auth/login`)
        .send({ ...EDITOR, password: 'mauvais' })
        .expect(401);
    }
    const locked = await http
      .post(`${API}/auth/login`)
      .send(EDITOR)
      .expect(423);
    expect(locked.body.code).toBe('ACCOUNT_LOCKED');
    await app.get(PrismaService).adminUser.update({
      where: { email: EDITOR.email },
      data: { lockedUntil: null },
    });
  }, 60_000);

  it('protège les routes admin : 401 sans jeton, 401 jeton invalide, 403 rôle insuffisant', async () => {
    await http.get(`${API}/admin/devices`).expect(401);
    const bad = await http
      .get(`${API}/admin/devices`)
      .set('Authorization', 'Bearer abc.def.ghi')
      .expect(401);
    expect(bad.body.code).toBe('INVALID_TOKEN');

    const { token } = await login(app, EDITOR);
    await http
      .get(`${API}/admin/devices`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    await http
      .get(`${API}/admin/media`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
    for (const path of [
      'countries',
      'regions',
      'equipment/panels',
      'parameter-sets',
      'users',
      'stats/simulations',
      'audit-log',
    ]) {
      const res = await http
        .get(`${API}/admin/${path}`)
        .set('Authorization', `Bearer ${token}`);
      expect([path, res.status]).toEqual([path, 403]);
    }
  });

  it('un compte désactivé ne peut plus se connecter ni renouveler', async () => {
    const { cookie } = await login(app, EDITOR);
    await app.get(PrismaService).adminUser.update({
      where: { email: EDITOR.email },
      data: { active: false },
    });
    await http.post(`${API}/auth/login`).send(EDITOR).expect(401);
    await http.post(`${API}/auth/refresh`).set('Cookie', cookie).expect(401);
    await app.get(PrismaService).adminUser.update({
      where: { email: EDITOR.email },
      data: { active: true },
    });
  });
});
