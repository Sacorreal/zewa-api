export const trimTrailingSlash = (url: string): string =>
  url.replace(/\/+$/, '');

/** Une una URL base (con o sin subruta) con una ruta y parámetros de consulta codificados. */
export function buildUrl(
  baseUrl: string,
  path: string,
  query: Record<string, string> = {},
): string {
  const url = new URL(
    `${trimTrailingSlash(baseUrl)}/${path.replace(/^\/+/, '')}`,
  );
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}
