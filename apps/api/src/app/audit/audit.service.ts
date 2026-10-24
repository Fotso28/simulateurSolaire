import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AuditAction =
  'create' | 'update' | 'delete' | 'deactivate' | 'activate' | 'upload';

export interface AuditEntry {
  adminUserId: string | null;
  entity: string;
  entityId: string | null;
  action: AuditAction;
  before?: unknown;
  after?: unknown;
}

type Tx = Prisma.TransactionClient | PrismaService;

/** Champs jamais recopiés dans le journal. */
const SECRET_FIELDS = new Set(['passwordHash', 'tokenHash']);

function toJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (value === undefined || value === null) return Prisma.DbNull;
  return JSON.parse(
    JSON.stringify(value, (key, v) => (SECRET_FIELDS.has(key) ? undefined : v)),
  ) as Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** Écrit une entrée du journal, dans la transaction fournie si besoin. */
  async log(entry: AuditEntry, tx: Tx = this.prisma): Promise<void> {
    await tx.auditLog.create({
      data: {
        adminUserId: entry.adminUserId,
        entity: entry.entity,
        entityId: entry.entityId,
        action: entry.action,
        before: toJson(entry.before),
        after: toJson(entry.after),
      },
    });
  }
}
