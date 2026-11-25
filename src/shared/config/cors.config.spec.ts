import { buildCorsOptions, parseOrigins } from './cors.config';
import type { EnvReader } from './env-reader';

const readerFrom =
  (env: Record<string, string>): EnvReader =>
  (key) =>
    env[key];

describe('parseOrigins', () => {
  it('separa por comas, limpia espacios y la barra final', () => {
    expect(parseOrigins(' https://zewa.co/ , https://www.zewa.co,,')).toEqual([
      'https://zewa.co',
      'https://www.zewa.co',
    ]);
  });

  it('rechaza el comodín "*"', () => {
    expect(() => parseOrigins('*')).toThrow('CORS_ORIGINS no admite "*"');
  });
});

describe('buildCorsOptions', () => {
  it('usa http://localhost:3000 por defecto en local', () => {
    const options = buildCorsOptions(readerFrom({ NODE_ENV: 'local' }));

    expect(options).toMatchObject({
      origin: ['http://localhost:3000'],
      credentials: true,
    });
  });

  it.each(['develop', 'production'])(
    'toma los orígenes de CORS_ORIGINS en %s',
    (nodeEnv) => {
      const options = buildCorsOptions(
        readerFrom({ NODE_ENV: nodeEnv, CORS_ORIGINS: 'https://zewa.co' }),
      );

      expect(options.origin).toEqual(['https://zewa.co']);
    },
  );

  it('exige CORS_ORIGINS fuera de local', () => {
    expect(() =>
      buildCorsOptions(readerFrom({ NODE_ENV: 'production' })),
    ).toThrow('Falta la variable de entorno CORS_ORIGINS.');
  });
});
