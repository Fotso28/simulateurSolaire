import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { AdminRole } from '@prisma/client';
import type { Request } from 'express';
import { ApiError } from '../common/api-error';
import type { AccessTokenPayload, AuthUser } from './auth.types';
import { ROLES_KEY } from './decorators';

/**
 * Vérifie le jeton d'accès (en-tête `Authorization: Bearer`) puis le rôle,
 * pour les routes marquées `@Roles(...)`. Les autres routes restent publiques.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<AdminRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!roles) return true;

    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new ApiError(
        HttpStatus.UNAUTHORIZED,
        'UNAUTHORIZED',
        'Authentification requise.',
      );
    }
    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new ApiError(
        HttpStatus.UNAUTHORIZED,
        'INVALID_TOKEN',
        'Session expirée ou invalide, reconnectez-vous.',
      );
    }
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    if (!roles.includes(payload.role)) {
      throw new ApiError(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Votre rôle ne permet pas cette action.',
      );
    }
    return true;
  }
}
