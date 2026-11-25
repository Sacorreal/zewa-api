import type { EnvReader } from '../../config/env-reader';
import { buildEmailOptions } from './email.config';

const readerFrom =
  (env: Record<string, string>): EnvReader =>
  (key) =>
    env[key];

const APP_WEB = { ENDPOINT_APP_WEB: 'https://pruebas.zewa.co/' };

describe('buildEmailOptions', () => {
  it('usa Resend por defecto', () => {
    expect(
      buildEmailOptions(
        readerFrom({ EMAIL_FROM: 'ZEWA <no-reply@zewa.co>', ...APP_WEB }),
      ),
    ).toEqual({
      provider: 'resend',
      from: 'ZEWA <no-reply@zewa.co>',
      appWebUrl: 'https://pruebas.zewa.co',
    });
  });

  it('lee el proveedor y la dirección de respuesta configurados', () => {
    expect(
      buildEmailOptions(
        readerFrom({
          EMAIL_PROVIDER: 'log',
          EMAIL_FROM: 'no-reply@zewa.co',
          EMAIL_REPLY_TO: 'soporte@zewa.co',
          ...APP_WEB,
        }),
      ),
    ).toEqual({
      provider: 'log',
      from: 'no-reply@zewa.co',
      replyTo: 'soporte@zewa.co',
      appWebUrl: 'https://pruebas.zewa.co',
    });
  });

  it('rechaza un proveedor desconocido', () => {
    expect(() =>
      buildEmailOptions(
        readerFrom({ EMAIL_PROVIDER: 'smtp', EMAIL_FROM: 'no-reply@zewa.co' }),
      ),
    ).toThrow('EMAIL_PROVIDER debe ser uno de: resend, log.');
  });

  it('exige EMAIL_FROM', () => {
    expect(() => buildEmailOptions(readerFrom({}))).toThrow('EMAIL_FROM');
  });

  it('exige ENDPOINT_APP_WEB', () => {
    expect(() =>
      buildEmailOptions(readerFrom({ EMAIL_FROM: 'no-reply@zewa.co' })),
    ).toThrow('ENDPOINT_APP_WEB');
  });
});
