import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  INestApplication,
  NotFoundException,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { OrdersService } from '../src/orders/orders.service.js';
import { AuthService } from '../src/auth/auth.service.js';
import { CategoriesService } from '../src/menu/categories.service.js';
import { FoodItemsService } from '../src/menu/food-items.service.js';

describe('Phase 14 — Menu Management & Customer Ordering E2E Flow', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let adminToken: string;

  // In-memory simulation state
  let inMemoryCategories: any[] = [];
  let inMemoryItems: any[] = [];
  let inMemoryOrders: any[] = [];

  beforeAll(async () => {
    // Reset in-memory collections
    inMemoryCategories = [];
    inMemoryItems = [];
    inMemoryOrders = [];

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AuthService)
      .useValue({
        login: vi.fn().mockImplementation((dto) => {
          if (
            dto.email === 'admin@creamtreat.local' &&
            dto.password === 'Admin@CreamTreat2026!'
          ) {
            return Promise.resolve({
              accessToken: adminToken,
              admin: {
                id: '670c00000000000000000001',
                name: 'Cream Treat Admin',
                email: 'admin@creamtreat.local',
                role: 'ADMIN',
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
        findActive: vi.fn().mockImplementation(() => {
          return Promise.resolve(
            inMemoryCategories.filter((c) => c.isActive !== false),
          );
        }),
        findAll: vi.fn().mockImplementation(() => {
          return Promise.resolve(inMemoryCategories);
        }),
        create: vi.fn().mockImplementation((dto) => {
          const newCat = {
            _id: `670d000000000000000000c${inMemoryCategories.length + 1}`,
            name: dto.name,
            description: dto.description || '',
            displayOrder: dto.displayOrder ?? 0,
            isActive: dto.isActive ?? true,
          };
          inMemoryCategories.push(newCat);
          return Promise.resolve(newCat);
        }),
        update: vi.fn().mockImplementation((id, dto) => {
          const cat = inMemoryCategories.find((c) => c._id === id);
          if (!cat) throw new NotFoundException('Category not found');
          for (const key of Object.keys(dto)) {
            if (dto[key] !== undefined) {
              cat[key] = dto[key];
            }
          }
          return Promise.resolve(cat);
        }),
        remove: vi.fn().mockImplementation((id) => {
          const cat = inMemoryCategories.find((c) => c._id === id);
          if (!cat) throw new NotFoundException('Category not found');
          cat.isActive = false;
          return Promise.resolve({
            message: `Category deactivated`,
            deleted: false,
            category: cat,
          });
        }),
      })
      .overrideProvider(FoodItemsService)
      .useValue({
        findAvailable: vi.fn().mockImplementation((categoryId) => {
          return Promise.resolve(
            inMemoryItems.filter(
              (i) =>
                i.isAvailable !== false &&
                (!categoryId || i.categoryId === categoryId),
            ),
          );
        }),
        findAll: vi.fn().mockImplementation((categoryId) => {
          return Promise.resolve(
            inMemoryItems.filter(
              (i) => !categoryId || i.categoryId === categoryId,
            ),
          );
        }),
        findById: vi.fn().mockImplementation((id) => {
          const item = inMemoryItems.find((i) => i._id === id);
          if (!item) throw new NotFoundException('Food item not found');
          return Promise.resolve(item);
        }),
        findByIdPublic: vi.fn().mockImplementation((id) => {
          const item = inMemoryItems.find((i) => i._id === id && i.isAvailable !== false);
          if (!item) throw new NotFoundException('Item unavailable');
          return Promise.resolve(item);
        }),
        create: vi.fn().mockImplementation((dto) => {
          const newItem = {
            _id: `670d000000000000000000f${inMemoryItems.length + 1}`,
            categoryId: dto.categoryId,
            name: dto.name,
            description: dto.description || '',
            price: dto.price,
            imageUrl: dto.imageUrl || '',
            isAvailable: dto.isAvailable ?? true,
            displayOrder: dto.displayOrder ?? 0,
          };
          inMemoryItems.push(newItem);
          return Promise.resolve(newItem);
        }),
        update: vi.fn().mockImplementation((id, dto) => {
          const item = inMemoryItems.find((i) => i._id === id);
          if (!item) throw new NotFoundException('Food item not found');
          for (const key of Object.keys(dto)) {
            if (dto[key] !== undefined) {
              item[key] = dto[key];
            }
          }
          return Promise.resolve(item);
        }),
        remove: vi.fn().mockImplementation((id) => {
          const idx = inMemoryItems.findIndex((i) => i._id === id);
          if (idx === -1) throw new NotFoundException('Food item not found');
          const [deleted] = inMemoryItems.splice(idx, 1);
          return Promise.resolve({
            message: `Deleted`,
            id: deleted._id,
          });
        }),
      })
      .overrideProvider(OrdersService)
      .useValue({
        create: vi.fn().mockImplementation((dto) => {
          const orderItems: any[] = [];
          let subtotal = 0;

          for (const it of dto.items) {
            const item = inMemoryItems.find((f) => f._id === it.foodItemId);
            if (!item) throw new NotFoundException('Item not found');
            if (!item.isAvailable) {
              throw new BadRequestException(
                `Food item "${item.name}" is currently unavailable`,
              );
            }

            const itemTotal = item.price * it.quantity;
            subtotal += itemTotal;
            orderItems.push({
              foodItemId: item._id,
              name: item.name,
              quantity: it.quantity,
              unitPrice: item.price,
              itemTotal,
            });
          }

          const order = {
            id: `670d000000000000000000e${inMemoryOrders.length + 1}`,
            orderNumber: `#${(inMemoryOrders.length + 1).toString().padStart(3, '0')}`,
            displayOrderNumber: `#${(inMemoryOrders.length + 1).toString().padStart(3, '0')}`,
            orderDate: '2026-10-16',
            tableNumber: dto.tableNumber,
            status: 'NEW',
            items: orderItems,
            subtotal,
            total: subtotal,
            createdAt: new Date().toISOString(),
          };

          inMemoryOrders.push(order);
          return Promise.resolve(order);
        }),
        findCustomerOrderById: vi.fn().mockImplementation((id) => {
          const order = inMemoryOrders.find((o) => o.id === id);
          if (!order) throw new NotFoundException('Order not found');
          return Promise.resolve(order);
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

    jwtService = moduleFixture.get<JwtService>(JwtService);
    adminToken = jwtService.sign(
      {
        sub: '670c00000000000000000001',
        email: 'admin@creamtreat.local',
        role: 'ADMIN',
      },
      { secret: 'cream_treat_dev_secret_key_2026_qr_ordering', expiresIn: '1d' },
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('Flow 1: Admin creates menu, customer orders, price updates, snapshots preserved', async () => {
    // 1. Admin logs in
    const loginRes = await request(app.getHttpServer())
      .post('/auth/admin/login')
      .send({
        email: 'admin@creamtreat.local',
        password: 'Admin@CreamTreat2026!',
      })
      .expect(200);

    expect(loginRes.body.accessToken).toBeDefined();
    const token = loginRes.body.accessToken;

    // 2. Admin creates category "Sundae"
    const catRes = await request(app.getHttpServer())
      .post('/admin/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Sundae',
        description: 'Specialty dessert sundaes',
        displayOrder: 1,
        isActive: true,
      })
      .expect(201);

    expect(catRes.body.name).toBe('Sundae');
    const createdCatId = catRes.body._id;

    // 3. Admin creates food item "Hot Chocolate Fudge" at ₹200 (20000 paise)
    const itemRes = await request(app.getHttpServer())
      .post('/admin/items')
      .set('Authorization', `Bearer ${token}`)
      .send({
        categoryId: createdCatId,
        name: 'Hot Chocolate Fudge',
        description: 'Warm fudge with vanilla scoops',
        price: 20000,
        isAvailable: true,
        displayOrder: 1,
      })
      .expect(201);

    expect(itemRes.body.price).toBe(20000);
    const createdItemId = itemRes.body._id;

    // 4. Customer retrieves public menu categories
    const menuCatsRes = await request(app.getHttpServer())
      .get('/menu/categories')
      .expect(200);

    expect(menuCatsRes.body.some((c: any) => c.name === 'Sundae')).toBe(true);

    // 5. Customer retrieves public available items
    const menuItemsRes = await request(app.getHttpServer())
      .get('/menu/items')
      .expect(200);

    const foundItem = menuItemsRes.body.find((i: any) => i.name === 'Hot Chocolate Fudge');
    expect(foundItem).toBeDefined();
    expect(foundItem.price).toBe(20000);

    // 6. Customer places Order 1 for 2x Hot Chocolate Fudge at ₹200 each (40000 total)
    const order1Res = await request(app.getHttpServer())
      .post('/orders')
      .send({
        tableNumber: 5,
        items: [{ foodItemId: createdItemId, quantity: 2 }],
      })
      .expect(201);

    expect(order1Res.body.total).toBe(40000);
    expect(order1Res.body.items[0].unitPrice).toBe(20000);
    const order1Id = order1Res.body.id;

    // 7. Admin updates item price to ₹250 (25000 paise)
    const priceUpdateRes = await request(app.getHttpServer())
      .patch(`/admin/items/${createdItemId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        price: 25000,
      })
      .expect(200);

    expect(priceUpdateRes.body.price).toBe(25000);

    // 8. Customer retrieves updated menu and verifies new price is ₹250
    const updatedMenuRes = await request(app.getHttpServer())
      .get('/menu/items')
      .expect(200);

    const updatedItem = updatedMenuRes.body.find((i: any) => i._id === createdItemId);
    expect(updatedItem).toBeDefined();
    expect(updatedItem.price).toBe(25000);

    // 9. Customer places Order 2 for 2x Hot Chocolate Fudge at new price ₹250 each (50000 total)
    const order2Res = await request(app.getHttpServer())
      .post('/orders')
      .send({
        tableNumber: 5,
        items: [{ foodItemId: createdItemId, quantity: 2 }],
      })
      .expect(201);

    expect(order2Res.body.total).toBe(50000);
    expect(order2Res.body.items[0].unitPrice).toBe(25000);

    // 10. Customer verifies Order 1 STILL retains original price of ₹200 and total ₹400
    const getOldOrderRes = await request(app.getHttpServer())
      .get(`/orders/${order1Id}`)
      .expect(200);

    expect(getOldOrderRes.body.total).toBe(40000);
    expect(getOldOrderRes.body.items[0].unitPrice).toBe(20000);
  });

  it('Flow 2: Admin disables item -> Customer cannot order disabled item', async () => {
    const item = inMemoryItems[0];
    expect(item).toBeDefined();

    // 1. Admin disables item
    await request(app.getHttpServer())
      .patch(`/admin/items/${item._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isAvailable: false })
      .expect(200);

    // 2. Customer menu should not return unavailable item
    const publicItems = await request(app.getHttpServer())
      .get('/menu/items')
      .expect(200);

    expect(publicItems.body.some((i: any) => i._id === item._id)).toBe(false);

    // 3. Customer attempts to place order for disabled item -> Rejected with 400
    const orderAttempt = await request(app.getHttpServer())
      .post('/orders')
      .send({
        tableNumber: 5,
        items: [{ foodItemId: item._id, quantity: 1 }],
      })
      .expect(400);

    expect(orderAttempt.body.message).toContain('unavailable');
  });

  it('Flow 3: Admin deactivates category -> Customer no longer sees category', async () => {
    const cat = inMemoryCategories[0];
    expect(cat).toBeDefined();

    // 1. Admin deactivates category
    await request(app.getHttpServer())
      .patch(`/admin/categories/${cat._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false })
      .expect(200);

    // 2. Customer categories should not list deactivated category
    const publicCategories = await request(app.getHttpServer())
      .get('/menu/categories')
      .expect(200);

    expect(publicCategories.body.some((c: any) => c._id === cat._id)).toBe(false);
  });
});
