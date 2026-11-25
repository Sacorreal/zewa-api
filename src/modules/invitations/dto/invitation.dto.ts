import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_POLICY_MESSAGE,
} from '../../../shared/security/password-policy';

const MAX_TOKEN_LENGTH = 128;

export class InvitationTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'El enlace de activación no es válido.' })
  @MaxLength(MAX_TOKEN_LENGTH)
  token: string;
}

export class AcceptInvitationDto extends InvitationTokenDto {
  /** Obligatoria si la cuenta aún no tiene contraseña (ver `requiresPassword`). */
  @IsOptional()
  @IsString()
  @Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, {
    message: PASSWORD_POLICY_MESSAGE,
  })
  password?: string;
}
