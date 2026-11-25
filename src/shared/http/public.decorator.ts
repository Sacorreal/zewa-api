import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'auth:isPublic';

/**
 * Excluye el endpoint de la autenticación global (`AccessTokenGuard`).
 * Vive en `shared` para que la infraestructura pueda marcarse sin depender
 * del módulo de autenticación.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
