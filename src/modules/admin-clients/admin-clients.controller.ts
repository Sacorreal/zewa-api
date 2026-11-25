import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ReqMeta,
  type RequestMeta,
} from '../../shared/http/request-meta.decorator';
import { AuthScope } from '../auth/auth-scope';
import type { AuthPrincipal } from '../auth/auth.types';
import {
  CurrentPrincipal,
  RequireScope,
} from '../auth/decorators/auth.decorators';
import { AdminClientsQueryService } from './admin-clients-query.service';
import { AdminClientsService } from './admin-clients.service';
import {
  LOGO_FIELD,
  LOGO_UPLOAD_LIMIT_BYTES,
  LogoFilePipe,
  type ValidatedLogo,
} from './client-logo';
import {
  ChangeClientStatusDto,
  CreateClientDto,
  ListClientsQueryDto,
  UpdateClientDto,
} from './dto/client.dto';

const LogoUpload = () =>
  UseInterceptors(
    FileInterceptor(LOGO_FIELD, {
      limits: { fileSize: LOGO_UPLOAD_LIMIT_BYTES, files: 1 },
    }),
  );

/** Panel global: solo tokens de alcance `global` (SUPERADMIN). */
@RequireScope(AuthScope.Global)
@Controller('admin/clients')
export class AdminClientsController {
  constructor(
    private readonly clients: AdminClientsService,
    private readonly queries: AdminClientsQueryService,
  ) {}

  @Post()
  @LogoUpload()
  create(
    @Body() dto: CreateClientDto,
    @UploadedFile(LogoFilePipe) logo: ValidatedLogo | undefined,
    @CurrentPrincipal() actor: AuthPrincipal,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.clients.create(dto, logo, actor, meta);
  }

  @Get()
  list(@Query() query: ListClientsQueryDto) {
    return this.queries.list(query);
  }

  @Get('stats')
  stats() {
    return this.queries.stats();
  }

  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.queries.detail(id);
  }

  @Patch(':id')
  @LogoUpload()
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
    @UploadedFile(LogoFilePipe) logo: ValidatedLogo | undefined,
    @CurrentPrincipal() actor: AuthPrincipal,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.clients.update(id, dto, logo, actor, meta);
  }

  @Patch(':id/status')
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeClientStatusDto,
    @CurrentPrincipal() actor: AuthPrincipal,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.clients.changeStatus(id, dto, actor, meta);
  }

  @Post(':id/resend-invitation')
  @HttpCode(HttpStatus.OK)
  resendInvitation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPrincipal() actor: AuthPrincipal,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.clients.resendInvitation(id, actor, meta);
  }
}
