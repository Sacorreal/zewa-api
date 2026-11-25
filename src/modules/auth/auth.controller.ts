import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ReqMeta,
  type RequestMeta,
} from '../../shared/http/request-meta.decorator';
import { RateLimit } from '../../shared/security/rate-limit';
import { AuthScope } from './auth-scope';
import { AuthService } from './auth.service';
import type { AuthPrincipal } from './auth.types';
import {
  CurrentPrincipal,
  Public,
  RequireScope,
} from './decorators/auth.decorators';
import { LoginDto, RefreshDto, SelectTenantDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @RateLimit('login')
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() { email, password }: LoginDto, @ReqMeta() meta: RequestMeta) {
    return this.auth.login(email, password, meta);
  }

  @Public()
  @RateLimit('login')
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() { refreshToken }: RefreshDto, @ReqMeta() meta: RequestMeta) {
    return this.auth.refresh(refreshToken, meta);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@CurrentPrincipal() principal: AuthPrincipal): Promise<void> {
    return this.auth.logout(principal);
  }

  @Get('me')
  me(@CurrentPrincipal() principal: AuthPrincipal) {
    return this.auth.toPrincipalView(principal);
  }

  @RequireScope(AuthScope.Account, AuthScope.Tenant)
  @Get('memberships')
  memberships(@CurrentPrincipal() principal: AuthPrincipal) {
    return this.auth.listMemberships(principal.userId);
  }

  @RequireScope(AuthScope.Account, AuthScope.Tenant)
  @Post('tenant-session')
  @HttpCode(HttpStatus.OK)
  selectTenant(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body() { tenantId }: SelectTenantDto,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.auth.selectTenant(principal, tenantId, meta);
  }
}
