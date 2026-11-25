import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthSessionsService } from '../auth-sessions.service';
import type { AuthenticatedRequest } from '../auth.types';
import { IS_PUBLIC_KEY } from '../decorators/auth.decorators';

const BEARER_PREFIX = 'Bearer ';

/** Guard global: toda ruta exige un access token válido salvo `@Public()`. */
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: AuthSessionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);
    if (!token) throw new UnauthorizedException('Debes iniciar sesión.');

    request.principal = await this.sessions.authenticate(token);
    return true;
  }

  private extractBearerToken(request: AuthenticatedRequest): string | null {
    const header = request.headers.authorization;
    return header?.startsWith(BEARER_PREFIX)
      ? header.slice(BEARER_PREFIX.length).trim() || null
      : null;
  }
}
