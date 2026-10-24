import { Logger } from '@nestjs/common';
import { createApp } from './app/bootstrap';
import { GLOBAL_PREFIX } from './app/constants';

async function bootstrap() {
  const app = await createApp();
  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`API démarrée sur http://localhost:${port}/${GLOBAL_PREFIX}`);
}

bootstrap();
