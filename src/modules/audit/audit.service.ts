import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import type { RequestMeta } from '../../shared/http/request-meta.decorator';
import { AuditAction, AuditEntityType } from './audit-action';
import { AuditLog, type AuditValues } from './entities/audit-log.entity';

export interface AuditEntry {
  actorUserId: string | null;
  tenantId?: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  previousValues?: AuditValues | null;
  newValues?: AuditValues | null;
  meta?: RequestMeta;
}

const DEFAULT_HISTORY_LIMIT = 50;

/**
 * Registro de operaciones sensibles. Nunca recibe contraseñas ni tokens:
 * quien audita decide qué valores son seguros de guardar.
 */
@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogs: Repository<AuditLog>,
  ) {}

  /** Con `manager`, el registro participa en la transacción en curso. */
  async record(entry: AuditEntry, manager?: EntityManager): Promise<void> {
    const repository = manager?.getRepository(AuditLog) ?? this.auditLogs;
    await repository.save(
      repository.create({
        actorUserId: entry.actorUserId,
        tenantId: entry.tenantId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        previousValues: entry.previousValues ?? null,
        newValues: entry.newValues ?? null,
        ipAddress: entry.meta?.ipAddress ?? null,
        userAgent: entry.meta?.userAgent ?? null,
      }),
    );
  }

  findTenantHistory(
    tenantId: string,
    limit = DEFAULT_HISTORY_LIMIT,
  ): Promise<AuditLog[]> {
    return this.auditLogs.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
