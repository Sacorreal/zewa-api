import type { DataSource } from 'typeorm';
import { AuditAction, AuditEntityType } from '../modules/audit/audit-action';
import { AuditService } from '../modules/audit/audit.service';
import { AuditLog } from '../modules/audit/entities/audit-log.entity';
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

/**
 * Crea el SUPERADMIN inicial. Solo procede si todavía no existe ninguno y si
 * el correo no pertenece ya a otra identidad: el rol global nunca se otorga a
 * una cuenta existente ni por API.
 */
export async function bootstrapSuperAdmin(
  { email, password }: SuperAdminCredentials,
  dataSource: DataSource,
  passwordHasher: PasswordHasher,
): Promise<User> {
  const normalizedEmail = normalizeEmail(email);
  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    throw new SuperAdminBootstrapError('El correo no es válido.');
  }
  if (!isPasswordAcceptable(password)) {
    throw new SuperAdminBootstrapError(PASSWORD_POLICY_MESSAGE);
  }
  const passwordHash = await passwordHasher.hash(password);

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
    if (await users.existsBy({ email: normalizedEmail })) {
      throw new SuperAdminBootstrapError(
        'El correo ya pertenece a otra cuenta de ZEWA; usa uno exclusivo para el superadministrador.',
      );
    }

    const superAdmin = await users.save(
      users.create({
        email: normalizedEmail,
        passwordHash,
        status: UserStatus.Active,
        platformRole: PlatformRole.SuperAdmin,
      }),
    );

    await new AuditService(manager.getRepository(AuditLog)).record(
      {
        actorUserId: superAdmin.id,
        action: AuditAction.SuperAdminBootstrapped,
        entityType: AuditEntityType.User,
        entityId: superAdmin.id,
        newValues: { email: superAdmin.email },
        meta: { ipAddress: null, userAgent: 'cli:create-superadmin' },
      },
      manager,
    );
    return superAdmin;
  });
}
