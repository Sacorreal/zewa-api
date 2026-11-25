import {
  type ArgumentsHost,
  BadRequestException,
  Catch,
  type ExceptionFilter,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { StorageKeyError } from '../storage.errors';

/** Traduce los `StorageKeyError` a 400 en lugar de un 500 genérico. */
@Catch(StorageKeyError)
export class StorageKeyErrorFilter
  extends BaseExceptionFilter
  implements ExceptionFilter<StorageKeyError>
{
  override catch(error: StorageKeyError, host: ArgumentsHost): void {
    super.catch(new BadRequestException(error.message), host);
  }
}
