import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  const query = jest.fn();
  let controller: HealthController;

  beforeEach(async () => {
    query.mockReset();
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [HealthService, { provide: DataSource, useValue: { query } }],
    }).compile();
    controller = moduleRef.get(HealthController);
  });

  it('responde ok cuando la base de datos está disponible', async () => {
    query.mockResolvedValue([{ '?column?': 1 }]);

    await expect(controller.check()).resolves.toMatchObject({
      status: 'ok',
      checks: { database: 'up' },
    });
  });

  it('responde 503 cuando la base de datos no responde', async () => {
    query.mockRejectedValue(new Error('connection refused'));

    await expect(controller.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
