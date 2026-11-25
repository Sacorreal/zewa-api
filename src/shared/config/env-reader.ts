export type EnvReader = (key: string) => unknown;

export function readOptional(read: EnvReader, key: string): string | undefined {
  const value = read(key);
  if (typeof value === 'string') return value === '' ? undefined : value;
  if (typeof value === 'number') return String(value);
  return undefined;
}

export function readRequired(read: EnvReader, key: string): string {
  const value = readOptional(read, key);
  if (value === undefined) {
    throw new Error(`Falta la variable de entorno ${key}.`);
  }
  return value;
}
