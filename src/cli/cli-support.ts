import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { AppDataSource } from '../shared/config/database/data-source';
import { PasswordHasher } from '../shared/security/password-hasher';
import {
  SuperAdminBootstrapError,
  type SuperAdminCredentials,
} from './superadmin-bootstrap';

type SuperAdminCommand = (
  credentials: SuperAdminCredentials,
  dataSource: typeof AppDataSource,
  passwordHasher: PasswordHasher,
) => Promise<{ email: string }>;

/**
 * Ejecuta un comando de SUPERADMIN: lee `--email` y la contraseña, abre la
 * conexión, corre el comando y reporta el resultado o el error.
 */
export function runSuperAdminCommand(
  command: SuperAdminCommand,
  successMessage: (email: string) => string,
): void {
  execute(command, successMessage).catch((error: unknown) => {
    const message =
      error instanceof SuperAdminBootstrapError
        ? error.message
        : `Error inesperado: ${error instanceof Error ? error.message : String(error)}`;
    console.error(message);
    process.exitCode = 1;
  });
}

async function execute(
  command: SuperAdminCommand,
  successMessage: (email: string) => string,
): Promise<void> {
  const email = readEmailArgument();
  const password = await readNewPassword();

  await AppDataSource.initialize();
  try {
    const superAdmin = await command(
      { email, password },
      AppDataSource,
      new PasswordHasher(),
    );
    console.log(successMessage(superAdmin.email));
  } finally {
    await AppDataSource.destroy();
  }
}

function readEmailArgument(): string {
  const { values } = parseArgs({ options: { email: { type: 'string' } } });
  if (!values.email) {
    throw new SuperAdminBootstrapError(
      'Indica el correo con --email <correo>.',
    );
  }
  return values.email;
}

/**
 * Contraseña desde `SUPERADMIN_PASSWORD` o, en la terminal, sin eco y pedida
 * dos veces: un error de tecleo no puede verse, así que se exige confirmarla.
 */
async function readNewPassword(): Promise<string> {
  const fromEnv = process.env.SUPERADMIN_PASSWORD;
  if (fromEnv !== undefined) return fromEnv;

  if (!process.stdin.isTTY) {
    throw new SuperAdminBootstrapError(
      'No hay una terminal interactiva: define la contraseña en SUPERADMIN_PASSWORD.',
    );
  }
  const password = await promptHidden('Contraseña: ');
  const confirmation = await promptHidden('Confirma la contraseña: ');
  if (password !== confirmation) {
    throw new SuperAdminBootstrapError(
      'Las contraseñas no coinciden. No se hizo ningún cambio.',
    );
  }
  return password;
}

/** `readline` con su escritura interna reemplazada para enmascarar lo tecleado. */
type MaskedReadline = ReturnType<typeof createInterface> & {
  _writeToOutput: (text: string) => void;
  line: string;
};

const CLEAR_LINE = '\x1B[2K\r';

/** Pide un valor mostrando `*` por cada carácter (nunca el texto real). */
function promptHidden(question: string): Promise<string> {
  const terminal = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  }) as MaskedReadline;

  let masking = false;
  terminal._writeToOutput = (text: string) => {
    if (!masking) {
      process.stdout.write(text);
      return;
    }
    if (text.includes('\n')) return;
    process.stdout.write(
      `${CLEAR_LINE}${question}${'*'.repeat(terminal.line.length)}`,
    );
  };

  return new Promise((resolve) => {
    terminal.question(question, (answer) => {
      terminal.close();
      process.stdout.write('\n');
      resolve(answer);
    });
    masking = true;
  });
}
