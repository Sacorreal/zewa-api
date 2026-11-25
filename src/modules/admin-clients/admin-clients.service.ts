import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { isUniqueViolation } from '../../shared/database/postgres-errors';
import { EventBusService } from '../../shared/events';
import type { RequestMeta } from '../../shared/http/request-meta.decorator';
import { parseNit } from '../../utils/nit';
import { AuditAction, AuditEntityType } from '../audit/audit-action';
import { AuditService } from '../audit/audit.service';
import type { AuditValues } from '../audit/entities/audit-log.entity';
import type { AuthPrincipal } from '../auth/auth.types';
import {
  InvitationsService,
  type IssuedInvitation,
} from '../invitations/invitations.service';
import {
  Tenant,
  TENANT_TAX_ID_UNIQUE,
  TenantStatus,
} from '../tenants/entities/tenant.entity';
import { MembershipRoleName } from '../users/entities/membership-role.entity';
import { MembershipStatus } from '../users/entities/membership.entity';
import type { User } from '../users/entities/user.entity';
import { MembershipsService } from '../users/memberships.service';
import { UsersService } from '../users/users.service';
import { AdminClientsQueryService } from './admin-clients-query.service';
import type {
  ClientCreatedView,
  ClientSummaryView,
  InvitationDeliveryView,
} from './admin-clients.views';
import { ClientLogoStorage, type ValidatedLogo } from './client-logo';
import type {
  ChangeClientStatusDto,
  CreateClientDto,
  UpdateClientDto,
} from './dto/client.dto';

const duplicateTaxIdError = (taxId?: string) =>
  new ConflictException(
    `Ya existe un cliente registrado con ${taxId ? `el NIT ${taxId}` : 'ese NIT'}.`,
  );

interface CreatedClient {
  tenant: Tenant;
  administrator: User;
  issued: IssuedInvitation;
}

/**
 * Operaciones del SUPERADMIN sobre clientes. Cada cambio se persiste junto
 * con su auditoría en una misma transacción; el correo sale tras el commit.
 */
@Injectable()
export class AdminClientsService {
  constructor(
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    private readonly dataSource: DataSource,
    private readonly users: UsersService,
    private readonly memberships: MembershipsService,
    private readonly invitations: InvitationsService,
    private readonly audit: AuditService,
    private readonly logos: ClientLogoStorage,
    private readonly queries: AdminClientsQueryService,
    private readonly eventBus: EventBusService,
  ) {}

  async create(
    dto: CreateClientDto,
    logo: ValidatedLogo | undefined,
    actor: AuthPrincipal,
    meta: RequestMeta,
  ): Promise<ClientCreatedView> {
    const taxId = this.normalizeTaxId(dto.taxId);
    await this.assertTaxIdAvailable(taxId);

    const tenantId = randomUUID();
    const logoKey = logo ? await this.logos.upload(tenantId, logo) : null;

    const created = await this.withLogoRollback(tenantId, logoKey, () =>
      this.dataSource.transaction((manager) =>
        this.persistNewClient(
          {
            tenantId,
            name: dto.name,
            taxId,
            logoKey,
            email: dto.administratorEmail,
          },
          actor,
          meta,
          manager,
        ),
      ),
    );

    return this.announceCreation(created, actor);
  }

  async update(
    id: string,
    dto: UpdateClientDto,
    logo: ValidatedLogo | undefined,
    actor: AuthPrincipal,
    meta: RequestMeta,
  ): Promise<ClientSummaryView> {
    const tenant = await this.queries.findTenantOrFail(id);
    const changes: Partial<Pick<Tenant, 'name' | 'taxId' | 'logoKey'>> = {};

    if (dto.name !== undefined && dto.name !== tenant.name) {
      changes.name = dto.name;
    }
    if (dto.taxId !== undefined) {
      const taxId = this.normalizeTaxId(dto.taxId);
      if (taxId !== tenant.taxId) {
        await this.assertTaxIdAvailable(taxId);
        changes.taxId = taxId;
      }
    }
    if (logo) {
      changes.logoKey = await this.logos.upload(tenant.id, logo);
    } else if (dto.removeLogo && tenant.logoKey) {
      changes.logoKey = null;
    }

    if (Object.keys(changes).length === 0)
      return this.queries.summaryOf(tenant);

    const uploadedKey = logo ? (changes.logoKey ?? null) : null;
    await this.withLogoRollback(tenant.id, uploadedKey, () =>
      this.dataSource.transaction(async (manager) => {
        await manager.getRepository(Tenant).update(tenant.id, changes);
        await this.audit.record(
          {
            actorUserId: actor.userId,
            tenantId: tenant.id,
            action: AuditAction.ClientUpdated,
            entityType: AuditEntityType.Tenant,
            entityId: tenant.id,
            previousValues: this.auditableTenantValues(tenant, changes),
            newValues: this.auditableTenantValues(changes, changes),
            meta,
          },
          manager,
        );
      }),
    );

    if ('logoKey' in changes) {
      await this.logos.removeQuietly(tenant.id, tenant.logoKey);
    }
    return this.queries.summaryOf(await this.queries.findTenantOrFail(id));
  }

  /**
   * Suspender bloquea la operación del tenant (los guards validan su estado en
   * cada petición). Reactivar restaura el estado previo sin tocar datos.
   */
  async changeStatus(
    id: string,
    { status }: ChangeClientStatusDto,
    actor: AuthPrincipal,
    meta: RequestMeta,
  ): Promise<ClientSummaryView> {
    const tenant = await this.queries.findTenantOrFail(id);
    const suspending = status === TenantStatus.Suspended;

    if (suspending && tenant.status === TenantStatus.Suspended) {
      throw new ConflictException('El cliente ya está suspendido.');
    }
    if (!suspending && tenant.status !== TenantStatus.Suspended) {
      throw new ConflictException(
        'Solo se puede reactivar un cliente suspendido.',
      );
    }

    const nextStatus = suspending
      ? TenantStatus.Suspended
      : tenant.activatedAt
        ? TenantStatus.Active
        : TenantStatus.PendingActivation;

    await this.dataSource.transaction(async (manager) => {
      await manager
        .getRepository(Tenant)
        .update(tenant.id, { status: nextStatus });
      await this.audit.record(
        {
          actorUserId: actor.userId,
          tenantId: tenant.id,
          action: suspending
            ? AuditAction.ClientSuspended
            : AuditAction.ClientReactivated,
          entityType: AuditEntityType.Tenant,
          entityId: tenant.id,
          previousValues: { status: tenant.status },
          newValues: { status: nextStatus },
          meta,
        },
        manager,
      );
    });

    return this.queries.summaryOf({ ...tenant, status: nextStatus });
  }

  /** Revoca la invitación vigente y envía una nueva (operación independiente). */
  async resendInvitation(
    id: string,
    actor: AuthPrincipal,
    meta: RequestMeta,
  ): Promise<InvitationDeliveryView> {
    const tenant = await this.queries.findTenantOrFail(id);
    if (tenant.status === TenantStatus.Suspended) {
      throw new ConflictException(
        'Reactiva el cliente antes de reenviar la invitación.',
      );
    }

    const [administrator] = await this.memberships.findByTenantAndRole(
      tenant.id,
      MembershipRoleName.Administrador,
    );
    if (!administrator?.user) {
      throw new ConflictException(
        'El cliente no tiene un administrador asignado.',
      );
    }
    if (administrator.status !== MembershipStatus.Pending) {
      throw new ConflictException('El administrador ya activó su cuenta.');
    }

    const issued = await this.dataSource.transaction(async (manager) => {
      await this.invitations.revokePending(administrator.id, manager);
      const invitation = await this.invitations.issue(
        { userId: administrator.userId, membershipId: administrator.id },
        manager,
      );
      await this.audit.record(
        {
          actorUserId: actor.userId,
          tenantId: tenant.id,
          action: AuditAction.InvitationResent,
          entityType: AuditEntityType.Invitation,
          entityId: invitation.invitation.id,
          newValues: { email: administrator.user?.email },
          meta,
        },
        manager,
      );
      return invitation;
    });

    return this.deliver(issued, tenant, administrator.user.email);
  }

  private async persistNewClient(
    params: {
      tenantId: string;
      name: string;
      taxId: string;
      logoKey: string | null;
      email: string;
    },
    actor: AuthPrincipal,
    meta: RequestMeta,
    manager: EntityManager,
  ): Promise<CreatedClient> {
    const tenantRepository = manager.getRepository(Tenant);
    const tenant = await tenantRepository.save(
      tenantRepository.create({
        id: params.tenantId,
        name: params.name,
        taxId: params.taxId,
        logoKey: params.logoKey,
        status: TenantStatus.PendingActivation,
        createdById: actor.userId,
      }),
    );

    const administrator = await this.users.findOrCreatePending(
      params.email,
      manager,
    );
    if (administrator.platformRole) {
      throw new ConflictException(
        'El correo pertenece a un superadministrador; usa otro correo para el administrador del conjunto.',
      );
    }

    const membership = await this.memberships.create(
      {
        userId: administrator.id,
        tenantId: tenant.id,
        role: MembershipRoleName.Administrador,
      },
      manager,
    );
    const issued = await this.invitations.issue(
      { userId: administrator.id, membershipId: membership.id },
      manager,
    );

    await this.audit.record(
      {
        actorUserId: actor.userId,
        tenantId: tenant.id,
        action: AuditAction.ClientCreated,
        entityType: AuditEntityType.Tenant,
        entityId: tenant.id,
        newValues: {
          name: tenant.name,
          taxId: tenant.taxId,
          administratorEmail: administrator.email,
          status: tenant.status,
          hasLogo: tenant.logoKey !== null,
        },
        meta,
      },
      manager,
    );

    return { tenant, administrator, issued };
  }

  private async announceCreation(
    { tenant, administrator, issued }: CreatedClient,
    actor: AuthPrincipal,
  ): Promise<ClientCreatedView> {
    this.eventBus.emit('client.created', {
      tenantId: tenant.id,
      clientName: tenant.name,
      adminEmail: administrator.email,
      createdByUserId: actor.userId,
      occurredAt: new Date(),
    });

    const invitation = await this.deliver(issued, tenant, administrator.email);
    const client = await this.queries.summaryOf(tenant);
    return { client, invitation };
  }

  private async deliver(
    issued: IssuedInvitation,
    tenant: Tenant,
    email: string,
  ): Promise<InvitationDeliveryView> {
    const deliveryStatus = await this.invitations.dispatch({
      ...issued,
      tenantId: tenant.id,
      clientName: tenant.name,
      email,
    });
    return { email, deliveryStatus, expiresAt: issued.invitation.expiresAt };
  }

  /** Si la transacción falla, el logo recién subido no debe quedar huérfano. */
  private async withLogoRollback<T>(
    tenantId: string,
    uploadedKey: string | null,
    operation: () => Promise<T>,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      await this.logos.removeQuietly(tenantId, uploadedKey);
      if (isUniqueViolation(error, TENANT_TAX_ID_UNIQUE)) {
        throw duplicateTaxIdError();
      }
      throw error;
    }
  }

  private normalizeTaxId(raw: string): string {
    const nit = parseNit(raw);
    if (!nit.valid) throw new BadRequestException(nit.reason);
    return nit.normalized;
  }

  /** Validación amigable; la restricción UNIQUE cubre las carreras concurrentes. */
  private async assertTaxIdAvailable(taxId: string): Promise<void> {
    if (await this.tenants.existsBy({ taxId })) {
      throw duplicateTaxIdError(taxId);
    }
  }

  private auditableTenantValues(
    source: Partial<Tenant>,
    changes: Partial<Tenant>,
  ): AuditValues {
    const values: AuditValues = {};
    if ('name' in changes) values.name = source.name;
    if ('taxId' in changes) values.taxId = source.taxId;
    if ('logoKey' in changes) values.hasLogo = Boolean(source.logoKey);
    return values;
  }
}
