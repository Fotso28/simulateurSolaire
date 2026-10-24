import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import { ApiErrorBody } from './api-error';

const DEFAULT_CODES: Record<number, [string, string]> = {
  400: ['BAD_REQUEST', 'Requête invalide.'],
  401: ['UNAUTHORIZED', 'Authentification requise.'],
  403: ['FORBIDDEN', 'Accès refusé.'],
  404: ['NOT_FOUND', 'Ressource introuvable.'],
  405: ['METHOD_NOT_ALLOWED', 'Méthode non autorisée.'],
  409: ['CONFLICT', 'Conflit avec l’état actuel de la ressource.'],
  413: ['PAYLOAD_TOO_LARGE', 'Contenu trop volumineux.'],
  415: ['UNSUPPORTED_MEDIA_TYPE', 'Type de contenu non pris en charge.'],
  422: ['UNPROCESSABLE_ENTITY', 'Requête impossible à traiter.'],
  429: ['TOO_MANY_REQUESTS', 'Trop de requêtes, réessayez plus tard.'],
};

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ApiErrorBody).code === 'string' &&
    typeof (value as ApiErrorBody).message === 'string'
  );
}

/** Convertit toute erreur au format unique `{ code, message, field? }`. */
export function toErrorResponse(exception: unknown): {
  status: number;
  body: ApiErrorBody;
} {
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const response = exception.getResponse();
    if (isApiErrorBody(response)) return { status, body: response };
    const [code, message] = DEFAULT_CODES[status] ?? ['ERROR', 'Erreur.'];
    return { status, body: { code, message } };
  }
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    if (exception.code === 'P2002') {
      const target = (exception.meta?.target as string[] | undefined)?.[0];
      return {
        status: HttpStatus.CONFLICT,
        body: {
          code: 'ALREADY_EXISTS',
          message: 'Un enregistrement avec cette valeur existe déjà.',
          ...(target ? { field: target } : {}),
        },
      };
    }
    if (exception.code === 'P2025') {
      return {
        status: 404,
        body: { code: 'NOT_FOUND', message: 'Ressource introuvable.' },
      };
    }
    if (exception.code === 'P2003') {
      return {
        status: HttpStatus.CONFLICT,
        body: {
          code: 'REFERENCE_ERROR',
          message: 'Référence invalide ou enregistrement encore utilisé.',
        },
      };
    }
  }
  // Erreurs `http-errors` des analyseurs de corps (JSON invalide, corps trop gros).
  const httpError = exception as { status?: unknown; expose?: unknown };
  if (
    httpError?.expose === true &&
    typeof httpError.status === 'number' &&
    httpError.status >= 400 &&
    httpError.status < 500
  ) {
    const status = httpError.status;
    const [code, message] = DEFAULT_CODES[status] ?? ['ERROR', 'Erreur.'];
    return { status, body: { code, message } };
  }
  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    body: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur.' },
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const { status, body } = toErrorResponse(exception);
    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }
    res.status(status).json(body);
  }
}
