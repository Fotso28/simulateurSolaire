import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AdminCrudService } from './admin/admin-crud.service';
import {
  DeviceCategoriesController,
  DevicesController,
} from './admin/catalog-admin.controller';
import {
  AuditLogController,
  ParameterSetsController,
  StatsController,
  UsersController,
} from './admin/governance-admin.controller';
import {
  CountriesAdminController,
  EquipmentAdminController,
  RegionsAdminController,
} from './admin/reference-admin.controller';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CatalogService } from './catalog/catalog.service';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { ConfigModule } from './config/config.module';
import { Env } from './config/env';
import { HealthController } from './health/health.controller';
import { MediaController } from './media/media.controller';
import {
  LocalMediaStorage,
  MediaStorage,
  VercelBlobStorage,
} from './media/media-storage';
import { PrismaModule } from './prisma/prisma.module';
import { PublicController } from './public/public.controller';
import { SimulationsController } from './public/simulations.controller';
import { SimulationsService } from './public/simulations.service';

@Module({
  imports: [ConfigModule, PrismaModule, AuditModule, AuthModule],
  controllers: [
    HealthController,
    PublicController,
    SimulationsController,
    DeviceCategoriesController,
    DevicesController,
    MediaController,
    CountriesAdminController,
    RegionsAdminController,
    EquipmentAdminController,
    ParameterSetsController,
    UsersController,
    StatsController,
    AuditLogController,
  ],
  providers: [
    CatalogService,
    SimulationsService,
    AdminCrudService,
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    {
      provide: MediaStorage,
      inject: [Env],
      useFactory: (env: Env): MediaStorage =>
        env.STORAGE_DRIVER === 'vercel-blob'
          ? new VercelBlobStorage(env.BLOB_READ_WRITE_TOKEN as string)
          : new LocalMediaStorage(
              env.LOCAL_MEDIA_DIR,
              env.PUBLIC_MEDIA_BASE_URL,
            ),
    },
  ],
})
export class AppModule {}
