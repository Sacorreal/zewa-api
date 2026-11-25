import { Inject, Injectable } from '@nestjs/common';
import {
  type AppEventPayload,
  EventBusService,
  OnAppEvent,
} from '../../../events';
import type { EmailTemplateContext } from '../contracts/email-template';
import type { EmailOptions } from '../contracts/email.types';
import { EmailService } from '../email.service';
import { EMAIL_OPTIONS } from '../email.tokens';
import { invitationCreatedTemplate } from '../templates/invitation-created.template';

/** Traduce eventos de dominio en correos. Un método por evento notificable. */
@Injectable()
export class EmailNotificationListener {
  private readonly templateContext: EmailTemplateContext;

  constructor(
    private readonly email: EmailService,
    private readonly eventBus: EventBusService,
    @Inject(EMAIL_OPTIONS) options: EmailOptions,
  ) {
    this.templateContext = { appWebUrl: options.appWebUrl };
  }

  /**
   * Envía la invitación e informa el resultado por el bus para que el dominio
   * lo registre (y permita reenviar si falla). El error se relanza para que
   * quede en el log del consumidor.
   */
  @OnAppEvent('invitation.created', { channel: 'email' })
  async sendInvitation(
    payload: AppEventPayload<'invitation.created'>,
  ): Promise<void> {
    const { invitationId } = payload;
    try {
      const rendered = invitationCreatedTemplate(payload, this.templateContext);
      await this.email.send(payload.email, rendered, {
        idempotencyKey: `invitation-created/${invitationId}`,
      });
    } catch (error) {
      await this.eventBus.emitAndWait('invitation.delivery-failed', {
        invitationId,
        reason: error instanceof Error ? error.message : String(error),
        occurredAt: new Date(),
      });
      throw error;
    }

    await this.eventBus.emitAndWait('invitation.delivery-succeeded', {
      invitationId,
      occurredAt: new Date(),
    });
  }
}
