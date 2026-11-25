import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule, DatabaseModule } from './shared/config';
import { EventBusModule } from './shared/events';
import { EmailNotificationsModule } from './shared/notifications';
import { StorageDevModule, StorageModule } from './shared/storage';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    EventBusModule,
    EmailNotificationsModule,
    StorageModule,
    StorageDevModule.forEnvironment(process.env.NODE_ENV),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
