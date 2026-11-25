import { StorageProvider } from './contracts/storage-provider';
import type { PutObjectInput, StorageOptions } from './contracts/storage.types';
import { StorageService } from './storage.service';

const TENANT_ID = '3f1c2a4e-8b7d-4c1a-9e2f-0a1b2c3d4e5f';
const OTHER_TENANT_ID = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const PUBLIC_BASE_URL = 'https://cdn.zewa.co';

class FakeStorageProvider extends StorageProvider {
  readonly objects = new Map<string, PutObjectInput>();
  readonly signedUrlRequests: Array<{ key: string; ttlSeconds: number }> = [];

  putObject(input: PutObjectInput): Promise<void> {
    this.objects.set(input.key, input);
    return Promise.resolve();
  }

  deleteObject(key: string): Promise<void> {
    this.objects.delete(key);
    return Promise.resolve();
  }

  objectExists(key: string): Promise<boolean> {
    return Promise.resolve(this.objects.has(key));
  }

  getSignedReadUrl(key: string, ttlSeconds: number): Promise<string> {
    this.signedUrlRequests.push({ key, ttlSeconds });
    return Promise.resolve(`https://signed/${key}?ttl=${ttlSeconds}`);
  }

  getPublicUrl(key: string): string {
    return `${PUBLIC_BASE_URL}/${key}`;
  }
}

const OPTIONS = { signedUrlTtlSeconds: 300 } as StorageOptions;

describe('StorageService', () => {
  let provider: FakeStorageProvider;
  let service: StorageService;

  beforeEach(() => {
    provider = new FakeStorageProvider();
    service = new StorageService(provider, OPTIONS);
  });

  describe('createTenantFolder', () => {
    it('crea un objeto vacío y privado como carpeta del tenant', async () => {
      await service.createTenantFolder(TENANT_ID);

      const folder = provider.objects.get(`tenants/${TENANT_ID}/`);
      expect(folder?.body.length).toBe(0);
      expect(folder?.visibility).toBe('private');
    });

    it('es idempotente', async () => {
      const putSpy = jest.spyOn(provider, 'putObject');

      await service.createTenantFolder(TENANT_ID);
      await service.createTenantFolder(TENANT_ID);

      expect(putSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('upload', () => {
    const baseInput = {
      tenantId: TENANT_ID,
      category: 'branding' as const,
      fileName: 'logo.png',
      body: Buffer.from('png'),
      contentType: 'image/png',
    };

    it('devuelve la URL pública de un archivo público', async () => {
      const stored = await service.upload({
        ...baseInput,
        visibility: 'public',
      });

      expect(stored.key).toMatch(`tenants/${TENANT_ID}/branding/`);
      expect(stored).toMatchObject({
        visibility: 'public',
        contentType: 'image/png',
        size: 3,
        url: `${PUBLIC_BASE_URL}/${stored.key}`,
      });
      expect(provider.objects.get(stored.key)?.visibility).toBe('public');
    });

    it('no expone URL de un archivo privado', async () => {
      const stored = await service.upload({
        ...baseInput,
        visibility: 'private',
      });

      expect(stored.url).toBeUndefined();
    });
  });

  describe('getAccessUrl', () => {
    const key = `tenants/${TENANT_ID}/documents/acta.pdf`;

    it('firma las URLs privadas con el TTL configurado', async () => {
      await expect(
        service.getAccessUrl(TENANT_ID, key, 'private'),
      ).resolves.toBe(`https://signed/${key}?ttl=300`);
    });

    it('devuelve la URL pública sin firmar', async () => {
      await expect(
        service.getAccessUrl(TENANT_ID, key, 'public'),
      ).resolves.toBe(`${PUBLIC_BASE_URL}/${key}`);
      expect(provider.signedUrlRequests).toHaveLength(0);
    });

    it('no entrega archivos de otro tenant', async () => {
      await expect(
        service.getAccessUrl(OTHER_TENANT_ID, key, 'private'),
      ).rejects.toThrow('no pertenece al tenant');
    });
  });

  describe('remove', () => {
    it('elimina un archivo del tenant', async () => {
      const stored = await service.upload({
        tenantId: TENANT_ID,
        category: 'documents',
        fileName: 'acta.pdf',
        body: Buffer.from('pdf'),
        contentType: 'application/pdf',
        visibility: 'private',
      });

      await service.remove(TENANT_ID, stored.key);

      expect(provider.objects.has(stored.key)).toBe(false);
    });

    it('rechaza eliminar archivos de otro tenant', async () => {
      await expect(
        service.remove(
          OTHER_TENANT_ID,
          `tenants/${TENANT_ID}/documents/acta.pdf`,
        ),
      ).rejects.toThrow('no pertenece al tenant');
    });
  });
});
