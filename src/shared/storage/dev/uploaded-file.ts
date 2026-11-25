import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';
import type { UploadedFileData } from '../../http/uploaded-file';

export type { UploadedFileData };

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
