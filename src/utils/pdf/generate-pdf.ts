import PDFDocument from 'pdfkit';
import { renderBlock, renderTitle } from './pdf-block-renderers';
import { renderLogo } from './pdf-logo';
import type {
  GeneratePdfOptions,
  PdfDocumentDefinition,
  PdfMetadata,
} from './pdf.types';

const DEFAULT_PAGE_SIZE = 'LETTER';
const PAGE_MARGIN = 56;

/** pdfkit invoca `.valueOf()` sobre cada entrada de `info`, por lo que solo se incluyen valores definidos. */
function buildInfo(
  title: string,
  metadata: PdfMetadata = {},
): PDFKit.DocumentInfo {
  const entries = {
    Title: title,
    Author: metadata.author,
    Subject: metadata.subject,
    Keywords: metadata.keywords?.join(', '),
  };
  return Object.fromEntries(
    Object.entries(entries).filter(([, value]) => value !== undefined),
  );
}

function createDocument(
  definition: PdfDocumentDefinition,
  options: GeneratePdfOptions,
): PDFKit.PDFDocument {
  const { title, metadata, pageSize = DEFAULT_PAGE_SIZE } = definition;
  return new PDFDocument({
    size: pageSize,
    margin: PAGE_MARGIN,
    compress: options.compress ?? true,
    info: buildInfo(title, metadata),
  });
}

/** Genera un PDF a partir de una definición de documento y lo devuelve como Buffer. */
export function generatePdf(
  definition: PdfDocumentDefinition,
  options: GeneratePdfOptions = {},
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = createDocument(definition, options);
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    try {
      if (definition.logo) renderLogo(doc, definition.logo);
      renderTitle(doc, definition.title);
      definition.blocks.forEach((block) => renderBlock(doc, block));
      doc.end();
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}
