import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { DataSource } from 'typeorm';
import {
  bootstrapSuperAdmin,
  resetSuperAdminPassword,
  SuperAdminBootstrapError,
} from '../src/cli/superadmin-bootstrap';
import { PasswordHasher } from '../src/shared/security/password-hasher';
import { PNG_BYTES } from '../src/utils/image/image.fixtures';
import type { InMemoryEmailProvider } from './utils/fakes';
import { createTestApp } from './utils/test-app';

const ROOT = { email: 'root@zewa.test', password: 'clave-superadmin-segura' };
const ADMIN_PASSWORD = 'clave-administrador-1';
const API = '/api/v1';

interface Client {
  id: string;
  status: string;
  taxId: string;
  logoUrl: string | null;
}

describe('Administración global de clientes (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let email: InMemoryEmailProvider;
  let rootToken: string;

  const http = () => request(app.getHttpServer());

  const login = (user: string, password: string) =>
    http().post(`${API}/auth/login`).send({ email: user, password });

  const createClient = (
    fields: { name: string; taxId: string; administratorEmail: string },
    logo?: { bytes: Buffer; name: string; type: string },
    token = rootToken,
  ) => {
    const call = http()
      .post(`${API}/admin/clients`)
      .set('Authorization', `Bearer ${token}`)
      .field('name', fields.name)
      .field('taxId', fields.taxId)
      .field('administratorEmail', fields.administratorEmail);
    return logo
      ? call.attach('logo', logo.bytes, {
          filename: logo.name,
          contentType: logo.type,
        })
      : call;
  };

  const acceptInvitation = (token: string, password?: string) =>
    http()
      .post(`${API}/auth/invitations/accept`)
      .send(password ? { token, password } : { token });

  /** Login del administrador + selección del tenant (alcance `tenant`). */
  const tenantTokenFor = async (adminEmail: string, tenantId: string) => {
    const { body } = await login(adminEmail, ADMIN_PASSWORD);
    const selection = await http()
      .post(`${API}/auth/tenant-session`)
      .set('Authorization', `Bearer ${body.tokens.accessToken as string}`)
      .send({ tenantId });
    return selection;
  };

  const currentTenant = (token: string) =>
    http().get(`${API}/tenant/current`).set('Authorization', `Bearer ${token}`);

  const setStatus = (id: string, status: string) =>
    http()
      .patch(`${API}/admin/clients/${id}/status`)
      .set('Authorization', `Bearer ${rootToken}`)
      .send({ status });

  beforeAll(async () => {
    ({ app, dataSource, email } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  describe('CA-01 bootstrap del SUPERADMIN', () => {
    it('crea el superadministrador cuando no existe ninguno', async () => {
      const superAdmin = await bootstrapSuperAdmin(
        ROOT,
        dataSource,
        new PasswordHasher(),
      );
      expect(superAdmin.platformRole).toBe('SUPERADMIN');
    });

    it('no permite un segundo bootstrap', async () => {
      await expect(
        bootstrapSuperAdmin(
          { email: 'otro@zewa.test', password: 'otra-clave-segura' },
          dataSource,
          new PasswordHasher(),
        ),
      ).rejects.toThrow(SuperAdminBootstrapError);
    });
  });

  describe('CA-02 autenticación global', () => {
    it('el SUPERADMIN obtiene una sesión de alcance global', async () => {
      const response = await login(ROOT.email, ROOT.password).expect(200);
      expect(response.body.tokens.scope).toBe('global');
      rootToken = response.body.tokens.accessToken as string;
    });

    it('sin token, los endpoints globales responden 401', async () => {
      await http().get(`${API}/admin/clients`).expect(401);
    });

    it('el dashboard muestra los indicadores', async () => {
      const { body } = await http()
        .get(`${API}/admin/clients/stats`)
        .set('Authorization', `Bearer ${rootToken}`)
        .expect(200);
      expect(body).toEqual({
        total: 0,
        active: 0,
        pendingActivation: 0,
        suspended: 0,
      });
    });

    it('la contraseña incorrecta se rechaza con un mensaje genérico', async () => {
      const { body } = await login(ROOT.email, 'clave-equivocada').expect(401);
      expect(body.message).toBe('Correo o contraseña incorrectos.');
    });
  });

  describe('CA-03 a CA-08: registro, invitación y activación', () => {
    let pinos: Client;

    it('CA-03/04/06 crea el cliente sin logo, pendiente, y envía la invitación', async () => {
      const { body } = await createClient({
        name: '  Conjunto Los Pinos ',
        taxId: '900.123.456-8',
        administratorEmail: 'Admin@LosPinos.test',
      }).expect(201);

      pinos = body.client as Client;
      expect(body.client).toMatchObject({
        name: 'Conjunto Los Pinos',
        taxId: '900123456-8',
        administratorEmail: 'admin@lospinos.test',
        status: 'PENDING_ACTIVATION',
        logoUrl: null,
      });
      expect(body.invitation).toMatchObject({
        email: 'admin@lospinos.test',
        deliveryStatus: 'SENT',
      });

      const [{ token_hash: storedHash }] = await dataSource.query<
        Array<{ token_hash: string }>
      >('SELECT token_hash FROM invitations');
      const token = email.lastActivationTokenFor('admin@lospinos.test');
      expect(storedHash).toHaveLength(64);
      expect(storedHash).not.toBe(token);
    });

    it('CA-05 rechaza un NIT duplicado aunque cambie su presentación', async () => {
      const { body } = await createClient({
        name: 'Otro conjunto',
        taxId: '900 123 456',
        administratorEmail: 'otro@conjunto.test',
      }).expect(409);
      expect(body.message).toBe(
        'Ya existe un cliente registrado con el NIT 900123456-8.',
      );
    });

    it('rechaza NIT con dígito de verificación inválido y correo mal formado', async () => {
      const { body } = await createClient({
        name: 'Conjunto X',
        taxId: '900123456-1',
        administratorEmail: 'no-es-correo',
      }).expect(400);
      expect(body.message).toEqual(
        expect.arrayContaining([
          'El dígito de verificación del NIT no es válido.',
          'Ingresa un correo electrónico válido.',
        ]),
      );
    });

    it('el administrador no puede iniciar sesión antes de activar', async () => {
      await login('admin@lospinos.test', ADMIN_PASSWORD).expect(401);
    });

    it('valida la invitación y pide definir contraseña', async () => {
      const token = email.lastActivationTokenFor('admin@lospinos.test');
      const { body } = await http()
        .post(`${API}/auth/invitations/validate`)
        .send({ token })
        .expect(200);
      expect(body).toMatchObject({
        clientName: 'Conjunto Los Pinos',
        email: 'admin@lospinos.test',
        requiresPassword: true,
      });
    });

    it('exige una contraseña robusta al aceptar', async () => {
      const token = email.lastActivationTokenFor('admin@lospinos.test');
      await acceptInvitation(token, 'corta').expect(400);
    });

    it('CA-07 acepta la invitación, activa la cuenta y el cliente', async () => {
      const token = email.lastActivationTokenFor('admin@lospinos.test');
      await acceptInvitation(token, ADMIN_PASSWORD).expect(200);

      const { body } = await http()
        .get(`${API}/admin/clients/${pinos.id}`)
        .set('Authorization', `Bearer ${rootToken}`)
        .expect(200);
      expect(body.status).toBe('ACTIVE');
      expect(body.activatedAt).not.toBeNull();
      expect(body.memberships).toEqual([
        expect.objectContaining({
          email: 'admin@lospinos.test',
          status: 'ACTIVE',
          roles: ['ADMINISTRADOR'],
        }),
      ]);
      expect(body.invitation.state).toBe('ACCEPTED');
    });

    it('CA-08 una invitación utilizada no puede volver a aceptarse', async () => {
      const token = email.lastActivationTokenFor('admin@lospinos.test');
      const { body } = await acceptInvitation(token, ADMIN_PASSWORD).expect(
        400,
      );
      expect(body.message).toContain('ya fue utilizada');
    });

    it('CA-08 una invitación expirada se rechaza', async () => {
      await createClient({
        name: 'Conjunto Expirado',
        taxId: '800197268-4',
        administratorEmail: 'expira@conjunto.test',
      }).expect(201);
      await dataSource.query(
        `UPDATE invitations SET expires_at = now() - interval '1 minute' WHERE accepted_at IS NULL`,
      );

      const token = email.lastActivationTokenFor('expira@conjunto.test');
      const { body } = await acceptInvitation(token, ADMIN_PASSWORD).expect(
        400,
      );
      expect(body.message).toContain('expiró');
    });

    it('un token inexistente se rechaza sin dar detalles', async () => {
      const { body } = await acceptInvitation(
        'token-falso',
        ADMIN_PASSWORD,
      ).expect(400);
      expect(body.message).toBe('El enlace de activación no es válido.');
    });
  });

  describe('logo', () => {
    it('acepta un PNG válido y guarda la referencia, no el binario', async () => {
      const { body } = await createClient(
        {
          name: 'Conjunto Con Logo',
          taxId: '860002964-4',
          administratorEmail: 'logo@conjunto.test',
        },
        { bytes: PNG_BYTES, name: 'logo.png', type: 'image/png' },
      ).expect(201);

      expect(body.client.logoUrl).toMatch(
        /^https:\/\/cdn\.test\/tenants\/[\w-]+\/branding\/.+\.png$/,
      );
      const [{ logo_key: logoKey }] = await dataSource.query<
        Array<{ logo_key: string }>
      >('SELECT logo_key FROM tenants WHERE id = $1', [body.client.id]);
      expect(logoKey).toMatch(/^tenants\/.+\/branding\//);
    });

    it('rechaza un archivo que no es imagen aunque declare image/png', async () => {
      const { body } = await createClient(
        {
          name: 'Conjunto Logo Falso',
          taxId: '899999034-1',
          administratorEmail: 'falso@conjunto.test',
        },
        { bytes: Buffer.from('%PDF-1.7'), name: 'logo.png', type: 'image/png' },
      ).expect(400);
      expect(body.message).toBe('El logo debe ser una imagen PNG, JPG o WEBP.');

      const [{ count }] = await dataSource.query<Array<{ count: string }>>(
        `SELECT count(*) FROM tenants WHERE tax_id = '899999034-1'`,
      );
      expect(count).toBe('0');
    });
  });

  describe('consistencia transaccional', () => {
    it('si la transacción falla no queda ningún registro parcial', async () => {
      const before = await dataSource.query<Array<{ count: string }>>(
        'SELECT count(*) FROM tenants',
      );
      await createClient({
        name: 'Conjunto Inválido',
        taxId: '890903938-8',
        administratorEmail: ROOT.email,
      }).expect(409);
      const after = await dataSource.query<Array<{ count: string }>>(
        'SELECT count(*) FROM tenants',
      );
      expect(after).toEqual(before);
    });

    it('dos registros simultáneos con el mismo NIT: solo uno prospera', async () => {
      const fields = (n: number) => ({
        name: `Conjunto Concurrente ${n}`,
        taxId: '811009788-8',
        administratorEmail: `concurrente${n}@conjunto.test`,
      });
      const statuses = (
        await Promise.all([createClient(fields(1)), createClient(fields(2))])
      ).map(({ status }) => status);

      expect(statuses.sort()).toEqual([201, 409]);
    });

    it('si el correo falla, el cliente queda pendiente y se puede reenviar', async () => {
      email.failNext();
      const { body } = await createClient({
        name: 'Conjunto Sin Correo',
        taxId: '830054539-0',
        administratorEmail: 'sincorreo@conjunto.test',
      }).expect(201);
      expect(body.invitation.deliveryStatus).toBe('FAILED');
      expect(body.client.status).toBe('PENDING_ACTIVATION');

      const resent = await http()
        .post(
          `${API}/admin/clients/${body.client.id as string}/resend-invitation`,
        )
        .set('Authorization', `Bearer ${rootToken}`)
        .expect(200);
      expect(resent.body.deliveryStatus).toBe('SENT');

      const token = email.lastActivationTokenFor('sincorreo@conjunto.test');
      await acceptInvitation(token, ADMIN_PASSWORD).expect(200);
    });
  });

  describe('CA-09 a CA-13: aislamiento, estados y multi-cliente', () => {
    let tenantA: string;
    let tenantB: string;
    let tenantC: string;

    beforeAll(async () => {
      const register = async (
        name: string,
        taxId: string,
        adminEmail: string,
      ) => {
        const { body } = await createClient({
          name,
          taxId,
          administratorEmail: adminEmail,
        }).expect(201);
        return body.client.id as string;
      };

      tenantA = await register('Conjunto A', '900500600-1', 'admin-a@test.co');
      tenantB = await register('Conjunto B', '900500601-7', 'admin-b@test.co');
      await acceptInvitation(
        email.lastActivationTokenFor('admin-a@test.co'),
        ADMIN_PASSWORD,
      ).expect(200);
      await acceptInvitation(
        email.lastActivationTokenFor('admin-b@test.co'),
        ADMIN_PASSWORD,
      ).expect(200);

      // El administrador de A también administra C (otra membresía).
      tenantC = await register('Conjunto C', '900500602-4', 'admin-a@test.co');
    });

    it('el ADMINISTRADOR obtiene alcance de cuenta y no accede al panel global', async () => {
      const { body } = await login('admin-a@test.co', ADMIN_PASSWORD).expect(
        200,
      );
      expect(body.tokens.scope).toBe('account');
      await http()
        .get(`${API}/admin/clients`)
        .set('Authorization', `Bearer ${body.tokens.accessToken as string}`)
        .expect(403);
    });

    it('un token de tenant tampoco sirve para el panel global', async () => {
      const { body } = await tenantTokenFor('admin-a@test.co', tenantA);
      await http()
        .get(`${API}/admin/clients`)
        .set('Authorization', `Bearer ${body.accessToken as string}`)
        .expect(403);
    });

    it('el SUPERADMIN no opera dentro de un tenant con su token global', async () => {
      await currentTenant(rootToken).expect(403);
    });

    it('CA-09 el administrador de A no puede entrar al conjunto B', async () => {
      const selection = await tenantTokenFor('admin-a@test.co', tenantB);
      expect(selection.status).toBe(403);
    });

    it('CA-09 el contexto del tenant sale del token, no de parámetros del cliente', async () => {
      const { body } = await tenantTokenFor('admin-a@test.co', tenantA);
      const response = await currentTenant(body.accessToken as string)
        .query({ tenantId: tenantB })
        .expect(200);
      expect(response.body.id).toBe(tenantA);
    });

    it('CA-13 una invitación a un segundo conjunto reutiliza la identidad', async () => {
      const token = email.lastActivationTokenFor('admin-a@test.co');
      const { body: preview } = await http()
        .post(`${API}/auth/invitations/validate`)
        .send({ token })
        .expect(200);
      expect(preview.requiresPassword).toBe(false);
      await acceptInvitation(token).expect(200);

      const { body } = await login('admin-a@test.co', ADMIN_PASSWORD);
      const memberships = await http()
        .get(`${API}/auth/memberships`)
        .set('Authorization', `Bearer ${body.tokens.accessToken as string}`)
        .expect(200);
      expect(
        (memberships.body as Array<{ tenantId: string }>)
          .map(({ tenantId }) => tenantId)
          .sort(),
      ).toEqual([tenantA, tenantC].sort());
    });

    it('CA-13 opera solo en el tenant seleccionado', async () => {
      const inC = await tenantTokenFor('admin-a@test.co', tenantC);
      const { body } = await currentTenant(
        inC.body.accessToken as string,
      ).expect(200);
      expect(body).toMatchObject({ id: tenantC, roles: ['ADMINISTRADOR'] });
    });

    it('CA-10 al suspender el cliente, sus usuarios dejan de operar de inmediato', async () => {
      const { body } = await tenantTokenFor('admin-b@test.co', tenantB);
      const token = body.accessToken as string;
      await currentTenant(token).expect(200);

      await setStatus(tenantB, 'SUSPENDED').expect(200);
      await currentTenant(token).expect(403);
      expect((await tenantTokenFor('admin-b@test.co', tenantB)).status).toBe(
        403,
      );
    });

    it('CA-11 al reactivar se recupera el acceso sin perder información', async () => {
      const { body } = await setStatus(tenantB, 'ACTIVE').expect(200);
      expect(body.status).toBe('ACTIVE');

      const selection = await tenantTokenFor('admin-b@test.co', tenantB);
      const current = await currentTenant(
        selection.body.accessToken as string,
      ).expect(200);
      expect(current.body).toMatchObject({
        name: 'Conjunto B',
        taxId: '900500601-7',
      });
    });

    it('CA-12 cada operación queda auditada con actor, acción, entidad y fecha', async () => {
      const { body } = await http()
        .get(`${API}/admin/clients/${tenantB}`)
        .set('Authorization', `Bearer ${rootToken}`)
        .expect(200);
      const actions = (body.history as Array<{ action: string }>).map(
        ({ action }) => action,
      );
      expect(actions).toEqual([
        'CLIENT_REACTIVATED',
        'CLIENT_SUSPENDED',
        'INVITATION_ACCEPTED',
        'CLIENT_CREATED',
      ]);
      expect(body.history[0]).toMatchObject({
        actorEmail: ROOT.email,
        previousValues: { status: 'SUSPENDED' },
        newValues: { status: 'ACTIVE' },
      });
    });

    it('la auditoría no admite modificaciones', async () => {
      await expect(
        dataSource.query(`UPDATE audit_logs SET action = 'X'`),
      ).rejects.toThrow(/inmutable/);
      await expect(dataSource.query('DELETE FROM audit_logs')).rejects.toThrow(
        /inmutable/,
      );
    });
  });

  describe('listado, edición y sesiones', () => {
    it('lista con búsqueda por nombre o NIT, filtro por estado y paginación', async () => {
      const auth = { Authorization: `Bearer ${rootToken}` };
      const byName = await http()
        .get(`${API}/admin/clients`)
        .query({ search: 'pinos' })
        .set(auth)
        .expect(200);
      expect(byName.body.items).toHaveLength(1);

      const byNit = await http()
        .get(`${API}/admin/clients`)
        .query({ search: '900.500.601' })
        .set(auth)
        .expect(200);
      expect(byNit.body.items[0].name).toBe('Conjunto B');

      const page = await http()
        .get(`${API}/admin/clients`)
        .query({
          status: 'ACTIVE',
          page: 1,
          pageSize: 2,
          sort: 'createdAt:asc',
        })
        .set(auth)
        .expect(200);
      expect(page.body.items).toHaveLength(2);
      expect(page.body.total).toBeGreaterThan(2);
      expect(page.body.items[0].name).toBe('Conjunto Los Pinos');
    });

    it('edita nombre y NIT y audita los valores anteriores', async () => {
      const { body: list } = await http()
        .get(`${API}/admin/clients`)
        .query({ search: 'Conjunto C' })
        .set('Authorization', `Bearer ${rootToken}`);
      const id = list.items[0].id as string;

      const { body } = await http()
        .patch(`${API}/admin/clients/${id}`)
        .set('Authorization', `Bearer ${rootToken}`)
        .field('name', 'Conjunto C Renovado')
        .field('taxId', '900500602-4')
        .expect(200);
      expect(body.name).toBe('Conjunto C Renovado');

      const [audit] = await dataSource.query<
        Array<{ previous_values: unknown; new_values: unknown }>
      >(
        `SELECT previous_values, new_values FROM audit_logs WHERE action = 'CLIENT_UPDATED' AND tenant_id = $1`,
        [id],
      );
      expect(audit).toEqual({
        previous_values: { name: 'Conjunto C' },
        new_values: { name: 'Conjunto C Renovado' },
      });
    });

    it('rota el refresh token y detecta su reutilización', async () => {
      const { body } = await login(ROOT.email, ROOT.password).expect(200);
      const original = body.tokens.refreshToken as string;

      const rotated = await http()
        .post(`${API}/auth/refresh`)
        .send({ refreshToken: original })
        .expect(200);
      expect(rotated.body.refreshToken).not.toBe(original);

      // Reutilizar el token ya rotado revoca toda la familia.
      await http()
        .post(`${API}/auth/refresh`)
        .send({ refreshToken: original })
        .expect(401);
      await http()
        .get(`${API}/auth/me`)
        .set('Authorization', `Bearer ${rotated.body.accessToken as string}`)
        .expect(401);
    });

    it('el logout invalida el access token de inmediato', async () => {
      const { body } = await login(ROOT.email, ROOT.password).expect(200);
      const auth = {
        Authorization: `Bearer ${body.tokens.accessToken as string}`,
      };

      await http().get(`${API}/auth/me`).set(auth).expect(200);
      await http().post(`${API}/auth/logout`).set(auth).expect(204);
      await http().get(`${API}/auth/me`).set(auth).expect(401);
    });
  });

  // Va al final: cierra todas las sesiones del SUPERADMIN.
  describe('restablecimiento de la contraseña del SUPERADMIN (CLI)', () => {
    const NEW_PASSWORD = 'nueva-clave-superadmin';

    it('rechaza un correo que no es de un superadministrador', async () => {
      await expect(
        resetSuperAdminPassword(
          { email: 'nadie@zewa.test', password: NEW_PASSWORD },
          dataSource,
          new PasswordHasher(),
        ),
      ).rejects.toThrow(SuperAdminBootstrapError);
    });

    it('cambia la contraseña, desbloquea la cuenta y cierra las sesiones', async () => {
      const { body } = await login(ROOT.email, ROOT.password).expect(200);
      const openSession = {
        Authorization: `Bearer ${body.tokens.accessToken as string}`,
      };
      await login(ROOT.email, 'clave-equivocada').expect(401);

      await resetSuperAdminPassword(
        { email: ROOT.email.toUpperCase(), password: NEW_PASSWORD },
        dataSource,
        new PasswordHasher(),
      );

      await http().get(`${API}/auth/me`).set(openSession).expect(401);
      await login(ROOT.email, ROOT.password).expect(401);
      await login(ROOT.email, NEW_PASSWORD).expect(200);

      const [audit] = await dataSource.query<{ count: string }[]>(
        "SELECT count(*) FROM audit_logs WHERE action = 'SUPERADMIN_PASSWORD_RESET'",
      );
      expect(audit.count).toBe('1');
    });
  });
});
