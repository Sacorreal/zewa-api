import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { nitSearchDigits } from '../../utils/nit';
import { AuditService } from '../audit/audit.service';
import type { Invitation } from '../invitations/entities/invitation.entity';
import { unusableReason } from '../invitations/invitation-rules';
import { InvitationsService } from '../invitations/invitations.service';
import { Tenant, TenantStatus } from '../tenants/entities/tenant.entity';
import { MembershipRoleName } from '../users/entities/membership-role.entity';
import type { Membership } from '../users/entities/membership.entity';
import { User } from '../users/entities/user.entity';
import { MembershipsService } from '../users/memberships.service';
import type {
  AuditEntryView,
  ClientDetailView,
  ClientListView,
  ClientStatsView,
  ClientSummaryView,
  InvitationState,
  InvitationView,
} from './admin-clients.views';
import { ClientLogoStorage } from './client-logo';
import type { ListClientsQueryDto } from './dto/client.dto';

const escapeLike = (value: string): string => value.replace(/[\\%_]/g, '\\$&');

/** Lecturas del panel global (listado, indicadores y detalle). */
@Injectable()
export class AdminClientsQueryService {
  constructor(
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly memberships: MembershipsService,
    private readonly invitations: InvitationsService,
    private readonly audit: AuditService,
    private readonly logos: ClientLogoStorage,
  ) {}

  async list(query: ListClientsQueryDto): Promise<ClientListView> {
    const builder = this.tenants.createQueryBuilder('tenant');

    if (query.status) {
      builder.andWhere('tenant.status = :status', { status: query.status });
    }
    if (query.search) {
      const digits = nitSearchDigits(query.search);
      builder.andWhere(
        digits
          ? "(tenant.name ILIKE :name OR regexp_replace(tenant.tax_id, '\\D', '', 'g') LIKE :digits)"
          : 'tenant.name ILIKE :name',
        { name: `%${escapeLike(query.search)}%`, digits: `%${digits}%` },
      );
    }

    const [, direction] = query.sort.split(':');
    const [tenants, total] = await builder
      .orderBy('tenant.created_at', direction === 'asc' ? 'ASC' : 'DESC')
      .addOrderBy('tenant.id', 'ASC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();

    const adminEmails = await this.findAdministratorEmails(tenants);
    const items = await Promise.all(
      tenants.map((tenant) =>
        this.toSummary(tenant, adminEmails.get(tenant.id) ?? null),
      ),
    );
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async stats(): Promise<ClientStatsView> {
    const rows = await this.tenants
      .createQueryBuilder('tenant')
      .select('tenant.status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .groupBy('tenant.status')
      .getRawMany<{ status: TenantStatus; count: number }>();

    const countOf = (status: TenantStatus) =>
      rows.find((row) => row.status === status)?.count ?? 0;

    return {
      total: rows.reduce((sum, row) => sum + row.count, 0),
      active: countOf(TenantStatus.Active),
      pendingActivation: countOf(TenantStatus.PendingActivation),
      suspended: countOf(TenantStatus.Suspended),
    };
  }

  async detail(id: string): Promise<ClientDetailView> {
    const tenant = await this.findTenantOrFail(id);
    const memberships = await this.memberships.findByTenant(tenant.id);
    const administrator = this.findAdministrator(memberships);
    const [invitation, history] = await Promise.all([
      administrator
        ? this.invitations.findLatestForMembership(administrator.id)
        : null,
      this.history(tenant.id),
    ]);

    return {
      ...(await this.toSummary(tenant, administrator?.user?.email ?? null)),
      activatedAt: tenant.activatedAt,
      updatedAt: tenant.updatedAt,
      memberships: memberships.map((membership) => ({
        id: membership.id,
        email: membership.user?.email ?? '',
        status: membership.status,
        roles: (membership.roles ?? []).map(({ role }) => role),
        createdAt: membership.createdAt,
        activatedAt: membership.activatedAt,
      })),
      invitation: invitation ? this.toInvitationView(invitation) : null,
      history,
    };
  }

  async findTenantOrFail(id: string): Promise<Tenant> {
    const tenant = await this.tenants.findOneBy({ id });
    if (!tenant) throw new NotFoundException('El cliente no existe.');
    return tenant;
  }

  async summaryOf(tenant: Tenant): Promise<ClientSummaryView> {
    const administrators = await this.memberships.findByTenantAndRole(
      tenant.id,
      MembershipRoleName.Administrador,
    );
    return this.toSummary(tenant, administrators[0]?.user?.email ?? null);
  }

  private async toSummary(
    tenant: Tenant,
    administratorEmail: string | null,
  ): Promise<ClientSummaryView> {
    return {
      id: tenant.id,
      name: tenant.name,
      taxId: tenant.taxId,
      logoUrl: await this.logos.urlFor(tenant.id, tenant.logoKey),
      administratorEmail,
      status: tenant.status,
      createdAt: tenant.createdAt,
    };
  }

  /** Un único query para los administradores de toda la página. */
  private async findAdministratorEmails(
    tenants: Tenant[],
  ): Promise<Map<string, string>> {
    if (tenants.length === 0) return new Map();

    const rows = await this.users
      .createQueryBuilder('user')
      .innerJoin('memberships', 'membership', 'membership.user_id = user.id')
      .innerJoin(
        'membership_roles',
        'role',
        'role.membership_id = membership.id AND role.role = :role',
        { role: MembershipRoleName.Administrador },
      )
      .select('membership.tenant_id', 'tenantId')
      .addSelect('user.email', 'email')
      .where('membership.tenant_id IN (:...ids)', {
        ids: tenants.map(({ id }) => id),
      })
      .orderBy('membership.created_at', 'ASC')
      .getRawMany<{ tenantId: string; email: string }>();

    const emails = new Map<string, string>();
    for (const { tenantId, email } of rows) {
      if (!emails.has(tenantId)) emails.set(tenantId, email);
    }
    return emails;
  }

  private findAdministrator(memberships: Membership[]): Membership | undefined {
    return memberships.find((membership) =>
      membership.roles?.some(
        ({ role }) => role === MembershipRoleName.Administrador,
      ),
    );
  }

  private toInvitationView(invitation: Invitation): InvitationView {
    const state: InvitationState = unusableReason(invitation) ?? 'PENDING';
    return {
      state,
      deliveryStatus: invitation.deliveryStatus,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
      lastSentAt: invitation.lastSentAt,
      createdAt: invitation.createdAt,
    };
  }

  private async history(tenantId: string): Promise<AuditEntryView[]> {
    const entries = await this.audit.findTenantHistory(tenantId);
    const actorIds = [
      ...new Set(
        entries.flatMap(({ actorUserId }) =>
          actorUserId ? [actorUserId] : [],
        ),
      ),
    ];
    const actors = actorIds.length
      ? await this.users.findBy({ id: In(actorIds) })
      : [];
    const emailById = new Map(actors.map(({ id, email }) => [id, email]));

    return entries.map((entry) => ({
      id: entry.id,
      action: entry.action,
      actorEmail: entry.actorUserId
        ? (emailById.get(entry.actorUserId) ?? null)
        : null,
      previousValues: entry.previousValues,
      newValues: entry.newValues,
      createdAt: entry.createdAt,
    }));
  }
}
