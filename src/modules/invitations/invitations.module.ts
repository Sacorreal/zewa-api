import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityModule } from '../../shared/security/security.module';
import { AuditModule } from '../audit/audit.module';
import { Invitation } from './entities/invitation.entity';
import { InvitationDeliveryListener } from './invitation-delivery.listener';
import {
  buildInvitationOptions,
  INVITATION_OPTIONS,
  type InvitationOptions,
} from './invitations.config';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invitation]),
    AuditModule,
    SecurityModule,
  ],
  controllers: [InvitationsController],
  providers: [
    {
      provide: INVITATION_OPTIONS,
      inject: [ConfigService],
      useFactory: (config: ConfigService): InvitationOptions =>
        buildInvitationOptions((key) => config.get<unknown>(key)),
    },
    InvitationsService,
    InvitationDeliveryListener,
  ],
  exports: [InvitationsService],
})
export class InvitationsModule {}
