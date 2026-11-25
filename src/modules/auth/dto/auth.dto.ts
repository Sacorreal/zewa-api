import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PASSWORD_MAX_LENGTH } from '../../../shared/security/password-policy';
import { NormalizeEmail } from '../../../shared/http/transforms';

export class LoginDto {
  @NormalizeEmail()
  @IsEmail({}, { message: 'Ingresa un correo electrónico válido.' })
  @MaxLength(254)
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Ingresa tu contraseña.' })
  @MaxLength(PASSWORD_MAX_LENGTH)
  password: string;
}

export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  refreshToken: string;
}

export class SelectTenantDto {
  @IsUUID('4', { message: 'El conjunto seleccionado no es válido.' })
  tenantId: string;
}
