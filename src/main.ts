import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

const DEFAULT_PORT = 3001;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  await app.listen(app.get(ConfigService).get<number>('PORT', DEFAULT_PORT));
}
void bootstrap();
