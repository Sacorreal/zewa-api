import type { StorageCategory } from './contracts/storage.types';
import {
  assertKeyBelongsToTenant,
  buildObjectKey,
  sanitizeFileName,
  tenantRootPrefix,
} from './tenant-storage-path';

const TENANT_ID = '3f1c2a4e-8b7d-4c1a-9e2f-0a1b2c3d4e5f';
const OTHER_TENANT_ID = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';

describe('tenantRootPrefix', () => {
  it('devuelve la carpeta del tenant', () => {
    expect(tenantRootPrefix(TENANT_ID)).toBe(`tenants/${TENANT_ID}/`);
  });

  it.each(['', 'no-es-uuid', '../otro', `${TENANT_ID}/../x`])(
    'rechaza el tenantId "%s"',
    (tenantId) => {
      expect(() => tenantRootPrefix(tenantId)).toThrow('tenantId inválido');
    },
  );
});

describe('sanitizeFileName', () => {
  it.each([
    ['Logo Conjunto Ñandú.PNG', 'logo-conjunto-nandu.png'],
    ['../../etc/passwd', 'passwd'],
    ['C:\\fotos\\acta final.pdf', 'acta-final.pdf'],
    ['.env', 'env'],
    ['###.pdf', 'archivo.pdf'],
  ])('"%s" → "%s"', (input, expected) => {
    expect(sanitizeFileName(input)).toBe(expected);
  });
});

describe('buildObjectKey', () => {
  it('ubica el archivo en la categoría del tenant con un prefijo único', () => {
    const key = buildObjectKey({
      tenantId: TENANT_ID,
      category: 'branding',
      fileName: 'Logo.png',
    });

    expect(key).toMatch(
      new RegExp(`^tenants/${TENANT_ID}/branding/[0-9a-f-]{36}-logo\\.png$`),
    );
  });

  it('genera keys distintas para el mismo archivo', () => {
    const parts = {
      tenantId: TENANT_ID,
      category: 'documents' as const,
      fileName: 'acta.pdf',
    };
    expect(buildObjectKey(parts)).not.toBe(buildObjectKey(parts));
  });

  it('rechaza categorías desconocidas', () => {
    expect(() =>
      buildObjectKey({
        tenantId: TENANT_ID,
        category: 'secretos' as StorageCategory,
        fileName: 'x.pdf',
      }),
    ).toThrow('Categoría de storage desconocida');
  });
});

describe('assertKeyBelongsToTenant', () => {
  const ownKey = `tenants/${TENANT_ID}/documents/acta.pdf`;

  it('acepta keys dentro de la carpeta del tenant', () => {
    expect(() => assertKeyBelongsToTenant(TENANT_ID, ownKey)).not.toThrow();
  });

  it.each([
    `tenants/${OTHER_TENANT_ID}/documents/acta.pdf`,
    `tenants/${TENANT_ID}/../${OTHER_TENANT_ID}/documents/acta.pdf`,
    `tenants/${TENANT_ID}/`,
    'documents/acta.pdf',
  ])('rechaza "%s"', (key) => {
    expect(() => assertKeyBelongsToTenant(TENANT_ID, key)).toThrow(
      'no pertenece al tenant',
    );
  });
});
