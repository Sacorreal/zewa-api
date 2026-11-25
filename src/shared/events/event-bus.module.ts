import { Global, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventBusService } from './event-bus.service';
import { EventListenerLoader } from './event-listener.loader';
import { EventRegistryService } from './event-registry.service';

@Global()
@Module({
  imports: [EventEmitterModule.forRoot(), DiscoveryModule],
  providers: [EventBusService, EventRegistryService, EventListenerLoader],
  exports: [EventBusService, EventRegistryService],
})
export class EventBusModule {}
