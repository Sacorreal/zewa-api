import { join } from 'path';
import type { PostgresDataSourceOptions } from 'typeorm/driver/postgres/PostgresDataSourceOptions';
import { EnvReader, readOptional, readRequired } from '../env-reader';
import { NodeEnv, isNodeEnv } from '../environment';

type ConnectionOptions = Pick<
  PostgresDataSourceOptions,
  | 'host'
  | 'port'
  | 'username'
  | 'password'
  | 'database'
  | 'url'
  | 'ssl'
  | 'logging'
  | 'migrationsRun'
>;

const DEFAULT_DB_PORT = 5432;
const MIGRATIONS_GLOB = join(__dirname, '../../../migrations/*.{ts,js}');

const localConnection = (read: EnvReader): ConnectionOptions => ({
  host: readRequired(read, 'DB_HOST'),
  port: Number(readOptional(read, 'DB_PORT') ?? DEFAULT_DB_PORT),
  username: readRequired(read, 'DB_USERNAME'),
  password: readRequired(read, 'DB_PASSWORD'),
  database: readRequired(read, 'DB_NAME'),
  logging: true,
});

const remoteConnection = (read: EnvReader): ConnectionOptions => ({
  url: readRequired(read, 'DATABASE_URL'),
  ssl: {
    ca: readOptional(read, 'DB_SSL_CA'),
    rejectUnauthorized:
      readOptional(read, 'DB_SSL_REJECT_UNAUTHORIZED') !== 'false',
  },
  migrationsRun: true,
});

/** Base de datos efímera de integración/e2e: aplica las migraciones al arrancar. */
const testConnection = (read: EnvReader): ConnectionOptions => ({
  ...localConnection(read),
  logging: false,
  migrationsRun: true,
});

const CONNECTION_BY_ENV: Record<
  NodeEnv,
  (read: EnvReader) => ConnectionOptions
> = {
  [NodeEnv.Local]: localConnection,
  [NodeEnv.Develop]: remoteConnection,
  [NodeEnv.Production]: remoteConnection,
  [NodeEnv.Test]: testConnection,
};

export function buildDatabaseOptions(
  read: EnvReader,
): PostgresDataSourceOptions {
  const nodeEnv = read('NODE_ENV');
  if (!isNodeEnv(nodeEnv)) {
    throw new Error(
      `NODE_ENV "${String(nodeEnv)}" no es válido para la configuración de base de datos.`,
    );
  }

  return {
    type: 'postgres',
    synchronize: false,
    migrations: [MIGRATIONS_GLOB],
    migrationsTableName: 'typeorm_migrations',
    // gen_random_uuid() es nativo desde PostgreSQL 13: no requiere extensiones.
    uuidExtension: 'pgcrypto',
    installExtensions: false,
    ...CONNECTION_BY_ENV[nodeEnv](read),
  };
}
