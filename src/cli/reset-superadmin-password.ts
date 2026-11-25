import { runSuperAdminCommand } from './cli-support';
import { resetSuperAdminPassword } from './superadmin-bootstrap';

/**
 * Restablece la contraseña del SUPERADMIN (no existe endpoint para esto):
 *   pnpm superadmin:reset-password -- --email admin@zewa.co
 * Desbloquea la cuenta, cierra sus sesiones y queda auditado.
 */
runSuperAdminCommand(
  resetSuperAdminPassword,
  (email) =>
    `Contraseña restablecida para ${email}. Las sesiones abiertas se cerraron.`,
);
