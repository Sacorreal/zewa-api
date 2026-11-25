import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { AppDataSource } from '../shared/config/database/data-source';
import { PasswordHasher } from '../shared/security/password-hasher';
import {
  bootstrapSuperAdmin,
  SuperAdminBootstrapError,
} from './superadmin-bootstrap';

/**
 * Bootstrap del SUPERADMIN (no existe endpoint para esto):
 *   pnpm superadmin:create --email admin@zewa.co
 * La contraseña se lee de SUPERADMIN_PASSWORD o se pide sin eco en la terminal.
 */
async function main(): Promise<void> {
  const { values } = parseArgs({ options: { email: { type: 'string' } } });
  if (!values.email) {
    throw new SuperAdminBootstrapError(
      'Indica el correo con --email <correo>.',
    );
  }
  const password =
    process.env.SUPERADMIN_PASSWORD ?? (await promptHidden('Contraseña: '));

  await AppDataSource.initialize();
  try {
    const superAdmin = await bootstrapSuperAdmin(
      { email: values.email, password },
      AppDataSource,
      new PasswordHasher(),
    );
    console.log(`Superadministrador creado: ${superAdmin.email}`);
  } finally {
    await AppDataSource.destroy();
  }
}

/** `readline` sin eco: se silencia su escritura interna mientras se teclea. */
type SilentReadline = ReturnType<typeof createInterface> & {
  _writeToOutput: (text: string) => void;
};

function promptHidden(question: string): Promise<string> {
  const terminal = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  }) as SilentReadline;

  process.stdout.write(question);
  terminal._writeToOutput = () => undefined;

  return new Promise((resolve) => {
    terminal.question('', (answer) => {
      terminal.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

main().catch((error: unknown) => {
  const message =
    error instanceof SuperAdminBootstrapError
      ? error.message
      : `Error inesperado: ${error instanceof Error ? error.message : String(error)}`;
  console.error(message);
  process.exitCode = 1;
});
