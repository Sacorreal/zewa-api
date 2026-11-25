import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ReqMeta,
  type RequestMeta,
} from '../../shared/http/request-meta.decorator';
import { RateLimit } from '../../shared/security/rate-limit';
import { Public } from '../auth/decorators/auth.decorators';
import { AcceptInvitationDto, InvitationTokenDto } from './dto/invitation.dto';
import { InvitationsService } from './invitations.service';

/** Activación de cuentas por invitación: pública, con límite por IP. */
@Public()
@RateLimit('invitations')
@Controller('auth/invitations')
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  validate(@Body() { token }: InvitationTokenDto) {
    return this.invitations.validate(token);
  }

  @Post('accept')
  @HttpCode(HttpStatus.OK)
  accept(
    @Body() { token, password }: AcceptInvitationDto,
    @ReqMeta() meta: RequestMeta,
  ) {
    return this.invitations.accept(token, password, meta);
  }
}
