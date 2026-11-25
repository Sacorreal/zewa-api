import { Injectable } from '@nestjs/common';
import { type AppEventPayload, OnAppEvent } from '../../shared/events';
import { InvitationDeliveryStatus } from './entities/invitation.entity';
import { InvitationsService } from './invitations.service';

/** Persiste el resultado del envío que informa el canal de correo. */
@Injectable()
export class InvitationDeliveryListener {
  constructor(private readonly invitations: InvitationsService) {}

  @OnAppEvent('invitation.delivery-succeeded', { channel: 'internal' })
  markSent({
    invitationId,
    occurredAt,
  }: AppEventPayload<'invitation.delivery-succeeded'>): Promise<void> {
    return this.invitations.recordDelivery(
      invitationId,
      InvitationDeliveryStatus.Sent,
      occurredAt,
    );
  }

  @OnAppEvent('invitation.delivery-failed', { channel: 'internal' })
  markFailed({
    invitationId,
    occurredAt,
  }: AppEventPayload<'invitation.delivery-failed'>): Promise<void> {
    return this.invitations.recordDelivery(
      invitationId,
      InvitationDeliveryStatus.Failed,
      occurredAt,
    );
  }
}
