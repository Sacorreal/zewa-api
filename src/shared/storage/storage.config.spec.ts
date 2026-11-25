import type { EnvReader } from '../config/env-reader';
import { buildStorageOptions } from './storage.config';

const BASE_ENV = {
  SPACES_ENDPOINT: 'https://nyc3.digitaloceanspaces.com/',
  SPACES_REGION: 'nyc3',
  SPACES_BUCKET: 'zewa-files',
  SPACES_ACCESS_KEY_ID: 'key',
  SPACES_SECRET_ACCESS_KEY: 'secret',
};

const readerFrom =
  (env: Record<string, string>): EnvReader =>
  (key) =>
    env[key];

describe('buildStorageOptions', () => {
  it('lee la configuración del Space con valores por defecto', () => {
    expect(buildStorageOptions(readerFrom(BASE_ENV))).toEqual({
      endpoint: 'https://nyc3.digitaloceanspaces.com',
      region: 'nyc3',
      bucket: 'zewa-files',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
      publicBaseUrl: 'https://zewa-files.nyc3.digitaloceanspaces.com',
      signedUrlTtlSeconds: 900,
    });
  });

  it('usa el CDN y el TTL configurados', () => {
    const options = buildStorageOptions(
      readerFrom({
        ...BASE_ENV,
        SPACES_CDN_URL: 'https://cdn.zewa.co/',
        SPACES_SIGNED_URL_TTL_SECONDS: '60',
      }),
    );

    expect(options.publicBaseUrl).toBe('https://cdn.zewa.co');
    expect(options.signedUrlTtlSeconds).toBe(60);
  });

  it.each(['0', '-5', '1.5', 'abc'])('rechaza el TTL "%s"', (ttl) => {
    expect(() =>
      buildStorageOptions(
        readerFrom({ ...BASE_ENV, SPACES_SIGNED_URL_TTL_SECONDS: ttl }),
      ),
    ).toThrow('SPACES_SIGNED_URL_TTL_SECONDS');
  });

  it('exige las credenciales', () => {
    const env: Record<string, string> = { ...BASE_ENV };
    delete env.SPACES_SECRET_ACCESS_KEY;

    expect(() => buildStorageOptions(readerFrom(env))).toThrow(
      'Falta la variable de entorno SPACES_SECRET_ACCESS_KEY.',
    );
  });
});
