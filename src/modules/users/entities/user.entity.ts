import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export enum UserStatus {
  PendingActivation = 'PENDING_ACTIVATION',
  Active = 'ACTIVE',
  Disabled = 'DISABLED',
}

/** Rol de alcance global. Nunca se asigna mediante membresías ni por API. */
export enum PlatformRole {
  SuperAdmin = 'SUPERADMIN',
}

export const USER_EMAIL_UNIQUE = 'UQ_users_email';

/** Identidad de una persona en ZEWA (correo único global). No equivale a un tenant. */
@Entity('users')
@Unique(USER_EMAIL_UNIQUE, ['email'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 254 })
  email: string;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  passwordHash: string | null;

  @Column({
    type: 'enum',
    enum: UserStatus,
    enumName: 'user_status',
    default: UserStatus.PendingActivation,
  })
  status: UserStatus;

  @Column({
    name: 'platform_role',
    type: 'enum',
    enum: PlatformRole,
    enumName: 'platform_role',
    nullable: true,
  })
  platformRole: PlatformRole | null;

  @Column({ name: 'failed_login_attempts', type: 'int', default: 0 })
  failedLoginAttempts: number;

  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
