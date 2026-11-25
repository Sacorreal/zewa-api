import type { DataSource, EntityManager } from 'typeorm';
import { IsNull } from 'typeorm';
import { AuditAction, AuditEntityType } from '../modules/audit/audit-action';
import { AuditService } from '../modules/audit/audit.service';
import { AuditLog } from '../modules/audit/entities/audit-log.entity';
import { AuthSession } from '../modules/auth/entities/auth-session.entity';
import {
  PlatformRole,
  User,
  UserStatus,
} from '../modules/users/entities/user.entity';
import type { PasswordHasher } from '../shared/security/password-hasher';
import {
  isPasswordAcceptable,
  PASSWORD_POLICY_MESSAGE,
} from '../shared/security/password-policy';
import { normalizeEmail } from '../utils/email';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Serializa bootstraps simultáneos (dos terminales ejecutando el comando). */
const BOOTSTRAP_LOCK_KEY = 'zewa:superadmin-bootstrap';

export class SuperAdminBootstrapError extends Error {}

export interface SuperAdminCredentials {
  email: string;
  password: string;
}

interface ValidatedCredentials {
  email: string;
  passwordHash: string;
}

/** Valida correo y política de contraseña, y calcula el hash fuera de la transacción. */
async function validateCredentials(
  { email, password }: SuperAdminCredentials,
  passwordHasher: PasswordHasher,
): Promise<ValidatedCredentials> {
  const normalizedEmail = normalizeEmail(email);
  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    throw new SuperAdminBootstrapError('El correo no es válido.');
  }
  if (!isPasswordAcceptable(password)) {
    throw new SuperAdminBootstrapError(PASSWORD_POLICY_MESSAGE);
  }
  return {
    email: normalizedEmail,
    passwordHash: await passwordHasher.hash(password),
  };
}

function recordCliAudit(
  manager: EntityManager,
  superAdmin: User,
  action: AuditAction,
  command: string,
): Promise<void> {
  return new AuditService(manager.getRepository(AuditLog)).record(
    {
      actorUserId: superAdmin.id,
      action,
      entityType: AuditEntityType.User,
      entityId: superAdmin.id,
      newValues: { email: superAdmin.email },
      meta: { ipAddress: null, userAgent: `cli:${command}` },
    },
    manager,
  );
}

/**
 * Crea el SUPERADMIN inicial. Solo procede si todavía no existe ninguno y si
 * el correo no pertenece ya a otra identidad: el rol global nunca se otorga a
 * una cuenta existente ni por API.
 */
export async function bootstrapSuperAdmin(
  credentials: SuperAdminCredentials,
  dataSource: DataSource,
  passwordHasher: PasswordHasher,
): Promise<User> {
  const { email, passwordHash } = await validateCredentials(
    credentials,
    passwordHasher,
  );

  return dataSource.transaction(async (manager) => {
    await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
      BOOTSTRAP_LOCK_KEY,
    ]);
    const users = manager.getRepository(User);

    if (await users.existsBy({ platformRole: PlatformRole.SuperAdmin })) {
      throw new SuperAdminBootstrapError(
        'Ya existe un superadministrador. El bootstrap solo crea el primero.',
      );
    }
    if (await users.existsBy({ email })) {
      throw new SuperAdminBootstrapError(
        'El correo ya pertenece a otra cuenta de ZEWA; usa uno exclusivo para el superadministrador.',
      );
    }

    const superAdmin = await users.save(
      users.create({
        email,
        passwordHash,
        status: UserStatus.Active,
        platformRole: PlatformRole.SuperAdmin,
      }),
    );
    await recordCliAudit(
      manager,
      superAdmin,
      AuditAction.SuperAdminBootstrapped,
      'create-superadmin',
    );
    return superAdmin;
  });
}

/**
 * Restablece la contraseña del SUPERADMIN (solo por CLI, con acceso a la BD).
 * Desbloquea la cuenta y revoca todas sus sesiones abiertas.
 */
export async function resetSuperAdminPassword(
  credentials: SuperAdminCredentials,
  dataSource: DataSource,
  passwordHasher: PasswordHasher,
): Promise<User> {
  const { email, passwordHash } = await validateCredentials(
    credentials,
    passwordHasher,
  );

  return dataSource.transaction(async (manager) => {
    const users = manager.getRepository(User);
    const superAdmin = await users.findOne({
      where: { email, platformRole: PlatformRole.SuperAdmin },
      lock: { mode: 'pessimistic_write' },
    });
    if (!superAdmin) {
      throw new SuperAdminBootstrapError(
        'No existe un superadministrador con ese correo.',
      );
    }

    await users.update(superAdmin.id, {
      passwordHash,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
    await manager
      .getRepository(AuthSession)
      .update(
        { userId: superAdmin.id, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
    await recordCliAudit(
      manager,
      superAdmin,
      AuditAction.SuperAdminPasswordReset,
      'reset-superadmin-password',
    );
    return superAdmin;
  });
}
