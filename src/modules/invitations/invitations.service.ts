import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import { EventBusService } from '../../shared/events';
import type { RequestMeta } from '../../shared/http/request-meta.decorator';
import { PasswordHasher } from '../../shared/security/password-hasher';
import { PASSWORD_POLICY_MESSAGE } from '../../shared/security/password-policy';
import {
  generateSecureToken,
  hashToken,
} from '../../utils/crypto/secure-token';
import { AuditAction, AuditEntityType } from '../audit/audit-action';
import { AuditService } from '../audit/audit.service';
import { Tenant, TenantStatus } from '../tenants/entities/tenant.entity';
import {
  Membership,
  MembershipStatus,
} from '../users/entities/membership.entity';
import { User, UserStatus } from '../users/entities/user.entity';
import {
  Invitation,
  InvitationDeliveryStatus,
} from './entities/invitation.entity';
import {
  INVITATION_UNUSABLE_MESSAGES,
  unusableReason,
} from './invitation-rules';
import {
  INVITATION_OPTIONS,
  type InvitationOptions,
} from './invitations.config';

export interface IssuedInvitation {
  invitation: Invitation;
  /** Token en claro: solo se entrega al correo, nunca se persiste. */
  token: string;
}

export interface InvitationDispatch extends IssuedInvitation {
  tenantId: string;
  clientName: string;
  email: string;
}

export interface InvitationPreview {
  clientName: string;
  email: string;
  expiresAt: Date;
  requiresPassword: boolean;
}

export interface AcceptedInvitation {
  clientName: string;
  email: string;
  tenantId: string;
}

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(Invitation)
    private readonly invitations: Repository<Invitation>,
    private readonly dataSource: DataSource,
    private readonly eventBus: EventBusService,
    private readonly passwordHasher: PasswordHasher,
    private readonly audit: AuditService,
    @Inject(INVITATION_OPTIONS) private readonly options: InvitationOptions,
  ) {}

  /** Crea una invitación de un solo uso dentro de la transacción del llamador. */
  async issue(
    params: { userId: string; membershipId: string },
    manager: EntityManager,
  ): Promise<IssuedInvitation> {
    const token = generateSecureToken();
    const repository = manager.getRepository(Invitation);
    const invitation = await repository.save(
      repository.create({
        userId: params.userId,
        membershipId: params.membershipId,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + this.options.ttlHours * 3_600_000),
      }),
    );
    return { invitation, token };
  }

  /** Invalida las invitaciones pendientes previas (al reenviar). */
  async revokePending(
    membershipId: string,
    manager: EntityManager,
  ): Promise<void> {
    await manager
      .getRepository(Invitation)
      .update(
        { membershipId, acceptedAt: IsNull(), revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
  }

  /**
   * Dispara el correo (después del commit) y devuelve el resultado del envío.
   * Un fallo no deshace nada: la invitación queda `FAILED` y puede reenviarse.
   */
  async dispatch({
    invitation,
    token,
    tenantId,
    clientName,
    email,
  }: InvitationDispatch): Promise<InvitationDeliveryStatus> {
    await this.eventBus.emitAndWait('invitation.created', {
      invitationId: invitation.id,
      tenantId,
      clientName,
      email,
      activationToken: token,
      expiresAt: invitation.expiresAt,
    });

    const { deliveryStatus } = await this.invitations.findOneByOrFail({
      id: invitation.id,
    });
    return deliveryStatus;
  }

  async recordDelivery(
    invitationId: string,
    status: InvitationDeliveryStatus,
    occurredAt: Date,
  ): Promise<void> {
    await this.invitations.update(invitationId, {
      deliveryStatus: status,
      ...(status === InvitationDeliveryStatus.Sent
        ? { lastSentAt: occurredAt }
        : {}),
    });
  }

  findLatestForMembership(membershipId: string): Promise<Invitation | null> {
    return this.invitations.findOne({
      where: { membershipId },
      order: { createdAt: 'DESC' },
    });
  }

  async validate(token: string): Promise<InvitationPreview> {
    const invitation = await this.findUsable(token, this.dataSource.manager);
    const { user, tenant } = await this.loadParticipants(
      invitation,
      this.dataSource.manager,
    );
    return {
      clientName: tenant.name,
      email: user.email,
      expiresAt: invitation.expiresAt,
      requiresPassword: !user.passwordHash,
    };
  }

  /**
   * Acepta la invitación en una transacción con bloqueo de la fila: dos
   * aceptaciones simultáneas del mismo token no pueden prosperar.
   */
  accept(
    token: string,
    password: string | undefined,
    meta: RequestMeta,
  ): Promise<AcceptedInvitation> {
    return this.dataSource.transaction(async (manager) => {
      const invitation = await this.findUsable(token, manager, true);
      const { user, membership, tenant } = await this.loadParticipants(
        invitation,
        manager,
      );
      const now = new Date();

      await this.activateUser(user, password, manager);
      await manager.getRepository(Membership).update(membership.id, {
        status: MembershipStatus.Active,
        activatedAt: membership.activatedAt ?? now,
      });
      await manager
        .getRepository(Invitation)
        .update(invitation.id, { acceptedAt: now });
      const tenantActivated = await this.activateTenant(tenant, now, manager);

      await this.audit.record(
        {
          actorUserId: user.id,
          tenantId: tenant.id,
          action: AuditAction.InvitationAccepted,
          entityType: AuditEntityType.Invitation,
          entityId: invitation.id,
          newValues: {
            membershipStatus: MembershipStatus.Active,
            ...(tenantActivated ? { tenantStatus: TenantStatus.Active } : {}),
          },
          meta,
        },
        manager,
      );

      return {
        clientName: tenant.name,
        email: user.email,
        tenantId: tenant.id,
      };
    });
  }

  private async findUsable(
    token: string,
    manager: EntityManager,
    lockForUpdate = false,
  ): Promise<Invitation> {
    const invitation = await manager.getRepository(Invitation).findOne({
      where: { tokenHash: hashToken(token) },
      ...(lockForUpdate
        ? { lock: { mode: 'pessimistic_write' as const } }
        : {}),
    });
    if (!invitation) {
      throw new BadRequestException(INVITATION_UNUSABLE_MESSAGES.NOT_FOUND);
    }

    const reason = unusableReason(invitation);
    if (reason)
      throw new BadRequestException(INVITATION_UNUSABLE_MESSAGES[reason]);
    return invitation;
  }

  private async loadParticipants(
    invitation: Invitation,
    manager: EntityManager,
  ) {
    const membership = await manager
      .getRepository(Membership)
      .findOneByOrFail({ id: invitation.membershipId });
    if (membership.status === MembershipStatus.Revoked) {
      throw new BadRequestException(INVITATION_UNUSABLE_MESSAGES.REVOKED);
    }
    const [user, tenant] = await Promise.all([
      manager.getRepository(User).findOneByOrFail({ id: invitation.userId }),
      manager
        .getRepository(Tenant)
        .findOneByOrFail({ id: membership.tenantId }),
    ]);
    return { user, membership, tenant };
  }

  /** Define la contraseña solo si la cuenta aún no tiene (administrador nuevo). */
  private async activateUser(
    user: User,
    password: string | undefined,
    manager: EntityManager,
  ): Promise<void> {
    const changes: Partial<User> = { status: UserStatus.Active };
    if (!user.passwordHash) {
      if (!password) throw new BadRequestException(PASSWORD_POLICY_MESSAGE);
      changes.passwordHash = await this.passwordHasher.hash(password);
    }
    await manager.getRepository(User).update(user.id, changes);
  }

  /** Un tenant suspendido sigue suspendido aunque se acepte la invitación. */
  private async activateTenant(
    tenant: Tenant,
    now: Date,
    manager: EntityManager,
  ): Promise<boolean> {
    if (tenant.status !== TenantStatus.PendingActivation) return false;
    await manager
      .getRepository(Tenant)
      .update(tenant.id, { status: TenantStatus.Active, activatedAt: now });
    return true;
  }
}
