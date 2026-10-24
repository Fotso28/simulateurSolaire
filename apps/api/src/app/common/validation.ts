import { HttpStatus, ValidationError, ValidationPipe } from '@nestjs/common';
import { ApiError } from './api-error';

const MESSAGES: Record<string, string> = {
  isDefined: 'est obligatoire',
  isNotEmpty: 'est obligatoire',
  isString: 'doit être un texte',
  isNumber: 'doit être un nombre',
  isInt: 'doit être un nombre entier',
  isPositive: 'doit être strictement positif',
  min: 'est trop petit',
  max: 'est trop grand',
  minLength: 'est trop court',
  maxLength: 'est trop long',
  isEmail: 'doit être une adresse e-mail valide',
  isIn: 'a une valeur non autorisée',
  isEnum: 'a une valeur non autorisée',
  isBoolean: 'doit valoir vrai ou faux',
  equals: 'a une valeur non autorisée',
  isArray: 'doit être une liste',
  arrayMinSize: 'contient trop peu d’éléments',
  arrayMaxSize: 'contient trop d’éléments',
  isObject: 'doit être un objet',
  isUrl: 'doit être une URL valide',
  isUUID: 'doit être un identifiant valide',
  matches: 'a un format invalide',
  whitelistValidation: 'n’est pas autorisé',
  nestedValidation: 'est invalide',
};

/** Premier champ en erreur (chemin pointé) et sa contrainte. */
function firstError(
  errors: ValidationError[],
  prefix = '',
): { field: string; constraint: string; message?: string } | null {
  for (const error of errors) {
    const field = prefix ? `${prefix}.${error.property}` : error.property;
    if (error.constraints) {
      const [constraint, message] = Object.entries(error.constraints)[0];
      return { field, constraint, message };
    }
    if (error.children?.length) {
      const nested = firstError(error.children, field);
      if (nested) return nested;
    }
  }
  return null;
}

/** Messages personnalisés en français : ils commencent par une majuscule. */
const isCustomMessage = (message?: string) =>
  !!message &&
  /^[A-ZÀ-Ý«]/.test(message) &&
  !/^(property|each value)/i.test(message);

export function validationErrorToApiError(errors: ValidationError[]): ApiError {
  const first = firstError(errors);
  if (!first) {
    return new ApiError(
      HttpStatus.BAD_REQUEST,
      'VALIDATION_ERROR',
      'Requête invalide.',
    );
  }
  const message = isCustomMessage(first.message)
    ? (first.message as string)
    : `Le champ « ${first.field} » ${MESSAGES[first.constraint] ?? 'est invalide'}.`;
  return new ApiError(
    HttpStatus.BAD_REQUEST,
    'VALIDATION_ERROR',
    message,
    first.field,
  );
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: validationErrorToApiError,
  });
}
