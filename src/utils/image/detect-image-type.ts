/** Formatos de imagen aceptados para logos, detectados por su firma (magic bytes). */
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

export type ImageType = (typeof IMAGE_TYPES)[number];

interface ImageSignature {
  type: ImageType;
  matches: (bytes: Buffer) => boolean;
}

const startsWith = (bytes: Buffer, signature: number[], offset = 0): boolean =>
  bytes.length >= offset + signature.length &&
  signature.every((byte, index) => bytes[offset + index] === byte);

const ascii = (text: string): number[] =>
  [...text].map((char) => char.charCodeAt(0));

const SIGNATURES: ImageSignature[] = [
  {
    type: 'image/png',
    matches: (bytes) =>
      startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  {
    type: 'image/jpeg',
    matches: (bytes) => startsWith(bytes, [0xff, 0xd8, 0xff]),
  },
  {
    type: 'image/webp',
    matches: (bytes) =>
      startsWith(bytes, ascii('RIFF')) && startsWith(bytes, ascii('WEBP'), 8),
  },
];

/** Tipo real de la imagen según su contenido, o `null` si no es un formato aceptado. */
export function detectImageType(bytes: Buffer): ImageType | null {
  return SIGNATURES.find(({ matches }) => matches(bytes))?.type ?? null;
}

/** Normaliza alias de MIME declarados por navegadores (p. ej. `image/jpg`). */
export function normalizeImageMime(mime: string): string {
  const lower = mime.trim().toLowerCase();
  return lower === 'image/jpg' || lower === 'image/pjpeg'
    ? 'image/jpeg'
    : lower;
}
