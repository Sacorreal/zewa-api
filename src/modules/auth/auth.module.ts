import { Module, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityModule } from '../../shared/security/security.module';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';
import { AuthSessionsService } from './auth-sessions.service';
import {
  AUTH_OPTIONS,
  type AuthOptions,
  buildAuthOptions,
} from './auth.config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthSession } from './entities/auth-session.entity';
import { AccessTokenGuard } from './guards/access-token.guard';
import { ScopeGuard } from './guards/scope.guard';
import { TenantAccessService } from './tenant-access.service';

const JWT_ALGORITHM = 'HS256';

const authOptionsProvider: Provider = {
  provide: AUTH_OPTIONS,
  inject: [ConfigService],
  useFactory: (config: ConfigService): AuthOptions =>
    buildAuthOptions((key) => config.get<unknown>(key)),
};

/**
 * Autenticación global: registra `AccessTokenGuard` y `ScopeGuard` como
 * guards de aplicación (en ese orden), así toda ruta nueva nace protegida.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([AuthSession]),
    UsersModule,
    AuditModule,
    SecurityModule,
    JwtModule.registerAsync({
      inject: [AUTH_OPTIONS],
      extraProviders: [authOptionsProvider],
      useFactory: (options: AuthOptions) => ({
        secret: options.accessTokenSecret,
        signOptions: {
          algorithm: JWT_ALGORITHM,
          expiresIn: options.accessTokenTtlSeconds,
        },
        verifyOptions: { algorithms: [JWT_ALGORITHM] },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    authOptionsProvider,
    AuthSessionsService,
    AuthService,
    TenantAccessService,
    { provide: APP_GUARD, useClass: AccessTokenGuard },
    { provide: APP_GUARD, useClass: ScopeGuard },
  ],
})
export class AuthModule {}
