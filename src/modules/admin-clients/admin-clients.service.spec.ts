import { ConflictException } from '@nestjs/common';
import { QueryFailedError, type DataSource } from 'typeorm';
import type { EventBusService } from '../../shared/events';
import { AuditAction } from '../audit/audit-action';
import type { AuditService } from '../audit/audit.service';
import { AuthScope } from '../auth/auth-scope';
import type { AuthPrincipal } from '../auth/auth.types';
import { InvitationDeliveryStatus } from '../invitations/entities/invitation.entity';
import type { InvitationsService } from '../invitations/invitations.service';
import {
  type Tenant,
  TENANT_TAX_ID_UNIQUE,
  TenantStatus,
} from '../tenants/entities/tenant.entity';
import { MembershipStatus } from '../users/entities/membership.entity';
import { PlatformRole } from '../users/entities/user.entity';
import type { MembershipsService } from '../users/memberships.service';
import type { UsersService } from '../users/users.service';
import type { AdminClientsQueryService } from './admin-clients-query.service';
import { AdminClientsService } from './admin-clients.service';
import type { ClientLogoStorage } from './client-logo';

const ACTOR: AuthPrincipal = {
  userId: 'superadmin-1',
  email: 'root@zewa.co',
  sessionId: 's1',
  familyId: 'f1',
  scope: AuthScope.Global,
  tenantId: null,
  platformRole: PlatformRole.SuperAdmin,
};
const META = { ipAddress: '10.0.0.1', userAgent: 'jest' };
const DTO = {
  name: 'Conjunto Los Pinos',
  taxId: '900.123.456-8',
  administratorEmail: 'admin@lospinos.co',
};
const LOGO = {
  fileName: 'logo.png',
  body: Buffer.from('png'),
  contentType: 'image/png' as const,
};
const EXPIRES_AT = new Date('2026-12-01T00:00:00Z');

const uniqueViolation = () =>
  new QueryFailedError('INSERT', [], {
    code: '23505',
    constraint: TENANT_TAX_ID_UNIQUE,
  } as unknown as Error);

const tenantWith = (overrides: Partial<Tenant>): Tenant =>
  ({
    id: 'tenant-1',
    name: 'Conjunto Los Pinos',
    taxId: '900123456-8',
    logoKey: null,
    status: TenantStatus.Active,
    activatedAt: new Date('2026-01-01'),
    ...overrides,
  }) as Tenant;

describe('AdminClientsService', () => {
  const repository = {
    create: jest.fn((value: unknown) => value),
    save: jest.fn((value: unknown) => Promise.resolve(value)),
    update: jest.fn(),
  };
  const manager = { getRepository: () => repository };
  const dataSource = {
    transaction: jest.fn<Promise<unknown>, [(m: typeof manager) => unknown]>(
      (work) => Promise.resolve(work(manager)),
    ),
  };
  const tenants = { existsBy: jest.fn() };
  const users = { findOrCreatePending: jest.fn() };
  const memberships = { create: jest.fn(), findByTenantAndRole: jest.fn() };
  const invitations = {
    issue: jest.fn(),
    dispatch: jest.fn(),
    revokePending: jest.fn(),
  };
  const audit = { record: jest.fn() };
  const logos = { upload: jest.fn(), removeQuietly: jest.fn() };
  const queries = {
    findTenantOrFail: jest.fn(),
    summaryOf: jest.fn((tenant: Tenant) =>
      Promise.resolve({ id: tenant.id, status: tenant.status }),
    ),
  };
  const eventBus = { emit: jest.fn() };

  const service = new AdminClientsService(
    tenants as never,
    dataSource as unknown as DataSource,
    users as unknown as UsersService,
    memberships as unknown as MembershipsService,
    invitations as unknown as InvitationsService,
    audit as unknown as AuditService,
    logos as unknown as ClientLogoStorage,
    queries as unknown as AdminClientsQueryService,
    eventBus as unknown as EventBusService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    tenants.existsBy.mockResolvedValue(false);
    users.findOrCreatePending.mockResolvedValue({
      id: 'admin-1',
      email: DTO.administratorEmail,
      platformRole: null,
    });
    memberships.create.mockResolvedValue({ id: 'membership-1' });
    invitations.issue.mockResolvedValue({
      invitation: { id: 'invitation-1', expiresAt: EXPIRES_AT },
      token: 'token-en-claro',
    });
    invitations.dispatch.mockResolvedValue(InvitationDeliveryStatus.Sent);
    logos.upload.mockResolvedValue('tenants/x/branding/logo.png');
  });

  describe('create', () => {
    it('crea tenant, membresía, invitación y auditoría en una transacción y luego envía el correo', async () => {
      const result = await service.create(DTO, undefined, ACTOR, META);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: DTO.name,
          taxId: '900123456-8',
          logoKey: null,
          status: TenantStatus.PendingActivation,
          createdById: ACTOR.userId,
        }),
      );
      expect(memberships.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'admin-1', role: 'ADMINISTRADOR' }),
        manager,
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.ClientCreated }),
        manager,
      );
      expect(eventBus.emit).toHaveBeenCalledWith(
        'client.created',
        expect.objectContaining({ clientName: DTO.name }),
      );
      expect(invitations.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ email: DTO.administratorEmail }),
      );
      expect(result.invitation).toEqual({
        email: DTO.administratorEmail,
        deliveryStatus: InvitationDeliveryStatus.Sent,
        expiresAt: EXPIRES_AT,
      });
    });

    it('sin logo no toca el storage (logo opcional)', async () => {
      await service.create(DTO, undefined, ACTOR, META);
      expect(logos.upload).not.toHaveBeenCalled();
    });

    it('rechaza un NIT ya registrado antes de subir archivos', async () => {
      tenants.existsBy.mockResolvedValue(true);

      await expect(service.create(DTO, LOGO, ACTOR, META)).rejects.toThrow(
        new ConflictException(
          'Ya existe un cliente registrado con el NIT 900123456-8.',
        ),
      );
      expect(logos.upload).not.toHaveBeenCalled();
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('ante una carrera por el mismo NIT responde 409 y elimina el logo subido', async () => {
      dataSource.transaction.mockRejectedValueOnce(uniqueViolation());

      await expect(service.create(DTO, LOGO, ACTOR, META)).rejects.toThrow(
        ConflictException,
      );
      expect(logos.removeQuietly).toHaveBeenCalledWith(
        expect.any(String),
        'tenants/x/branding/logo.png',
      );
      expect(invitations.dispatch).not.toHaveBeenCalled();
    });

    it('si el correo falla, el cliente queda creado con la invitación FAILED', async () => {
      invitations.dispatch.mockResolvedValue(InvitationDeliveryStatus.Failed);

      const result = await service.create(DTO, undefined, ACTOR, META);

      expect(result.invitation.deliveryStatus).toBe(
        InvitationDeliveryStatus.Failed,
      );
    });

    it('no asigna como administrador a un superadministrador', async () => {
      users.findOrCreatePending.mockResolvedValue({
        id: 'root',
        email: DTO.administratorEmail,
        platformRole: PlatformRole.SuperAdmin,
      });

      await expect(service.create(DTO, undefined, ACTOR, META)).rejects.toThrow(
        ConflictException,
      );
      expect(invitations.dispatch).not.toHaveBeenCalled();
    });
  });

  describe('changeStatus', () => {
    it('suspende un cliente activo y lo audita', async () => {
      queries.findTenantOrFail.mockResolvedValue(tenantWith({}));

      const result = await service.changeStatus(
        'tenant-1',
        { status: TenantStatus.Suspended },
        ACTOR,
        META,
      );

      expect(repository.update).toHaveBeenCalledWith('tenant-1', {
        status: TenantStatus.Suspended,
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.ClientSuspended,
          previousValues: { status: TenantStatus.Active },
          newValues: { status: TenantStatus.Suspended },
        }),
        manager,
      );
      expect(result.status).toBe(TenantStatus.Suspended);
    });

    it('no suspende dos veces', async () => {
      queries.findTenantOrFail.mockResolvedValue(
        tenantWith({ status: TenantStatus.Suspended }),
      );
      await expect(
        service.changeStatus(
          'tenant-1',
          { status: TenantStatus.Suspended },
          ACTOR,
          META,
        ),
      ).rejects.toThrow('El cliente ya está suspendido.');
    });

    it('reactivar restablece ACTIVE si el administrador ya había activado', async () => {
      queries.findTenantOrFail.mockResolvedValue(
        tenantWith({ status: TenantStatus.Suspended }),
      );
      const result = await service.changeStatus(
        'tenant-1',
        { status: TenantStatus.Active },
        ACTOR,
        META,
      );
      expect(result.status).toBe(TenantStatus.Active);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.ClientReactivated }),
        manager,
      );
    });

    it('reactivar vuelve a PENDING_ACTIVATION si nunca se activó', async () => {
      queries.findTenantOrFail.mockResolvedValue(
        tenantWith({ status: TenantStatus.Suspended, activatedAt: null }),
      );
      const result = await service.changeStatus(
        'tenant-1',
        { status: TenantStatus.Active },
        ACTOR,
        META,
      );
      expect(result.status).toBe(TenantStatus.PendingActivation);
    });

    it('solo se reactiva un cliente suspendido', async () => {
      queries.findTenantOrFail.mockResolvedValue(tenantWith({}));
      await expect(
        service.changeStatus(
          'tenant-1',
          { status: TenantStatus.Active },
          ACTOR,
          META,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('resendInvitation', () => {
    it('revoca la invitación anterior, emite una nueva y la envía', async () => {
      queries.findTenantOrFail.mockResolvedValue(
        tenantWith({ status: TenantStatus.PendingActivation }),
      );
      memberships.findByTenantAndRole.mockResolvedValue([
        {
          id: 'membership-1',
          userId: 'admin-1',
          status: MembershipStatus.Pending,
          user: { email: DTO.administratorEmail },
        },
      ]);

      const result = await service.resendInvitation('tenant-1', ACTOR, META);

      expect(invitations.revokePending).toHaveBeenCalledWith(
        'membership-1',
        manager,
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.InvitationResent }),
        manager,
      );
      expect(result.deliveryStatus).toBe(InvitationDeliveryStatus.Sent);
    });

    it('no reenvía si el administrador ya activó su cuenta', async () => {
      queries.findTenantOrFail.mockResolvedValue(tenantWith({}));
      memberships.findByTenantAndRole.mockResolvedValue([
        {
          id: 'membership-1',
          status: MembershipStatus.Active,
          user: { email: DTO.administratorEmail },
        },
      ]);

      await expect(
        service.resendInvitation('tenant-1', ACTOR, META),
      ).rejects.toThrow('El administrador ya activó su cuenta.');
    });

    it('no reenvía a un cliente suspendido', async () => {
      queries.findTenantOrFail.mockResolvedValue(
        tenantWith({ status: TenantStatus.Suspended }),
      );
      await expect(
        service.resendInvitation('tenant-1', ACTOR, META),
      ).rejects.toThrow(ConflictException);
    });
  });
});
