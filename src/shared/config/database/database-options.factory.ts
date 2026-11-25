import { join } from 'path';
import type { PostgresDataSourceOptions } from 'typeorm/driver/postgres/PostgresDataSourceOptions';
import { NodeEnv, isNodeEnv } from '../environment';

export type EnvReader = (key: string) => unknown;

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

function readOptional(read: EnvReader, key: string): string | undefined {
  const value = read(key);
  if (typeof value === 'string') return value === '' ? undefined : value;
  if (typeof value === 'number') return String(value);
  return undefined;
}

function readRequired(read: EnvReader, key: string): string {
  const value = readOptional(read, key);
  if (value === undefined) {
    throw new Error(`Falta la variable de entorno ${key}.`);
  }
  return value;
}

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

const CONNECTION_BY_ENV: Record<
  NodeEnv,
  (read: EnvReader) => ConnectionOptions
> = {
  [NodeEnv.Local]: localConnection,
  [NodeEnv.Develop]: remoteConnection,
  [NodeEnv.Production]: remoteConnection,
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
    ...CONNECTION_BY_ENV[nodeEnv](read),
  };
}
