import {
  BadRequestException,
  Injectable,
  Logger,
  type PipeTransform,
} from '@nestjs/common';
import type { UploadedFileData } from '../../shared/http/uploaded-file';
import { StorageService } from '../../shared/storage';
import {
  detectImageType,
  type ImageType,
  normalizeImageMime,
} from '../../utils/image/detect-image-type';

export const MAX_LOGO_BYTES = 5 * 1024 * 1024;
/**
 * Tope de Multer un poco mayor que el permitido: así el exceso lo rechaza
 * `LogoFilePipe` con un mensaje claro, sin cargar archivos arbitrarios en memoria.
 */
export const LOGO_UPLOAD_LIMIT_BYTES = MAX_LOGO_BYTES + 1024 * 1024;
export const LOGO_FIELD = 'logo';

export interface ValidatedLogo {
  fileName: string;
  body: Buffer;
  contentType: ImageType;
}

/** Valida el logo opcional por tamaño y por contenido real (no por extensión). */
@Injectable()
export class LogoFilePipe implements PipeTransform<
  UploadedFileData | undefined,
  ValidatedLogo | undefined
> {
  transform(file: UploadedFileData | undefined): ValidatedLogo | undefined {
    if (!file) return undefined;
    if (file.size === 0) {
      throw new BadRequestException('El logo está vacío.');
    }
    if (file.size > MAX_LOGO_BYTES) {
      throw new BadRequestException('El logo no puede superar 5 MB.');
    }

    const detected = detectImageType(file.buffer);
    if (!detected) {
      throw new BadRequestException(
        'El logo debe ser una imagen PNG, JPG o WEBP.',
      );
    }
    if (normalizeImageMime(file.mimetype) !== detected) {
      throw new BadRequestException(
        'El contenido del logo no corresponde al tipo de archivo declarado.',
      );
    }

    return {
      fileName: file.originalname,
      body: file.buffer,
      contentType: detected,
    };
  }
}

/** Logos de conjuntos en el storage existente (categoría `branding`, públicos). */
@Injectable()
export class ClientLogoStorage {
  private readonly logger = new Logger(ClientLogoStorage.name);

  constructor(private readonly storage: StorageService) {}

  async upload(tenantId: string, logo: ValidatedLogo): Promise<string> {
    const { key } = await this.storage.upload({
      tenantId,
      category: 'branding',
      visibility: 'public',
      ...logo,
    });
    return key;
  }

  /** URL pública, o `null` para que el frontend muestre la imagen de ZEWA. */
  async urlFor(tenantId: string, key: string | null): Promise<string | null> {
    return key ? this.storage.getAccessUrl(tenantId, key, 'public') : null;
  }

  /** Limpieza de mejor esfuerzo: un huérfano en el storage no debe tumbar la operación. */
  async removeQuietly(tenantId: string, key: string | null): Promise<void> {
    if (!key) return;
    try {
      await this.storage.remove(tenantId, key);
    } catch (error) {
      this.logger.warn(
        `No se pudo eliminar el logo ${key}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
