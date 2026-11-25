import { Injectable } from '@nestjs/common';
import { argon2id, hash, verify } from 'argon2';

/**
 * Hash ficticio con los mismos parámetros que los reales: verificar contra él
 * cuando el usuario no existe iguala los tiempos de respuesta y evita revelar
 * qué correos están registrados.
 */
const DUMMY_HASH_SOURCE = 'zewa-timing-equalizer';

/** Contraseñas con Argon2id (parámetros por defecto de `argon2`, recomendados por OWASP). */
@Injectable()
export class PasswordHasher {
  private dummyHash?: Promise<string>;

  hash(password: string): Promise<string> {
    return hash(password, { type: argon2id });
  }

  async verify(
    password: string,
    storedHash: string | null | undefined,
  ): Promise<boolean> {
    if (!storedHash) {
      await verify(await this.getDummyHash(), password);
      return false;
    }
    return verify(storedHash, password);
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.hash(DUMMY_HASH_SOURCE);
    return this.dummyHash;
  }
}
