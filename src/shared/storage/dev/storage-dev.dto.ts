import { IsIn, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import {
  FILE_VISIBILITIES,
  type FileVisibility,
  STORAGE_CATEGORIES,
  type StorageCategory,
} from '../contracts/storage.types';

class TenantScopedDto {
  @IsUUID()
  tenantId: string;
}

export class UploadTestFileDto extends TenantScopedDto {
  @IsIn(STORAGE_CATEGORIES)
  category: StorageCategory;

  @IsIn(FILE_VISIBILITIES)
  visibility: FileVisibility;
}

export class FileKeyQueryDto extends TenantScopedDto {
  @IsString()
  @IsNotEmpty()
  key: string;
}

export class FileAccessQueryDto extends FileKeyQueryDto {
  @IsIn(FILE_VISIBILITIES)
  visibility: FileVisibility;
}
