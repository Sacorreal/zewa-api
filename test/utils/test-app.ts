import { type INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { EmailProvider } from '../../src/shared/notifications/email/contracts/email-provider';
import { StorageProvider } from '../../src/shared/storage/contracts/storage-provider';
import { InMemoryEmailProvider, InMemoryStorageProvider } from './fakes';

/** Tablas del módulo, en orden seguro para vaciarlas entre suites. */
const TABLES = [
  'audit_logs',
  'auth_sessions',
  'invitations',
  'membership_roles',
  'memberships',
  'tenants',
  'users',
];

export interface TestApp {
  app: INestApplication;
  dataSource: DataSource;
  email: InMemoryEmailProvider;
  storage: InMemoryStorageProvider;
}

/**
 * Levanta la API completa contra la BD del ambiente `test` (`.env.test`),
 * con storage y correo en memoria. Las migraciones se aplican al arrancar.
 */
export async function createTestApp(): Promise<TestApp> {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Las pruebas e2e solo corren con NODE_ENV=test.');
  }
  Logger.overrideLogger(['error']);

  const email = new InMemoryEmailProvider();
  const storage = new InMemoryStorageProvider();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(EmailProvider)
    .useValue(email)
    .overrideProvider(StorageProvider)
    .useValue(storage)
    .compile();

  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();

  const dataSource = app.get(DataSource);
  await resetDatabase(dataSource);
  return { app, dataSource, email, storage };
}

/** TRUNCATE no dispara el trigger por fila que protege `audit_logs`. */
export async function resetDatabase(dataSource: DataSource): Promise<void> {
  await dataSource.query(
    `TRUNCATE ${TABLES.map((table) => `"${table}"`).join(', ')} CASCADE`,
  );
}
