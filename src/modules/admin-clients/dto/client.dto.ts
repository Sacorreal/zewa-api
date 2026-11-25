import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  NormalizeEmail,
  ToBoolean,
  Trim,
} from '../../../shared/http/transforms';
import { IsColombianNit } from '../../../shared/http/validators/is-colombian-nit.validator';
import { TenantStatus } from '../../tenants/entities/tenant.entity';

export const CLIENT_NAME_MAX_LENGTH = 150;
const TAX_ID_MAX_LENGTH = 30;
const EMAIL_MAX_LENGTH = 254;

export class CreateClientDto {
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'El nombre del conjunto es obligatorio.' })
  @MaxLength(CLIENT_NAME_MAX_LENGTH, {
    message: `El nombre no puede superar ${CLIENT_NAME_MAX_LENGTH} caracteres.`,
  })
  name: string;

  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'El NIT es obligatorio.' })
  @MaxLength(TAX_ID_MAX_LENGTH)
  @IsColombianNit()
  taxId: string;

  @NormalizeEmail()
  @IsEmail({}, { message: 'Ingresa un correo electrónico válido.' })
  @MaxLength(EMAIL_MAX_LENGTH)
  administratorEmail: string;
}

export class UpdateClientDto {
  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'El nombre del conjunto es obligatorio.' })
  @MaxLength(CLIENT_NAME_MAX_LENGTH, {
    message: `El nombre no puede superar ${CLIENT_NAME_MAX_LENGTH} caracteres.`,
  })
  name?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'El NIT es obligatorio.' })
  @MaxLength(TAX_ID_MAX_LENGTH)
  @IsColombianNit()
  taxId?: string;

  /** Quita el logo actual (se usará la imagen institucional de ZEWA). */
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  removeLogo?: boolean;
}

export const CHANGEABLE_STATUSES = [
  TenantStatus.Active,
  TenantStatus.Suspended,
] as const;

export class ChangeClientStatusDto {
  @IsIn(CHANGEABLE_STATUSES, {
    message: 'El estado debe ser ACTIVE (reactivar) o SUSPENDED (suspender).',
  })
  status: (typeof CHANGEABLE_STATUSES)[number];
}

export const CLIENT_SORTS = ['createdAt:desc', 'createdAt:asc'] as const;
export type ClientSort = (typeof CLIENT_SORTS)[number];

const MAX_PAGE_SIZE = 100;

export class ListClientsQueryDto {
  /** Coincide con el nombre o con los dígitos del NIT. */
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(CLIENT_NAME_MAX_LENGTH)
  search?: string;

  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize: number = 20;

  @IsOptional()
  @IsIn(CLIENT_SORTS)
  sort: ClientSort = 'createdAt:desc';
}
