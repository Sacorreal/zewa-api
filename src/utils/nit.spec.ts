import { computeNitCheckDigit, nitSearchDigits, parseNit } from './nit';

describe('NIT colombiano', () => {
  it.each([
    ['900123456', 8],
    ['800197268', 4],
    ['860002964', 4],
    ['899999034', 1],
  ])('calcula el dígito de verificación de %s', (base, expected) => {
    expect(computeNitCheckDigit(base)).toBe(expected);
  });

  it('normaliza puntos, espacios y comas y conserva el formato base-dv', () => {
    expect(parseNit(' 900.123.456-8 ')).toEqual({
      valid: true,
      base: '900123456',
      checkDigit: 8,
      normalized: '900123456-8',
    });
    expect(parseNit('900 123 456 - 8')).toMatchObject({
      normalized: '900123456-8',
    });
  });

  it('calcula el dígito cuando no se informa', () => {
    expect(parseNit('900123456')).toMatchObject({
      valid: true,
      normalized: '900123456-8',
    });
  });

  it('rechaza un dígito de verificación incorrecto', () => {
    expect(parseNit('900123456-3')).toEqual({
      valid: false,
      reason: 'El dígito de verificación del NIT no es válido.',
    });
  });

  it.each(['1234567', '12345678901', '900ABC456', '', '900123456-', '9001-23'])(
    'rechaza el formato inválido %p',
    (raw) => {
      expect(parseNit(raw).valid).toBe(false);
    },
  );

  it('extrae los dígitos para búsquedas', () => {
    expect(nitSearchDigits('900.123')).toBe('900123');
  });
});
