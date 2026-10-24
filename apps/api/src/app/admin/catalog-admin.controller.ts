import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { Device } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser, Roles } from '../auth/decorators';
import { ApiError } from '../common/api-error';
import { PrismaService } from '../prisma/prisma.service';
import { AdminCrudService } from './admin-crud.service';
import {
  CreateDeviceCategoryDto,
  CreateDeviceDto,
  DeviceQuery,
  UpdateDeviceCategoryDto,
  UpdateDeviceDto,
} from './dto';

@Controller('admin/device-categories')
@Roles('ADMIN', 'EDITEUR')
export class DeviceCategoriesController {
  constructor(
    private readonly crud: AdminCrudService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  list() {
    return this.prisma.deviceCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { devices: true } } },
    });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.crud.get('deviceCategory', id);
  }

  @Post()
  create(@Body() dto: CreateDeviceCategoryDto, @CurrentUser() user: AuthUser) {
    return this.crud.create('deviceCategory', dto, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDeviceCategoryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.crud.update('deviceCategory', id, dto, user);
  }

  /** Suppression possible seulement si la catégorie ne contient aucun appareil. */
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const count = await this.prisma.device.count({ where: { categoryId: id } });
    if (count > 0) {
      throw ApiError.conflict(
        'CATEGORY_NOT_EMPTY',
        'Cette catégorie contient encore des appareils : désactivez-les ou déplacez-les.',
      );
    }
    await this.crud.remove('deviceCategory', id, user);
  }
}

/** Vérifie p_min ≤ p_typ ≤ p_max sur l'état final de l'appareil. */
function checkPowers(
  d: Pick<Device, 'powerMinW' | 'powerTypW' | 'powerMaxW'>,
): void {
  if (!(d.powerMinW <= d.powerTypW && d.powerTypW <= d.powerMaxW)) {
    throw ApiError.badRequest(
      'INVALID_POWER_RANGE',
      'Les puissances doivent respecter min ≤ typique ≤ max.',
      'powerTypW',
    );
  }
}

@Controller('admin/devices')
@Roles('ADMIN', 'EDITEUR')
export class DevicesController {
  constructor(
    private readonly crud: AdminCrudService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  list(@Query() query: DeviceQuery) {
    return this.prisma.device.findMany({
      where: {
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(query.includeInactive ? {} : { active: true }),
      },
      orderBy: [{ categoryId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.crud.get('device', id);
  }

  @Post()
  async create(@Body() dto: CreateDeviceDto, @CurrentUser() user: AuthUser) {
    checkPowers(dto);
    await this.assertCategory(dto.categoryId);
    return this.crud.create('device', dto, user);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDeviceDto,
    @CurrentUser() user: AuthUser,
  ) {
    const current = await this.crud.get<Device>('device', id);
    checkPowers({ ...current, ...dto });
    if (dto.categoryId) await this.assertCategory(dto.categoryId);
    return this.crud.update('device', id, dto, user);
  }

  /** Désactivation logique : l'appareil reste lisible dans les anciennes simulations. */
  @Delete(':id')
  deactivate(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.crud.update(
      'device',
      id,
      { active: false },
      user,
      'deactivate',
    );
  }

  private async assertCategory(categoryId: string): Promise<void> {
    const exists = await this.prisma.deviceCategory.count({
      where: { id: categoryId },
    });
    if (!exists)
      throw ApiError.badRequest(
        'UNKNOWN_CATEGORY',
        'Catégorie inconnue.',
        'categoryId',
      );
  }
}
