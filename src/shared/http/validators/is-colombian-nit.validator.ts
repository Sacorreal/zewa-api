import { ValidateBy, type ValidationOptions } from 'class-validator';
import { parseNit } from '../../../utils/nit';

/** Valida formato y dígito de verificación de un NIT colombiano (ver `parseNit`). */
export const IsColombianNit = (options?: ValidationOptions) =>
  ValidateBy(
    {
      name: 'isColombianNit',
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && parseNit(value).valid,
        defaultMessage: (args) => {
          const value: unknown = args?.value;
          const result = typeof value === 'string' ? parseNit(value) : null;
          return result && !result.valid
            ? result.reason
            : 'El NIT no es válido.';
        },
      },
    },
    options,
  );
