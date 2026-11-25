import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditAction } from '../audit-action';

export type AuditValues = Record<string, unknown>;

/**
 * Registro inmutable de operaciones administrativas. Sin FKs para que la
 * historia sobreviva a cualquier cambio de los datos auditados; un trigger
 * de base de datos impide UPDATE y DELETE.
 */
@Entity('audit_logs')
@Index(['tenantId', 'createdAt'])
@Index(['entityType', 'entityId', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId: string | null;

  /** `null` para eventos globales de la plataforma. */
  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId: string | null;

  @Column({ type: 'varchar', length: 64 })
  action: AuditAction;

  @Column({ name: 'entity_type', type: 'varchar', length: 64 })
  entityType: string;

  @Column({ name: 'entity_id', type: 'varchar', length: 64, nullable: true })
  entityId: string | null;

  @Column({ name: 'previous_values', type: 'jsonb', nullable: true })
  previousValues: AuditValues | null;

  @Column({ name: 'new_values', type: 'jsonb', nullable: true })
  newValues: AuditValues | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 512, nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
