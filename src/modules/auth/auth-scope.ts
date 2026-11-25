/**
 * Alcance de una sesión:
 * - `global`: SUPERADMIN en el panel de administración de la plataforma.
 * - `account`: usuario autenticado que todavía no eligió un tenant.
 * - `tenant`: usuario operando dentro de un tenant validado por su membresía.
 */
export enum AuthScope {
  Global = 'global',
  Account = 'account',
  Tenant = 'tenant',
}
