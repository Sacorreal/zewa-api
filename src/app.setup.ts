import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Express } from 'express';
import { buildCorsOptions } from './shared/config/cors.config';
import { type EnvReader, readOptional } from './shared/config/env-reader';

export const API_PREFIX = 'api/v1';

/**
 * `TRUST_PROXY` sigue la sintaxis de Express (`true`, número de saltos o
 * lista de subredes). Necesario detrás del BFF o de un balanceador para que
 * `request.ip` (auditoría y rate limiting) sea la IP real del usuario.
 */
export function parseTrustProxy(read: EnvReader): boolean | number | string {
  const raw = readOptional(read, 'TRUST_PROXY');
  if (raw === undefined || raw === 'false') return false;
  if (raw === 'true') return true;
  return /^\d+$/.test(raw) ? Number(raw) : raw;
}

/** Configuración HTTP compartida por `main.ts` y las pruebas e2e. */
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);
  const read: EnvReader = (key) => config.get<unknown>(key);

  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors(buildCorsOptions(read));
  (app.getHttpAdapter().getInstance() as Express).set(
    'trust proxy',
    parseTrustProxy(read),
  );
}
