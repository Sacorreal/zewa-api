import { Inject, Injectable } from '@nestjs/common';
import { type AppEventPayload, OnAppEvent } from '../../../events';
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
    @Inject(EMAIL_OPTIONS) options: EmailOptions,
  ) {
    this.templateContext = { appWebUrl: options.appWebUrl };
  }

  @OnAppEvent('invitation.created', { channel: 'email' })
  async sendInvitation(
    payload: AppEventPayload<'invitation.created'>,
  ): Promise<void> {
    const rendered = invitationCreatedTemplate(payload, this.templateContext);
    await this.email.send(payload.email, rendered, {
      idempotencyKey: `invitation-created/${payload.invitationId}`,
    });
  }
}
