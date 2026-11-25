import type { EmailTemplate } from '../contracts/email-template';
import { formatDateTime } from './email-formatters';
import {
  renderButton,
  renderEmailLayout,
  renderParagraph,
} from './email-layout';

export const invitationCreatedTemplate: EmailTemplate<'invitation.created'> = ({
  clientName,
  activationUrl,
  expiresAt,
}) => {
  const title = `Bienvenido a ZEWA, ${clientName}`;
  const lines = {
    intro: `Fuiste registrado como administrador del conjunto ${clientName} en ZEWA, la plataforma para la gestión de tu propiedad horizontal.`,
    instructions:
      'Para activar tu cuenta, abre el siguiente enlace y define tu contraseña. El enlace es personal y solo puede usarse una vez.',
    expiration: `La invitación vence el ${formatDateTime(expiresAt)}. Si expira, solicita un nuevo enlace al equipo de ZEWA.`,
    ignore:
      'Si no esperabas este correo, puedes ignorarlo: tu cuenta no se activará.',
  };

  return {
    subject: `Activa tu cuenta de ZEWA para ${clientName}`,
    html: renderEmailLayout(
      title,
      [
        renderParagraph(lines.intro),
        renderParagraph(lines.instructions),
        `<p style="margin:24px 0;">${renderButton('Activar mi cuenta', activationUrl)}</p>`,
        renderParagraph(lines.expiration),
        renderParagraph(lines.ignore),
      ].join('\n'),
    ),
    text: [
      title,
      lines.intro,
      lines.instructions,
      `Activar mi cuenta: ${activationUrl}`,
      lines.expiration,
      lines.ignore,
    ].join('\n\n'),
  };
};
