/** Campos de `Express.Multer.File` que usa la API (evita depender de @types/multer). */
export interface UploadedFileData {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}
