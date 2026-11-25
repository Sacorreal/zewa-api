import { Inject, Injectable, Logger } from '@nestjs/common';
import { EmailProvider } from './contracts/email-provider';
import type { RenderedEmail } from './contracts/email-template';
import type {
  EmailDeliveryResult,
  EmailOptions,
} from './contracts/email.types';
import { EMAIL_OPTIONS } from './email.tokens';

export interface SendEmailOptions {
  idempotencyKey?: string;
}

/** Completa el mensaje con el remitente configurado y lo entrega al proveedor. */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly provider: EmailProvider,
    @Inject(EMAIL_OPTIONS) private readonly options: EmailOptions,
  ) {}

  async send(
    to: string | string[],
    email: RenderedEmail,
    { idempotencyKey }: SendEmailOptions = {},
  ): Promise<EmailDeliveryResult> {
    const result = await this.provider.send({
      ...email,
      from: this.options.from,
      replyTo: this.options.replyTo,
      to: [to].flat(),
      idempotencyKey,
    });
    this.logger.log(
      `Correo '${email.subject}' entregado (${result.messageId})`,
    );
    return result;
  }
}
