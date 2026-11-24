import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventBusModule } from './shared/events';

@Module({
  imports: [EventBusModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
