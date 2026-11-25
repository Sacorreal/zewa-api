/** Forma canónica de un correo: sin espacios exteriores y en minúsculas. */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}
