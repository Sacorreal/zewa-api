import type {
  PdfBlock,
  PdfBlockType,
  PdfHeadingBlock,
  PdfListBlock,
  PdfParagraphBlock,
  PdfSpacerBlock,
  PdfTableBlock,
} from './pdf.types';

type PdfDoc = PDFKit.PDFDocument;

export const PDF_STYLES = {
  fonts: { regular: 'Helvetica', bold: 'Helvetica-Bold' },
  title: { fontSize: 20, gapAfter: 1 },
  headingFontSize: { 1: 16, 2: 14, 3: 12 },
  bodyFontSize: 11,
  blockGap: 0.6,
  table: { cellPadding: 4, lineColor: '#D0D5DD', lineWidth: 0.5 },
} as const;

type BlockRenderer<T extends PdfBlock> = (doc: PdfDoc, block: T) => void;

type BlockRendererRegistry = {
  [K in PdfBlockType]: BlockRenderer<Extract<PdfBlock, { type: K }>>;
};

const useBodyFont = (doc: PdfDoc, bold = false) =>
  doc
    .font(bold ? PDF_STYLES.fonts.bold : PDF_STYLES.fonts.regular)
    .fontSize(PDF_STYLES.bodyFontSize);

const usableWidth = (doc: PdfDoc) =>
  doc.page.width - doc.page.margins.left - doc.page.margins.right;

const bottomLimit = (doc: PdfDoc) => doc.page.height - doc.page.margins.bottom;

export function renderTitle(doc: PdfDoc, title: string): void {
  doc
    .font(PDF_STYLES.fonts.bold)
    .fontSize(PDF_STYLES.title.fontSize)
    .text(title)
    .moveDown(PDF_STYLES.title.gapAfter);
}

const renderHeading: BlockRenderer<PdfHeadingBlock> = (doc, block) => {
  doc
    .font(PDF_STYLES.fonts.bold)
    .fontSize(PDF_STYLES.headingFontSize[block.level ?? 1])
    .text(block.text)
    .moveDown(PDF_STYLES.blockGap / 2);
};

const renderParagraph: BlockRenderer<PdfParagraphBlock> = (doc, block) => {
  useBodyFont(doc)
    .text(block.text, { align: block.align ?? 'left' })
    .moveDown(PDF_STYLES.blockGap);
};

const renderList: BlockRenderer<PdfListBlock> = (doc, block) => {
  useBodyFont(doc)
    .list(block.items, { listType: block.ordered ? 'numbered' : 'bullet' })
    .moveDown(PDF_STYLES.blockGap);
};

const renderSpacer: BlockRenderer<PdfSpacerBlock> = (doc, block) => {
  doc.moveDown(block.lines ?? 1);
};

function assertTableShape(block: PdfTableBlock): void {
  const invalidRow = block.rows.findIndex(
    (row) => row.length !== block.columns.length,
  );
  if (invalidRow !== -1) {
    throw new Error(
      `La fila ${invalidRow} de la tabla tiene ${block.rows[invalidRow].length} celdas y se esperaban ${block.columns.length}.`,
    );
  }
}

function drawTableRow(doc: PdfDoc, cells: string[], bold: boolean): void {
  const { cellPadding, lineColor, lineWidth } = PDF_STYLES.table;
  const left = doc.page.margins.left;
  const columnWidth = usableWidth(doc) / cells.length;
  const textWidth = columnWidth - cellPadding * 2;

  useBodyFont(doc, bold);
  const rowHeight =
    Math.max(
      ...cells.map((cell) => doc.heightOfString(cell, { width: textWidth })),
    ) +
    cellPadding * 2;

  if (doc.y + rowHeight > bottomLimit(doc)) doc.addPage();

  const top = doc.y;
  cells.forEach((cell, index) => {
    doc.text(
      cell,
      left + index * columnWidth + cellPadding,
      top + cellPadding,
      {
        width: textWidth,
      },
    );
  });

  const bottom = top + rowHeight;
  doc
    .moveTo(left, bottom)
    .lineTo(left + usableWidth(doc), bottom)
    .lineWidth(lineWidth)
    .strokeColor(lineColor)
    .stroke();

  doc.x = left;
  doc.y = bottom;
}

const renderTable: BlockRenderer<PdfTableBlock> = (doc, block) => {
  assertTableShape(block);
  drawTableRow(doc, block.columns, true);
  block.rows.forEach((row) => drawTableRow(doc, row, false));
  doc.moveDown(PDF_STYLES.blockGap);
};

export const BLOCK_RENDERERS: BlockRendererRegistry = {
  heading: renderHeading,
  paragraph: renderParagraph,
  list: renderList,
  table: renderTable,
  spacer: renderSpacer,
};

export function renderBlock(doc: PdfDoc, block: PdfBlock): void {
  const renderer = BLOCK_RENDERERS[block.type] as BlockRenderer<PdfBlock>;
  renderer(doc, block);
}
