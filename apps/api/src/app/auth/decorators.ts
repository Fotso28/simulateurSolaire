import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type { AdminRole } from '@prisma/client';
import type { Request } from 'express';
import type { AuthUser } from './auth.types';

export const ROLES_KEY = 'roles';

/** Rôles autorisés sur une route ou un contrôleur (implique l'authentification). */
export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles);

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser =>
    (ctx.switchToHttp().getRequest<Request>() as Request & { user: AuthUser })
      .user,
);
