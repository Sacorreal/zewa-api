import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { RequestMeta } from '../../shared/http/request-meta.decorator';
import { PasswordHasher } from '../../shared/security/password-hasher';
import { AuditAction, AuditEntityType } from '../audit/audit-action';
import { AuditService } from '../audit/audit.service';
import { MembershipStatus } from '../users/entities/membership.entity';
import { PlatformRole, User, UserStatus } from '../users/entities/user.entity';
import { MembershipsService } from '../users/memberships.service';
import { UsersService } from '../users/users.service';
import { AuthScope } from './auth-scope';
import { AuthSessionsService } from './auth-sessions.service';
import { AUTH_OPTIONS, type AuthOptions } from './auth.config';
import type { AuthPrincipal, IssuedTokens } from './auth.types';
import { TenantAccessService } from './tenant-access.service';

const INVALID_CREDENTIALS_MESSAGE = 'Correo o contraseña incorrectos.';
const LOCKED_MESSAGE =
  'Demasiados intentos fallidos. Intenta de nuevo más tarde.';

export interface SessionUserView {
  id: string;
  email: string;
  platformRole: PlatformRole | null;
}

export interface MembershipView {
  tenantId: string;
  tenantName: string;
  tenantStatus: string;
  membershipStatus: MembershipStatus;
  roles: string[];
}

export interface LoginResult {
  tokens: IssuedTokens;
  user: SessionUserView;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly memberships: MembershipsService,
    private readonly sessions: AuthSessionsService,
    private readonly tenantAccess: TenantAccessService,
    private readonly passwordHasher: PasswordHasher,
    private readonly audit: AuditService,
    @Inject(AUTH_OPTIONS) private readonly options: AuthOptions,
  ) {}

  /**
   * El SUPERADMIN obtiene alcance `global`; el resto, alcance `account`
   * (debe elegir un tenant con `selectTenant` para operar).
   */
  async login(
    email: string,
    password: string,
    meta: RequestMeta,
  ): Promise<LoginResult> {
    const user = await this.users.findByEmail(email);
    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      throw new HttpException(LOCKED_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
    }

    const passwordMatches = await this.passwordHasher.verify(
      password,
      user?.passwordHash,
    );
    if (!user || !passwordMatches || user.status !== UserStatus.Active) {
      await this.handleFailedLogin(user, meta);
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    await this.users.resetFailedLogins(user);
    const scope = this.isSuperAdmin(user)
      ? AuthScope.Global
      : AuthScope.Account;
    if (scope === AuthScope.Global) {
      await this.auditGlobalLogin(AuditAction.LoginSucceeded, user, meta);
    }

    const tokens = await this.sessions.issue({
      userId: user.id,
      scope,
      tenantId: null,
      meta,
    });
    return { tokens, user: this.toUserView(user) };
  }

  refresh(refreshToken: string, meta: RequestMeta): Promise<IssuedTokens> {
    return this.sessions.rotate(refreshToken, meta);
  }

  logout(principal: AuthPrincipal): Promise<void> {
    return this.sessions.revokeFamily(principal.familyId);
  }

  async listMemberships(userId: string): Promise<MembershipView[]> {
    const memberships = await this.memberships.findForUser(userId);
    return memberships.map((membership) => ({
      tenantId: membership.tenantId,
      tenantName: membership.tenant?.name ?? '',
      tenantStatus: membership.tenant?.status ?? '',
      membershipStatus: membership.status,
      roles: (membership.roles ?? []).map(({ role }) => role),
    }));
  }

  /**
   * Abre una sesión de alcance `tenant` tras validar la membresía activa y el
   * tenant activo. La sesión anterior se cierra: se opera en un tenant a la vez.
   */
  async selectTenant(
    principal: AuthPrincipal,
    tenantId: string,
    meta: RequestMeta,
  ): Promise<IssuedTokens> {
    if (principal.scope === AuthScope.Global) {
      throw new ForbiddenException(
        'El superadministrador opera en el contexto global, no en un conjunto.',
      );
    }
    const context = await this.tenantAccess.resolve(principal.userId, tenantId);

    await this.sessions.revokeFamily(principal.familyId);
    return this.sessions.issue({
      userId: principal.userId,
      scope: AuthScope.Tenant,
      tenantId: context.tenantId,
      meta,
    });
  }

  toPrincipalView(principal: AuthPrincipal) {
    return {
      user: {
        id: principal.userId,
        email: principal.email,
        platformRole: principal.platformRole,
      },
      scope: principal.scope,
      tenantId: principal.tenantId,
    };
  }

  private async handleFailedLogin(
    user: User | null,
    meta: RequestMeta,
  ): Promise<void> {
    if (!user) return;
    await this.users.registerFailedLogin(
      user,
      this.options.maxFailedLogins,
      this.options.lockoutMinutes,
    );
    if (this.isSuperAdmin(user)) {
      await this.auditGlobalLogin(AuditAction.LoginFailed, user, meta);
    }
  }

  private auditGlobalLogin(
    action: AuditAction,
    user: User,
    meta: RequestMeta,
  ): Promise<void> {
    return this.audit.record({
      actorUserId: user.id,
      action,
      entityType: AuditEntityType.User,
      entityId: user.id,
      meta,
    });
  }

  private isSuperAdmin(user: User): boolean {
    return user.platformRole === PlatformRole.SuperAdmin;
  }

  private toUserView(user: User): SessionUserView {
    return { id: user.id, email: user.email, platformRole: user.platformRole };
  }
}
