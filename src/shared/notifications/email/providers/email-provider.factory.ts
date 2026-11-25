import type { EnvReader } from '../../../config/env-reader';
import { EmailProvider } from '../contracts/email-provider';
import type { EmailProviderName } from '../contracts/email.types';
import { LogEmailProvider } from './log-email.provider';
import { createResendEmailProvider } from './resend-email.provider';

/** Cada proveedor lee sus propias credenciales. */
type EmailProviderFactory = (read: EnvReader) => EmailProvider;

/** Para agregar un proveedor: implementar `EmailProvider` y registrarlo aquí. */
const EMAIL_PROVIDER_FACTORIES: Record<
  EmailProviderName,
  EmailProviderFactory
> = {
  resend: createResendEmailProvider,
  log: () => new LogEmailProvider(),
};

export function createEmailProvider(
  name: EmailProviderName,
  read: EnvReader,
): EmailProvider {
  return EMAIL_PROVIDER_FACTORIES[name](read);
}
