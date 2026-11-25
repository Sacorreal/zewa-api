import {
  type EnvReader,
  readOptional,
  readRequired,
} from '../../config/env-reader';
import {
  DEFAULT_EMAIL_PROVIDER,
  EMAIL_PROVIDER_NAMES,
  type EmailOptions,
  type EmailProviderName,
  isEmailProviderName,
} from './contracts/email.types';

function readProvider(read: EnvReader): EmailProviderName {
  const provider =
    readOptional(read, 'EMAIL_PROVIDER') ?? DEFAULT_EMAIL_PROVIDER;
  if (!isEmailProviderName(provider)) {
    throw new Error(
      `EMAIL_PROVIDER debe ser uno de: ${EMAIL_PROVIDER_NAMES.join(', ')}.`,
    );
  }
  return provider;
}

/** Opciones comunes del canal. Las credenciales las lee cada proveedor. */
export function buildEmailOptions(read: EnvReader): EmailOptions {
  return {
    provider: readProvider(read),
    from: readRequired(read, 'EMAIL_FROM'),
    replyTo: readOptional(read, 'EMAIL_REPLY_TO'),
  };
}
