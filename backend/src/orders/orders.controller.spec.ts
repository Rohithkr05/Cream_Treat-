import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { OrderStatus } from './schemas/order.schema.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { Types } from 'mongoose';

describe('OrdersController', () => {
  let controller: OrdersController;

  const mockOrdersService = {
    create: vi.fn(),
    findById: vi.fn(),
    findCustomerOrderById: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /orders', () => {
    it('should delegate order creation to OrdersService', async () => {
      const mockResult = {
        id: new Types.ObjectId().toString(),
        orderNumber: '#001',
        displayOrderNumber: '#001',
        orderDate: '2026-10-14',
        tableNumber: 5,
        status: OrderStatus.NEW,
        items: [
          {
            foodItemId: new Types.ObjectId().toString(),
            name: 'Chicken Momos',
            quantity: 2,
            unitPrice: 12000,
            itemTotal: 24000,
          },
        ],
        subtotal: 24000,
        total: 24000,
        createdAt: new Date().toISOString(),
      };

      mockOrdersService.create.mockResolvedValue(mockResult);

      const dto = {
        tableNumber: 5,
        items: [
          {
            foodItemId: mockResult.items[0].foodItemId,
            quantity: 2,
          },
        ],
      };

      const result = await controller.create(dto);
      expect(mockOrdersService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResult);
    });

    it('should validate and pass for valid CreateOrderDto', async () => {
      const validationPipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      });

      const validPayload = {
        tableNumber: 5,
        items: [
          {
            foodItemId: new Types.ObjectId().toString(),
            quantity: 2,
          },
        ],
      };

      const transformed = await validationPipe.transform(validPayload, {
        type: 'body',
        metatype: CreateOrderDto,
      });

      expect(transformed).toBeDefined();
      expect(transformed.tableNumber).toBe(5);
      expect(transformed.items.length).toBe(1);
    });

    it('should reject invalid CreateOrderDto with validation error', async () => {
      const validationPipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      });

      // Missing tableNumber and empty items
      await expect(
        validationPipe.transform(
          {
            tableNumber: 0,
            items: [],
          },
          { type: 'body', metatype: CreateOrderDto },
        ),
      ).rejects.toThrow();

      // Invalid foodItemId (not a valid ObjectId)
      await expect(
        validationPipe.transform(
          {
            tableNumber: 5,
            items: [
              {
                foodItemId: 'invalid-non-object-id',
                quantity: 2,
              },
            ],
          },
          { type: 'body', metatype: CreateOrderDto },
        ),
      ).rejects.toThrow();

      // Non-whitelisted fields should be forbidden
      await expect(
        validationPipe.transform(
          {
            tableNumber: 5,
            items: [
              {
                foodItemId: new Types.ObjectId().toString(),
                quantity: 2,
              },
            ],
            price: 500, // untrusted injected field
          },
          { type: 'body', metatype: CreateOrderDto },
        ),
      ).rejects.toThrow();
    });
  });

  describe('GET /orders/:id', () => {
    it('should delegate order lookup by ID to OrdersService', async () => {
      const id = new Types.ObjectId().toString();
      const mockResult = {
        id,
        orderNumber: '#002',
        displayOrderNumber: '#002',
        orderDate: '2026-10-14',
        tableNumber: 3,
        status: OrderStatus.NEW,
        items: [],
        subtotal: 10000,
        total: 10000,
        createdAt: new Date().toISOString(),
      };

      mockOrdersService.findCustomerOrderById.mockResolvedValue(mockResult);

      const result = await controller.findOne(id);
      expect(mockOrdersService.findCustomerOrderById).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockResult);
    });
  });
});
