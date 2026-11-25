import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlatformRole } from '../../users/entities/user.entity';
import { AuthScope } from '../auth-scope';
import type { AuthenticatedRequest, AuthPrincipal } from '../auth.types';
import { REQUIRED_SCOPES_KEY } from '../decorators/auth.decorators';
import { TenantAccessService } from '../tenant-access.service';

/**
 * Autorización por alcance. Un token de tenant nunca sirve para endpoints
 * globales y viceversa; con alcance `tenant` resuelve el contexto del tenant
 * a partir de la membresía en cada petición.
 */
@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredScopes = this.reflector.getAllAndOverride<
      AuthScope[] | undefined
    >(REQUIRED_SCOPES_KEY, [context.getHandler(), context.getClass()]);
    if (!requiredScopes?.length) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { principal } = request;
    if (!principal || !requiredScopes.includes(principal.scope)) {
      throw new ForbiddenException('No tienes permiso para esta operación.');
    }

    this.assertGlobalScopeIntegrity(principal);

    if (principal.scope === AuthScope.Tenant) {
      request.tenantContext = await this.tenantAccess.resolve(
        principal.userId,
        principal.tenantId,
      );
    }
    return true;
  }

  /** Defensa en profundidad: el alcance global exige el rol SUPERADMIN vigente. */
  private assertGlobalScopeIntegrity(principal: AuthPrincipal): void {
    if (
      principal.scope === AuthScope.Global &&
      principal.platformRole !== PlatformRole.SuperAdmin
    ) {
      throw new ForbiddenException('No tienes permiso para esta operación.');
    }
  }
}
