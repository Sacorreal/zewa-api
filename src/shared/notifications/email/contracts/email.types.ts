export const EMAIL_PROVIDER_NAMES = ['resend', 'log'] as const;

export type EmailProviderName = (typeof EMAIL_PROVIDER_NAMES)[number];

export const DEFAULT_EMAIL_PROVIDER: EmailProviderName = 'resend';

export function isEmailProviderName(value: string): value is EmailProviderName {
  return (EMAIL_PROVIDER_NAMES as readonly string[]).includes(value);
}

/** Mensaje listo para entregar, independiente del proveedor. */
export interface EmailMessage {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /** Evita envíos duplicados si el mismo correo se intenta más de una vez. */
  idempotencyKey?: string;
}

export interface EmailDeliveryResult {
  messageId: string;
}

export interface EmailOptions {
  provider: EmailProviderName;
  from: string;
  replyTo?: string;
  /** URL base del frontend (ENDPOINT_APP_WEB) para los enlaces de los correos. */
  appWebUrl: string;
}
