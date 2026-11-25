import { type EnvReader, readOptional } from '../../shared/config/env-reader';

export const INVITATION_OPTIONS = Symbol('INVITATION_OPTIONS');

export interface InvitationOptions {
  ttlHours: number;
}

export const DEFAULT_INVITATION_TTL_HOURS = 72;

export function buildInvitationOptions(read: EnvReader): InvitationOptions {
  return {
    ttlHours: Number(
      readOptional(read, 'INVITATION_TTL_HOURS') ??
        DEFAULT_INVITATION_TTL_HOURS,
    ),
  };
}
