import type { AppEventName, AppEventPayload } from '../../../events';

/** Contenido de un correo ya renderizado. */
export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/** Configuración que las plantillas necesitan para armar enlaces. */
export interface EmailTemplateContext {
  appWebUrl: string;
}

/** Plantilla pura que convierte el payload de un evento en un correo. */
export type EmailTemplate<E extends AppEventName> = (
  payload: AppEventPayload<E>,
  context: EmailTemplateContext,
) => RenderedEmail;
