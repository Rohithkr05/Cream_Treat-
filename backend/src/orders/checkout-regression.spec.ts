import {
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import type { HttpAdapterHost } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { OrdersGateway } from './orders.gateway.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { Order, OrderStatus } from './schemas/order.schema.js';
import { OrderCounter } from './schemas/order-counter.schema.js';
import { FoodItem } from '../menu/schemas/food-item.schema.js';
import { Category } from '../menu/schemas/category.schema.js';
import { DatabaseExceptionFilter } from '../common/filters/database-exception.filter.js';

describe('Customer Checkout Regression & Error Handling', () => {
  let controller: OrdersController;
  let validationPipe: ValidationPipe;
  let exceptionFilter: DatabaseExceptionFilter;

  const validCategoryId = new Types.ObjectId('670d00000000000000000101');
  const inactiveCategoryId = new Types.ObjectId('670d00000000000000000102');
  const activeItemId = new Types.ObjectId('670d00000000000000000201');
  const unavailableItemId = new Types.ObjectId('670d00000000000000000202');
  const inactiveCatItemId = new Types.ObjectId('670d00000000000000000203');

  let dailySequence = 0;
  let storedOrders: Array<Record<string, unknown>> = [];
  let simulateDbDown = false;

  function MockOrderModel(this: Record<string, unknown>, doc: Record<string, unknown>) {
    Object.assign(this, doc, {
      _id: new Types.ObjectId(),
      createdAt: new Date('2026-11-12T10:00:00.000Z'),
      updatedAt: new Date('2026-11-12T10:00:00.000Z'),
      save: vi.fn().mockImplementation(async () => {
        if (simulateDbDown) {
          const err = new Error('connect ECONNREFUSED 127.0.0.1:27017');
          err.name = 'MongooseServerSelectionError';
          throw err;
        }
        storedOrders.push(this);
        return this;
      }),
    });
  }

  MockOrderModel.findById = vi.fn((id: string) => ({
    exec: vi.fn(async () => storedOrders.find((o) => String(o._id) === id) ?? null),
  }));

  const mockOrderCounterModel = {
    findOneAndUpdate: vi.fn(() => ({
      exec: vi.fn(async () => {
        dailySequence += 1;
        return { sequence: dailySequence };
      }),
    })),
  };

  const mockFoodItemModel = {
    findById: vi.fn((id: string) => ({
      exec: vi.fn(async () => {
        if (simulateDbDown) {
          const err = new Error('connect ECONNREFUSED 127.0.0.1:27017');
          err.name = 'MongooseServerSelectionError';
          throw err;
        }
        if (id === activeItemId.toString()) {
          return {
            _id: activeItemId,
            categoryId: validCategoryId,
            name: 'Chocolava Cake Sundae',
            price: 16000,
            isAvailable: true,
          };
        }
        if (id === unavailableItemId.toString()) {
          return {
            _id: unavailableItemId,
            categoryId: validCategoryId,
            name: 'Rose Falooda',
            price: 22000,
            isAvailable: false,
          };
        }
        if (id === inactiveCatItemId.toString()) {
          return {
            _id: inactiveCatItemId,
            categoryId: inactiveCategoryId,
            name: 'Archived Special',
            price: 15000,
            isAvailable: true,
          };
        }
        return null;
      }),
    })),
  };

  const mockCategoryModel = {
    findById: vi.fn((id: Types.ObjectId) => ({
      exec: vi.fn(async () => {
        if (String(id) === validCategoryId.toString()) {
          return { _id: validCategoryId, name: 'Sundae', isActive: true };
        }
        if (String(id) === inactiveCategoryId.toString()) {
          return { _id: inactiveCategoryId, name: 'Seasonal', isActive: false };
        }
        return null;
      }),
    })),
  };

  const mockOrdersGateway = {
    emitOrderCreated: vi.fn(),
    emitOrderStatusUpdated: vi.fn(),
  };

  beforeEach(async () => {
    dailySequence = 0;
    storedOrders = [];
    simulateDbDown = false;
    vi.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        OrdersService,
        { provide: getModelToken(Order.name), useValue: MockOrderModel },
        { provide: getModelToken(OrderCounter.name), useValue: mockOrderCounterModel },
        { provide: getModelToken(FoodItem.name), useValue: mockFoodItemModel },
        { provide: getModelToken(Category.name), useValue: mockCategoryModel },
        { provide: OrdersGateway, useValue: mockOrdersGateway },
      ],
    }).compile();

    controller = moduleFixture.get<OrdersController>(OrdersController);
    validationPipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    exceptionFilter = new DatabaseExceptionFilter({
      httpAdapter: {
        reply: vi.fn(),
        isHeadersSent: vi.fn().mockReturnValue(false),
      },
    } as unknown as HttpAdapterHost);
  });

  it('validates DTO, creates order with DB prices & daily #001, emits socket event, and retrieves order', async () => {
    const dto = await validationPipe.transform(
      {
        tableNumber: 5,
        items: [{ foodItemId: activeItemId.toString(), quantity: 2 }],
      },
      { type: 'body', metatype: CreateOrderDto },
    );

    const created = await controller.create(dto);
    expect(created.orderNumber).toBe('#001');
    expect(created.tableNumber).toBe(5);
    expect(created.status).toBe(OrderStatus.NEW);
    expect(created.subtotal).toBe(32000);
    expect(created.total).toBe(32000);
    expect(created.items[0]).toMatchObject({
      foodItemId: activeItemId.toString(),
      name: 'Chocolava Cake Sundae',
      quantity: 2,
      unitPrice: 16000,
      itemTotal: 32000,
    });
    expect(mockOrdersGateway.emitOrderCreated).toHaveBeenCalledTimes(1);

    const tracked = await controller.findOne(created.id);
    expect(tracked.orderNumber).toBe('#001');
    expect(tracked.total).toBe(32000);
  });

  it('rejects synthetic client_* IDs and extra price fields via ValidationPipe', async () => {
    await expect(
      validationPipe.transform(
        {
          tableNumber: 5,
          items: [{ foodItemId: 'client_chocolavacakesundae', quantity: 1 }],
        },
        { type: 'body', metatype: CreateOrderDto },
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      validationPipe.transform(
        {
          tableNumber: 5,
          items: [{ foodItemId: activeItemId.toString(), quantity: 1 }],
          total: 100,
        },
        { type: 'body', metatype: CreateOrderDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects nonexistent (404), unavailable item (400), and inactive category item (400)', async () => {
    await expect(
      controller.create({
        tableNumber: 5,
        items: [{ foodItemId: new Types.ObjectId().toString(), quantity: 1 }],
      }),
    ).rejects.toThrow(NotFoundException);

    await expect(
      controller.create({
        tableNumber: 5,
        items: [{ foodItemId: unavailableItemId.toString(), quantity: 1 }],
      }),
    ).rejects.toThrow('Food item "Rose Falooda" is currently unavailable');

    await expect(
      controller.create({
        tableNumber: 5,
        items: [{ foodItemId: inactiveCatItemId.toString(), quantity: 1 }],
      }),
    ).rejects.toThrow('Category "Seasonal" is currently unavailable');
  });

  it('maps MongoDB connectivity failure during checkout to HTTP 503 Service Unavailable', async () => {
    simulateDbDown = true;
    let caught: unknown;
    try {
      await controller.create({
        tableNumber: 5,
        items: [{ foodItemId: activeItemId.toString(), quantity: 1 }],
      });
    } catch (err) {
      caught = err;
    }

    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const host = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => ({ method: 'POST', url: '/orders' }),
        getResponse: () => ({ status }),
      }),
    } as unknown as ArgumentsHost;

    exceptionFilter.catch(caught, host);
    expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 503,
        error: 'Service Unavailable',
      }),
    );
  });
});
