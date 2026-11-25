import { ForbiddenException } from '@nestjs/common';
import { MembershipRoleName } from '../users/entities/membership-role.entity';
import type { MembershipsService } from '../users/memberships.service';
import { TenantAccessService } from './tenant-access.service';

describe('TenantAccessService', () => {
  const findOperable = jest.fn();
  const service = new TenantAccessService({
    findOperable,
  } as unknown as MembershipsService);

  afterEach(() => findOperable.mockReset());

  it('resuelve el contexto con la membresía activa de un tenant activo', async () => {
    findOperable.mockResolvedValue({
      id: 'membership-1',
      tenantId: 'tenant-1',
      roles: [{ role: MembershipRoleName.Administrador }],
    });

    await expect(service.resolve('user-1', 'tenant-1')).resolves.toEqual({
      tenantId: 'tenant-1',
      membershipId: 'membership-1',
      roles: [MembershipRoleName.Administrador],
    });
  });

  it('bloquea si el tenant está suspendido o la membresía no está activa', async () => {
    // findOperable solo devuelve membresías ACTIVE de tenants ACTIVE.
    findOperable.mockResolvedValue(null);
    await expect(service.resolve('user-1', 'tenant-1')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('bloquea si la sesión no tiene tenant', async () => {
    await expect(service.resolve('user-1', null)).rejects.toThrow(
      ForbiddenException,
    );
    expect(findOperable).not.toHaveBeenCalled();
  });
});
