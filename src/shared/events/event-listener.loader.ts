import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import type { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import {
  ON_APP_EVENT_METADATA,
  type OnAppEventMetadata,
} from './decorators/on-app-event.decorator';
import { EventBusService } from './event-bus.service';
import { EventRegistryService } from './event-registry.service';

type ProviderInstance = Record<string, (payload: unknown) => unknown>;

/**
 * Al arrancar, descubre los métodos marcados con `@OnAppEvent`,
 * los suscribe al bus y los registra en el catálogo de consumidores.
 */
@Injectable()
export class EventListenerLoader implements OnApplicationBootstrap {
  private readonly logger = new Logger(EventListenerLoader.name);

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly scanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly eventBus: EventBusService,
    private readonly registry: EventRegistryService,
  ) {}

  onApplicationBootstrap(): void {
    this.discovery
      .getProviders()
      .filter((wrapper) => this.isStaticInstance(wrapper))
      .forEach((wrapper) => this.loadListenersOf(wrapper));
  }

  private isStaticInstance(wrapper: InstanceWrapper): boolean {
    return (
      typeof wrapper.instance === 'object' &&
      wrapper.instance !== null &&
      wrapper.isDependencyTreeStatic()
    );
  }

  private loadListenersOf(wrapper: InstanceWrapper): void {
    const instance = wrapper.instance as ProviderInstance;
    const prototype = Object.getPrototypeOf(instance) as object;

    for (const methodName of this.scanner.getAllMethodNames(prototype)) {
      const metadata = this.reflector.get<OnAppEventMetadata | undefined>(
        ON_APP_EVENT_METADATA,
        instance[methodName],
      );
      if (metadata)
        this.subscribe(String(wrapper.name), instance, methodName, metadata);
    }
  }

  private subscribe(
    providerName: string,
    instance: ProviderInstance,
    methodName: string,
    { event, channel }: OnAppEventMetadata,
  ): void {
    const handlerId = `${providerName}.${methodName}`;

    this.eventBus.subscribe(event, (payload) =>
      this.runIsolated(handlerId, event, () => instance[methodName](payload)),
    );
    this.registry.register({
      event,
      channel,
      provider: providerName,
      handler: methodName,
    });

    this.logger.log(`Evento '${event}' [${channel}] → ${handlerId}`);
  }

  /** Un consumidor que falla no debe afectar al emisor ni a los demás consumidores. */
  private async runIsolated(
    handlerId: string,
    event: string,
    handler: () => unknown,
  ): Promise<void> {
    try {
      await handler();
    } catch (error) {
      this.logger.error(
        `Falló ${handlerId} al consumir '${event}'`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
