import { runSuperAdminCommand } from './cli-support';
import { bootstrapSuperAdmin } from './superadmin-bootstrap';

/**
 * Bootstrap del SUPERADMIN (no existe endpoint para esto):
 *   pnpm superadmin:create -- --email admin@zewa.co
 * La contraseña se lee de SUPERADMIN_PASSWORD o se pide dos veces sin eco.
 */
runSuperAdminCommand(
  bootstrapSuperAdmin,
  (email) => `Superadministrador creado: ${email}`,
);
