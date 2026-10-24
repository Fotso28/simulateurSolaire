import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  registerDecorator,
  ValidateNested,
  ValidationOptions,
} from 'class-validator';
import { CABLE_SEGMENTS } from '@simulateur/shared-types';
import type { CableSegment } from '@simulateur/shared-types';

/** Objet `{ segment: longueur }` limité aux segments connus, longueurs de 0 à 1000 m. */
function IsCableLengths(options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'isCableLengths',
      target: object.constructor,
      propertyName,
      options: {
        message:
          'Les longueurs de câbles sont invalides (segments connus, 0 à 1000 m).',
        ...options,
      },
      validator: {
        validate(value: unknown) {
          if (
            typeof value !== 'object' ||
            value === null ||
            Array.isArray(value)
          )
            return false;
          return Object.entries(value).every(
            ([k, v]) =>
              CABLE_SEGMENTS.includes(k as CableSegment) &&
              typeof v === 'number' &&
              Number.isFinite(v) &&
              v >= 0 &&
              v <= 1000,
          );
        },
      },
    });
}

export class LoadDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  deviceId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(1_000_000)
  powerW?: number;

  @IsInt()
  @Min(1)
  @Max(1000)
  quantity!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(24)
  hoursPerDay!: number;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(1)
  @Max(10)
  surgeFactor?: number;
}

export class TotalsDto {
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(1)
  @Max(10_000_000)
  powerW!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(1)
  @Max(100_000_000)
  dailyEnergyWh!: number;

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(1)
  @Max(10)
  surgeFactor?: number;
}

export class OptionsDto {
  @IsOptional()
  @IsIn([12, 24, 48])
  systemVoltage?: 12 | 24 | 48;

  @IsOptional()
  @IsIn(['hybride', 'separe'])
  inverterType?: 'hybride' | 'separe';

  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.1)
  @Max(1)
  simultaneity?: number;

  @IsOptional()
  @IsCableLengths()
  cableLengthsM?: Partial<Record<CableSegment, number>>;
}

export class OverridesDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  inverterId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  batteryModelId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  batteryParallel?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  panelModelId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  panelCount?: number;
}

/** Miroir validé de `SimulationInput` (types partagés). */
export class SimulationInputDto {
  @IsIn(['particulier', 'pro'])
  mode!: 'particulier' | 'pro';

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  regionId!: string;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.1)
  @Max(30)
  autonomyDays!: number;

  @IsIn(['lithium', 'plomb'])
  batteryTech!: 'lithium' | 'plomb';

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => LoadDto)
  loads?: LoadDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => TotalsDto)
  totals?: TotalsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OptionsDto)
  options?: OptionsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => OverridesDto)
  overrides?: OverridesDto;
}

export class CreateSimulationDto {
  @ValidateNested()
  @Type(() => SimulationInputDto)
  input!: SimulationInputDto;

  /** Résultat calculé par le navigateur ; comparé au rejeu serveur (tolérance 1 %). */
  @IsObject()
  result!: Record<string, unknown>;
}
