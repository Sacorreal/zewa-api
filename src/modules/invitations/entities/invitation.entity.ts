import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Membership } from '../../users/entities/membership.entity';
import { User } from '../../users/entities/user.entity';

export enum InvitationDeliveryStatus {
  Pending = 'PENDING',
  Sent = 'SENT',
  Failed = 'FAILED',
}

/** Invitación de un solo uso. El token en claro nunca se persiste. */
@Entity('invitations')
@Unique('UQ_invitations_token_hash', ['tokenHash'])
export class Invitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Index()
  @Column({ name: 'membership_id', type: 'uuid' })
  membershipId: string;

  @ManyToOne(() => Membership, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'membership_id' })
  membership?: Membership;

  /** SHA-256 (hex) del token enviado por correo. */
  @Column({ name: 'token_hash', type: 'varchar', length: 64 })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt: Date | null;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @Column({
    name: 'delivery_status',
    type: 'enum',
    enum: InvitationDeliveryStatus,
    enumName: 'invitation_delivery_status',
    default: InvitationDeliveryStatus.Pending,
  })
  deliveryStatus: InvitationDeliveryStatus;

  @Column({ name: 'last_sent_at', type: 'timestamptz', nullable: true })
  lastSentAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
