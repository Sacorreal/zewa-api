import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseFilters,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Public } from '../../http/public.decorator';
import type { StoredFile } from '../contracts/storage.types';
import { StorageService } from '../storage.service';
import {
  FileAccessQueryDto,
  FileKeyQueryDto,
  UploadTestFileDto,
} from './storage-dev.dto';
import { StorageKeyErrorFilter } from './storage-key-error.filter';
import { RequiredFilePipe, type UploadedFileData } from './uploaded-file';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Endpoints de prueba del storage. Solo se registran fuera de producción y,
 * a diferencia de los endpoints reales, reciben el `tenantId` del cliente.
 */
@Public()
@Controller('dev/storage')
@UseFilters(StorageKeyErrorFilter)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class StorageDevController {
  constructor(private readonly storage: StorageService) {}

  @Post('tenants/:tenantId/folder')
  @HttpCode(HttpStatus.NO_CONTENT)
  createTenantFolder(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
  ): Promise<void> {
    return this.storage.createTenantFolder(tenantId);
  }

  @Post('files')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE_BYTES } }),
  )
  upload(
    @UploadedFile(RequiredFilePipe) file: UploadedFileData,
    @Body() dto: UploadTestFileDto,
  ): Promise<StoredFile> {
    return this.storage.upload({
      ...dto,
      fileName: file.originalname,
      body: file.buffer,
      contentType: file.mimetype,
    });
  }

  @Get('files/url')
  async getAccessUrl(
    @Query() { tenantId, key, visibility }: FileAccessQueryDto,
  ): Promise<{ url: string }> {
    return { url: await this.storage.getAccessUrl(tenantId, key, visibility) };
  }

  @Delete('files')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Query() { tenantId, key }: FileKeyQueryDto): Promise<void> {
    return this.storage.remove(tenantId, key);
  }
}
