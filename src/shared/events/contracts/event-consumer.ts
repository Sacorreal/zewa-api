import type { AppEventName } from './app-event-map';
import type { EventChannel } from './event-channel';

/** Consumidor registrado de un evento: quién lo escucha y por qué canal. */
export interface EventConsumer {
  event: AppEventName;
  channel: EventChannel;
  provider: string;
  handler: string;
}
