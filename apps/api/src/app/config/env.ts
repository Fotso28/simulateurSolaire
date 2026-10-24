import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
  validateSync,
} from 'class-validator';

/** Variables d'environnement de l'API, validées au démarrage. */
export class Env {
  @IsIn(['development', 'production', 'test'])
  NODE_ENV: 'development' | 'production' | 'test' = 'development';

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  PORT = 3000;

  @IsString()
  @MinLength(1)
  DATABASE_URL!: string;

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET!: string;

  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  COOKIE_SECURE = false;

  @IsOptional()
  @IsString()
  CORS_ORIGINS = '';

  @IsString()
  @MinLength(16)
  IP_HASH_SECRET!: string;

  /** Journalisation des erreurs remontées par le navigateur. */
  @Transform(({ value }) => value !== false && value !== 'false')
  @IsBoolean()
  CLIENT_ERRORS_ENABLED = true;

  @IsIn(['local', 'vercel-blob'])
  STORAGE_DRIVER: 'local' | 'vercel-blob' = 'local';

  @IsOptional()
  @IsString()
  LOCAL_MEDIA_DIR = 'tmp/media';

  @IsOptional()
  @IsString()
  PUBLIC_MEDIA_BASE_URL = 'http://localhost:3000/media';

  @ValidateIf((env: Env) => env.STORAGE_DRIVER === 'vercel-blob')
  @IsString()
  @MinLength(1)
  BLOB_READ_WRITE_TOKEN?: string;
}

export function validateEnv(raw: Record<string, unknown>): Env {
  const defined = Object.fromEntries(
    Object.entries(raw).filter(([, v]) => v !== undefined && v !== ''),
  );
  const env = plainToInstance(Env, defined, {
    excludeExtraneousValues: false,
  });
  // Cookie `Secure` par défaut en production si COOKIE_SECURE n'est pas renseigné.
  if (defined['COOKIE_SECURE'] === undefined) {
    env.COOKIE_SECURE = env.NODE_ENV === 'production';
  }
  const errors = validateSync(env, { whitelist: false });
  if (errors.length > 0) {
    const names = errors.map((e) => e.property).join(', ');
    throw new Error(`Configuration invalide : ${names}`);
  }
  return env;
}

export function corsOrigins(env: Env): string[] {
  return env.CORS_ORIGINS.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}
