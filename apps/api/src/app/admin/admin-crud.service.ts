import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { ApiError } from '../common/api-error';
import { PrismaService } from '../prisma/prisma.service';

/** Modèles Prisma gérés par le CRUD générique du back-office. */
export type CrudModel =
  | 'country'
  | 'region'
  | 'deviceCategory'
  | 'device'
  | 'panelModel'
  | 'batteryModel'
  | 'inverterModel'
  | 'controllerModel'
  | 'cableSection'
  | 'protectionRating';

interface Row {
  id: string;
}

/** Sous-ensemble commun des délégués Prisma utilisés ici. */
interface Delegate {
  findMany(args?: object): Promise<Row[]>;
  findUnique(args: { where: { id: string } }): Promise<Row | null>;
  create(args: { data: object }): Promise<Row>;
  update(args: { where: { id: string }; data: object }): Promise<Row>;
  delete(args: { where: { id: string } }): Promise<Row>;
}

type Client = PrismaService | Prisma.TransactionClient;

const delegate = (client: Client, model: CrudModel) =>
  (client as unknown as Record<CrudModel, Delegate>)[model];

/** Nom de l'entité dans le journal : nom de table snake_case. */
const entityName = (model: CrudModel) =>
  model.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

/** CRUD générique : chaque écriture est journalisée (avant/après) dans la même transaction. */
@Injectable()
export class AdminCrudService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list<T = Row>(model: CrudModel, args: object = {}): Promise<T[]> {
    return delegate(this.prisma, model).findMany(args) as Promise<T[]>;
  }

  async get<T = Row>(model: CrudModel, id: string): Promise<T> {
    const row = await delegate(this.prisma, model).findUnique({
      where: { id },
    });
    if (!row) throw ApiError.notFound();
    return row as T;
  }

  create<T = Row>(model: CrudModel, data: object, user: AuthUser): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const after = await delegate(tx, model).create({ data });
      await this.audit.log(
        {
          adminUserId: user.id,
          entity: entityName(model),
          entityId: after.id,
          action: 'create',
          after,
        },
        tx,
      );
      return after as T;
    });
  }

  update<T = Row>(
    model: CrudModel,
    id: string,
    data: object,
    user: AuthUser,
    action: 'update' | 'deactivate' = 'update',
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const before = await delegate(tx, model).findUnique({ where: { id } });
      if (!before) throw ApiError.notFound();
      const after = await delegate(tx, model).update({ where: { id }, data });
      await this.audit.log(
        {
          adminUserId: user.id,
          entity: entityName(model),
          entityId: id,
          action,
          before,
          after,
        },
        tx,
      );
      return after as T;
    });
  }

  remove(model: CrudModel, id: string, user: AuthUser): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      const before = await delegate(tx, model).findUnique({ where: { id } });
      if (!before) throw ApiError.notFound();
      await delegate(tx, model).delete({ where: { id } });
      await this.audit.log(
        {
          adminUserId: user.id,
          entity: entityName(model),
          entityId: id,
          action: 'delete',
          before,
        },
        tx,
      );
    });
  }
}
