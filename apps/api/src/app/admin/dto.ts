import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

const NUM = { allowNaN: false, allowInfinity: false } as const;
const URL_OPTS = {
  require_tld: false,
  protocols: ['http', 'https'],
  require_protocol: true,
};
/** `""` vaut `null` (suppression d'une illustration). */
const emptyToNull = Transform(({ value }) => (value === '' ? null : value));

export class CreateDeviceCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @emptyToNull
  @ValidateIf((_, v) => v !== null)
  @IsUrl(URL_OPTS)
  @MaxLength(500)
  iconUrl?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
export class UpdateDeviceCategoryDto extends PartialType(
  CreateDeviceCategoryDto,
) {}

export class CreateDeviceDto {
  @IsString()
  @MinLength(1)
  categoryId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @emptyToNull
  @ValidateIf((_, v) => v !== null)
  @IsUrl(URL_OPTS)
  @MaxLength(500)
  iconUrl?: string | null;

  @IsOptional()
  @emptyToNull
  @ValidateIf((_, v) => v !== null)
  @IsUrl(URL_OPTS)
  @MaxLength(500)
  imageUrl?: string | null;

  @IsNumber(NUM)
  @Min(0)
  @Max(1_000_000)
  powerMinW!: number;

  @IsNumber(NUM)
  @Min(0)
  @Max(1_000_000)
  powerTypW!: number;

  @IsNumber(NUM)
  @Min(0)
  @Max(1_000_000)
  powerMaxW!: number;

  @IsNumber(NUM)
  @Min(0)
  @Max(24)
  defaultHoursPerDay!: number;

  @IsOptional()
  @IsNumber(NUM)
  @Min(0)
  @Max(1)
  dutyCycle?: number;

  @IsOptional()
  @IsNumber(NUM)
  @Min(1)
  @Max(10)
  surgeFactor?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
export class UpdateDeviceDto extends PartialType(CreateDeviceDto) {}

export class DeviceQuery {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeInactive?: boolean;
}

export class CreateCountryDto {
  @Matches(/^[A-Z]{2}$/, {
    message: 'Le code ISO doit comporter deux lettres majuscules.',
  })
  isoCode!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsInt()
  @Min(100)
  @Max(400)
  gridVoltageV!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
export class UpdateCountryDto extends PartialType(CreateCountryDto) {}

export class CreateRegionDto {
  @IsString()
  @MinLength(1)
  countryId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  capital!: string;

  @IsNumber(NUM)
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber(NUM)
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsNumber(NUM)
  @Min(0.5)
  @Max(10)
  irradiationAvg!: number;

  @IsNumber(NUM)
  @Min(0.5)
  @Max(10)
  irradiationMinMonth!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  source!: string;
}
export class UpdateRegionDto extends PartialType(CreateRegionDto) {}

export class RegionQuery {
  @IsOptional()
  @IsString()
  countryId?: string;
}

export class CreatePanelDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;

  @IsNumber(NUM) @Min(1) @Max(2000) powerWp!: number;
  @IsNumber(NUM) @Min(1) @Max(200) vocV!: number;
  @IsNumber(NUM) @Min(1) @Max(200) vmpV!: number;
  @IsNumber(NUM) @Min(0.1) @Max(50) iscA!: number;
  @IsNumber(NUM) @Min(0.1) @Max(50) impA!: number;

  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}
export class UpdatePanelDto extends PartialType(CreatePanelDto) {}

export class CreateBatteryDto {
  @IsIn(['lithium', 'plomb'])
  technology!: 'lithium' | 'plomb';

  @IsNumber(NUM) @Min(1) @Max(60) nominalVoltageV!: number;
  @IsNumber(NUM) @Min(1) @Max(5000) capacityAh!: number;
  @IsNumber(NUM) @Min(0.1) @Max(1) dod!: number;

  @IsOptional() @IsBoolean() active?: boolean;
}
export class UpdateBatteryDto extends PartialType(CreateBatteryDto) {}

export class CreateInverterDto {
  @IsIn(['hybride', 'autonome'])
  type!: 'hybride' | 'autonome';

  @IsNumber(NUM) @Min(50) @Max(100_000) nominalPowerW!: number;
  @IsNumber(NUM) @Min(1) @Max(5) surgeFactor!: number;
  @IsIn([12, 24, 48]) dcVoltageV!: 12 | 24 | 48;
  @IsNumber(NUM) @Min(0.5) @Max(1) efficiency!: number;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber(NUM)
  @Min(1)
  @Max(500)
  mpptMaxCurrentA?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsNumber(NUM)
  @Min(1)
  @Max(1500)
  mpptMaxPvVoltageV?: number | null;

  @IsOptional() @IsBoolean() active?: boolean;
}
export class UpdateInverterDto extends PartialType(CreateInverterDto) {}

export class CreateControllerDto {
  @IsIn(['MPPT', 'PWM'])
  type!: 'MPPT' | 'PWM';

  @IsNumber(NUM) @Min(1) @Max(500) maxCurrentA!: number;
  @IsNumber(NUM) @Min(1) @Max(1500) maxPvVoltageV!: number;
  @IsNumber(NUM) @Min(0.1) @Max(500) maxInputCurrentA!: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsIn([12, 24, 48], { each: true })
  supportedVoltages!: (12 | 24 | 48)[];

  @IsOptional() @IsBoolean() active?: boolean;
}
export class UpdateControllerDto extends PartialType(CreateControllerDto) {}

export class CreateCableSectionDto {
  @IsNumber(NUM) @Min(0.5) @Max(500) sectionMm2!: number;
  @IsNumber(NUM) @Min(1) @Max(2000) allowableCurrentA!: number;
}
export class UpdateCableSectionDto extends PartialType(CreateCableSectionDto) {}

export class CreateProtectionRatingDto {
  @IsString() @MinLength(1) @MaxLength(60) type!: string;
  @IsNumber(NUM) @Min(0.5) @Max(2000) ratingA!: number;
}
export class UpdateProtectionRatingDto extends PartialType(
  CreateProtectionRatingDto,
) {}

export class CreateParameterSetDto {
  /**
   * Valeurs `EngineParameters` modifiées : fusionnées sur la version de base
   * (par défaut la version active), puis contrôlées par `mergeParameters`.
   */
  @IsObject()
  values!: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(1)
  baseVersion?: number;
}
