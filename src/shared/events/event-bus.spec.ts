import { Injectable, Logger } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  EventBusModule,
  EventBusService,
  EventRegistryService,
  OnAppEvent,
  type AppEventPayload,
} from './index';

const flushAsyncHandlers = () =>
  new Promise((resolve) => setImmediate(resolve));

const invitationPayload: AppEventPayload<'invitation.created'> = {
  invitationId: 'inv-1',
  tenantId: 'tenant-1',
  clientName: 'Conjunto Los Pinos',
  email: 'admin@lospinos.co',
  activationUrl: 'https://zewa.co/activar/abc',
  expiresAt: new Date('2026-12-01'),
};

@Injectable()
class InvitationEmailListener {
  readonly received: AppEventPayload<'invitation.created'>[] = [];

  @OnAppEvent('invitation.created', { channel: 'email' })
  sendInvitation(payload: AppEventPayload<'invitation.created'>) {
    this.received.push(payload);
  }
}

@Injectable()
class FailingAuditListener {
  @OnAppEvent('invitation.created', { channel: 'audit' })
  record(): Promise<void> {
    return Promise.reject(new Error('audit down'));
  }
}

describe('EventBus', () => {
  let moduleRef: TestingModule;
  let eventBus: EventBusService;
  let registry: EventRegistryService;
  let emailListener: InvitationEmailListener;
  let logError: jest.SpyInstance;

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    logError = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    moduleRef = await Test.createTestingModule({
      imports: [EventBusModule],
      providers: [InvitationEmailListener, FailingAuditListener],
    }).compile();
    await moduleRef.init();

    eventBus = moduleRef.get(EventBusService);
    registry = moduleRef.get(EventRegistryService);
    emailListener = moduleRef.get(InvitationEmailListener);
  });

  afterEach(async () => {
    await moduleRef.close();
    jest.restoreAllMocks();
  });

  it('registra cada consumidor con su canal', () => {
    expect(registry.findAll()).toEqual(
      expect.arrayContaining([
        {
          event: 'invitation.created',
          channel: 'email',
          provider: 'InvitationEmailListener',
          handler: 'sendInvitation',
        },
        {
          event: 'invitation.created',
          channel: 'audit',
          provider: 'FailingAuditListener',
          handler: 'record',
        },
      ]),
    );
    expect(registry.findByChannel('email')).toHaveLength(1);
    expect(registry.groupByEvent()['invitation.created']).toHaveLength(2);
  });

  it('entrega el payload emitido a los consumidores', async () => {
    eventBus.emit('invitation.created', invitationPayload);
    await flushAsyncHandlers();

    expect(emailListener.received).toEqual([invitationPayload]);
  });

  it('aísla el fallo de un consumidor sin afectar al emisor', async () => {
    expect(() =>
      eventBus.emit('invitation.created', invitationPayload),
    ).not.toThrow();
    await flushAsyncHandlers();

    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining('FailingAuditListener.record'),
      expect.any(String),
    );
  });
});
