import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { resolve } from 'node:path';
import { AppModule } from './app.module';
import { createValidationPipe } from './common/validation';
import { corsOrigins, Env } from './config/env';
import { GLOBAL_PREFIX } from './constants';
import { CLIENT_ERROR_MAX_BYTES } from './public/client-errors.controller';

/** Configuration commune : serveur local, fonction Vercel et tests e2e. */
export function configureApp(
  app: NestExpressApplication,
): NestExpressApplication {
  const env = app.get(Env);
  app.setGlobalPrefix(GLOBAL_PREFIX);
  // Derrière le proxy Vercel : `req.ip` = adresse du client (hachée avant stockage).
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cookieParser());
  // Rapports d'erreurs navigateur : limite propre, plus stricte que la limite générale.
  app.use(
    `/${GLOBAL_PREFIX}/client-errors`,
    express.json({ limit: CLIENT_ERROR_MAX_BYTES }),
  );
  app.useBodyParser('json', { limit: '256kb' });
  const origins = corsOrigins(env);
  app.enableCors({
    origin: origins.length ? origins : false,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  });
  app.useGlobalPipes(createValidationPipe());
  if (env.STORAGE_DRIVER === 'local') {
    app.use(
      '/media',
      express.static(resolve(env.LOCAL_MEDIA_DIR), {
        fallthrough: false,
        // Le front (autre origine en dev) affiche ces fichiers : Helmet impose sinon same-origin.
        setHeaders: (res) =>
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
      }),
    );
  }
  app.enableShutdownHooks();
  return app;
}

export async function createApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    logger: ['error', 'warn', 'log'],
  });
  return configureApp(app);
}
