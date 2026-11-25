import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { EnvReader, readOptional, readRequired } from './env-reader';
import { usesHostConnection } from './environment';

const LOCAL_DEFAULT_ORIGINS = 'http://localhost:3000';
const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
const PREFLIGHT_CACHE_SECONDS = 86_400;

export function parseOrigins(raw: string): string[] {
  const origins = raw
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  if (origins.includes('*')) {
    throw new Error(
      'CORS_ORIGINS no admite "*": las peticiones llevan credenciales, define los orígenes explícitamente.',
    );
  }

  return origins;
}

function readOrigins(read: EnvReader): string {
  return usesHostConnection(read('NODE_ENV'))
    ? (readOptional(read, 'CORS_ORIGINS') ?? LOCAL_DEFAULT_ORIGINS)
    : readRequired(read, 'CORS_ORIGINS');
}

export function buildCorsOptions(read: EnvReader): CorsOptions {
  return {
    origin: parseOrigins(readOrigins(read)),
    credentials: true,
    methods: ALLOWED_METHODS,
    maxAge: PREFLIGHT_CACHE_SECONDS,
  };
}
