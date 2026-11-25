import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';

/** Campos de `Express.Multer.File` que usa el storage (evita depender de @types/multer). */
export interface UploadedFileData {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class RequiredFilePipe implements PipeTransform<
  UploadedFileData | undefined,
  UploadedFileData
> {
  transform(file: UploadedFileData | undefined): UploadedFileData {
    if (!file || file.size === 0) {
      throw new BadRequestException(
        'Adjunta un archivo no vacío en el campo "file".',
      );
    }
    return file;
  }
}
