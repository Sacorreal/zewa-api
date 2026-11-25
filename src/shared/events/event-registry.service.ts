import { Injectable } from '@nestjs/common';
import type { AppEventName } from './contracts/app-event-map';
import type { EventChannel } from './contracts/event-channel';
import type { EventConsumer } from './contracts/event-consumer';

/** Catálogo en memoria de los consumidores registrados al arrancar la app. */
@Injectable()
export class EventRegistryService {
  private readonly consumers: EventConsumer[] = [];

  register(consumer: EventConsumer): void {
    this.consumers.push(consumer);
  }

  findAll(): readonly EventConsumer[] {
    return this.consumers;
  }

  findByChannel(channel: EventChannel): EventConsumer[] {
    return this.consumers.filter((consumer) => consumer.channel === channel);
  }

  findByEvent(event: AppEventName): EventConsumer[] {
    return this.consumers.filter((consumer) => consumer.event === event);
  }

  groupByEvent(): Partial<Record<AppEventName, EventConsumer[]>> {
    const groups: Partial<Record<AppEventName, EventConsumer[]>> = {};
    for (const consumer of this.consumers) {
      (groups[consumer.event] ??= []).push(consumer);
    }
    return groups;
  }
}
