import { Global, Module } from '@nestjs/common';
import { Env, validateEnv } from './env';

@Global()
@Module({
  providers: [{ provide: Env, useFactory: () => validateEnv(process.env) }],
  exports: [Env],
})
export class ConfigModule {}
