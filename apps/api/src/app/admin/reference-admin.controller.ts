import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser, Roles } from '../auth/decorators';
import { ApiError } from '../common/api-error';
import { validateDto } from '../common/validate-dto';
import { PrismaService } from '../prisma/prisma.service';
import { AdminCrudService, CrudModel } from './admin-crud.service';
import {
  CreateBatteryDto,
  CreateCableSectionDto,
  CreateControllerDto,
  CreateCountryDto,
  CreateInverterDto,
  CreatePanelDto,
  CreateProtectionRatingDto,
  CreateRegionDto,
  RegionQuery,
  UpdateBatteryDto,
  UpdateCableSectionDto,
  UpdateControllerDto,
  UpdateCountryDto,
  UpdateInverterDto,
  UpdatePanelDto,
  UpdateProtectionRatingDto,
  UpdateRegionDto,
} from './dto';

@Controller('admin/countries')
@Roles('ADMIN')
export class CountriesAdminController {
  constructor(private readonly crud: AdminCrudService) {}

  @Get()
  list() {
    return this.crud.list('country', {
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.crud.get('country', id);
  }

  @Post()
  create(@Body() dto: CreateCountryDto, @CurrentUser() user: AuthUser) {
    return this.crud.create('country', dto, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCountryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.crud.update('country', id, dto, user);
  }
}

@Controller('admin/regions')
@Roles('ADMIN')
export class RegionsAdminController {
  constructor(
    private readonly crud: AdminCrudService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  list(@Query() query: RegionQuery) {
    return this.crud.list('region', {
      where: query.countryId ? { countryId: query.countryId } : {},
      orderBy: [{ countryId: 'asc' }, { name: 'asc' }],
    });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.crud.get('region', id);
  }

  @Post()
  async create(@Body() dto: CreateRegionDto, @CurrentUser() user: AuthUser) {
    await this.assertCountry(dto.countryId);
    return this.crud.create('region', dto, user);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRegionDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (dto.countryId) await this.assertCountry(dto.countryId);
    return this.crud.update('region', id, dto, user);
  }

  private async assertCountry(countryId: string): Promise<void> {
    if (!(await this.prisma.country.count({ where: { id: countryId } }))) {
      throw ApiError.badRequest(
        'UNKNOWN_COUNTRY',
        'Pays inconnu.',
        'countryId',
      );
    }
  }
}

interface EquipmentKind {
  model: CrudModel;
  create: new () => object;
  update: new () => object;
  orderBy: object;
}

/** Matériel de référence : `/admin/equipment/{kind}`. */
const EQUIPMENT: Record<string, EquipmentKind> = {
  panels: {
    model: 'panelModel',
    create: CreatePanelDto,
    update: UpdatePanelDto,
    orderBy: { powerWp: 'asc' },
  },
  batteries: {
    model: 'batteryModel',
    create: CreateBatteryDto,
    update: UpdateBatteryDto,
    orderBy: [{ technology: 'asc' }, { capacityAh: 'asc' }],
  },
  inverters: {
    model: 'inverterModel',
    create: CreateInverterDto,
    update: UpdateInverterDto,
    orderBy: { nominalPowerW: 'asc' },
  },
  controllers: {
    model: 'controllerModel',
    create: CreateControllerDto,
    update: UpdateControllerDto,
    orderBy: { maxCurrentA: 'asc' },
  },
  'cable-sections': {
    model: 'cableSection',
    create: CreateCableSectionDto,
    update: UpdateCableSectionDto,
    orderBy: { sectionMm2: 'asc' },
  },
  'protection-ratings': {
    model: 'protectionRating',
    create: CreateProtectionRatingDto,
    update: UpdateProtectionRatingDto,
    orderBy: [{ type: 'asc' }, { ratingA: 'asc' }],
  },
};

function kindOf(kind: string): EquipmentKind {
  const found = EQUIPMENT[kind];
  if (!found) throw ApiError.notFound('Type de matériel inconnu.');
  return found;
}

@Controller('admin/equipment')
@Roles('ADMIN')
export class EquipmentAdminController {
  constructor(private readonly crud: AdminCrudService) {}

  @Get(':kind')
  list(@Param('kind') kind: string) {
    const k = kindOf(kind);
    return this.crud.list(k.model, { orderBy: k.orderBy });
  }

  @Get(':kind/:id')
  get(@Param('kind') kind: string, @Param('id') id: string) {
    return this.crud.get(kindOf(kind).model, id);
  }

  @Post(':kind')
  async create(
    @Param('kind') kind: string,
    @Body() body: object,
    @CurrentUser() user: AuthUser,
  ) {
    const k = kindOf(kind);
    const dto = await validateDto(k.create, body);
    return this.crud.create(k.model, dto, user);
  }

  @Patch(':kind/:id')
  async update(
    @Param('kind') kind: string,
    @Param('id') id: string,
    @Body() body: object,
    @CurrentUser() user: AuthUser,
  ) {
    const k = kindOf(kind);
    const dto = await validateDto(k.update, body);
    return this.crud.update(k.model, id, dto, user);
  }
}
