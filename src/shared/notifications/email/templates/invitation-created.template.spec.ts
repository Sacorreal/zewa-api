import type { AppEventPayload } from '../../../events';
import { invitationCreatedTemplate } from './invitation-created.template';

const payload: AppEventPayload<'invitation.created'> = {
  invitationId: 'inv-1',
  tenantId: 'tenant-1',
  clientName: 'Conjunto Los Pinos',
  email: 'admin@lospinos.co',
  activationUrl: 'https://zewa.co/activar?token=abc&x=1',
  expiresAt: new Date('2026-12-01T15:00:00Z'),
};

describe('invitationCreatedTemplate', () => {
  it('incluye conjunto, enlace y fecha de expiración en hora de Colombia', () => {
    const email = invitationCreatedTemplate(payload);

    expect(email.subject).toContain('Conjunto Los Pinos');
    expect(email.text).toContain(payload.activationUrl);
    expect(email.text).toContain('1 de diciembre de 2026');
    expect(email.html).toContain(
      'href="https://zewa.co/activar?token=abc&amp;x=1"',
    );
    expect(email.text).not.toMatch(/<[a-z]/i);
  });

  it('escapa el contenido proporcionado por el usuario', () => {
    const { html } = invitationCreatedTemplate({
      ...payload,
      clientName: '<script>alert(1)</script>',
    });

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
