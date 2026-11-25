import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp } from './utils/test-app';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1 es público y responde el estado de la API', () => {
    return request(app.getHttpServer())
      .get('/api/v1')
      .expect(200)
      .expect('API is running successfully! ✔️');
  });
});
