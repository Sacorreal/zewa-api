import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { InvitationsModule } from '../invitations/invitations.module';
import { Tenant } from '../tenants/entities/tenant.entity';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { AdminClientsQueryService } from './admin-clients-query.service';
import { AdminClientsController } from './admin-clients.controller';
import { AdminClientsService } from './admin-clients.service';
import { ClientLogoStorage, LogoFilePipe } from './client-logo';

/** Administración global de clientes (conjuntos residenciales). */
@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, User]),
    UsersModule,
    InvitationsModule,
    AuditModule,
  ],
  controllers: [AdminClientsController],
  providers: [
    AdminClientsService,
    AdminClientsQueryService,
    ClientLogoStorage,
    LogoFilePipe,
  ],
})
export class AdminClientsModule {}
