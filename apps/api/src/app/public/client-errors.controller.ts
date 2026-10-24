import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';
import { Env } from '../config/env';
import { ClientErrorDto } from './client-error.dto';

/** Taille maximale d'un rapport d'erreur navigateur (analyseur JSON dédié, cf. bootstrap). */
export const CLIENT_ERROR_MAX_BYTES = 8 * 1024;

/**
 * Suivi des erreurs navigateur : journalisation structurée uniquement,
 * rien n'est stocké en base. Désactivable par `CLIENT_ERRORS_ENABLED=false`.
 */
@Controller('client-errors')
export class ClientErrorsController {
  private readonly logger = new Logger('ClientError');

  constructor(private readonly env: Env) {}

  @Post()
  @HttpCode(204)
  report(@Body() dto: ClientErrorDto): void {
    if (!this.env.CLIENT_ERRORS_ENABLED) return;
    this.logger.warn(
      JSON.stringify({
        event: 'client_error',
        kind: dto.kind ?? 'error',
        message: dto.message,
        path: dto.path?.split(/[?#]/)[0],
        release: dto.release,
        stack: dto.stack,
      }),
    );
  }
}
