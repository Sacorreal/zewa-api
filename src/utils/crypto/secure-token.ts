import { createHash, randomBytes } from 'node:crypto';

const TOKEN_BYTES = 32;

/** Token aleatorio de 256 bits, apto para URLs. Solo viaja al usuario; en BD va su hash. */
export function generateSecureToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

/**
 * SHA-256 del token. Basta un hash rápido (sin sal) porque el token tiene
 * 256 bits de entropía: no es adivinable por fuerza bruta como una contraseña.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
