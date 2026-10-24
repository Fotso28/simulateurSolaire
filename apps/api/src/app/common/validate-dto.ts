import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { validationErrorToApiError } from './validation';

/** Validation manuelle (mêmes règles que le pipe global), pour un DTO choisi à l'exécution. */
export async function validateDto<T extends object>(
  cls: new () => T,
  body: unknown,
  skipMissingProperties = false,
): Promise<T> {
  const instance = plainToInstance(cls, body ?? {});
  const errors = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
    skipMissingProperties,
  });
  if (errors.length) throw validationErrorToApiError(errors);
  return instance;
}
