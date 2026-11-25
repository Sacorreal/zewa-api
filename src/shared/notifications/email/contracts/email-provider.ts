import type { EmailDeliveryResult, EmailMessage } from './email.types';

/**
 * Puerto hacia el proveedor de correo. Solo transporta mensajes ya armados:
 * no conoce eventos ni plantillas. Cambiar de proveedor = otra implementación.
 */
export abstract class EmailProvider {
  abstract send(message: EmailMessage): Promise<EmailDeliveryResult>;
}
