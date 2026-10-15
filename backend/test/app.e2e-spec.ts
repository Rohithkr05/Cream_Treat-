import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  INestApplication,
  NotFoundException,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { OrdersService } from '../src/orders/orders.service.js';
import { AuthService } from '../src/auth/auth.service.js';
import { CategoriesService } from '../src/menu/categories.service.js';
import { FoodItemsService } from '../src/menu/food-items.service.js';

describe('AppController, Auth & Admin Protected APIs (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let validAdminToken: string;
  let nonAdminToken: string;
  let expiredToken: string;
  let testOrderStatus = 'NEW';

  beforeEach(async () => {
    testOrderStatus = 'NEW';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OrdersService)
      .useValue({
        create: vi.fn().mockImplementation((dto) =>
          Promise.resolve({
            id: '670d00000000000000000001',
            orderNumber: '#001',
            displayOrderNumber: '#001',
            orderDate: '2026-10-15',
            tableNumber: dto.tableNumber,
            status: 'NEW',
            items: dto.items.map((it: { foodItemId: string; quantity: number }) => ({
              foodItemId: it.foodItemId,
              name: 'Chicken Momos',
              quantity: it.quantity,
              unitPrice: 12000,
              itemTotal: 12000 * it.quantity,
            })),
            subtotal: 24000,
            total: 24000,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        ),
        findById: vi.fn(),
        findCustomerOrderById: vi.fn().mockImplementation((id: string) => {
          if (id === '670d00000000000000000001') {
            return Promise.resolve({
              id,
              orderNumber: '#001',
              displayOrderNumber: '#001',
              orderDate: '2026-10-15',
              tableNumber: 5,
              status: testOrderStatus,
              items: [
                {
                  foodItemId: '670d00000000000000000002',
                  name: 'Chicken Momos',
                  quantity: 2,
                  unitPrice: 12000,
                  itemTotal: 24000,
                },
              ],
              subtotal: 24000,
              total: 24000,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
          throw new NotFoundException(`Order with ID ${id} not found`);
        }),
        findAdminOrders: vi.fn().mockImplementation((query) => {
          return Promise.resolve({
            data: [
              {
                id: '670d00000000000000000001',
                orderNumber: '#001',
                orderDate: query.date || '2026-10-15',
                tableNumber: 5,
                items: [
                  {
                    name: 'Chicken Momos',
                    quantity: 2,
                    unitPrice: 12000,
                    itemTotal: 24000,
                  },
                ],
                subtotal: 24000,
                total: 24000,
                status: testOrderStatus,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            pagination: {
              page: query.page || 1,
              limit: query.limit || 20,
              total: 1,
              totalPages: 1,
            },
          });
        }),
        findAdminOrderById: vi.fn().mockImplementation((id: string) => {
          if (id === '670d00000000000000000001') {
            return Promise.resolve({
              id,
              orderNumber: '#001',
              orderDate: '2026-10-15',
              tableNumber: 5,
              items: [
                {
                  name: 'Chicken Momos',
                  quantity: 2,
                  unitPrice: 12000,
                  itemTotal: 24000,
                },
              ],
              subtotal: 24000,
              total: 24000,
              status: testOrderStatus,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
          throw new NotFoundException(`Order with ID ${id} not found`);
        }),
        updateOrderStatus: vi.fn().mockImplementation((id: string, newStatus: string) => {
          if (id !== '670d00000000000000000001') {
            throw new NotFoundException(`Order with ID ${id} not found`);
          }
          if (testOrderStatus === newStatus) {
            throw new ConflictException(`Order is already ${newStatus}.`);
          }
          const transitions: Record<string, string[]> = {
            NEW: ['ACCEPTED', 'CANCELLED'],
            ACCEPTED: ['PREPARING', 'CANCELLED'],
            PREPARING: ['READY', 'CANCELLED'],
            READY: ['COMPLETED'],
            COMPLETED: [],
            CANCELLED: [],
          };
          if (!transitions[testOrderStatus]?.includes(newStatus)) {
            throw new ConflictException(
              `Invalid order status transition from ${testOrderStatus} to ${newStatus}.`,
            );
          }
          testOrderStatus = newStatus;
          return Promise.resolve({
            id,
            orderNumber: '#001',
            orderDate: '2026-10-15',
            tableNumber: 5,
            items: [
              {
                name: 'Chicken Momos',
                quantity: 2,
                unitPrice: 12000,
                itemTotal: 24000,
              },
            ],
            subtotal: 24000,
            total: 24000,
            status: testOrderStatus,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }),
      })
      .overrideProvider(AuthService)
      .useValue({
        login: vi.fn().mockImplementation((dto) => {
          if (
            dto.email === 'admin@creamtreat.local' &&
            dto.password === 'Admin@CreamTreat2026!'
          ) {
            return Promise.resolve({
              accessToken: validAdminToken,
              admin: {
                id: '670c00000000000000000001',
                name: 'Cream Treat Admin',
                email: 'admin@creamtreat.local',
              },
            });
          }
          throw new UnauthorizedException('Invalid email or password.');
        }),
        getProfile: vi.fn().mockResolvedValue({
          id: '670c00000000000000000001',
          name: 'Cream Treat Admin',
          email: 'admin@creamtreat.local',
          role: 'ADMIN',
        }),
      })
      .overrideProvider(CategoriesService)
      .useValue({
        findActive: vi.fn().mockResolvedValue([]),
        findAll: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
        remove: vi.fn().mockResolvedValue({}),
      })
      .overrideProvider(FoodItemsService)
      .useValue({
        findAvailable: vi.fn().mockResolvedValue([]),
        findAll: vi.fn().mockResolvedValue([]),
        findById: vi.fn().mockResolvedValue({}),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
        remove: vi.fn().mockResolvedValue({}),
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

    jwtService = moduleFixture.get<JwtService>(JwtService);
    validAdminToken = jwtService.sign({
      sub: '670c00000000000000000001',
      email: 'admin@creamtreat.local',
      role: 'ADMIN',
    });
    nonAdminToken = jwtService.sign({
      sub: '670c00000000000000000002',
      email: 'user@example.com',
      role: 'CUSTOMER',
    });
    expiredToken = jwtService.sign(
      {
        sub: '670c00000000000000000001',
        email: 'admin@creamtreat.local',
        role: 'ADMIN',
      },
      { expiresIn: '-10s' },
    );
  });

  // Base Health
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

  // Authentication Flow E2E Tests
  it('/auth/admin/login (POST) should authenticate valid credentials and return 200 with JWT', () => {
    return request(app.getHttpServer())
      .post('/auth/admin/login')
      .send({
        email: 'admin@creamtreat.local',
        password: 'Admin@CreamTreat2026!',
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.accessToken).toBeDefined();
        expect(res.body.admin).toEqual({
          id: '670c00000000000000000001',
          name: 'Cream Treat Admin',
          email: 'admin@creamtreat.local',
        });
        expect(res.body.passwordHash).toBeUndefined();
      });
  });

  it('/auth/admin/login (POST) should reject wrong credentials with 401', () => {
    return request(app.getHttpServer())
      .post('/auth/admin/login')
      .send({
        email: 'admin@creamtreat.local',
        password: 'WrongPassword!',
      })
      .expect(401);
  });

  it('/auth/admin/me (GET) without token should reject with 401', () => {
    return request(app.getHttpServer()).get('/auth/admin/me').expect(401);
  });

  it('/auth/admin/me (GET) with valid token should return admin profile', () => {
    return request(app.getHttpServer())
      .get('/auth/admin/me')
      .set('Authorization', `Bearer ${validAdminToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({
          id: '670c00000000000000000001',
          name: 'Cream Treat Admin',
          email: 'admin@creamtreat.local',
          role: 'ADMIN',
        });
      });
  });

  // Protected Admin APIs vs Public APIs
  it('/admin/categories (GET) without token should reject with 401', () => {
    return request(app.getHttpServer()).get('/admin/categories').expect(401);
  });

  it('/admin/categories (POST) without token should reject with 401', () => {
    return request(app.getHttpServer())
      .post('/admin/categories')
      .send({ name: 'Desserts', displayOrder: 1 })
      .expect(401);
  });

  it('/admin/items (GET) without token should reject with 401', () => {
    return request(app.getHttpServer()).get('/admin/items').expect(401);
  });

  it('/admin/items (POST) without token should reject with 401', () => {
    return request(app.getHttpServer())
      .post('/admin/items')
      .send({
        name: 'Pastry',
        price: 8000,
        categoryId: '670c00000000000000000001',
      })
      .expect(401);
  });

  it('/admin/categories (GET) with valid admin token should succeed with 200', () => {
    return request(app.getHttpServer())
      .get('/admin/categories')
      .set('Authorization', `Bearer ${validAdminToken}`)
      .expect(200);
  });

  it('/admin/categories (GET) with invalid token format should reject with 401', () => {
    return request(app.getHttpServer())
      .get('/admin/categories')
      .set('Authorization', 'Bearer invalid.token.format')
      .expect(401);
  });

  it('/admin/categories (GET) with expired token should reject with 401', () => {
    return request(app.getHttpServer())
      .get('/admin/categories')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });

  it('/admin/categories (GET) with non-admin role token should reject with 403', () => {
    return request(app.getHttpServer())
      .get('/admin/categories')
      .set('Authorization', `Bearer ${nonAdminToken}`)
      .expect(403);
  });

  // Public Customer APIs Remain Completely Public
  it('/menu/categories (GET) should remain public without token', () => {
    return request(app.getHttpServer()).get('/menu/categories').expect(200);
  });

  it('/menu/items (GET) should remain public without token', () => {
    return request(app.getHttpServer()).get('/menu/items').expect(200);
  });

  it('/menu/items/invalid-id (GET) should reject invalid ObjectId format with 400', () => {
    return request(app.getHttpServer())
      .get('/menu/items/invalid-id')
      .expect(400);
  });

  it('/orders/invalid-id (GET) should reject invalid ObjectId format with 400', () => {
    return request(app.getHttpServer())
      .get('/orders/invalid-id')
      .expect(400);
  });

  it('/orders/:id (GET) should remain public and return 200 with customer order', () => {
    return request(app.getHttpServer())
      .get('/orders/670d00000000000000000001')
      .expect(200)
      .expect((res) => {
        expect(res.body.id).toBe('670d00000000000000000001');
        expect(res.body.orderNumber).toBe('#001');
        expect(res.body.status).toBe('NEW');
      });
  });

  it('/orders (POST) should remain public and create order with 201', () => {
    return request(app.getHttpServer())
      .post('/orders')
      .send({
        tableNumber: 5,
        items: [
          {
            foodItemId: '670d00000000000000000001',
            quantity: 2,
          },
        ],
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.orderNumber).toBe('#001');
        expect(res.body.status).toBe('NEW');
        expect(res.body.tableNumber).toBe(5);
      });
  });

  // Phase 10 — Admin Order Management Endpoints E2E
  it('/admin/orders (GET) without token should reject with 401', () => {
    return request(app.getHttpServer()).get('/admin/orders').expect(401);
  });

  it('/admin/orders (GET) with valid admin token should succeed with 200', () => {
    return request(app.getHttpServer())
      .get('/admin/orders')
      .set('Authorization', `Bearer ${validAdminToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.data).toBeDefined();
        expect(res.body.pagination).toBeDefined();
        expect(res.body.pagination.page).toBe(1);
        expect(res.body.pagination.limit).toBe(20);
      });
  });

  it('/admin/orders?status=NEW (GET) with valid admin token should return 200', () => {
    return request(app.getHttpServer())
      .get('/admin/orders?status=NEW')
      .set('Authorization', `Bearer ${validAdminToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.data[0].status).toBe('NEW');
      });
  });

  it('/admin/orders?status=INVALID (GET) with valid token should reject with 400', () => {
    return request(app.getHttpServer())
      .get('/admin/orders?status=INVALID')
      .set('Authorization', `Bearer ${validAdminToken}`)
      .expect(400);
  });

  it('/admin/orders?limit=1000 (GET) should reject with 400 for exceeding max limit 50', () => {
    return request(app.getHttpServer())
      .get('/admin/orders?limit=1000')
      .set('Authorization', `Bearer ${validAdminToken}`)
      .expect(400);
  });

  it('/admin/orders?date=2026-10-15 (GET) with valid token should return 200', () => {
    return request(app.getHttpServer())
      .get('/admin/orders?date=2026-10-15')
      .set('Authorization', `Bearer ${validAdminToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.data[0].orderDate).toBe('2026-10-15');
      });
  });

  it('/admin/orders/:id (GET) without token should reject with 401', () => {
    return request(app.getHttpServer())
      .get('/admin/orders/670d00000000000000000001')
      .expect(401);
  });

  it('/admin/orders/:id (GET) with valid token should return 200 with order details', () => {
    return request(app.getHttpServer())
      .get('/admin/orders/670d00000000000000000001')
      .set('Authorization', `Bearer ${validAdminToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.id).toBe('670d00000000000000000001');
        expect(res.body.orderNumber).toBe('#001');
        expect(res.body.tableNumber).toBe(5);
        expect(res.body.items).toHaveLength(1);
      });
  });

  it('/admin/orders/invalid-id (GET) with valid token should reject with 400', () => {
    return request(app.getHttpServer())
      .get('/admin/orders/invalid-id')
      .set('Authorization', `Bearer ${validAdminToken}`)
      .expect(400);
  });

  it('/admin/orders/nonexistent-id (GET) with valid token should return 404', () => {
    return request(app.getHttpServer())
      .get('/admin/orders/670d99999999999999999999')
      .set('Authorization', `Bearer ${validAdminToken}`)
      .expect(404);
  });

  // Phase 11 — Admin Order Status Management Endpoints E2E
  it('/admin/orders/:id/status (PATCH) without token should reject with 401', () => {
    return request(app.getHttpServer())
      .patch('/admin/orders/670d00000000000000000001/status')
      .send({ status: 'ACCEPTED' })
      .expect(401);
  });

  it('/admin/orders/:id/status (PATCH) with invalid token should reject with 401', () => {
    return request(app.getHttpServer())
      .patch('/admin/orders/670d00000000000000000001/status')
      .set('Authorization', 'Bearer invalid.token.format')
      .send({ status: 'ACCEPTED' })
      .expect(401);
  });

  it('/admin/orders/:id/status (PATCH) with non-admin token should reject with 403', () => {
    return request(app.getHttpServer())
      .patch('/admin/orders/670d00000000000000000001/status')
      .set('Authorization', `Bearer ${nonAdminToken}`)
      .send({ status: 'ACCEPTED' })
      .expect(403);
  });

  it('/admin/orders/invalid-id/status (PATCH) with valid token should reject with 400', () => {
    return request(app.getHttpServer())
      .patch('/admin/orders/invalid-id/status')
      .set('Authorization', `Bearer ${validAdminToken}`)
      .send({ status: 'ACCEPTED' })
      .expect(400);
  });

  it('/admin/orders/nonexistent-id/status (PATCH) with valid token should return 404', () => {
    return request(app.getHttpServer())
      .patch('/admin/orders/670d99999999999999999999/status')
      .set('Authorization', `Bearer ${validAdminToken}`)
      .send({ status: 'ACCEPTED' })
      .expect(404);
  });

  it('/admin/orders/:id/status (PATCH) with invalid status string should reject with 400', () => {
    return request(app.getHttpServer())
      .patch('/admin/orders/670d00000000000000000001/status')
      .set('Authorization', `Bearer ${validAdminToken}`)
      .send({ status: 'INVALID_STATUS' })
      .expect(400);
  });

  it('/admin/orders/:id/status (PATCH) invalid transition NEW -> READY should return 409 Conflict', () => {
    return request(app.getHttpServer())
      .patch('/admin/orders/670d00000000000000000001/status')
      .set('Authorization', `Bearer ${validAdminToken}`)
      .send({ status: 'READY' })
      .expect(409);
  });

  it('/admin/orders/:id/status (PATCH) invalid transition NEW -> COMPLETED should return 409 Conflict', () => {
    return request(app.getHttpServer())
      .patch('/admin/orders/670d00000000000000000001/status')
      .set('Authorization', `Bearer ${validAdminToken}`)
      .send({ status: 'COMPLETED' })
      .expect(409);
  });

  it('/admin/orders/:id/status (PATCH) same status NEW -> NEW should return 409 Conflict', () => {
    return request(app.getHttpServer())
      .patch('/admin/orders/670d00000000000000000001/status')
      .set('Authorization', `Bearer ${validAdminToken}`)
      .send({ status: 'NEW' })
      .expect(409);
  });

  it('/admin/orders/:id/status (PATCH) valid lifecycle transitions NEW -> ACCEPTED -> PREPARING -> READY -> COMPLETED', async () => {
    // 1. Transition NEW -> ACCEPTED
    await request(app.getHttpServer())
      .patch('/admin/orders/670d00000000000000000001/status')
      .set('Authorization', `Bearer ${validAdminToken}`)
      .send({ status: 'ACCEPTED' })
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ACCEPTED');
      });

    // Verify GET /orders/:id reflects ACCEPTED publicly
    await request(app.getHttpServer())
      .get('/orders/670d00000000000000000001')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ACCEPTED');
      });

    // 2. Transition ACCEPTED -> PREPARING
    await request(app.getHttpServer())
      .patch('/admin/orders/670d00000000000000000001/status')
      .set('Authorization', `Bearer ${validAdminToken}`)
      .send({ status: 'PREPARING' })
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('PREPARING');
      });

    // 3. Transition PREPARING -> READY
    await request(app.getHttpServer())
      .patch('/admin/orders/670d00000000000000000001/status')
      .set('Authorization', `Bearer ${validAdminToken}`)
      .send({ status: 'READY' })
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('READY');
      });

    // 4. Transition READY -> COMPLETED
    await request(app.getHttpServer())
      .patch('/admin/orders/670d00000000000000000001/status')
      .set('Authorization', `Bearer ${validAdminToken}`)
      .send({ status: 'COMPLETED' })
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('COMPLETED');
      });

    // Verify GET /admin/orders reflects COMPLETED
    await request(app.getHttpServer())
      .get('/admin/orders')
      .set('Authorization', `Bearer ${validAdminToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.data[0].status).toBe('COMPLETED');
      });

    // Verify GET /admin/orders/:id reflects COMPLETED
    await request(app.getHttpServer())
      .get('/admin/orders/670d00000000000000000001')
      .set('Authorization', `Bearer ${validAdminToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('COMPLETED');
      });

    // Verify public GET /orders/:id reflects COMPLETED for customer tracking
    await request(app.getHttpServer())
      .get('/orders/670d00000000000000000001')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('COMPLETED');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
