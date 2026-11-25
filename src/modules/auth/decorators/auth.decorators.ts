import {
  createParamDecorator,
  type ExecutionContext,
  InternalServerErrorException,
  SetMetadata,
} from '@nestjs/common';
import type { AuthScope } from '../auth-scope';
import type {
  AuthenticatedRequest,
  AuthPrincipal,
  TenantContext,
} from '../auth.types';

export { IS_PUBLIC_KEY, Public } from '../../../shared/http/public.decorator';

export const REQUIRED_SCOPES_KEY = 'auth:requiredScopes';

/**
 * Restringe el endpoint a los alcances indicados. Con `tenant`, además se
 * valida en cada petición la membresía y el estado del tenant.
 */
export const RequireScope = (...scopes: AuthScope[]) =>
  SetMetadata(REQUIRED_SCOPES_KEY, scopes);

const requestOf = (context: ExecutionContext): AuthenticatedRequest =>
  context.switchToHttp().getRequest<AuthenticatedRequest>();

export const CurrentPrincipal = createParamDecorator(
  (_: unknown, context: ExecutionContext): AuthPrincipal => {
    const { principal } = requestOf(context);
    if (!principal) {
      throw new InternalServerErrorException(
        '@CurrentPrincipal() requiere un endpoint autenticado.',
      );
    }
    return principal;
  },
);

/** Tenant resuelto desde la membresía; nunca desde datos enviados por el cliente. */
export const CurrentTenant = createParamDecorator(
  (_: unknown, context: ExecutionContext): TenantContext => {
    const { tenantContext } = requestOf(context);
    if (!tenantContext) {
      throw new InternalServerErrorException(
        '@CurrentTenant() requiere @RequireScope(AuthScope.Tenant).',
      );
    }
    return tenantContext;
  },
);
