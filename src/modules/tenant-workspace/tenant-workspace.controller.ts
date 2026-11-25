import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthScope } from '../auth/auth-scope';
import type { TenantContext } from '../auth/auth.types';
import {
  CurrentTenant,
  RequireScope,
} from '../auth/decorators/auth.decorators';
import { Tenant } from '../tenants/entities/tenant.entity';

/**
 * Punto de entrada operativo de un conjunto. Ilustra el patrón que deben
 * seguir los módulos operativos: el tenant sale de `@CurrentTenant()`
 * (membresía validada en cada petición), nunca de parámetros del cliente.
 */
@RequireScope(AuthScope.Tenant)
@Controller('tenant')
export class TenantWorkspaceController {
  constructor(
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
  ) {}

  @Get('current')
  async current(@CurrentTenant() context: TenantContext) {
    const tenant = await this.tenants.findOneByOrFail({ id: context.tenantId });
    return {
      id: tenant.id,
      name: tenant.name,
      taxId: tenant.taxId,
      status: tenant.status,
      roles: context.roles,
    };
  }
}
