/**
 * NIT colombiano (DIAN): número base de 8 a 10 dígitos y dígito de verificación
 * (DV) calculado con módulo 11. Se almacena normalizado como `<base>-<dv>`.
 */

/** Pesos DIAN, aplicados desde el dígito menos significativo del número base. */
const DIAN_WEIGHTS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

const PRESENTATION_CHARS = /[\s.,]/g;
const NIT_PATTERN = /^(\d{8,10})(?:-(\d))?$/;

export type NitParseResult =
  | { valid: true; base: string; checkDigit: number; normalized: string }
  | { valid: false; reason: string };

export function computeNitCheckDigit(base: string): number {
  const sum = [...base]
    .reverse()
    .reduce(
      (total, digit, index) => total + Number(digit) * DIAN_WEIGHTS[index],
      0,
    );
  const remainder = sum % 11;
  return remainder > 1 ? 11 - remainder : remainder;
}

/**
 * Limpia los caracteres de presentación (puntos, comas, espacios) y valida el
 * formato. Si el NIT trae DV (separado por guion) debe coincidir con el
 * calculado; si no lo trae, se calcula.
 */
export function parseNit(raw: string): NitParseResult {
  const match = NIT_PATTERN.exec(raw.replace(PRESENTATION_CHARS, ''));
  if (!match) {
    return {
      valid: false,
      reason:
        'El NIT debe tener entre 8 y 10 dígitos y, opcionalmente, el dígito de verificación separado por guion (p. ej. 900.123.456-8).',
    };
  }

  const [, base, providedDigit] = match;
  const checkDigit = computeNitCheckDigit(base);

  if (providedDigit !== undefined && Number(providedDigit) !== checkDigit) {
    return {
      valid: false,
      reason: 'El dígito de verificación del NIT no es válido.',
    };
  }

  return { valid: true, base, checkDigit, normalized: `${base}-${checkDigit}` };
}

/** Dígitos del NIT sin presentación, útil para búsquedas parciales. */
export function nitSearchDigits(raw: string): string {
  return raw.replace(/\D/g, '');
}
