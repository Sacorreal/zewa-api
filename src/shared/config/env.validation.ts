import { Type, plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
  ValidationError,
  validateSync,
} from 'class-validator';
import { NodeEnv } from './environment';

const isLocal = (env: EnvironmentVariables) => env.NODE_ENV === NodeEnv.Local;
const isRemote = (env: EnvironmentVariables) => !isLocal(env);

/**
 * Catálogo único de variables de entorno. Si falta una requerida para el
 * NODE_ENV activo, el proceso no arranca.
 */
export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  PORT?: number;

  @ValidateIf(isLocal)
  @IsString()
  @IsNotEmpty()
  DB_HOST?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  DB_PORT?: number;

  @ValidateIf(isLocal)
  @IsString()
  @IsNotEmpty()
  DB_USERNAME?: string;

  @ValidateIf(isLocal)
  @IsString()
  @IsNotEmpty()
  DB_PASSWORD?: string;

  @ValidateIf(isLocal)
  @IsString()
  @IsNotEmpty()
  DB_NAME?: string;

  @ValidateIf(isRemote)
  @IsString()
  @IsNotEmpty()
  DATABASE_URL?: string;

  @IsOptional()
  @IsString()
  DB_SSL_CA?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  DB_SSL_REJECT_UNAUTHORIZED?: string;
}

const describeError = (error: ValidationError): string =>
  `  - ${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`;

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const env = plainToInstance(EnvironmentVariables, config);
  const errors = validateSync(env);

  if (errors.length > 0) {
    throw new Error(
      `Variables de entorno inválidas (NODE_ENV=${String(config.NODE_ENV)}):\n${errors.map(describeError).join('\n')}`,
    );
  }

  return env;
}
