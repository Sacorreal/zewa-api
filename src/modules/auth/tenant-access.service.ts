import { ForbiddenException, Injectable } from '@nestjs/common';
import { MembershipsService } from '../users/memberships.service';
import type { TenantContext } from './auth.types';

const NO_ACCESS_MESSAGE =
  'No tienes acceso a este conjunto o se encuentra suspendido.';

/** Resuelve el tenant de operación exclusivamente desde la membresía del usuario. */
@Injectable()
export class TenantAccessService {
  constructor(private readonly memberships: MembershipsService) {}

  async resolve(
    userId: string,
    tenantId: string | null,
  ): Promise<TenantContext> {
    if (!tenantId) throw new ForbiddenException(NO_ACCESS_MESSAGE);

    const membership = await this.memberships.findOperable(userId, tenantId);
    if (!membership) throw new ForbiddenException(NO_ACCESS_MESSAGE);

    return {
      tenantId: membership.tenantId,
      membershipId: membership.id,
      roles: (membership.roles ?? []).map(({ role }) => role),
    };
  }
}
