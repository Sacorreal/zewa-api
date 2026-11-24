import type { PdfLogo } from './pdf.types';

type PdfDoc = PDFKit.PDFDocument;

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
// La firma (8 bytes) va seguida del chunk IHDR: longitud (4) + tipo (4) + ancho (4) + alto (4).
const IHDR_WIDTH_OFFSET = 16;
const IHDR_HEIGHT_OFFSET = 20;
const MIN_PNG_LENGTH = 24;

const LOGO_DEFAULTS = { width: 96, gapAfter: 0.8 } as const;

interface ImageSize {
  width: number;
  height: number;
}

export function readPngSize(image: Buffer): ImageSize {
  const isPng =
    image.length >= MIN_PNG_LENGTH &&
    image.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE);
  if (!isPng) {
    throw new Error('El logo debe ser una imagen PNG válida.');
  }
  return {
    width: image.readUInt32BE(IHDR_WIDTH_OFFSET),
    height: image.readUInt32BE(IHDR_HEIGHT_OFFSET),
  };
}

function horizontalPosition(
  doc: PdfDoc,
  width: number,
  align: NonNullable<PdfLogo['align']>,
): number {
  const { left, right } = doc.page.margins;
  const usable = doc.page.width - left - right;
  const offsets = {
    left: 0,
    center: (usable - width) / 2,
    right: usable - width,
  };
  return left + offsets[align];
}

export function renderLogo(doc: PdfDoc, logo: PdfLogo): void {
  const natural = readPngSize(logo.image);
  const width = logo.width ?? LOGO_DEFAULTS.width;
  const height = (natural.height * width) / natural.width;
  const x = horizontalPosition(doc, width, logo.align ?? 'left');
  const top = doc.y;

  doc.image(logo.image, x, top, { width });

  doc.x = doc.page.margins.left;
  doc.y = top + height;
  doc.moveDown(LOGO_DEFAULTS.gapAfter);
}
