import {
  BadRequestException,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { OrdersService } from '../src/orders/orders.service.js';
import { AuthService } from '../src/auth/auth.service.js';
import { CategoriesService } from '../src/menu/categories.service.js';
import { FoodItemsService } from '../src/menu/food-items.service.js';

describe('Customer Checkout to Admin Dashboard Integration (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;

  const sampleCategoryId = '670d00000000000000000101';
  const sampleItemId = '670d00000000000000000201';
  const ordersStore: Array<Record<string, unknown>> = [];
  let simulateDbDown = false;

  beforeEach(async () => {
    ordersStore.length = 0;
    simulateDbDown = false;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthService)
      .useValue({ login: vi.fn(), getProfile: vi.fn() })
      .overrideProvider(CategoriesService)
      .useValue({
        findActive: vi.fn().mockResolvedValue([
          { _id: sampleCategoryId, name: 'Sundae', displayOrder: 1, isActive: true },
        ]),
        findAll: vi.fn().mockResolvedValue([]),
      })
      .overrideProvider(FoodItemsService)
      .useValue({
        findAvailable: vi.fn().mockResolvedValue([
          {
            _id: sampleItemId,
            categoryId: sampleCategoryId,
            name: 'Chocolava Cake Sundae',
            price: 16000,
            isAvailable: true,
            displayOrder: 1,
          },
        ]),
        findAll: vi.fn().mockResolvedValue([]),
      })
      .overrideProvider(OrdersService)
      .useValue({
        create: vi.fn().mockImplementation(async (dto) => {
          if (simulateDbDown) {
            const err = new Error('connect ECONNREFUSED 127.0.0.1:27017');
            err.name = 'MongooseServerSelectionError';
            throw err;
          }
          if (dto.items[0]?.foodItemId !== sampleItemId) {
            throw new NotFoundException('Food item not found');
          }
          const created = {
            id: '670d00000000000000000901',
            orderNumber: '#001',
            displayOrderNumber: '#001',
            orderDate: '2026-11-12',
            tableNumber: dto.tableNumber,
            status: 'NEW',
            items: [
              {
                foodItemId: sampleItemId,
                name: 'Chocolava Cake Sundae',
                quantity: dto.items[0].quantity,
                unitPrice: 16000,
                itemTotal: 16000 * dto.items[0].quantity,
              },
            ],
            subtotal: 16000 * dto.items[0].quantity,
            total: 16000 * dto.items[0].quantity,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          ordersStore.push(created);
          return created;
        }),
        findCustomerOrderById: vi.fn().mockImplementation(async (id: string) => {
          const found = ordersStore.find((o) => o.id === id);
          if (!found) throw new NotFoundException(`Order ${id} not found`);
          return found;
        }),
        findAdminOrders: vi.fn().mockImplementation(async () => ({
          data: ordersStore,
          pagination: { page: 1, limit: 20, total: ordersStore.length, totalPages: 1 },
        })),
        updateOrderStatus: vi.fn().mockImplementation(async (id: string, status: string) => {
          const found = ordersStore.find((o) => o.id === id);
          if (!found) throw new BadRequestException('Order not found');
          found.status = status;
          return found;
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    const jwtService = moduleFixture.get<JwtService>(JwtService);
    adminToken = jwtService.sign({
      sub: '670c00000000000000000001',
      email: 'admin@creamtreat.local',
      role: 'ADMIN',
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it('completes customer menu -> POST /orders -> customer tracking -> admin list & status update', async () => {
    const itemsRes = await request(app.getHttpServer())
      .get('/menu/items')
      .expect(200);
    const firstItem = itemsRes.body[0];

    const orderRes = await request(app.getHttpServer())
      .post('/orders')
      .send({
        tableNumber: 4,
        items: [{ foodItemId: firstItem._id, quantity: 2 }],
      })
      .expect(201);
    expect(orderRes.body.orderNumber).toBe('#001');
    expect(orderRes.body.total).toBe(32000);

    const adminListRes = await request(app.getHttpServer())
      .get('/admin/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(adminListRes.body.data).toHaveLength(1);
    expect(adminListRes.body.data[0].orderNumber).toBe('#001');

    await request(app.getHttpServer())
      .patch(`/admin/orders/${orderRes.body.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACCEPTED' })
      .expect(200);

    const customerTrackRes = await request(app.getHttpServer())
      .get(`/orders/${orderRes.body.id}`)
      .expect(200);
    expect(customerTrackRes.body.status).toBe('ACCEPTED');
  });

  it('rejects synthetic client_* IDs with 400 and maps DB errors to 503 via AppModule filter', async () => {
    await request(app.getHttpServer())
      .post('/orders')
      .send({
        tableNumber: 4,
        items: [{ foodItemId: 'client_chocolavacakesundae', quantity: 1 }],
      })
      .expect(400);

    simulateDbDown = true;
    const errRes = await request(app.getHttpServer())
      .post('/orders')
      .send({
        tableNumber: 4,
        items: [{ foodItemId: sampleItemId, quantity: 1 }],
      })
      .expect(503);
    expect(errRes.body.statusCode).toBe(503);
  });
});

