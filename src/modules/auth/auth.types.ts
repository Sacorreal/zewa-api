import type { Request } from 'express';
import type { MembershipRoleName } from '../users/entities/membership-role.entity';
import type { PlatformRole } from '../users/entities/user.entity';
import type { AuthScope } from './auth-scope';

/** Claims del access token. `tid` solo existe con alcance `tenant`. */
export interface AccessTokenClaims {
  sub: string;
  sid: string;
  fid: string;
  scope: AuthScope;
  tid?: string;
}

/** Identidad autenticada de la petición, resuelta por `AccessTokenGuard`. */
export interface AuthPrincipal {
  userId: string;
  email: string;
  sessionId: string;
  familyId: string;
  scope: AuthScope;
  tenantId: string | null;
  platformRole: PlatformRole | null;
}

/** Tenant en el que opera la petición, validado contra la membresía. */
export interface TenantContext {
  tenantId: string;
  membershipId: string;
  roles: MembershipRoleName[];
}

export interface AuthenticatedRequest extends Request {
  principal?: AuthPrincipal;
  tenantContext?: TenantContext;
}

export interface IssuedTokens {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  scope: AuthScope;
}
