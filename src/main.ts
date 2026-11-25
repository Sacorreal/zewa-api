import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { buildCorsOptions } from './shared/config';

const DEFAULT_PORT = 3001;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.enableCors(buildCorsOptions((key) => config.get<unknown>(key)));

  await app.listen(config.get<number>('PORT', DEFAULT_PORT));
}
void bootstrap();
