import { BadRequestException } from '@nestjs/common';
import type { UploadedFileData } from '../../shared/http/uploaded-file';
import { JPEG_BYTES, PNG_BYTES } from '../../utils/image/image.fixtures';
import { LogoFilePipe, MAX_LOGO_BYTES } from './client-logo';

const file = (overrides: Partial<UploadedFileData>): UploadedFileData => ({
  originalname: 'logo.png',
  mimetype: 'image/png',
  buffer: PNG_BYTES,
  size: PNG_BYTES.length,
  ...overrides,
});

describe('LogoFilePipe', () => {
  const pipe = new LogoFilePipe();

  it('el logo es opcional', () => {
    expect(pipe.transform(undefined)).toBeUndefined();
  });

  it('acepta una imagen válida y usa el tipo detectado por contenido', () => {
    expect(
      pipe.transform(
        file({
          originalname: 'logo.jpg',
          mimetype: 'image/jpg',
          buffer: JPEG_BYTES,
        }),
      ),
    ).toEqual({
      fileName: 'logo.jpg',
      body: JPEG_BYTES,
      contentType: 'image/jpeg',
    });
  });

  it('rechaza archivos mayores a 5 MB', () => {
    expect(() => pipe.transform(file({ size: MAX_LOGO_BYTES + 1 }))).toThrow(
      'El logo no puede superar 5 MB.',
    );
  });

  it('rechaza contenido que no es una imagen aunque la extensión lo sea', () => {
    expect(() =>
      pipe.transform(file({ buffer: Buffer.from('<?php echo 1; ?>') })),
    ).toThrow('El logo debe ser una imagen PNG, JPG o WEBP.');
  });

  it('rechaza un MIME declarado distinto del contenido real', () => {
    expect(() => pipe.transform(file({ mimetype: 'image/webp' }))).toThrow(
      BadRequestException,
    );
  });

  it('rechaza archivos vacíos', () => {
    expect(() => pipe.transform(file({ size: 0 }))).toThrow(
      'El logo está vacío.',
    );
  });
});
