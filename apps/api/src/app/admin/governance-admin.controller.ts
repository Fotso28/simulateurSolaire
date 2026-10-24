import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { resolveParameters } from '@simulateur/engine';
import type { EngineParameters } from '@simulateur/shared-types';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser, Roles } from '../auth/decorators';
import {
  hashPassword,
  PASSWORD_MESSAGE,
  PASSWORD_PATTERN,
} from '../auth/password';
import { AuditService } from '../audit/audit.service';
import { ApiError } from '../common/api-error';
import { Page, PaginationQuery } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateParameterSetDto } from './dto';
import { mergeParameters } from './parameters';

@Controller('admin/parameter-sets')
@Roles('ADMIN')
export class ParameterSetsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list() {
    const sets = await this.prisma.parameterSet.findMany({
      orderBy: { version: 'desc' },
    });
    const activeId = sets
      .filter((s) => s.activeSince && s.activeSince <= new Date())
      .sort(
        (a, b) =>
          (b.activeSince as Date).getTime() - (a.activeSince as Date).getTime(),
      )[0]?.id;
    return sets.map((s) => ({ ...s, active: s.id === activeId }));
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const set = await this.prisma.parameterSet.findUnique({ where: { id } });
    if (!set) throw ApiError.notFound();
    return set;
  }

  /** Crée une nouvelle version (inactive) à partir d'une version de base ; jamais de modification en place. */
  @Post()
  create(@Body() dto: CreateParameterSetDto, @CurrentUser() user: AuthUser) {
    return this.prisma.$transaction(
      async (tx) => {
        const base = dto.baseVersion
          ? await tx.parameterSet.findUnique({
              where: { version: dto.baseVersion },
            })
          : ((await tx.parameterSet.findFirst({
              where: { activeSince: { not: null, lte: new Date() } },
              orderBy: { activeSince: 'desc' },
            })) ??
            (await tx.parameterSet.findFirst({
              orderBy: { version: 'desc' },
            })));
        if (!base) {
          throw ApiError.badRequest(
            'UNKNOWN_BASE_VERSION',
            'Version de base introuvable.',
            'baseVersion',
          );
        }
        // Base complétée des valeurs par défaut : tout paramètre connu du moteur est modifiable.
        const resolved = resolveParameters(
          base.values as Partial<EngineParameters>,
        );
        const values = mergeParameters(
          resolved as unknown as Record<string, unknown>,
          dto.values,
        );
        const last = await tx.parameterSet.findFirst({
          orderBy: { version: 'desc' },
        });
        const created = await tx.parameterSet.create({
          data: {
            version: (last?.version ?? 0) + 1,
            values,
            createdById: user.id,
          },
        });
        await this.audit.log(
          {
            adminUserId: user.id,
            entity: 'parameter_set',
            entityId: created.id,
            action: 'create',
            before: { version: base.version, values: base.values },
            after: created,
          },
          tx,
        );
        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  /** Active une version : elle devient la plus récemment activée. */
  @Post(':id/activate')
  @HttpCode(200)
  activate(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.parameterSet.findUnique({ where: { id } });
      if (!before) throw ApiError.notFound();
      const after = await tx.parameterSet.update({
        where: { id },
        data: { activeSince: new Date() },
      });
      await this.audit.log(
        {
          adminUserId: user.id,
          entity: 'parameter_set',
          entityId: id,
          action: 'activate',
          before,
          after,
        },
        tx,
      );
      return after;
    });
  }
}

class CreateUserDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsIn(['ADMIN', 'EDITEUR'])
  role!: 'ADMIN' | 'EDITEUR';

  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  password!: string;
}

class UpdateUserDto {
  @IsOptional()
  @IsIn(['ADMIN', 'EDITEUR'])
  role?: 'ADMIN' | 'EDITEUR';

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  password?: string;
}

const USER_SELECT = {
  id: true,
  email: true,
  role: true,
  active: true,
  lastLoginAt: true,
  lockedUntil: true,
  createdAt: true,
} as const;

/** RF-22 : comptes administrateurs et éditeurs. */
@Controller('admin/users')
@Roles('ADMIN')
export class UsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list() {
    return this.prisma.adminUser.findMany({
      select: USER_SELECT,
      orderBy: { email: 'asc' },
    });
  }

  @Post()
  async create(@Body() dto: CreateUserDto, @CurrentUser() user: AuthUser) {
    const passwordHash = await hashPassword(dto.password);
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.adminUser.create({
        data: { email: dto.email.toLowerCase(), role: dto.role, passwordHash },
        select: USER_SELECT,
      });
      await this.audit.log(
        {
          adminUserId: user.id,
          entity: 'admin_user',
          entityId: created.id,
          action: 'create',
          after: created,
        },
        tx,
      );
      return created;
    });
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (
      id === user.id &&
      (dto.active === false || (dto.role && dto.role !== 'ADMIN'))
    ) {
      throw ApiError.badRequest(
        'SELF_LOCKOUT',
        'Vous ne pouvez pas désactiver votre propre compte ni retirer votre rôle ADMIN.',
      );
    }
    const passwordHash = dto.password
      ? await hashPassword(dto.password)
      : undefined;
    return this.prisma.$transaction(async (tx) => {
      const before = await tx.adminUser.findUnique({
        where: { id },
        select: USER_SELECT,
      });
      if (!before) throw ApiError.notFound();
      const after = await tx.adminUser.update({
        where: { id },
        data: {
          role: dto.role,
          active: dto.active,
          ...(passwordHash
            ? { passwordHash, failedLogins: 0, lockedUntil: null }
            : {}),
        },
        select: USER_SELECT,
      });
      // Désactivation ou nouveau mot de passe : les sessions en cours sont révoquées.
      if (dto.active === false || passwordHash) {
        await tx.refreshToken.updateMany({
          where: { adminUserId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      await this.audit.log(
        {
          adminUserId: user.id,
          entity: 'admin_user',
          entityId: id,
          action: 'update',
          before,
          after: {
            ...after,
            ...(passwordHash ? { passwordChanged: true } : {}),
          },
        },
        tx,
      );
      return after;
    });
  }
}

class StatsQuery {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

/** RF-23 : statistiques d'usage. */
@Controller('admin/stats')
@Roles('ADMIN')
export class StatsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('simulations')
  async simulations(@Query() q: StatsQuery) {
    const from = q.from
      ? new Date(q.from)
      : new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const to = q.to ? new Date(q.to) : new Date();
    const where = { createdAt: { gte: from, lte: to } };
    const [total, byMode, byRegion, perDay, topDevices] = await Promise.all([
      this.prisma.simulation.count({ where }),
      this.prisma.simulation.groupBy({
        by: ['mode'],
        where,
        _count: { _all: true },
      }),
      this.prisma.simulation.groupBy({
        by: ['regionId'],
        where,
        _count: { _all: true },
        orderBy: { _count: { regionId: 'desc' } },
        take: 20,
      }),
      this.prisma.$queryRaw<{ day: Date; count: bigint }[]>`
        SELECT date_trunc('day', created_at) AS day, count(*) AS count
        FROM simulation WHERE created_at BETWEEN ${from} AND ${to}
        GROUP BY 1 ORDER BY 1`,
      this.prisma.$queryRaw<
        { deviceId: string; count: bigint; quantity: bigint }[]
      >`
        SELECT l->>'deviceId' AS "deviceId", count(*) AS count,
               coalesce(sum((l->>'quantity')::int), 0) AS quantity
        FROM simulation s, jsonb_array_elements(coalesce(s.inputs->'loads', '[]'::jsonb)) l
        WHERE s.created_at BETWEEN ${from} AND ${to} AND l ? 'deviceId'
        GROUP BY 1 ORDER BY 2 DESC LIMIT 20`,
    ]);
    const regions = await this.prisma.region.findMany({
      where: { id: { in: byRegion.map((r) => r.regionId) } },
      select: { id: true, name: true },
    });
    const devices = await this.prisma.device.findMany({
      where: { id: { in: topDevices.map((d) => d.deviceId) } },
      select: { id: true, name: true },
    });
    const name = (list: { id: string; name: string }[], id: string) =>
      list.find((x) => x.id === id)?.name ?? id;
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      total,
      byMode: Object.fromEntries(byMode.map((m) => [m.mode, m._count._all])),
      byRegion: byRegion.map((r) => ({
        regionId: r.regionId,
        name: name(regions, r.regionId),
        count: r._count._all,
      })),
      perDay: perDay.map((d) => ({
        day: d.day.toISOString().slice(0, 10),
        count: Number(d.count),
      })),
      topDevices: topDevices.map((d) => ({
        deviceId: d.deviceId,
        name: name(devices, d.deviceId),
        count: Number(d.count),
        quantity: Number(d.quantity),
      })),
    };
  }
}

class AuditQuery extends PaginationQuery {
  @IsOptional()
  @IsString()
  entity?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsString()
  adminUserId?: string;

  @IsOptional()
  @Type(() => String)
  @IsIn(['create', 'update', 'delete', 'deactivate', 'activate', 'upload'])
  action?: string;
}

@Controller('admin/audit-log')
@Roles('ADMIN')
export class AuditLogController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query() q: AuditQuery): Promise<Page<unknown>> {
    const where: Prisma.AuditLogWhereInput = {
      ...(q.entity ? { entity: q.entity } : {}),
      ...(q.entityId ? { entityId: q.entityId } : {}),
      ...(q.adminUserId ? { adminUserId: q.adminUserId } : {}),
      ...(q.action ? { action: q.action } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: { adminUser: { select: { email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page: q.page, pageSize: q.pageSize };
  }
}
