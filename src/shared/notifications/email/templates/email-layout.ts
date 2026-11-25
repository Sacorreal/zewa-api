import { escapeHtml } from './escape-html';

const COLORS = {
  night: '#14263D',
  petrol: '#167C72',
  text: '#1F2937',
  muted: '#6B7280',
  background: '#F3F4F6',
  surface: '#FFFFFF',
};

const FONT_STACK = "Inter, 'Segoe UI', Arial, sans-serif";

/** Botón de llamado a la acción. Escapa etiqueta y URL. */
export function renderButton(label: string, url: string): string {
  return `<a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 24px;background:${COLORS.petrol};color:#FFFFFF;text-decoration:none;border-radius:6px;font-weight:600;">${escapeHtml(label)}</a>`;
}

/** Párrafo de texto plano escapado. */
export function renderParagraph(content: string): string {
  return `<p style="margin:0 0 16px;line-height:1.6;">${escapeHtml(content)}</p>`;
}

/**
 * Envoltorio común de los correos de ZEWA. `bodyHtml` debe venir ya escapado
 * (construido con `renderParagraph`, `renderButton` o `escapeHtml`).
 */
export function renderEmailLayout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:24px 0;background:${COLORS.background};font-family:${FONT_STACK};color:${COLORS.text};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${COLORS.surface};border-radius:8px;overflow:hidden;">
        <tr><td style="background:${COLORS.night};padding:20px 32px;color:#FFFFFF;font-size:20px;font-weight:700;letter-spacing:1px;">ZEWA</td></tr>
        <tr><td style="padding:32px;font-size:15px;">
          <h1 style="margin:0 0 20px;font-size:22px;color:${COLORS.night};">${escapeHtml(title)}</h1>
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:16px 32px;font-size:12px;color:${COLORS.muted};border-top:1px solid ${COLORS.background};">Este es un mensaje automático de ZEWA. Por favor no respondas a este correo.</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
