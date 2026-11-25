import { Inject, Injectable } from '@nestjs/common';
import { StorageProvider } from './contracts/storage-provider';
import type {
  FileVisibility,
  StorageOptions,
  StoredFile,
  UploadFileInput,
} from './contracts/storage.types';
import { STORAGE_OPTIONS } from './storage.tokens';
import {
  assertKeyBelongsToTenant,
  buildObjectKey,
  tenantRootPrefix,
} from './tenant-storage-path';

const FOLDER_CONTENT_TYPE = 'application/x-directory';

/**
 * Punto único para guardar archivos aislados por tenant.
 * El `tenantId` debe provenir de la membresía resuelta en el backend.
 */
@Injectable()
export class StorageService {
  constructor(
    private readonly provider: StorageProvider,
    @Inject(STORAGE_OPTIONS) private readonly options: StorageOptions,
  ) {}

  /**
   * Crea la carpeta `tenants/<id>/` (objeto vacío con barra final, como hace el
   * panel de Spaces). Es idempotente.
   */
  async createTenantFolder(tenantId: string): Promise<void> {
    const prefix = tenantRootPrefix(tenantId);
    if (await this.provider.objectExists(prefix)) return;

    await this.provider.putObject({
      key: prefix,
      body: Buffer.alloc(0),
      contentType: FOLDER_CONTENT_TYPE,
      visibility: 'private',
    });
  }

  async upload({
    tenantId,
    category,
    fileName,
    body,
    contentType,
    visibility,
  }: UploadFileInput): Promise<StoredFile> {
    const key = buildObjectKey({ tenantId, category, fileName });
    await this.provider.putObject({ key, body, contentType, visibility });

    return {
      key,
      visibility,
      contentType,
      size: body.length,
      url:
        visibility === 'public' ? this.provider.getPublicUrl(key) : undefined,
    };
  }

  async getAccessUrl(
    tenantId: string,
    key: string,
    visibility: FileVisibility,
  ): Promise<string> {
    assertKeyBelongsToTenant(tenantId, key);
    return visibility === 'public'
      ? this.provider.getPublicUrl(key)
      : this.provider.getSignedReadUrl(key, this.options.signedUrlTtlSeconds);
  }

  async remove(tenantId: string, key: string): Promise<void> {
    assertKeyBelongsToTenant(tenantId, key);
    await this.provider.deleteObject(key);
  }
}
