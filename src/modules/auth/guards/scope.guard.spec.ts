import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MembershipRoleName } from '../../users/entities/membership-role.entity';
import { PlatformRole } from '../../users/entities/user.entity';
import { AuthScope } from '../auth-scope';
import type { AuthenticatedRequest, AuthPrincipal } from '../auth.types';
import { RequireScope } from '../decorators/auth.decorators';
import type { TenantAccessService } from '../tenant-access.service';
import { ScopeGuard } from './scope.guard';

const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';

class Endpoints {
  @RequireScope(AuthScope.Global)
  admin() {}

  @RequireScope(AuthScope.Tenant)
  operational() {}

  open() {}
}

const principal = (overrides: Partial<AuthPrincipal>): AuthPrincipal => ({
  userId: 'user-1',
  email: 'user@zewa.co',
  sessionId: 'session-1',
  familyId: 'family-1',
  scope: AuthScope.Account,
  tenantId: null,
  platformRole: null,
  ...overrides,
});

const superAdmin = principal({
  scope: AuthScope.Global,
  platformRole: PlatformRole.SuperAdmin,
});
const administratorOfA = principal({
  scope: AuthScope.Tenant,
  tenantId: TENANT_A,
});

function contextFor(
  handler: keyof Endpoints,
  request: AuthenticatedRequest,
): ExecutionContext {
  return {
    // Solo se usa como clave de metadatos, nunca se invoca.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    getHandler: () => Endpoints.prototype[handler],
    getClass: () => Endpoints,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('ScopeGuard', () => {
  let resolve: jest.Mock;
  let guard: ScopeGuard;

  beforeEach(() => {
    // Solo la membresía del usuario en el tenant A está activa.
    resolve = jest.fn((userId: string, tenantId: string | null) =>
      tenantId === TENANT_A
        ? Promise.resolve({
            tenantId,
            membershipId: 'membership-a',
            roles: [MembershipRoleName.Administrador],
          })
        : Promise.reject(new ForbiddenException()),
    );
    guard = new ScopeGuard(new Reflector(), {
      resolve,
    } as unknown as TenantAccessService);
  });

  const run = (handler: keyof Endpoints, who?: AuthPrincipal) => {
    const request = { principal: who } as AuthenticatedRequest;
    return guard
      .canActivate(contextFor(handler, request))
      .then((allowed) => ({ allowed, request }));
  };

  describe('SUPERADMIN', () => {
    it('accede a los endpoints globales', async () => {
      await expect(run('admin', superAdmin)).resolves.toMatchObject({
        allowed: true,
      });
    });

    it('no opera endpoints de tenant con su token global', async () => {
      await expect(run('operational', superAdmin)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('un alcance global sin el rol SUPERADMIN vigente se rechaza', async () => {
      await expect(
        run('admin', { ...superAdmin, platformRole: null }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('ADMINISTRADOR', () => {
    it('no puede usar su token de tenant en endpoints globales', async () => {
      await expect(run('admin', administratorOfA)).rejects.toThrow(
        ForbiddenException,
      );
      expect(resolve).not.toHaveBeenCalled();
    });

    it('un token de cuenta (sin tenant elegido) no accede a la operación', async () => {
      await expect(
        run('operational', principal({ scope: AuthScope.Account })),
      ).rejects.toThrow(ForbiddenException);
    });

    it('opera en su tenant con el contexto resuelto desde la membresía', async () => {
      const { allowed, request } = await run('operational', administratorOfA);
      expect(allowed).toBe(true);
      expect(resolve).toHaveBeenCalledWith('user-1', TENANT_A);
      expect(request.tenantContext).toEqual({
        tenantId: TENANT_A,
        membershipId: 'membership-a',
        roles: [MembershipRoleName.Administrador],
      });
    });
  });

  describe('aislamiento multi-tenant', () => {
    it('rechaza un token de tenant B si el usuario no tiene membresía activa allí', async () => {
      await expect(
        run('operational', { ...administratorOfA, tenantId: TENANT_B }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  it('los endpoints sin alcance declarado solo exigen autenticación', async () => {
    await expect(run('open', administratorOfA)).resolves.toMatchObject({
      allowed: true,
    });
  });
});
