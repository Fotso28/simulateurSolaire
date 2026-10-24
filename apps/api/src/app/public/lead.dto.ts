import {
  Equals,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateLeadDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @Matches(/^\+?[0-9 ().-]{6,25}$/, {
    message: 'Le numéro de téléphone est invalide.',
  })
  phone!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  /** Jeton de partage de la simulation concernée, le cas échéant. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  shareToken?: string;

  @Equals(true, {
    message: 'Votre consentement est nécessaire pour être recontacté.',
  })
  consent!: boolean;
}
