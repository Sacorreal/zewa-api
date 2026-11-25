import { randomUUID } from 'node:crypto';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import type { RequestMeta } from '../../shared/http/request-meta.decorator';
import {
  generateSecureToken,
  hashToken,
} from '../../utils/crypto/secure-token';
import { User, UserStatus } from '../users/entities/user.entity';
import { AuthScope } from './auth-scope';
import { AUTH_OPTIONS, type AuthOptions } from './auth.config';
import type {
  AccessTokenClaims,
  AuthPrincipal,
  IssuedTokens,
} from './auth.types';
import { AuthSession } from './entities/auth-session.entity';

const INVALID_SESSION_MESSAGE = 'La sesión no es válida o expiró.';

export interface SessionGrant {
  userId: string;
  scope: AuthScope;
  tenantId: string | null;
  meta: RequestMeta;
}

/**
 * Emite, rota y revoca sesiones. El access token es un JWT corto; el refresh
 * token es opaco, de un solo uso, y en BD solo se guarda su hash.
 */
@Injectable()
export class AuthSessionsService {
  constructor(
    @InjectRepository(AuthSession)
    private readonly sessions: Repository<AuthSession>,
    private readonly dataSource: DataSource,
    private readonly jwt: JwtService,
    @Inject(AUTH_OPTIONS) private readonly options: AuthOptions,
  ) {}

  /** Abre una familia de sesiones nueva (login o cambio de tenant). */
  async issue(grant: SessionGrant): Promise<IssuedTokens> {
    const { tokens } = await this.createSession(
      grant,
      randomUUID(),
      this.sessions,
    );
    return tokens;
  }

  /**
   * Rota el refresh token. Si llega uno ya rotado (posible robo), revoca
   * toda la familia y obliga a iniciar sesión de nuevo.
   */
  async rotate(refreshToken: string, meta: RequestMeta): Promise<IssuedTokens> {
    const current = await this.sessions.findOneBy({
      refreshTokenHash: hashToken(refreshToken),
    });
    if (!current) throw new UnauthorizedException(INVALID_SESSION_MESSAGE);

    if (current.revokedAt) {
      if (current.replacedById) await this.revokeFamily(current.familyId);
      throw new UnauthorizedException(INVALID_SESSION_MESSAGE);
    }
    if (current.expiresAt <= new Date()) {
      throw new UnauthorizedException(INVALID_SESSION_MESSAGE);
    }

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(AuthSession);
      const { tokens, session: replacement } = await this.createSession(
        {
          userId: current.userId,
          scope: current.scope,
          tenantId: current.tenantId,
          meta,
        },
        current.familyId,
        repository,
      );
      const { affected } = await repository.update(
        { id: current.id, revokedAt: IsNull() },
        { revokedAt: new Date(), replacedById: replacement.id },
      );
      // Otro refresh concurrente ganó la carrera: se descarta esta rotación.
      if (!affected) throw new UnauthorizedException(INVALID_SESSION_MESSAGE);
      return tokens;
    });
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.sessions.update(
      { familyId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  /**
   * Verifica el access token y que su familia siga vigente y el usuario
   * activo. Así, logout, suspensión de la cuenta o robo detectado cortan el
   * acceso de inmediato, sin esperar a que expire el JWT.
   */
  async authenticate(accessToken: string): Promise<AuthPrincipal> {
    const claims = await this.verifyAccessToken(accessToken);

    const session = await this.sessions
      .createQueryBuilder('session')
      .innerJoinAndSelect('session.user', 'user')
      .where('session.family_id = :familyId', { familyId: claims.fid })
      .andWhere('session.revoked_at IS NULL')
      .andWhere('session.expires_at > now()')
      .andWhere('user.status = :status', { status: UserStatus.Active })
      .getOne();

    const user = session?.user;
    if (!user || user.id !== claims.sub) {
      throw new UnauthorizedException(INVALID_SESSION_MESSAGE);
    }

    return this.toPrincipal(claims, user);
  }

  private async verifyAccessToken(token: string): Promise<AccessTokenClaims> {
    try {
      return await this.jwt.verifyAsync<AccessTokenClaims>(token);
    } catch {
      throw new UnauthorizedException(INVALID_SESSION_MESSAGE);
    }
  }

  private toPrincipal(claims: AccessTokenClaims, user: User): AuthPrincipal {
    return {
      userId: user.id,
      email: user.email,
      sessionId: claims.sid,
      familyId: claims.fid,
      scope: claims.scope,
      tenantId: claims.tid ?? null,
      platformRole: user.platformRole,
    };
  }

  private async createSession(
    { userId, scope, tenantId, meta }: SessionGrant,
    familyId: string,
    repository: Repository<AuthSession>,
  ): Promise<{ tokens: IssuedTokens; session: AuthSession }> {
    const refreshToken = generateSecureToken();
    const refreshTokenExpiresAt = this.secondsFromNow(
      this.options.refreshTokenTtlSeconds,
    );
    const session = await repository.save(
      repository.create({
        userId,
        familyId,
        scope,
        tenantId,
        refreshTokenHash: hashToken(refreshToken),
        expiresAt: refreshTokenExpiresAt,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      }),
    );

    const claims: AccessTokenClaims = {
      sub: userId,
      sid: session.id,
      fid: familyId,
      scope,
      ...(tenantId ? { tid: tenantId } : {}),
    };

    const tokens: IssuedTokens = {
      accessToken: await this.jwt.signAsync(claims),
      accessTokenExpiresAt: this.secondsFromNow(
        this.options.accessTokenTtlSeconds,
      ).toISOString(),
      refreshToken,
      refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
      scope,
    };
    return { tokens, session };
  }

  private secondsFromNow(seconds: number): Date {
    return new Date(Date.now() + seconds * 1000);
  }
}
