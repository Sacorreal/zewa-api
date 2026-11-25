import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { TenantScopedEntity } from '../../../shared/tenancy/tenant-scoped.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { MembershipRole } from './membership-role.entity';
import { User } from './user.entity';

export enum MembershipStatus {
  Pending = 'PENDING',
  Active = 'ACTIVE',
  Revoked = 'REVOKED',
}

/** Relación de un usuario con un tenant. Un usuario puede tener varias. */
@Entity('memberships')
@Unique('UQ_memberships_user_tenant', ['userId', 'tenantId'])
export class Membership extends TenantScopedEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne(() => Tenant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenant_id' })
  tenant?: Tenant;

  @Column({
    type: 'enum',
    enum: MembershipStatus,
    enumName: 'membership_status',
    default: MembershipStatus.Pending,
  })
  status: MembershipStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'activated_at', type: 'timestamptz', nullable: true })
  activatedAt: Date | null;

  @OneToMany(() => MembershipRole, (role) => role.membership, {
    cascade: ['insert'],
  })
  roles?: MembershipRole[];
}
