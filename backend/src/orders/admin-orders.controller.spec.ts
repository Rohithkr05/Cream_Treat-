import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { AdminOrdersController } from './admin-orders.controller.js';
import { OrdersService } from './orders.service.js';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { OrderStatus } from './schemas/order.schema.js';
import { Types } from 'mongoose';

describe('AdminOrdersController', () => {
  let controller: AdminOrdersController;

  const mockOrdersService = {
    findAdminOrders: vi.fn(),
    findAdminOrderById: vi.fn(),
    updateOrderStatus: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminOrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: mockOrdersService,
        },
      ],
    }).compile();

    controller = module.get<AdminOrdersController>(AdminOrdersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /admin/orders', () => {
    it('should delegate query to OrdersService.findAdminOrders', async () => {
      const mockResult = {
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      };

      mockOrdersService.findAdminOrders.mockResolvedValue(mockResult);

      const query: AdminOrderQueryDto = {
        page: 1,
        limit: 20,
        status: OrderStatus.NEW,
        date: '2026-10-16',
      };

      const result = await controller.getOrders(query);
      expect(mockOrdersService.findAdminOrders).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockResult);
    });

    it('should validate and transform valid AdminOrderQueryDto', async () => {
      const pipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      });

      const rawQuery = {
        page: '2',
        limit: '15',
        status: 'NEW',
        date: '2026-10-16',
      };

      const transformed = await pipe.transform(rawQuery, {
        type: 'query',
        metatype: AdminOrderQueryDto,
      });

      expect(transformed.page).toBe(2);
      expect(transformed.limit).toBe(15);
      expect(transformed.status).toBe(OrderStatus.NEW);
      expect(transformed.date).toBe('2026-10-16');
    });

    it('should reject invalid status with validation error', async () => {
      const pipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      });

      await expect(
        pipe.transform(
          { status: 'INVALID_STATUS' },
          { type: 'query', metatype: AdminOrderQueryDto },
        ),
      ).rejects.toThrow();
    });

    it('should reject invalid date format with validation error', async () => {
      const pipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      });

      await expect(
        pipe.transform(
          { date: '16-10-2026' },
          { type: 'query', metatype: AdminOrderQueryDto },
        ),
      ).rejects.toThrow();
    });

    it('should reject limit greater than 50 with validation error', async () => {
      const pipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      });

      await expect(
        pipe.transform(
          { limit: '51' },
          { type: 'query', metatype: AdminOrderQueryDto },
        ),
      ).rejects.toThrow();
    });

    it('should reject page less than 1 with validation error', async () => {
      const pipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      });

      await expect(
        pipe.transform(
          { page: '0' },
          { type: 'query', metatype: AdminOrderQueryDto },
        ),
      ).rejects.toThrow();
    });
  });

  describe('GET /admin/orders/:id', () => {
    it('should delegate lookup by ID to OrdersService.findAdminOrderById', async () => {
      const id = new Types.ObjectId().toString();
      const mockResult = {
        id,
        orderNumber: '#005',
        orderDate: '2026-10-16',
        tableNumber: 4,
        items: [],
        subtotal: 24000,
        total: 24000,
        status: OrderStatus.NEW,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockOrdersService.findAdminOrderById.mockResolvedValue(mockResult);

      const result = await controller.getOrderById(id);
      expect(mockOrdersService.findAdminOrderById).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockResult);
    });
  });

  describe('PATCH /admin/orders/:id/status', () => {
    it('should delegate status update to OrdersService.updateOrderStatus', async () => {
      const id = new Types.ObjectId().toString();
      const mockResult = {
        id,
        orderNumber: '#005',
        orderDate: '2026-10-16',
        tableNumber: 4,
        items: [],
        subtotal: 24000,
        total: 24000,
        status: OrderStatus.ACCEPTED,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockOrdersService.updateOrderStatus.mockResolvedValue(mockResult);

      const result = await controller.updateStatus(id, {
        status: OrderStatus.ACCEPTED,
      });

      expect(mockOrdersService.updateOrderStatus).toHaveBeenCalledWith(
        id,
        OrderStatus.ACCEPTED,
      );
      expect(result).toEqual(mockResult);
    });

    it('should validate and pass for valid UpdateOrderStatusDto', async () => {
      const pipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      });

      const transformed = await pipe.transform(
        { status: 'PREPARING' },
        { type: 'body', metatype: UpdateOrderStatusDto },
      );

      expect(transformed.status).toBe(OrderStatus.PREPARING);
    });

    it('should reject invalid status with validation error', async () => {
      const pipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      });

      await expect(
        pipe.transform(
          { status: 'INVALID_STATUS' },
          { type: 'body', metatype: UpdateOrderStatusDto },
        ),
      ).rejects.toThrow();
    });

    it('should reject missing status with validation error', async () => {
      const pipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      });

      await expect(
        pipe.transform({}, { type: 'body', metatype: UpdateOrderStatusDto }),
      ).rejects.toThrow();
    });
  });
});

