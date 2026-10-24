import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { GLOBAL_PREFIX } from './app/constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix(GLOBAL_PREFIX);
  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`API démarrée sur http://localhost:${port}/${GLOBAL_PREFIX}`);
}

bootstrap();
