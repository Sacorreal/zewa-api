import type { AppEventPayload } from '../../../events';
import type { EmailTemplateContext } from '../contracts/email-template';
import { invitationCreatedTemplate } from './invitation-created.template';

const payload: AppEventPayload<'invitation.created'> = {
  invitationId: 'inv-1',
  tenantId: 'tenant-1',
  clientName: 'Conjunto Los Pinos',
  email: 'admin@lospinos.co',
  activationToken: 'abc&x=1',
  expiresAt: new Date('2026-12-01T15:00:00Z'),
};

const context: EmailTemplateContext = { appWebUrl: 'https://zewa.co' };

describe('invitationCreatedTemplate', () => {
  it('incluye conjunto, enlace y fecha de expiración en hora de Colombia', () => {
    const email = invitationCreatedTemplate(payload, context);

    expect(email.subject).toContain('Conjunto Los Pinos');
    expect(email.text).toContain('https://zewa.co/activar?token=abc%26x%3D1');
    expect(email.text).toContain('1 de diciembre de 2026');
    expect(email.html).toContain(
      'href="https://zewa.co/activar?token=abc%26x%3D1"',
    );
    expect(email.text).not.toMatch(/<[a-z]/i);
  });

  it('arma el enlace con la URL del frontend configurada', () => {
    const { html } = invitationCreatedTemplate(payload, {
      appWebUrl: 'https://pruebas.zewa.co/app/',
    });

    expect(html).toContain('href="https://pruebas.zewa.co/app/activar?token=');
  });

  it('escapa el contenido proporcionado por el usuario', () => {
    const { html } = invitationCreatedTemplate(
      { ...payload, clientName: '<script>alert(1)</script>' },
      context,
    );

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
