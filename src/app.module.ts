import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminClientsModule } from './modules/admin-clients/admin-clients.module';
import { AuthModule } from './modules/auth/auth.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { TenantWorkspaceModule } from './modules/tenant-workspace/tenant-workspace.module';
import { AppConfigModule, DatabaseModule } from './shared/config';
import { EventBusModule } from './shared/events';
import { EmailNotificationsModule } from './shared/notifications';
import { RateLimitModule } from './shared/security/rate-limit';
import { StorageDevModule, StorageModule } from './shared/storage';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    EventBusModule,
    EmailNotificationsModule,
    StorageModule,
    StorageDevModule.forEnvironment(process.env.NODE_ENV),
    RateLimitModule,
    AuthModule,
    InvitationsModule,
    AdminClientsModule,
    TenantWorkspaceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
