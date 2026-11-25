import type { EnvReader } from '../env-reader';
import { buildDatabaseOptions } from './database-options.factory';

const readerFrom =
  (env: Record<string, string>): EnvReader =>
  (key) =>
    env[key];

const LOCAL_ENV = {
  NODE_ENV: 'local',
  DB_HOST: 'localhost',
  DB_USERNAME: 'postgres',
  DB_PASSWORD: 'secret',
  DB_NAME: 'zewa',
};

describe('buildDatabaseOptions', () => {
  it('usa host/puerto sin SSL ni migraciones automáticas en local', () => {
    const options = buildDatabaseOptions(readerFrom(LOCAL_ENV));

    expect(options).toMatchObject({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      database: 'zewa',
      synchronize: false,
      migrationsTableName: 'typeorm_migrations',
    });
    expect(options.ssl).toBeUndefined();
    expect(options.migrationsRun).toBeUndefined();
  });

  it('respeta DB_PORT cuando se define', () => {
    const options = buildDatabaseOptions(
      readerFrom({ ...LOCAL_ENV, DB_PORT: '5433' }),
    );

    expect(options.port).toBe(5433);
  });

  it.each(['develop', 'production'])(
    'usa DATABASE_URL con SSL y migraciones automáticas en %s',
    (nodeEnv) => {
      const url = 'postgresql://user:pass@host:5432/zewa';
      const options = buildDatabaseOptions(
        readerFrom({ NODE_ENV: nodeEnv, DATABASE_URL: url }),
      );

      expect(options).toMatchObject({
        url,
        ssl: { rejectUnauthorized: true },
        migrationsRun: true,
        synchronize: false,
      });
      expect(options.host).toBeUndefined();
    },
  );

  it('permite CA propia y desactivar la verificación TLS de forma explícita', () => {
    const options = buildDatabaseOptions(
      readerFrom({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@host:5432/zewa',
        DB_SSL_CA: 'PEM',
        DB_SSL_REJECT_UNAUTHORIZED: 'false',
      }),
    );

    expect(options.ssl).toEqual({ ca: 'PEM', rejectUnauthorized: false });
  });

  it('falla con un NODE_ENV inválido', () => {
    expect(() =>
      buildDatabaseOptions(readerFrom({ NODE_ENV: 'staging' })),
    ).toThrow('NODE_ENV "staging" no es válido');
  });

  it('falla si falta una variable requerida', () => {
    expect(() =>
      buildDatabaseOptions(readerFrom({ NODE_ENV: 'develop' })),
    ).toThrow('Falta la variable de entorno DATABASE_URL.');
  });
});
