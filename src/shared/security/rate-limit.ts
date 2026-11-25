import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Throttle, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { NodeEnv } from '../config/environment';

const ONE_MINUTE_MS = 60_000;
const DEFAULT_REQUESTS_PER_MINUTE = 120;

/** Límites por IP para endpoints expuestos a fuerza bruta. */
export const RATE_LIMITS = {
  login: { limit: 5, ttl: ONE_MINUTE_MS },
  invitations: { limit: 10, ttl: ONE_MINUTE_MS },
} as const;

/** Aplica un límite estricto (por IP) al endpoint o controlador decorado. */
export const RateLimit = (policy: keyof typeof RATE_LIMITS) =>
  Throttle({ default: RATE_LIMITS[policy] });

/**
 * Rate limiting global en memoria (una instancia). Con varias réplicas,
 * configurar un storage compartido (p. ej. Redis) en `ThrottlerModule`.
 * En el ambiente `test` se desactiva para que las suites no compartan cupo.
 */
@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: ONE_MINUTE_MS,
          limit: DEFAULT_REQUESTS_PER_MINUTE,
        },
      ],
      skipIf: () => process.env.NODE_ENV === NodeEnv.Test,
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class RateLimitModule {}
