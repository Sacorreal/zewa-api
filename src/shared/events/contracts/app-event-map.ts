/**
 * Catálogo tipado de eventos de dominio de ZEWA.
 * Cada clave es el nombre del evento y su valor, el payload que lo acompaña.
 * Para crear un evento nuevo basta con agregarlo aquí.
 */
export interface AppEventMap {
  // 🏢 CLIENTES (conjuntos residenciales)

  'client.created': {
    tenantId: string;
    clientName: string;
    adminEmail: string;
    createdByUserId: string;
    occurredAt: Date;
  };

  // ✉️ INVITACIONES

  'invitation.created': {
    invitationId: string;
    tenantId: string;
    clientName: string;
    email: string;
    /** Token en claro: solo viaja en el correo; en BD se guarda su hash. */
    activationToken: string;
    expiresAt: Date;
  };
}

export type AppEventName = keyof AppEventMap;

export type AppEventPayload<E extends AppEventName> = AppEventMap[E];
