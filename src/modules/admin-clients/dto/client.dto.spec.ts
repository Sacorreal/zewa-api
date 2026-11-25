import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateClientDto, ListClientsQueryDto } from './client.dto';

const validCreate = {
  name: 'Conjunto Los Pinos',
  taxId: '900.123.456-8',
  administratorEmail: 'admin@lospinos.co',
};

function validateCreate(input: Record<string, unknown>) {
  const dto = plainToInstance(CreateClientDto, input);
  const errors = validateSync(dto);
  return { dto, errors };
}

const messagesOf = (input: Record<string, unknown>) =>
  validateCreate(input).errors.flatMap((error) =>
    Object.values(error.constraints ?? {}),
  );

describe('CreateClientDto', () => {
  it('acepta un formulario válido', () => {
    expect(validateCreate(validCreate).errors).toHaveLength(0);
  });

  it('recorta el nombre y normaliza el correo a minúsculas', () => {
    const { dto } = validateCreate({
      ...validCreate,
      name: '  Conjunto Los Pinos  ',
      administratorEmail: '  Admin@LosPinos.CO ',
    });
    expect(dto.name).toBe('Conjunto Los Pinos');
    expect(dto.administratorEmail).toBe('admin@lospinos.co');
  });

  it('exige el nombre (también si solo trae espacios)', () => {
    expect(messagesOf({ ...validCreate, name: '   ' })).toContain(
      'El nombre del conjunto es obligatorio.',
    );
  });

  it('limita el nombre a 150 caracteres', () => {
    expect(messagesOf({ ...validCreate, name: 'a'.repeat(151) })).toContain(
      'El nombre no puede superar 150 caracteres.',
    );
  });

  it('valida el dígito de verificación del NIT', () => {
    expect(messagesOf({ ...validCreate, taxId: '900123456-1' })).toContain(
      'El dígito de verificación del NIT no es válido.',
    );
  });

  it.each(['no-es-correo', 'admin@', '@zewa.co', ''])(
    'rechaza el correo %p',
    (administratorEmail) => {
      expect(messagesOf({ ...validCreate, administratorEmail })).toContain(
        'Ingresa un correo electrónico válido.',
      );
    },
  );
});

describe('ListClientsQueryDto', () => {
  it('aplica paginación y orden por defecto', () => {
    const dto = plainToInstance(ListClientsQueryDto, {});
    expect(validateSync(dto)).toHaveLength(0);
    expect(dto).toMatchObject({
      page: 1,
      pageSize: 20,
      sort: 'createdAt:desc',
    });
  });

  it('convierte los parámetros numéricos y limita el tamaño de página', () => {
    const dto = plainToInstance(ListClientsQueryDto, {
      page: '2',
      pageSize: '500',
    });
    expect(dto.page).toBe(2);
    expect(validateSync(dto).map(({ property }) => property)).toEqual([
      'pageSize',
    ]);
  });
});
