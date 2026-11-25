import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { PasswordHasher } from '../../shared/security/password-hasher';
import { AuditAction } from '../audit/audit-action';
import type { AuditService } from '../audit/audit.service';
import {
  PlatformRole,
  type User,
  UserStatus,
} from '../users/entities/user.entity';
import type { MembershipsService } from '../users/memberships.service';
import type { UsersService } from '../users/users.service';
import { AuthScope } from './auth-scope';
import type { AuthSessionsService } from './auth-sessions.service';
import type { AuthOptions } from './auth.config';
import { AuthService } from './auth.service';
import type { AuthPrincipal } from './auth.types';
import type { TenantAccessService } from './tenant-access.service';

const META = { ipAddress: '10.0.0.1', userAgent: 'jest' };
const OPTIONS: AuthOptions = {
  accessTokenSecret: 'x'.repeat(32),
  accessTokenTtlSeconds: 900,
  refreshTokenTtlSeconds: 3600,
  maxFailedLogins: 5,
  lockoutMinutes: 15,
};
const TOKENS = { accessToken: 'jwt', refreshToken: 'opaque' };

const userWith = (overrides: Partial<User>): User =>
  ({
    id: 'user-1',
    email: 'admin@zewa.co',
    passwordHash: '$argon2id$hash',
    status: UserStatus.Active,
    platformRole: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    ...overrides,
  }) as User;

describe('AuthService', () => {
  const users = {
    findByEmail: jest.fn(),
    registerFailedLogin: jest.fn(),
    resetFailedLogins: jest.fn(),
  };
  const sessions = { issue: jest.fn(), revokeFamily: jest.fn() };
  const tenantAccess = { resolve: jest.fn() };
  const hasher = { verify: jest.fn() };
  const audit = { record: jest.fn() };

  const service = new AuthService(
    users as unknown as UsersService,
    {} as MembershipsService,
    sessions as unknown as AuthSessionsService,
    tenantAccess as unknown as TenantAccessService,
    hasher as unknown as PasswordHasher,
    audit as unknown as AuditService,
    OPTIONS,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    sessions.issue.mockResolvedValue(TOKENS);
  });

  describe('login', () => {
    it('el SUPERADMIN recibe alcance global y queda auditado', async () => {
      users.findByEmail.mockResolvedValue(
        userWith({ platformRole: PlatformRole.SuperAdmin }),
      );
      hasher.verify.mockResolvedValue(true);

      const result = await service.login('admin@zewa.co', 'secreta', META);

      expect(sessions.issue).toHaveBeenCalledWith({
        userId: 'user-1',
        scope: AuthScope.Global,
        tenantId: null,
        meta: META,
      });
      expect(result.user.platformRole).toBe(PlatformRole.SuperAdmin);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.LoginSucceeded }),
      );
    });

    it('un ADMINISTRADOR recibe alcance de cuenta, nunca global', async () => {
      users.findByEmail.mockResolvedValue(userWith({}));
      hasher.verify.mockResolvedValue(true);

      await service.login('admin@zewa.co', 'secreta', META);

      expect(sessions.issue).toHaveBeenCalledWith(
        expect.objectContaining({ scope: AuthScope.Account }),
      );
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('contraseña incorrecta: mensaje genérico y se cuenta el intento', async () => {
      const user = userWith({});
      users.findByEmail.mockResolvedValue(user);
      hasher.verify.mockResolvedValue(false);

      await expect(
        service.login('admin@zewa.co', 'mala', META),
      ).rejects.toThrow(
        new UnauthorizedException('Correo o contraseña incorrectos.'),
      );
      expect(users.registerFailedLogin).toHaveBeenCalledWith(user, 5, 15);
      expect(sessions.issue).not.toHaveBeenCalled();
    });

    it('correo inexistente: mismo mensaje y se verifica igual (tiempo constante)', async () => {
      users.findByEmail.mockResolvedValue(null);
      hasher.verify.mockResolvedValue(false);

      await expect(service.login('nadie@zewa.co', 'x', META)).rejects.toThrow(
        'Correo o contraseña incorrectos.',
      );
      expect(hasher.verify).toHaveBeenCalledWith('x', undefined);
    });

    it('una cuenta pendiente de activación no puede iniciar sesión', async () => {
      users.findByEmail.mockResolvedValue(
        userWith({ status: UserStatus.PendingActivation, passwordHash: null }),
      );
      hasher.verify.mockResolvedValue(false);

      await expect(service.login('admin@zewa.co', 'x', META)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('una cuenta bloqueada responde 429 sin verificar la contraseña', async () => {
      users.findByEmail.mockResolvedValue(
        userWith({ lockedUntil: new Date(Date.now() + 60_000) }),
      );

      const error = await service
        .login('admin@zewa.co', 'secreta', META)
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
      expect(hasher.verify).not.toHaveBeenCalled();
    });
  });

  describe('selectTenant', () => {
    const accountPrincipal: AuthPrincipal = {
      userId: 'user-1',
      email: 'admin@zewa.co',
      sessionId: 's1',
      familyId: 'f1',
      scope: AuthScope.Account,
      tenantId: null,
      platformRole: null,
    };

    it('emite una sesión de tenant solo tras validar la membresía', async () => {
      tenantAccess.resolve.mockResolvedValue({
        tenantId: 'tenant-a',
        membershipId: 'm1',
        roles: [],
      });

      await service.selectTenant(accountPrincipal, 'tenant-a', META);

      expect(tenantAccess.resolve).toHaveBeenCalledWith('user-1', 'tenant-a');
      expect(sessions.revokeFamily).toHaveBeenCalledWith('f1');
      expect(sessions.issue).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: AuthScope.Tenant,
          tenantId: 'tenant-a',
        }),
      );
    });

    it('un tenant sin membresía activa se rechaza sin emitir sesión', async () => {
      tenantAccess.resolve.mockRejectedValue(new ForbiddenException());

      await expect(
        service.selectTenant(accountPrincipal, 'tenant-b', META),
      ).rejects.toThrow(ForbiddenException);
      expect(sessions.issue).not.toHaveBeenCalled();
      expect(sessions.revokeFamily).not.toHaveBeenCalled();
    });

    it('el SUPERADMIN no entra a un tenant con su sesión global', async () => {
      await expect(
        service.selectTenant(
          {
            ...accountPrincipal,
            scope: AuthScope.Global,
            platformRole: PlatformRole.SuperAdmin,
          },
          'tenant-a',
          META,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
