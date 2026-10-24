import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/** Erreur remontée par le navigateur (aucune donnée personnelle attendue). */
export class ClientErrorDto {
  @IsString()
  @MaxLength(500)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  stack?: string;

  /** Chemin de la page, sans paramètres de requête. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  path?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  release?: string;

  @IsOptional()
  @IsIn(['error', 'unhandledrejection', 'http'])
  kind?: string;
}
