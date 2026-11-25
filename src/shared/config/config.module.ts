import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolveEnvFilePath } from './environment';
import { validateEnv } from './env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: resolveEnvFilePath(process.env.NODE_ENV),
      validate: validateEnv,
    }),
  ],
})
export class AppConfigModule {}
