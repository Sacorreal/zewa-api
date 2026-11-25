/** Carpetas permitidas dentro de la carpeta de cada tenant. Agregar una = agregarla aquí. */
export const STORAGE_CATEGORIES = [
  'branding',
  'documents',
  'invoices',
  'reports',
] as const;

export type StorageCategory = (typeof STORAGE_CATEGORIES)[number];

/**
 * `public`: legible por cualquiera con la URL (p. ej. logos), servido por CDN si existe.
 * `private`: solo accesible con una URL prefirmada temporal.
 */
export const FILE_VISIBILITIES = ['public', 'private'] as const;

export type FileVisibility = (typeof FILE_VISIBILITIES)[number];

export interface StorageOptions {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
  signedUrlTtlSeconds: number;
}

export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
  visibility: FileVisibility;
}

export interface UploadFileInput {
  /** Debe venir de la membresía resuelta en el backend, nunca del frontend. */
  tenantId: string;
  category: StorageCategory;
  fileName: string;
  body: Buffer;
  contentType: string;
  visibility: FileVisibility;
}

/** Referencia que se persiste en base de datos (`key` + `visibility`), nunca el binario. */
export interface StoredFile {
  key: string;
  visibility: FileVisibility;
  contentType: string;
  size: number;
  url?: string;
}
