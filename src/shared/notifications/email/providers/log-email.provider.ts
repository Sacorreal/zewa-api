import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import { EmailProvider } from '../contracts/email-provider';
import type {
  EmailDeliveryResult,
  EmailMessage,
} from '../contracts/email.types';

/**
 * Proveedor de desarrollo: no envía nada, escribe el correo en el log.
 * Pensado para `local`; no usarlo en ambientes con datos reales.
 */
export class LogEmailProvider extends EmailProvider {
  private readonly logger = new Logger(LogEmailProvider.name);

  send({ to, subject, text }: EmailMessage): Promise<EmailDeliveryResult> {
    const messageId = `log-${randomUUID()}`;
    this.logger.log(
      `Correo simulado ${messageId} → ${to.join(', ')}\nAsunto: ${subject}\n${text}`,
    );
    return Promise.resolve({ messageId });
  }
}
