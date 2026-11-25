import { Resend } from 'resend';
import { type EnvReader, readRequired } from '../../../config/env-reader';
import { EmailProvider } from '../contracts/email-provider';
import type {
  EmailDeliveryResult,
  EmailMessage,
} from '../contracts/email.types';
import { EmailDeliveryError } from '../email.errors';

const PROVIDER_NAME = 'resend';

/** Subconjunto del SDK que usa el adaptador; permite sustituirlo en pruebas. */
export type ResendEmailsClient = { emails: Pick<Resend['emails'], 'send'> };

/** Implementación de `EmailProvider` sobre Resend. Único punto que conoce el SDK. */
export class ResendEmailProvider extends EmailProvider {
  constructor(private readonly client: ResendEmailsClient) {
    super();
  }

  async send({
    from,
    to,
    subject,
    html,
    text,
    replyTo,
    idempotencyKey,
  }: EmailMessage): Promise<EmailDeliveryResult> {
    const { data, error } = await this.client.emails.send(
      { from, to, subject, html, text, replyTo },
      idempotencyKey ? { idempotencyKey } : undefined,
    );

    if (error) {
      throw new EmailDeliveryError(
        PROVIDER_NAME,
        `${error.name} (${error.statusCode ?? 'sin estado'}): ${error.message}`,
      );
    }
    return { messageId: data.id };
  }
}

export function createResendEmailProvider(read: EnvReader): EmailProvider {
  return new ResendEmailProvider(
    new Resend(readRequired(read, 'RESEND_API_KEY')),
  );
}
