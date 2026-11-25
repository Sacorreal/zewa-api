import type { EmailMessage } from '../contracts/email.types';
import { EmailDeliveryError } from '../email.errors';
import { createEmailProvider } from './email-provider.factory';
import { LogEmailProvider } from './log-email.provider';
import {
  ResendEmailProvider,
  type ResendEmailsClient,
} from './resend-email.provider';

const message: EmailMessage = {
  from: 'ZEWA <no-reply@zewa.co>',
  to: ['admin@lospinos.co'],
  subject: 'Asunto',
  html: '<p>Hola</p>',
  text: 'Hola',
  replyTo: 'soporte@zewa.co',
  idempotencyKey: 'invitation-created/inv-1',
};

function clientReturning(response: unknown) {
  const send = jest.fn().mockResolvedValue(response);
  const client = { emails: { send } } as unknown as ResendEmailsClient;
  return { client, send };
}

describe('ResendEmailProvider', () => {
  it('envía el mensaje con su clave de idempotencia', async () => {
    const { client, send } = clientReturning({
      data: { id: 're_123' },
      error: null,
    });

    await expect(
      new ResendEmailProvider(client).send(message),
    ).resolves.toEqual({ messageId: 're_123' });
    expect(send).toHaveBeenCalledWith(
      {
        from: message.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        replyTo: message.replyTo,
      },
      { idempotencyKey: 'invitation-created/inv-1' },
    );
  });

  it('convierte el error de Resend en EmailDeliveryError', async () => {
    const { client } = clientReturning({
      data: null,
      error: {
        name: 'validation_error',
        statusCode: 422,
        message: 'Invalid `from` field',
      },
    });

    await expect(new ResendEmailProvider(client).send(message)).rejects.toThrow(
      EmailDeliveryError,
    );
  });
});

describe('createEmailProvider', () => {
  it('exige RESEND_API_KEY para Resend', () => {
    expect(() => createEmailProvider('resend', () => undefined)).toThrow(
      'RESEND_API_KEY',
    );
  });

  it('crea el proveedor de log sin credenciales', () => {
    expect(createEmailProvider('log', () => undefined)).toBeInstanceOf(
      LogEmailProvider,
    );
  });
});
