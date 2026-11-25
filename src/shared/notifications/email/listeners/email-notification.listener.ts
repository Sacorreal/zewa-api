import { Injectable } from '@nestjs/common';
import { type AppEventPayload, OnAppEvent } from '../../../events';
import { EmailService } from '../email.service';
import { invitationCreatedTemplate } from '../templates/invitation-created.template';

/** Traduce eventos de dominio en correos. Un método por evento notificable. */
@Injectable()
export class EmailNotificationListener {
  constructor(private readonly email: EmailService) {}

  @OnAppEvent('invitation.created', { channel: 'email' })
  async sendInvitation(
    payload: AppEventPayload<'invitation.created'>,
  ): Promise<void> {
    await this.email.send(payload.email, invitationCreatedTemplate(payload), {
      idempotencyKey: `invitation-created/${payload.invitationId}`,
    });
  }
}
