import type { AppEventName, AppEventPayload } from '../contracts/app-event-map';
import type { EventChannel } from '../contracts/event-channel';

export const ON_APP_EVENT_METADATA = Symbol('ON_APP_EVENT_METADATA');

export interface OnAppEventMetadata {
  event: AppEventName;
  channel: EventChannel;
}

type AppEventHandler<E extends AppEventName> = (
  payload: AppEventPayload<E>,
) => unknown;

/**
 * Marca un método de un provider como consumidor de un evento.
 * El tipo del parámetro del método se valida contra el payload del evento.
 *
 * @example
 * @OnAppEvent('invitation.created', { channel: 'email' })
 * async sendInvitation(payload: AppEventPayload<'invitation.created'>) {}
 */
export function OnAppEvent<E extends AppEventName>(
  event: E,
  options: { channel: EventChannel },
) {
  return (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<AppEventHandler<E>>,
  ): void => {
    const metadata: OnAppEventMetadata = { event, channel: options.channel };
    Reflect.defineMetadata(ON_APP_EVENT_METADATA, metadata, descriptor.value!);
  };
}
