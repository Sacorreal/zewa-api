import { Column, Index } from 'typeorm';

/**
 * Base de toda entidad operativa de un conjunto residencial.
 *
 * El `tenantId` se asigna siempre desde el contexto resuelto en el backend
 * (`@CurrentTenant()`), nunca desde el cuerpo de la petición. La columna
 * `tenant_id` permite activar más adelante Row Level Security en PostgreSQL
 * (`USING (tenant_id = current_setting('app.tenant_id')::uuid)`).
 */
export abstract class TenantScopedEntity {
  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;
}
