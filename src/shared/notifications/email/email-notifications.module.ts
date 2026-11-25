import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvReader } from '../../config/env-reader';
import { EmailProvider } from './contracts/email-provider';
import type { EmailOptions } from './contracts/email.types';
import { buildEmailOptions } from './email.config';
import { EmailService } from './email.service';
import { EMAIL_OPTIONS } from './email.tokens';
import { EmailNotificationListener } from './listeners/email-notification.listener';
import { createEmailProvider } from './providers/email-provider.factory';

const envReaderFrom =
  (config: ConfigService): EnvReader =>
  (key) =>
    config.get<unknown>(key);

/**
 * Canal de notificaciones por correo: escucha eventos del bus y los envía.
 * No exporta nada: para notificar, se emite un evento.
 */
@Module({
  providers: [
    {
      provide: EMAIL_OPTIONS,
      inject: [ConfigService],
      useFactory: (config: ConfigService): EmailOptions =>
        buildEmailOptions(envReaderFrom(config)),
    },
    {
      provide: EmailProvider,
      inject: [EMAIL_OPTIONS, ConfigService],
      useFactory: (options: EmailOptions, config: ConfigService) =>
        createEmailProvider(options.provider, envReaderFrom(config)),
    },
    EmailService,
    EmailNotificationListener,
  ],
})
export class EmailNotificationsModule {}
