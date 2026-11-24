export type PdfPageSize = 'A4' | 'LETTER';

export type PdfTextAlign = 'left' | 'center' | 'right' | 'justify';

export interface PdfMetadata {
  author?: string;
  subject?: string;
  keywords?: string[];
}

export interface PdfHeadingBlock {
  type: 'heading';
  text: string;
  level?: 1 | 2 | 3;
}

export interface PdfParagraphBlock {
  type: 'paragraph';
  text: string;
  align?: PdfTextAlign;
}

export interface PdfListBlock {
  type: 'list';
  items: string[];
  ordered?: boolean;
}

export interface PdfTableBlock {
  type: 'table';
  columns: string[];
  rows: string[][];
}

export interface PdfSpacerBlock {
  type: 'spacer';
  lines?: number;
}

export type PdfBlock =
  | PdfHeadingBlock
  | PdfParagraphBlock
  | PdfListBlock
  | PdfTableBlock
  | PdfSpacerBlock;

export type PdfBlockType = PdfBlock['type'];

export interface PdfLogo {
  /** Contenido del archivo PNG. */
  image: Buffer;
  /** Ancho en puntos; el alto se calcula manteniendo la proporción. */
  width?: number;
  align?: 'left' | 'center' | 'right';
}

export interface PdfDocumentDefinition {
  title: string;
  logo?: PdfLogo;
  metadata?: PdfMetadata;
  pageSize?: PdfPageSize;
  blocks: PdfBlock[];
}

export interface GeneratePdfOptions {
  /** Comprime los streams del PDF. Desactivarlo solo sirve para inspeccionar el contenido (p. ej. en tests). */
  compress?: boolean;
}
