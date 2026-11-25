import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import type { Membership } from './membership.entity';

/** Roles funcionales dentro de un tenant. SUPERADMIN no pertenece aquí. */
export enum MembershipRoleName {
  Administrador = 'ADMINISTRADOR',
}

@Entity('membership_roles')
@Unique('UQ_membership_roles_membership_role', ['membershipId', 'role'])
export class MembershipRole {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'membership_id', type: 'uuid' })
  membershipId: string;

  @ManyToOne('Membership', (membership: Membership) => membership.roles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'membership_id' })
  membership?: Membership;

  @Column({
    type: 'enum',
    enum: MembershipRoleName,
    enumName: 'membership_role_name',
  })
  role: MembershipRoleName;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
