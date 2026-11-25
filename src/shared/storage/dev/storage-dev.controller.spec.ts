import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { StorageKeyError } from '../storage.errors';
import { StorageService } from '../storage.service';
import { StorageDevController } from './storage-dev.controller';

const TENANT_ID = '3f1c2a4e-8b7d-4c1a-9e2f-0a1b2c3d4e5f';
const KEY = `tenants/${TENANT_ID}/branding/abc-logo.png`;

describe('StorageDevController', () => {
  let app: INestApplication<App>;
  const storage = {
    createTenantFolder: jest.fn(),
    upload: jest.fn(),
    getAccessUrl: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [StorageDevController],
      providers: [{ provide: StorageService, useValue: storage }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(() => app.close());

  describe('POST /dev/storage/files', () => {
    it('sube el archivo adjunto', async () => {
      storage.upload.mockResolvedValue({ key: KEY });

      await request(app.getHttpServer())
        .post('/dev/storage/files')
        .field('tenantId', TENANT_ID)
        .field('category', 'branding')
        .field('visibility', 'public')
        .attach('file', Buffer.from('png'), {
          filename: 'Logo.png',
          contentType: 'image/png',
        })
        .expect(201, { key: KEY });

      expect(storage.upload).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        category: 'branding',
        visibility: 'public',
        fileName: 'Logo.png',
        body: Buffer.from('png'),
        contentType: 'image/png',
      });
    });

    it('exige un archivo', async () => {
      await request(app.getHttpServer())
        .post('/dev/storage/files')
        .field('tenantId', TENANT_ID)
        .field('category', 'branding')
        .field('visibility', 'public')
        .expect(400);
    });

    it('valida los campos del formulario', async () => {
      const response = await request(app.getHttpServer())
        .post('/dev/storage/files')
        .field('tenantId', 'no-uuid')
        .field('category', 'secretos')
        .field('visibility', 'publico')
        .attach('file', Buffer.from('x'), 'a.txt')
        .expect(400);

      expect(JSON.stringify(response.body)).toMatch(/tenantId/);
      expect(storage.upload).not.toHaveBeenCalled();
    });
  });

  it('GET /dev/storage/files/url devuelve la URL de acceso', async () => {
    storage.getAccessUrl.mockResolvedValue('https://signed');

    await request(app.getHttpServer())
      .get('/dev/storage/files/url')
      .query({ tenantId: TENANT_ID, key: KEY, visibility: 'private' })
      .expect(200, { url: 'https://signed' });

    expect(storage.getAccessUrl).toHaveBeenCalledWith(
      TENANT_ID,
      KEY,
      'private',
    );
  });

  it('DELETE /dev/storage/files traduce StorageKeyError a 400', async () => {
    storage.remove.mockRejectedValue(
      new StorageKeyError('El archivo solicitado no pertenece al tenant.'),
    );

    const response = await request(app.getHttpServer())
      .delete('/dev/storage/files')
      .query({ tenantId: TENANT_ID, key: 'tenants/otro/x.png' })
      .expect(400);

    expect((response.body as { message: string }).message).toBe(
      'El archivo solicitado no pertenece al tenant.',
    );
  });

  it('POST /dev/storage/tenants/:tenantId/folder crea la carpeta', async () => {
    await request(app.getHttpServer())
      .post(`/dev/storage/tenants/${TENANT_ID}/folder`)
      .expect(204);

    expect(storage.createTenantFolder).toHaveBeenCalledWith(TENANT_ID);
  });
});
