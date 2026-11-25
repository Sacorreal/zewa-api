import { join } from 'path';
import { DataSource } from 'typeorm';
import { resolveEnvFilePath } from '../environment';
import { validateEnv } from '../env.validation';
import { buildDatabaseOptions } from './database-options.factory';

process.loadEnvFile(resolveEnvFilePath(process.env.NODE_ENV));
validateEnv(process.env);

export const AppDataSource = new DataSource({
  ...buildDatabaseOptions((key) => process.env[key]),
  entities: [join(__dirname, '../../../**/*.entity.{ts,js}')],
});
