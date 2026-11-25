import {
  type EnvReader,
  readOptional,
  readRequired,
} from '../config/env-reader';
import { trimTrailingSlash } from '../../utils/url';
import type { StorageOptions } from './contracts/storage.types';

const DEFAULT_SIGNED_URL_TTL_SECONDS = 900;

function readTtlSeconds(read: EnvReader): number {
  const raw = readOptional(read, 'SPACES_SIGNED_URL_TTL_SECONDS');
  if (raw === undefined) return DEFAULT_SIGNED_URL_TTL_SECONDS;

  const ttl = Number(raw);
  if (!Number.isInteger(ttl) || ttl <= 0) {
    throw new Error(
      'SPACES_SIGNED_URL_TTL_SECONDS debe ser un entero positivo.',
    );
  }
  return ttl;
}

/** Sin CDN, la URL pública es la del endpoint virtual-hosted del Space. */
function defaultPublicBaseUrl(endpoint: string, bucket: string): string {
  const url = new URL(endpoint);
  return `${url.protocol}//${bucket}.${url.host}`;
}

export function buildStorageOptions(read: EnvReader): StorageOptions {
  const endpoint = trimTrailingSlash(readRequired(read, 'SPACES_ENDPOINT'));
  const bucket = readRequired(read, 'SPACES_BUCKET');
  const cdnUrl = readOptional(read, 'SPACES_CDN_URL');

  return {
    endpoint,
    region: readRequired(read, 'SPACES_REGION'),
    bucket,
    accessKeyId: readRequired(read, 'SPACES_ACCESS_KEY_ID'),
    secretAccessKey: readRequired(read, 'SPACES_SECRET_ACCESS_KEY'),
    publicBaseUrl: trimTrailingSlash(
      cdnUrl ?? defaultPublicBaseUrl(endpoint, bucket),
    ),
    signedUrlTtlSeconds: readTtlSeconds(read),
  };
}
