import {
  type EnvReader,
  readOptional,
  readRequired,
} from '../../shared/config/env-reader';

export const AUTH_OPTIONS = Symbol('AUTH_OPTIONS');

export interface AuthOptions {
  accessTokenSecret: string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  maxFailedLogins: number;
  lockoutMinutes: number;
}

export const AUTH_DEFAULTS = {
  accessTokenTtlSeconds: 15 * 60,
  refreshTokenTtlSeconds: 7 * 24 * 60 * 60,
  maxFailedLogins: 5,
  lockoutMinutes: 15,
} as const;

const readNumber = (read: EnvReader, key: string, fallback: number): number =>
  Number(readOptional(read, key) ?? fallback);

export function buildAuthOptions(read: EnvReader): AuthOptions {
  return {
    accessTokenSecret: readRequired(read, 'JWT_ACCESS_SECRET'),
    accessTokenTtlSeconds: readNumber(
      read,
      'JWT_ACCESS_TTL_SECONDS',
      AUTH_DEFAULTS.accessTokenTtlSeconds,
    ),
    refreshTokenTtlSeconds: readNumber(
      read,
      'REFRESH_TOKEN_TTL_SECONDS',
      AUTH_DEFAULTS.refreshTokenTtlSeconds,
    ),
    maxFailedLogins: readNumber(
      read,
      'AUTH_MAX_FAILED_LOGINS',
      AUTH_DEFAULTS.maxFailedLogins,
    ),
    lockoutMinutes: readNumber(
      read,
      'AUTH_LOCKOUT_MINUTES',
      AUTH_DEFAULTS.lockoutMinutes,
    ),
  };
}
