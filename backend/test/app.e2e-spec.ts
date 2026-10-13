import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect({
        message: 'Cream Treat QR Ordering API',
        status: 'running',
      });
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect((res) => {
        expect([200, 503]).toContain(res.status);
        expect(res.body.service).toBe('cream-treat-backend');
        expect(['connected', 'disconnected']).toContain(res.body.database);
      });
  });

  it('/menu/items/invalid-id (GET) should reject invalid ObjectId format', () => {
    return request(app.getHttpServer())
      .get('/menu/items/invalid-id')
      .expect(400);
  });

  it('/admin/items/invalid-id (GET) should reject invalid ObjectId format', () => {
    return request(app.getHttpServer())
      .get('/admin/items/invalid-id')
      .expect(400);
  });

  afterEach(async () => {
    await app.close();
  });
});
