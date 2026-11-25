import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule, DatabaseModule } from './shared/config';
import { EventBusModule } from './shared/events';

@Module({
  imports: [AppConfigModule, DatabaseModule, EventBusModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
