import { crc32, deflateSync } from 'node:zlib';
import { generatePdf } from './generate-pdf';
import { readPngSize } from './pdf-logo';
import type { PdfDocumentDefinition } from './pdf.types';

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** PNG RGB real de un solo color, para no depender de archivos de prueba. */
function createPng(width: number, height: number): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.writeUInt8(8, 8); // profundidad de bits
  header.writeUInt8(2, 9); // tipo de color: RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, 0x16)]);
  const pixels = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(pixels)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const ALL_BLOCKS_DOCUMENT: PdfDocumentDefinition = {
  title: 'Acta de reunión del consejo',
  metadata: {
    author: 'ZEWA',
    subject: 'Acta',
    keywords: ['acta', 'consejo'],
  },
  pageSize: 'A4',
  blocks: [
    { type: 'heading', text: 'Orden del día', level: 1 },
    { type: 'heading', text: 'Asistentes', level: 3 },
    {
      type: 'paragraph',
      text: 'Se verificó el quórum y se aprobó el orden del día. Señalización y mantenimiento.',
      align: 'justify',
    },
    { type: 'list', items: ['Lectura del acta', 'Informe financiero'] },
    { type: 'list', items: ['Primero', 'Segundo'], ordered: true },
    { type: 'spacer', lines: 2 },
    {
      type: 'table',
      columns: ['Contratista', 'Objeto', 'Vence'],
      rows: [
        ['Vigilancia Andina', 'Seguridad', '31/12/2025'],
        ['Aseo Norte', 'Aseo zonas comunes', '28/02/2026'],
      ],
    },
  ],
};

const asText = (pdf: Buffer) => pdf.toString('latin1');

describe('generatePdf', () => {
  it('devuelve un Buffer con un PDF válido', async () => {
    const pdf = await generatePdf(ALL_BLOCKS_DOCUMENT);

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(asText(pdf.subarray(0, 5))).toBe('%PDF-');
    expect(asText(pdf).trimEnd().endsWith('%%EOF')).toBe(true);
  });

  it('genera un documento solo con título cuando no hay bloques', async () => {
    const pdf = await generatePdf({ title: 'Documento vacío', blocks: [] });

    expect(asText(pdf.subarray(0, 5))).toBe('%PDF-');
  });

  it('pagina tablas largas sin fallar', async () => {
    const rows = Array.from({ length: 120 }, (_, index) => [
      `Fila ${index}`,
      'Detalle',
    ]);

    const pdf = await generatePdf({
      title: 'Tabla extensa',
      blocks: [{ type: 'table', columns: ['Nombre', 'Detalle'], rows }],
    });

    const pageCount = asText(pdf).match(/\/Type \/Page\b/g)?.length ?? 0;
    expect(pageCount).toBeGreaterThan(1);
  });

  it('incluye el título en los metadatos del documento', async () => {
    const pdf = await generatePdf(
      { title: 'Informe mensual', blocks: [] },
      { compress: false },
    );

    expect(asText(pdf)).toContain('/Title');
    expect(asText(pdf)).toContain('Informe mensual');
  });

  describe('logo', () => {
    it('incrusta un logo PNG en el documento', async () => {
      const pdf = await generatePdf(
        {
          title: 'Documento con logo',
          logo: { image: createPng(40, 20), width: 120, align: 'center' },
          blocks: [{ type: 'paragraph', text: 'Contenido' }],
        },
        { compress: false },
      );

      expect(asText(pdf)).toContain('/Subtype /Image');
      expect(asText(pdf)).toContain('/Width 40');
      expect(asText(pdf)).toContain('/Height 20');
    });

    it('lee el tamaño real del PNG', () => {
      expect(readPngSize(createPng(300, 150))).toEqual({
        width: 300,
        height: 150,
      });
    });

    it('rechaza un logo que no es PNG', async () => {
      const jpegHeader = Buffer.concat([
        Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
        Buffer.alloc(30),
      ]);

      await expect(
        generatePdf({
          title: 'Logo inválido',
          logo: { image: jpegHeader },
          blocks: [],
        }),
      ).rejects.toThrow('El logo debe ser una imagen PNG válida.');
    });
  });

  it('rechaza una tabla con filas de distinto número de celdas', async () => {
    await expect(
      generatePdf({
        title: 'Tabla inválida',
        blocks: [
          { type: 'table', columns: ['A', 'B'], rows: [['solo una celda']] },
        ],
      }),
    ).rejects.toThrow('La fila 0 de la tabla tiene 1 celdas y se esperaban 2.');
  });
});
