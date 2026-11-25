import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StorageOptions } from '../contracts/storage.types';
import { SpacesStorageProvider } from './spaces-storage.provider';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

const OPTIONS: StorageOptions = {
  endpoint: 'https://nyc3.digitaloceanspaces.com',
  region: 'nyc3',
  bucket: 'zewa-files',
  accessKeyId: 'key',
  secretAccessKey: 'secret',
  publicBaseUrl: 'https://zewa-files.nyc3.digitaloceanspaces.com',
  signedUrlTtlSeconds: 900,
};

describe('SpacesStorageProvider', () => {
  let send: jest.Mock;
  let client: S3Client;
  let provider: SpacesStorageProvider;

  const sentCommand = () =>
    (send.mock.calls as Array<[{ input: unknown }]>)[0][0];

  beforeEach(() => {
    send = jest.fn().mockResolvedValue({});
    client = { send } as unknown as S3Client;
    provider = new SpacesStorageProvider(client, OPTIONS);
  });

  it.each([
    ['public', 'public-read'],
    ['private', 'private'],
  ] as const)('sube un archivo %s con ACL %s', async (visibility, acl) => {
    const body = Buffer.from('data');

    await provider.putObject({
      key: 'tenants/t/branding/logo.png',
      body,
      contentType: 'image/png',
      visibility,
    });

    expect(sentCommand()).toBeInstanceOf(PutObjectCommand);
    expect(sentCommand().input).toEqual({
      Bucket: 'zewa-files',
      Key: 'tenants/t/branding/logo.png',
      Body: body,
      ContentType: 'image/png',
      ACL: acl,
    });
  });

  it('elimina un objeto', async () => {
    await provider.deleteObject('tenants/t/documents/acta.pdf');

    expect(sentCommand()).toBeInstanceOf(DeleteObjectCommand);
    expect(sentCommand().input).toEqual({
      Bucket: 'zewa-files',
      Key: 'tenants/t/documents/acta.pdf',
    });
  });

  describe('objectExists', () => {
    it('devuelve true si el objeto existe', async () => {
      await expect(provider.objectExists('tenants/t/')).resolves.toBe(true);
      expect(sentCommand()).toBeInstanceOf(HeadObjectCommand);
    });

    it('devuelve false ante un 404', async () => {
      send.mockRejectedValue({
        name: 'NotFound',
        $metadata: { httpStatusCode: 404 },
      });

      await expect(provider.objectExists('tenants/t/')).resolves.toBe(false);
    });

    it('propaga otros errores', async () => {
      const error = { name: 'Forbidden', $metadata: { httpStatusCode: 403 } };
      send.mockRejectedValue(error);

      await expect(provider.objectExists('tenants/t/')).rejects.toBe(error);
    });
  });

  it('firma URLs de lectura con el TTL indicado', async () => {
    const getSignedUrlMock = jest.mocked(getSignedUrl);
    getSignedUrlMock.mockResolvedValue('https://signed');

    await expect(
      provider.getSignedReadUrl('tenants/t/documents/acta.pdf', 120),
    ).resolves.toBe('https://signed');

    const [usedClient, command, options] = getSignedUrlMock.mock.calls[0];
    expect(usedClient).toBe(client);
    expect(command).toBeInstanceOf(GetObjectCommand);
    expect((command as GetObjectCommand).input).toEqual({
      Bucket: 'zewa-files',
      Key: 'tenants/t/documents/acta.pdf',
    });
    expect(options).toEqual({ expiresIn: 120 });
  });

  it('arma la URL pública desde la base configurada', () => {
    expect(provider.getPublicUrl('tenants/t/branding/logo.png')).toBe(
      'https://zewa-files.nyc3.digitaloceanspaces.com/tenants/t/branding/logo.png',
    );
  });
});
