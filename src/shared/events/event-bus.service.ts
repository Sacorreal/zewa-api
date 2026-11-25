import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { AppEventName, AppEventPayload } from './contracts/app-event-map';

/** Punto único para emitir eventos y suscribir consumidores. */
@Injectable()
export class EventBusService {
  constructor(private readonly emitter: EventEmitter2) {}

  emit<E extends AppEventName>(event: E, payload: AppEventPayload<E>): void {
    this.emitter.emit(event, payload);
  }

  /**
   * Emite y espera a que terminen todos los consumidores. Úsalo solo cuando el
   * emisor necesita el efecto de los consumidores (p. ej. el resultado de un envío).
   * Los fallos de cada consumidor quedan aislados y no se propagan.
   */
  async emitAndWait<E extends AppEventName>(
    event: E,
    payload: AppEventPayload<E>,
  ): Promise<void> {
    await this.emitter.emitAsync(event, payload);
  }

  subscribe<E extends AppEventName>(
    event: E,
    handler: (payload: AppEventPayload<E>) => unknown,
  ): void {
    this.emitter.on(event, handler);
  }
}
