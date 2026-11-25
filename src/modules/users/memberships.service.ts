import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { TenantStatus } from '../tenants/entities/tenant.entity';
import {
  MembershipRole,
  MembershipRoleName,
} from './entities/membership-role.entity';
import { Membership, MembershipStatus } from './entities/membership.entity';

@Injectable()
export class MembershipsService {
  constructor(
    @InjectRepository(Membership)
    private readonly memberships: Repository<Membership>,
  ) {}

  /** Crea la membresía pendiente con su rol, dentro de la transacción indicada. */
  create(
    params: { userId: string; tenantId: string; role: MembershipRoleName },
    manager: EntityManager,
  ): Promise<Membership> {
    const repository = manager.getRepository(Membership);
    return repository.save(
      repository.create({
        userId: params.userId,
        tenantId: params.tenantId,
        status: MembershipStatus.Pending,
        roles: [
          manager.getRepository(MembershipRole).create({ role: params.role }),
        ],
      }),
    );
  }

  /** Membresías del usuario con su tenant y roles (para elegir dónde operar). */
  findForUser(userId: string): Promise<Membership[]> {
    return this.memberships.find({
      where: { userId },
      relations: { tenant: true, roles: true },
      order: { createdAt: 'ASC' },
    });
  }

  /** Única fuente de autorización operativa: membresía y tenant activos. */
  findOperable(userId: string, tenantId: string): Promise<Membership | null> {
    return this.memberships.findOne({
      where: {
        userId,
        tenantId,
        status: MembershipStatus.Active,
        tenant: { status: TenantStatus.Active },
      },
      relations: { tenant: true, roles: true },
    });
  }

  findByTenantAndRole(
    tenantId: string,
    role: MembershipRoleName,
  ): Promise<Membership[]> {
    return this.memberships.find({
      where: { tenantId, roles: { role } },
      relations: { user: true, roles: true },
      order: { createdAt: 'ASC' },
    });
  }

  findByTenant(tenantId: string): Promise<Membership[]> {
    return this.memberships.find({
      where: { tenantId },
      relations: { user: true, roles: true },
      order: { createdAt: 'ASC' },
    });
  }
}
