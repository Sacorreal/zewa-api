import { detectImageType, normalizeImageMime } from './detect-image-type';
import { JPEG_BYTES, PNG_BYTES, WEBP_BYTES } from './image.fixtures';

describe('detectImageType', () => {
  it.each([
    [PNG_BYTES, 'image/png'],
    [JPEG_BYTES, 'image/jpeg'],
    [WEBP_BYTES, 'image/webp'],
  ])('reconoce la firma real del archivo', (bytes, expected) => {
    expect(detectImageType(bytes)).toBe(expected);
  });

  it.each([
    ['un GIF', Buffer.from('GIF89a')],
    ['un PDF', Buffer.from('%PDF-1.7')],
    ['un SVG', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')],
    ['un RIFF que no es WEBP', Buffer.from('RIFF\0\0\0\0WAVEfmt ')],
    ['un archivo vacío', Buffer.alloc(0)],
  ])('rechaza %s', (_, bytes) => {
    expect(detectImageType(bytes)).toBeNull();
  });

  it('normaliza los alias de JPEG', () => {
    expect(normalizeImageMime('image/JPG')).toBe('image/jpeg');
    expect(normalizeImageMime('image/pjpeg')).toBe('image/jpeg');
    expect(normalizeImageMime('image/png')).toBe('image/png');
  });
});
