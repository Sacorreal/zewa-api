import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum TenantStatus {
  PendingActivation = 'PENDING_ACTIVATION',
  Active = 'ACTIVE',
  Suspended = 'SUSPENDED',
}

export const TENANT_TAX_ID_UNIQUE = 'UQ_tenants_tax_id';

/**
 * Conjunto residencial cliente de ZEWA y su espacio de operación aislado.
 * Nunca se elimina físicamente: se suspende.
 */
@Entity('tenants')
@Unique(TENANT_TAX_ID_UNIQUE, ['taxId'])
export class Tenant {
  /** Lo genera la aplicación para poder ubicar el logo antes de persistir. */
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  /** NIT normalizado `<base>-<dv>`. */
  @Column({ name: 'tax_id', type: 'varchar', length: 30 })
  taxId: string;

  /** Key del logo en el storage (categoría `branding`, visibilidad pública). */
  @Column({ name: 'logo_key', type: 'text', nullable: true })
  logoKey: string | null;

  @Index()
  @Column({
    type: 'enum',
    enum: TenantStatus,
    enumName: 'tenant_status',
    default: TenantStatus.PendingActivation,
  })
  status: TenantStatus;

  @Index()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'activated_at', type: 'timestamptz', nullable: true })
  activatedAt: Date | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  createdBy?: User;
}
