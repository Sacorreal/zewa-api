/** Key, tenant o categoría de storage inválidos: error del cliente, no del proveedor. */
export class StorageKeyError extends Error {
  override readonly name = 'StorageKeyError';
}
