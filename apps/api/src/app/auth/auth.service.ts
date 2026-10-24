import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AdminUser } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { ApiError } from '../common/api-error';
import { PrismaService } from '../prisma/prisma.service';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  AccessTokenPayload,
  LOCK_DURATION_MS,
  MAX_FAILED_LOGINS,
  REFRESH_TOKEN_TTL_MS,
} from './auth.types';
import { hashPassword, verifyPassword } from './password';

export interface SessionTokens {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresAt: Date;
  user: { id: string; email: string; role: AdminUser['role'] };
}

const invalidCredentials = () =>
  new ApiError(
    HttpStatus.UNAUTHORIZED,
    'INVALID_CREDENTIALS',
    'Adresse e-mail ou mot de passe incorrect.',
  );

const invalidSession = () =>
  new ApiError(
    HttpStatus.UNAUTHORIZED,
    'INVALID_REFRESH_TOKEN',
    'Session expirée, reconnectez-vous.',
  );

export const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthService {
  private dummyHash?: Promise<string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<SessionTokens> {
    const user = await this.prisma.adminUser.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user || !user.active) {
      // Même coût de calcul qu'un compte existant (pas d'énumération des comptes).
      this.dummyHash ??= hashPassword(randomBytes(16).toString('hex'));
      await verifyPassword(await this.dummyHash, password);
      throw invalidCredentials();
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ApiError(
        HttpStatus.LOCKED,
        'ACCOUNT_LOCKED',
        'Compte verrouillé après plusieurs échecs, réessayez dans 15 minutes.',
      );
    }
    if (!(await verifyPassword(user.passwordHash, password))) {
      const failedLogins = user.failedLogins + 1;
      const locked = failedLogins >= MAX_FAILED_LOGINS;
      await this.prisma.adminUser.update({
        where: { id: user.id },
        data: {
          failedLogins: locked ? 0 : failedLogins,
          lockedUntil: locked ? new Date(Date.now() + LOCK_DURATION_MS) : null,
        },
      });
      throw invalidCredentials();
    }
    await this.prisma.adminUser.update({
      where: { id: user.id },
      data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
    return this.issueTokens(user);
  }

  /** Rotation : l'ancien jeton est révoqué ; sa réutilisation révoque toute la famille. */
  async refresh(refreshToken: string | undefined): Promise<SessionTokens> {
    if (!refreshToken) throw invalidSession();
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(refreshToken) },
      include: { adminUser: true },
    });
    if (!stored) throw invalidSession();
    if (stored.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { adminUserId: stored.adminUserId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw invalidSession();
    }
    if (stored.expiresAt <= new Date() || !stored.adminUser.active)
      throw invalidSession();

    const { count } = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count === 0) throw invalidSession();
    return this.issueTokens(stored.adminUser);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(user: AdminUser): Promise<SessionTokens> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = await this.jwt.signAsync(payload);
    const refreshToken = randomBytes(32).toString('base64url');
    const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    await this.prisma.refreshToken.create({
      data: {
        adminUserId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: refreshExpiresAt,
      },
    });
    return {
      accessToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      refreshToken,
      refreshExpiresAt,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }
}
