import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from './app/bootstrap';

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

let handler: Promise<Handler> | undefined;

/**
 * Point d'entrée de la fonction Vercel : l'application Nest est créée une fois
 * par instance puis réutilisée (Fluid compute). Bundle : `dist/apps/api/serverless.js`.
 */
export default async function vercelHandler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  handler ??= createApp().then(async (app) => {
    await app.init();
    return app.getHttpAdapter().getInstance() as Handler;
  });
  (await handler)(req, res);
}
