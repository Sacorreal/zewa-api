import type { PutObjectInput } from './storage.types';

/**
 * Puerto hacia el proveedor de almacenamiento de objetos. No conoce tenants:
 * opera sobre keys ya construidas. Cambiar de proveedor = otra implementación.
 */
export abstract class StorageProvider {
  abstract putObject(input: PutObjectInput): Promise<void>;
  abstract deleteObject(key: string): Promise<void>;
  abstract objectExists(key: string): Promise<boolean>;
  abstract getSignedReadUrl(key: string, ttlSeconds: number): Promise<string>;
  abstract getPublicUrl(key: string): string;
}
