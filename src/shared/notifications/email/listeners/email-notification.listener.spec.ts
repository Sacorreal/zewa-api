import { Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  type AppEventPayload,
  EventBusModule,
  EventBusService,
  EventRegistryService,
} from '../../../events';
import { EmailProvider } from '../contracts/email-provider';
import { EmailNotificationsModule } from '../email-notifications.module';

const flushAsyncHandlers = () =>
  new Promise((resolve) => setImmediate(resolve));

const invitationPayload: AppEventPayload<'invitation.created'> = {
  invitationId: 'inv-1',
  tenantId: 'tenant-1',
  clientName: 'Conjunto Los Pinos',
  email: 'admin@lospinos.co',
  activationUrl: 'https://zewa.co/activar/abc',
  expiresAt: new Date('2026-12-01T15:00:00Z'),
};

describe('EmailNotificationListener', () => {
  let moduleRef: TestingModule;
  let eventBus: EventBusService;
  let send: jest.Mock;
  let logError: jest.SpyInstance;

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    logError = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    send = jest.fn().mockResolvedValue({ messageId: 'msg-1' });

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              EMAIL_PROVIDER: 'log',
              EMAIL_FROM: 'ZEWA <no-reply@zewa.co>',
              EMAIL_REPLY_TO: 'soporte@zewa.co',
            }),
          ],
        }),
        EventBusModule,
        EmailNotificationsModule,
      ],
    })
      .overrideProvider(EmailProvider)
      .useValue({ send })
      .compile();
    await moduleRef.init();

    eventBus = moduleRef.get(EventBusService);
  });

  afterEach(async () => {
    await moduleRef.close();
    jest.restoreAllMocks();
  });

  it('se registra como consumidor del canal email', () => {
    expect(moduleRef.get(EventRegistryService).findByChannel('email')).toEqual([
      {
        event: 'invitation.created',
        channel: 'email',
        provider: 'EmailNotificationListener',
        handler: 'sendInvitation',
      },
    ]);
  });

  it('envía la invitación al administrador del conjunto', async () => {
    eventBus.emit('invitation.created', invitationPayload);
    await flushAsyncHandlers();

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'ZEWA <no-reply@zewa.co>',
        replyTo: 'soporte@zewa.co',
        to: ['admin@lospinos.co'],
        subject: expect.stringContaining('Conjunto Los Pinos') as string,
        idempotencyKey: 'invitation-created/inv-1',
      }),
    );
  });

  it('un fallo del proveedor no afecta al emisor', async () => {
    send.mockRejectedValue(new Error('proveedor caído'));

    expect(() =>
      eventBus.emit('invitation.created', invitationPayload),
    ).not.toThrow();
    await flushAsyncHandlers();

    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining('EmailNotificationListener.sendInvitation'),
      expect.any(String),
    );
  });
});
