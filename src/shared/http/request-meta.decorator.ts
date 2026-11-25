import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/** Datos de origen de la petición que se guardan en la auditoría. */
export interface RequestMeta {
  ipAddress: string | null;
  userAgent: string | null;
}

const MAX_USER_AGENT_LENGTH = 512;

export function extractRequestMeta(request: Request): RequestMeta {
  const userAgent = request.headers['user-agent'];
  return {
    ipAddress: request.ip ?? null,
    userAgent: userAgent ? userAgent.slice(0, MAX_USER_AGENT_LENGTH) : null,
  };
}

/**
 * IP (respeta `trust proxy`, ver `TRUST_PROXY`) y user agent de la petición.
 */
export const ReqMeta = createParamDecorator(
  (_: unknown, context: ExecutionContext): RequestMeta =>
    extractRequestMeta(context.switchToHttp().getRequest<Request>()),
);
