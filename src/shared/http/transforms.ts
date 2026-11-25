import { Transform } from 'class-transformer';
import { normalizeEmail } from '../../utils/email';

const mapString =
  (fn: (value: string) => string) =>
  ({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? fn(value) : value;

/** Recorta espacios al inicio y al final. */
export const Trim = () => Transform(mapString((value) => value.trim()));

/** Normaliza un correo (recorte + minúsculas) antes de validarlo. */
export const NormalizeEmail = () => Transform(mapString(normalizeEmail));

/** Convierte "true"/"false" de formularios multipart a booleano. */
export const ToBoolean = () =>
  Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  );
