import { randomUUID } from 'node:crypto';
import {
  STORAGE_CATEGORIES,
  type StorageCategory,
} from './contracts/storage.types';
import { StorageKeyError } from './storage.errors';

const TENANTS_ROOT = 'tenants';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BASE_NAME_LENGTH = 80;
const FALLBACK_BASE_NAME = 'archivo';

export interface ObjectKeyParts {
  tenantId: string;
  category: StorageCategory;
  fileName: string;
}

function assertValidTenantId(tenantId: string): void {
  if (!UUID_PATTERN.test(tenantId)) {
    throw new StorageKeyError(`tenantId inválido para storage: "${tenantId}".`);
  }
}

function assertValidCategory(category: string): void {
  if (!(STORAGE_CATEGORIES as readonly string[]).includes(category)) {
    throw new StorageKeyError(
      `Categoría de storage desconocida: "${category}".`,
    );
  }
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Deja solo un nombre seguro: sin rutas, acentos ni caracteres especiales. */
export function sanitizeFileName(fileName: string): string {
  const baseName = fileName.split(/[\\/]/).pop() ?? '';
  const dotIndex = baseName.lastIndexOf('.');
  const hasExtension = dotIndex > 0;

  const name =
    slugify(hasExtension ? baseName.slice(0, dotIndex) : baseName).slice(
      0,
      MAX_BASE_NAME_LENGTH,
    ) || FALLBACK_BASE_NAME;
  const extension = hasExtension ? slugify(baseName.slice(dotIndex + 1)) : '';

  return extension ? `${name}.${extension}` : name;
}

/** Carpeta raíz del tenant: `tenants/<tenantId>/`. */
export function tenantRootPrefix(tenantId: string): string {
  assertValidTenantId(tenantId);
  return `${TENANTS_ROOT}/${tenantId}/`;
}

/** `tenants/<tenantId>/<category>/<uuid>-<nombre-saneado>.<ext>` */
export function buildObjectKey({
  tenantId,
  category,
  fileName,
}: ObjectKeyParts): string {
  assertValidCategory(category);
  return `${tenantRootPrefix(tenantId)}${category}/${randomUUID()}-${sanitizeFileName(fileName)}`;
}

/** Impide operar sobre archivos de otro tenant o salir de su carpeta. */
export function assertKeyBelongsToTenant(tenantId: string, key: string): void {
  const prefix = tenantRootPrefix(tenantId);
  const escapesFolder = key.split('/').some((part) => part === '..');

  if (!key.startsWith(prefix) || key === prefix || escapesFolder) {
    throw new StorageKeyError('El archivo solicitado no pertenece al tenant.');
  }
}
