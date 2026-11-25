export const PASSWORD_MIN_LENGTH = 12;
/** Límite superior para acotar el costo de Argon2 ante entradas enormes. */
export const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_POLICY_MESSAGE = `La contraseña debe tener entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres.`;

export function isPasswordAcceptable(password: string): boolean {
  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    password.length <= PASSWORD_MAX_LENGTH
  );
}
