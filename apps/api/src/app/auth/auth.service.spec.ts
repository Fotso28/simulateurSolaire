import { JwtService } from '@nestjs/jwt';
import type { AdminUser } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { AuthService, sha256 } from './auth.service';
import { hashPassword } from './password';

describe('AuthService', () => {
  let user: AdminUser;
  const prisma = {
    adminUser: { findUnique: jest.fn(), update: jest.fn() },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const service = new AuthService(
    prisma as unknown as PrismaService,
    new JwtService({ secret: 'x'.repeat(32), signOptions: { expiresIn: 900 } }),
  );

  beforeAll(async () => {
    user = {
      id: 'u1',
      email: 'a@b.fr',
      passwordHash: await hashPassword('Secret-123456'),
      role: 'ADMIN',
      active: true,
      lastLoginAt: null,
      failedLogins: 0,
      lockedUntil: null,
      createdAt: new Date(),
    };
  });

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.adminUser.findUnique.mockImplementation(async () => user);
    prisma.adminUser.update.mockImplementation(async ({ data }) => {
      const { failedLogins, ...rest } = data;
      Object.assign(user, rest);
      if (typeof failedLogins === 'number') user.failedLogins = failedLogins;
      else if (failedLogins?.increment)
        user.failedLogins += failedLogins.increment;
      return { ...user };
    });
  });

  it('connecte avec le bon mot de passe et remet le compteur à zéro', async () => {
    user.failedLogins = 2;
    const tokens = await service.login('A@B.fr', 'Secret-123456');
    expect(tokens.accessToken).toBeTruthy();
    expect(user.failedLogins).toBe(0);
    expect(prisma.refreshToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ tokenHash: sha256(tokens.refreshToken) }),
    });
  });

  it('verrouille le compte au 5e échec', async () => {
    user.failedLogins = 0;
    for (let i = 0; i < 4; i++) {
      await expect(service.login('a@b.fr', 'mauvais')).rejects.toMatchObject({
        status: 401,
      });
    }
    expect(user.lockedUntil).toBeNull();
    await expect(service.login('a@b.fr', 'mauvais')).rejects.toMatchObject({
      status: 401,
    });
    expect(user.lockedUntil?.getTime()).toBeGreaterThan(Date.now());
    await expect(
      service.login('a@b.fr', 'Secret-123456'),
    ).rejects.toMatchObject({ status: 423 });
    user.lockedUntil = null;
  });

  it('verrouille même si les 5 échecs sont simultanés (incrément atomique)', async () => {
    user.failedLogins = 0;
    // Chaque essai lit l'état initial (compteur à 0) avant les autres écritures.
    prisma.adminUser.findUnique.mockImplementation(async () => ({ ...user }));
    const attempts = Array.from({ length: 5 }, () =>
      service.login('a@b.fr', 'mauvais'),
    );
    await Promise.allSettled(attempts);
    expect(prisma.adminUser.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { failedLogins: { increment: 1 } } }),
    );
    expect(user.lockedUntil?.getTime()).toBeGreaterThan(Date.now());
    user.lockedUntil = null;
    user.failedLogins = 0;
  });

  it('révoque toute la famille si un jeton déjà utilisé est rejoué', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 't1',
      adminUserId: 'u1',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 1000),
      adminUser: user,
    });
    await expect(service.refresh('ancien')).rejects.toMatchObject({
      status: 401,
    });
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { adminUserId: 'u1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('fait tourner un jeton valide', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 't1',
      adminUserId: 'u1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 1000),
      adminUser: user,
    });
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    const tokens = await service.refresh('valide');
    expect(tokens.refreshToken).not.toBe('valide');
    expect(prisma.refreshToken.create).toHaveBeenCalled();
  });
});
