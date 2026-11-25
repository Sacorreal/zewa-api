import type { Invitation } from './entities/invitation.entity';

export type InvitationUnusableReason = 'ACCEPTED' | 'REVOKED' | 'EXPIRED';

export const INVITATION_UNUSABLE_MESSAGES: Record<
  InvitationUnusableReason | 'NOT_FOUND',
  string
> = {
  NOT_FOUND: 'El enlace de activación no es válido.',
  ACCEPTED: 'Esta invitación ya fue utilizada. Inicia sesión con tu cuenta.',
  REVOKED:
    'Esta invitación fue reemplazada por una más reciente. Revisa tu correo.',
  EXPIRED:
    'Esta invitación expiró. Solicita un nuevo enlace al equipo de ZEWA.',
};

/** Regla única de uso: una invitación sirve una sola vez y antes de expirar. */
export function unusableReason(
  invitation: Pick<Invitation, 'acceptedAt' | 'revokedAt' | 'expiresAt'>,
  now: Date = new Date(),
): InvitationUnusableReason | null {
  if (invitation.acceptedAt) return 'ACCEPTED';
  if (invitation.revokedAt) return 'REVOKED';
  if (invitation.expiresAt <= now) return 'EXPIRED';
  return null;
}
