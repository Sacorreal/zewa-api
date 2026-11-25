import { PasswordHasher } from './password-hasher';
import { isPasswordAcceptable } from './password-policy';

describe('PasswordHasher', () => {
  const hasher = new PasswordHasher();

  it('usa Argon2id y nunca guarda la contraseña en claro', async () => {
    const hash = await hasher.hash('una-clave-muy-segura');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(hash).not.toContain('una-clave-muy-segura');
  });

  it('verifica la contraseña correcta y rechaza la incorrecta', async () => {
    const hash = await hasher.hash('una-clave-muy-segura');
    await expect(hasher.verify('una-clave-muy-segura', hash)).resolves.toBe(
      true,
    );
    await expect(hasher.verify('otra-clave-distinta', hash)).resolves.toBe(
      false,
    );
  });

  it('sin hash (usuario inexistente o pendiente) siempre falla', async () => {
    await expect(hasher.verify('cualquier-clave', null)).resolves.toBe(false);
    await expect(
      hasher.verify('zewa-timing-equalizer', undefined),
    ).resolves.toBe(false);
  });
});

describe('política de contraseñas', () => {
  it.each([
    ['a'.repeat(11), false],
    ['a'.repeat(12), true],
    ['a'.repeat(128), true],
    ['a'.repeat(129), false],
  ])('longitud de %p → %p', (password, expected) => {
    expect(isPasswordAcceptable(password)).toBe(expected);
  });
});
