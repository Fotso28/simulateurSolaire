import { HttpException, HttpStatus } from '@nestjs/common';

/** Corps d'erreur unique de l'API. */
export interface ApiErrorBody {
  code: string;
  message: string;
  field?: string;
}

/** Erreur métier avec code stable et message en français. */
export class ApiError extends HttpException {
  constructor(
    status: HttpStatus,
    code: string,
    message: string,
    field?: string,
  ) {
    const body: ApiErrorBody = field
      ? { code, message, field }
      : { code, message };
    super(body, status);
  }

  static notFound(message = 'Ressource introuvable.'): ApiError {
    return new ApiError(HttpStatus.NOT_FOUND, 'NOT_FOUND', message);
  }

  static badRequest(code: string, message: string, field?: string): ApiError {
    return new ApiError(HttpStatus.BAD_REQUEST, code, message, field);
  }

  static conflict(code: string, message: string, field?: string): ApiError {
    return new ApiError(HttpStatus.CONFLICT, code, message, field);
  }
}
