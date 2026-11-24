export { EventBusModule } from './event-bus.module';
export { EventBusService } from './event-bus.service';
export { EventRegistryService } from './event-registry.service';
export { OnAppEvent } from './decorators/on-app-event.decorator';
export { EVENT_CHANNELS } from './contracts/event-channel';
export type { EventChannel } from './contracts/event-channel';
export type { EventConsumer } from './contracts/event-consumer';
export type {
  AppEventMap,
  AppEventName,
  AppEventPayload,
} from './contracts/app-event-map';
