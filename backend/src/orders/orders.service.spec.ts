import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { OrdersService } from './orders.service.js';
import { Order, OrderStatus } from './schemas/order.schema.js';
import { OrderCounter } from './schemas/order-counter.schema.js';
import { FoodItem } from '../menu/schemas/food-item.schema.js';
import { OrdersGateway } from './orders.gateway.js';

describe('OrdersService', () => {
  let ordersService: OrdersService;

  const mockOrderInstance = {
    _id: new Types.ObjectId('670d00000000000000000001'),
    orderNumber: '#001',
    orderDate: '2026-10-14',
    tableNumber: 5,
    items: [],
    subtotal: 24000,
    total: 24000,
    status: OrderStatus.NEW,
    createdAt: new Date('2026-10-14T10:00:00.000Z'),
    save: vi.fn(),
  };

  function mockOrderModel(this: unknown, dto: Record<string, unknown>) {
    Object.assign(this as object, mockOrderInstance, dto, {
      _id: new Types.ObjectId('670d00000000000000000001'),
      save: vi.fn().mockImplementation(function (this: unknown) {
        return Promise.resolve(this);
      }),
    });
  }

  mockOrderModel.findById = vi.fn();
  mockOrderModel.find = vi.fn();
  mockOrderModel.countDocuments = vi.fn();
  mockOrderModel.findOneAndUpdate = vi.fn();

  const mockOrderCounterModel = {
    findOneAndUpdate: vi.fn(),
  };

  const mockFoodItemModel = {
    findById: vi.fn(),
  };

  const mockOrdersGateway = {
    emitOrderCreated: vi.fn(),
    emitOrderStatusUpdated: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getModelToken(Order.name),
          useValue: mockOrderModel,
        },
        {
          provide: getModelToken(OrderCounter.name),
          useValue: mockOrderCounterModel,
        },
        {
          provide: getModelToken(FoodItem.name),
          useValue: mockFoodItemModel,
        },
        {
          provide: OrdersGateway,
          useValue: mockOrdersGateway,
        },
      ],
    }).compile();

    ordersService = module.get<OrdersService>(OrdersService);
  });

  describe('Order Creation & Price Snapshots', () => {
    const foodId1 = new Types.ObjectId().toString();
    const foodId2 = new Types.ObjectId().toString();

    it('should create a valid order with database price snapshots and correct totals', async () => {
      // Mock food items in database with prices ₹120 (12000 paise) and ₹80 (8000 paise)
      mockFoodItemModel.findById
        .mockReturnValueOnce({
          exec: vi.fn().mockResolvedValue({
            _id: new Types.ObjectId(foodId1),
            name: 'Chicken Momos',
            price: 12000,
            isAvailable: true,
          }),
        })
        .mockReturnValueOnce({
          exec: vi.fn().mockResolvedValue({
            _id: new Types.ObjectId(foodId2),
            name: 'Hot & Sour Soup',
            price: 8000,
            isAvailable: true,
          }),
        });

      // Mock counter sequence returning 1
      mockOrderCounterModel.findOneAndUpdate.mockReturnValue({
        exec: vi.fn().mockResolvedValue({ sequence: 1 }),
      });

      const result = await ordersService.create({
        tableNumber: 5,
        items: [
          { foodItemId: foodId1, quantity: 2 },
          { foodItemId: foodId2, quantity: 1 },
        ],
      });

      expect(result).toBeDefined();
      expect(result.orderNumber).toBe('#001');
      expect(result.displayOrderNumber).toBe('#001');
      expect(result.tableNumber).toBe(5);
      expect(result.status).toBe(OrderStatus.NEW);
      // Chicken Momos 2 * 12000 = 24000; Soup 1 * 8000 = 8000; Total = 32000 paise (₹320)
      expect(result.items.length).toBe(2);
      expect(result.items[0]).toEqual({
        foodItemId: foodId1,
        name: 'Chicken Momos',
        quantity: 2,
        unitPrice: 12000,
        itemTotal: 24000,
      });
      expect(result.items[1]).toEqual({
        foodItemId: foodId2,
        name: 'Hot & Sour Soup',
        quantity: 1,
        unitPrice: 8000,
        itemTotal: 8000,
      });
      expect(result.subtotal).toBe(32000);
      expect(result.total).toBe(32000);
    });

    it('should normalize duplicate food items by summing their quantities', async () => {
      // Customer passes same food item twice: quantity 2 and quantity 3 -> should normalize to quantity 5
      mockFoodItemModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          _id: new Types.ObjectId(foodId1),
          name: 'Chicken Momos',
          price: 12000,
          isAvailable: true,
        }),
      });

      mockOrderCounterModel.findOneAndUpdate.mockReturnValue({
        exec: vi.fn().mockResolvedValue({ sequence: 2 }),
      });

      const result = await ordersService.create({
        tableNumber: 3,
        items: [
          { foodItemId: foodId1, quantity: 2 },
          { foodItemId: foodId1, quantity: 3 },
        ],
      });

      expect(result.items.length).toBe(1);
      expect(result.items[0].quantity).toBe(5);
      expect(result.items[0].itemTotal).toBe(60000); // 5 * 12000
      expect(result.total).toBe(60000);
      expect(result.orderNumber).toBe('#002');
    });

    it('should reject order if items array is empty', async () => {
      await expect(
        ordersService.create({
          tableNumber: 1,
          items: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject order if a food item is not found in database', async () => {
      mockFoodItemModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      await expect(
        ordersService.create({
          tableNumber: 1,
          items: [{ foodItemId: foodId1, quantity: 1 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject order if a food item is currently unavailable', async () => {
      mockFoodItemModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          _id: new Types.ObjectId(foodId1),
          name: 'Seasonal Drink',
          price: 10000,
          isAvailable: false,
        }),
      });

      await expect(
        ordersService.create({
          tableNumber: 1,
          items: [{ foodItemId: foodId1, quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid food item ID format', async () => {
      await expect(
        ordersService.create({
          tableNumber: 1,
          items: [{ foodItemId: 'invalid-id-123', quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid table number (negative, zero, >999, non-integer)', async () => {
      await expect(
        ordersService.create({
          tableNumber: 0,
          items: [{ foodItemId: foodId1, quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        ordersService.create({
          tableNumber: -5,
          items: [{ foodItemId: foodId1, quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        ordersService.create({
          tableNumber: 1000,
          items: [{ foodItemId: foodId1, quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        ordersService.create({
          tableNumber: 3.14,
          items: [{ foodItemId: foodId1, quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid item quantity (zero, negative, non-integer)', async () => {
      await expect(
        ordersService.create({
          tableNumber: 1,
          items: [{ foodItemId: foodId1, quantity: 0 }],
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        ordersService.create({
          tableNumber: 1,
          items: [{ foodItemId: foodId1, quantity: -2 }],
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        ordersService.create({
          tableNumber: 1,
          items: [{ foodItemId: foodId1, quantity: 1.5 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should strictly use database price and ignore any frontend prices or totals', async () => {
      // In DB: Chicken Momos price is 12000 (₹120)
      mockFoodItemModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          _id: new Types.ObjectId(foodId1),
          name: 'Chicken Momos',
          price: 12000,
          isAvailable: true,
        }),
      });

      mockOrderCounterModel.findOneAndUpdate.mockReturnValue({
        exec: vi.fn().mockResolvedValue({ sequence: 10 }),
      });

      // Customer payload attempting to inject price: 100 paise or total: 200
      const payload = {
        tableNumber: 5,
        items: [
          {
            foodItemId: foodId1,
            quantity: 3,
            price: 100, // untrusted injection attempt
            unitPrice: 100,
            itemTotal: 300,
          } as unknown as { foodItemId: string; quantity: number },
        ],
        subtotal: 300,
        total: 300,
      };

      const result = await ordersService.create(payload as any);

      // Backend must calculate from DB price: 3 * 12000 = 36000
      expect(result.items[0].unitPrice).toBe(12000);
      expect(result.items[0].itemTotal).toBe(36000);
      expect(result.subtotal).toBe(36000);
      expect(result.total).toBe(36000);
      expect(result.orderNumber).toBe('#010');
    });
  });

  describe('Daily Order Numbering & Concurrency', () => {
    it('should pad daily sequences below 1000 with leading zeros', async () => {
      mockOrderCounterModel.findOneAndUpdate.mockReturnValue({
        exec: vi.fn().mockResolvedValue({ sequence: 42 }),
      });

      const num = await ordersService.getNextOrderNumber('2026-10-14');
      expect(num).toBe('#042');
    });

    it('should format order numbers >= 1000 without truncation', async () => {
      mockOrderCounterModel.findOneAndUpdate.mockReturnValue({
        exec: vi.fn().mockResolvedValue({ sequence: 1005 }),
      });

      const num = await ordersService.getNextOrderNumber('2026-10-14');
      expect(num).toBe('#1005');
    });

    it('should format order date consistently in Asia/Kolkata timezone', () => {
      const fixedDate = new Date('2026-10-14T02:00:00.000Z'); // 07:30 AM IST on Oct 14
      const localDate = ordersService.getRestaurantLocalDate(fixedDate);
      expect(localDate).toBe('2026-10-14');
    });

    it('should atomically increment daily sequence counter with $inc and upsert', async () => {
      let currentSeq = 0;
      mockOrderCounterModel.findOneAndUpdate.mockImplementation(({ key }) => ({
        exec: vi.fn().mockImplementation(async () => {
          currentSeq += 1;
          return { key, sequence: currentSeq };
        }),
      }));

      const num1 = await ordersService.getNextOrderNumber('2026-10-14');
      const num2 = await ordersService.getNextOrderNumber('2026-10-14');
      const num3 = await ordersService.getNextOrderNumber('2026-10-14');

      expect(num1).toBe('#001');
      expect(num2).toBe('#002');
      expect(num3).toBe('#003');
      expect(mockOrderCounterModel.findOneAndUpdate).toHaveBeenCalledWith(
        { key: 'ORDER-2026-10-14' },
        { $inc: { sequence: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
    });
  });

  describe('findById & findCustomerOrderById', () => {
    it('should return formatted order if found', async () => {
      const orderId = new Types.ObjectId();
      const mockOrder = {
        _id: orderId,
        orderNumber: '#005',
        orderDate: '2026-10-14',
        tableNumber: 8,
        status: OrderStatus.PREPARING,
        items: [
          {
            foodItemId: new Types.ObjectId(),
            nameSnapshot: 'Veg Chowmein',
            priceSnapshot: 15000,
            quantity: 1,
            itemTotal: 15000,
          },
        ],
        subtotal: 15000,
        total: 15000,
        createdAt: new Date('2026-10-14T12:00:00Z'),
        updatedAt: new Date('2026-10-14T12:05:00Z'),
      };

      mockOrderModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockOrder),
      });

      const result = await ordersService.findCustomerOrderById(orderId.toString());
      expect(result).toBeDefined();
      expect(result.id).toBe(orderId.toString());
      expect(result.orderNumber).toBe('#005');
      expect(result.status).toBe(OrderStatus.PREPARING);
      expect(result.total).toBe(15000);
      expect(result.subtotal).toBe(15000);
      expect(result.items[0].name).toBe('Veg Chowmein');
      expect(result.items[0].unitPrice).toBe(15000);
      expect(result.items[0].itemTotal).toBe(15000);
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();

      // Ensure sensitive/internal fields are NOT exposed
      expect((result as any)._id).toBeUndefined();
      expect((result as any).__v).toBeUndefined();
      expect((result as any).adminNotes).toBeUndefined();
    });

    it('should throw NotFoundException if order does not exist', async () => {
      mockOrderModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      const randomId = new Types.ObjectId().toString();
      await expect(ordersService.findCustomerOrderById(randomId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAdminOrders', () => {
    const mockOrderList = [
      {
        _id: new Types.ObjectId('670d00000000000000000002'),
        orderNumber: '#002',
        orderDate: '2026-10-16',
        tableNumber: 4,
        items: [
          {
            foodItemId: new Types.ObjectId('670c00000000000000000001'),
            nameSnapshot: 'Chicken Momos',
            priceSnapshot: 12000,
            quantity: 2,
            itemTotal: 24000,
          },
        ],
        subtotal: 24000,
        total: 24000,
        status: OrderStatus.NEW,
        createdAt: new Date('2026-10-16T12:00:00.000Z'),
        updatedAt: new Date('2026-10-16T12:00:00.000Z'),
      },
    ];

    it('1. should return paginated orders with default page=1, limit=20 and newest-first sort', async () => {
      const mockQueryChain = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(mockOrderList),
      };

      mockOrderModel.find.mockReturnValue(mockQueryChain);
      mockOrderModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(1),
      });

      const result = await ordersService.findAdminOrders({
        page: 1,
        limit: 20,
      });

      expect(mockOrderModel.find).toHaveBeenCalledWith({});
      expect(mockQueryChain.sort).toHaveBeenCalledWith({
        createdAt: -1,
        orderDate: -1,
        orderNumber: -1,
      });
      expect(mockQueryChain.skip).toHaveBeenCalledWith(0);
      expect(mockQueryChain.limit).toHaveBeenCalledWith(20);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('670d00000000000000000002');
      expect(result.data[0].orderNumber).toBe('#002');
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
      // Ensure no raw mongoose internal fields
      expect((result.data[0] as any)._id).toBeUndefined();
      expect((result.data[0] as any).__v).toBeUndefined();
    });

    it('2. should calculate skip correctly for custom page and limit', async () => {
      const mockQueryChain = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };

      mockOrderModel.find.mockReturnValue(mockQueryChain);
      mockOrderModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(45),
      });

      const result = await ordersService.findAdminOrders({
        page: 3,
        limit: 10,
      });

      expect(mockQueryChain.skip).toHaveBeenCalledWith(20);
      expect(mockQueryChain.limit).toHaveBeenCalledWith(10);
      expect(result.pagination.totalPages).toBe(5);
    });

    it('3. should enforce maximum limit cap of 50', async () => {
      const mockQueryChain = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };

      mockOrderModel.find.mockReturnValue(mockQueryChain);
      mockOrderModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(0),
      });

      const result = await ordersService.findAdminOrders({
        page: 1,
        limit: 1000,
      });

      expect(mockQueryChain.limit).toHaveBeenCalledWith(50);
      expect(result.pagination.limit).toBe(50);
    });

    it('4. should filter by status when provided', async () => {
      const mockQueryChain = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };

      mockOrderModel.find.mockReturnValue(mockQueryChain);
      mockOrderModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(0),
      });

      await ordersService.findAdminOrders({
        page: 1,
        limit: 20,
        status: OrderStatus.PREPARING,
      });

      expect(mockOrderModel.find).toHaveBeenCalledWith({
        status: OrderStatus.PREPARING,
      });
      expect(mockOrderModel.countDocuments).toHaveBeenCalledWith({
        status: OrderStatus.PREPARING,
      });
    });

    it('5. should filter by date when provided', async () => {
      const mockQueryChain = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };

      mockOrderModel.find.mockReturnValue(mockQueryChain);
      mockOrderModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(0),
      });

      await ordersService.findAdminOrders({
        page: 1,
        limit: 20,
        date: '2026-10-16',
      });

      expect(mockOrderModel.find).toHaveBeenCalledWith({
        orderDate: '2026-10-16',
      });
      expect(mockOrderModel.countDocuments).toHaveBeenCalledWith({
        orderDate: '2026-10-16',
      });
    });

    it('6. should return totalPages 0 when total is 0', async () => {
      const mockQueryChain = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };

      mockOrderModel.find.mockReturnValue(mockQueryChain);
      mockOrderModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(0),
      });

      const result = await ordersService.findAdminOrders({
        page: 1,
        limit: 20,
      });

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });
  });

  describe('findAdminOrderById', () => {
    it('1. should return full order details for admin', async () => {
      const orderId = new Types.ObjectId('670d00000000000000000003');
      mockOrderModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          _id: orderId,
          orderNumber: '#003',
          orderDate: '2026-10-16',
          tableNumber: 2,
          items: [
            {
              foodItemId: new Types.ObjectId('670c00000000000000000001'),
              nameSnapshot: 'Vanilla Ice Cream',
              priceSnapshot: 8000,
              quantity: 1,
              itemTotal: 8000,
            },
          ],
          subtotal: 8000,
          total: 8000,
          status: OrderStatus.READY,
          createdAt: new Date('2026-10-16T14:30:00.000Z'),
          updatedAt: new Date('2026-10-16T14:35:00.000Z'),
        }),
      });

      const result = await ordersService.findAdminOrderById(orderId.toString());
      expect(result).toBeDefined();
      expect(result.id).toBe(orderId.toString());
      expect(result.orderNumber).toBe('#003');
      expect(result.status).toBe(OrderStatus.READY);
      expect(result.tableNumber).toBe(2);
      expect(result.items[0].name).toBe('Vanilla Ice Cream');
      expect(result.items[0].unitPrice).toBe(8000);
      expect(result.items[0].quantity).toBe(1);
      expect(result.items[0].itemTotal).toBe(8000);
      expect((result as any)._id).toBeUndefined();
      expect((result as any).__v).toBeUndefined();
    });

    it('2. should throw NotFoundException when order does not exist', async () => {
      mockOrderModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      const fakeId = new Types.ObjectId().toString();
      await expect(ordersService.findAdminOrderById(fakeId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateOrderStatus', () => {
    const orderId = new Types.ObjectId('670d00000000000000000099');

    function createMockOrderDoc(status: OrderStatus) {
      return {
        _id: orderId,
        orderNumber: '#099',
        orderDate: '2026-10-16',
        tableNumber: 3,
        items: [
          {
            foodItemId: new Types.ObjectId('670c00000000000000000001'),
            nameSnapshot: 'Chicken Momos',
            priceSnapshot: 12000,
            quantity: 2,
            itemTotal: 24000,
          },
        ],
        subtotal: 24000,
        total: 24000,
        status,
        createdAt: new Date('2026-10-16T12:00:00.000Z'),
        updatedAt: new Date('2026-10-16T12:00:00.000Z'),
      };
    }

    it('1. should succeed for NEW -> ACCEPTED', async () => {
      const initial = createMockOrderDoc(OrderStatus.NEW);
      const updated = { ...initial, status: OrderStatus.ACCEPTED };

      mockOrderModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(initial),
      });
      mockOrderModel.findOneAndUpdate.mockReturnValue({
        exec: vi.fn().mockResolvedValue(updated),
      });

      const res = await ordersService.updateOrderStatus(
        orderId.toString(),
        OrderStatus.ACCEPTED,
      );

      expect(res.status).toBe(OrderStatus.ACCEPTED);
      expect(mockOrderModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: orderId, status: OrderStatus.NEW },
        { $set: { status: OrderStatus.ACCEPTED } },
        { new: true, runValidators: true },
      );
      expect((res as any)._id).toBeUndefined();
      expect((res as any).__v).toBeUndefined();
    });

    it('2. should succeed for ACCEPTED -> PREPARING', async () => {
      const initial = createMockOrderDoc(OrderStatus.ACCEPTED);
      const updated = { ...initial, status: OrderStatus.PREPARING };

      mockOrderModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(initial),
      });
      mockOrderModel.findOneAndUpdate.mockReturnValue({
        exec: vi.fn().mockResolvedValue(updated),
      });

      const res = await ordersService.updateOrderStatus(
        orderId.toString(),
        OrderStatus.PREPARING,
      );
      expect(res.status).toBe(OrderStatus.PREPARING);
    });

    it('3. should succeed for PREPARING -> READY', async () => {
      const initial = createMockOrderDoc(OrderStatus.PREPARING);
      const updated = { ...initial, status: OrderStatus.READY };

      mockOrderModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(initial),
      });
      mockOrderModel.findOneAndUpdate.mockReturnValue({
        exec: vi.fn().mockResolvedValue(updated),
      });

      const res = await ordersService.updateOrderStatus(
        orderId.toString(),
        OrderStatus.READY,
      );
      expect(res.status).toBe(OrderStatus.READY);
    });

    it('4. should succeed for READY -> COMPLETED', async () => {
      const initial = createMockOrderDoc(OrderStatus.READY);
      const updated = { ...initial, status: OrderStatus.COMPLETED };

      mockOrderModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(initial),
      });
      mockOrderModel.findOneAndUpdate.mockReturnValue({
        exec: vi.fn().mockResolvedValue(updated),
      });

      const res = await ordersService.updateOrderStatus(
        orderId.toString(),
        OrderStatus.COMPLETED,
      );
      expect(res.status).toBe(OrderStatus.COMPLETED);
    });

    it('5. should succeed for NEW -> CANCELLED', async () => {
      const initial = createMockOrderDoc(OrderStatus.NEW);
      const updated = { ...initial, status: OrderStatus.CANCELLED };

      mockOrderModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(initial),
      });
      mockOrderModel.findOneAndUpdate.mockReturnValue({
        exec: vi.fn().mockResolvedValue(updated),
      });

      const res = await ordersService.updateOrderStatus(
        orderId.toString(),
        OrderStatus.CANCELLED,
      );
      expect(res.status).toBe(OrderStatus.CANCELLED);
    });

    it('6. should succeed for ACCEPTED -> CANCELLED', async () => {
      const initial = createMockOrderDoc(OrderStatus.ACCEPTED);
      const updated = { ...initial, status: OrderStatus.CANCELLED };

      mockOrderModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(initial),
      });
      mockOrderModel.findOneAndUpdate.mockReturnValue({
        exec: vi.fn().mockResolvedValue(updated),
      });

      const res = await ordersService.updateOrderStatus(
        orderId.toString(),
        OrderStatus.CANCELLED,
      );
      expect(res.status).toBe(OrderStatus.CANCELLED);
    });

    it('7. should succeed for PREPARING -> CANCELLED', async () => {
      const initial = createMockOrderDoc(OrderStatus.PREPARING);
      const updated = { ...initial, status: OrderStatus.CANCELLED };

      mockOrderModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(initial),
      });
      mockOrderModel.findOneAndUpdate.mockReturnValue({
        exec: vi.fn().mockResolvedValue(updated),
      });

      const res = await ordersService.updateOrderStatus(
        orderId.toString(),
        OrderStatus.CANCELLED,
      );
      expect(res.status).toBe(OrderStatus.CANCELLED);
    });

    it('8. should reject invalid skip transition NEW -> PREPARING with 409', async () => {
      mockOrderModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(createMockOrderDoc(OrderStatus.NEW)),
      });

      await expect(
        ordersService.updateOrderStatus(orderId.toString(), OrderStatus.PREPARING),
      ).rejects.toThrow(ConflictException);
    });

    it('9. should reject invalid transition NEW -> READY with 409', async () => {
      mockOrderModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(createMockOrderDoc(OrderStatus.NEW)),
      });

      await expect(
        ordersService.updateOrderStatus(orderId.toString(), OrderStatus.READY),
      ).rejects.toThrow(ConflictException);
    });

    it('10. should reject invalid transition NEW -> COMPLETED with 409', async () => {
      mockOrderModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(createMockOrderDoc(OrderStatus.NEW)),
      });

      await expect(
        ordersService.updateOrderStatus(orderId.toString(), OrderStatus.COMPLETED),
      ).rejects.toThrow(ConflictException);
    });

    it('11. should reject invalid transition ACCEPTED -> READY with 409', async () => {
      mockOrderModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(createMockOrderDoc(OrderStatus.ACCEPTED)),
      });

      await expect(
        ordersService.updateOrderStatus(orderId.toString(), OrderStatus.READY),
      ).rejects.toThrow(ConflictException);
    });

    it('12. should reject invalid transition ACCEPTED -> COMPLETED with 409', async () => {
      mockOrderModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(createMockOrderDoc(OrderStatus.ACCEPTED)),
      });

      await expect(
        ordersService.updateOrderStatus(orderId.toString(), OrderStatus.COMPLETED),
      ).rejects.toThrow(ConflictException);
    });

    it('13. should reject invalid transition PREPARING -> COMPLETED with 409', async () => {
      mockOrderModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(createMockOrderDoc(OrderStatus.PREPARING)),
      });

      await expect(
        ordersService.updateOrderStatus(orderId.toString(), OrderStatus.COMPLETED),
      ).rejects.toThrow(ConflictException);
    });

    it('14. should reject backward transition READY -> PREPARING with 409', async () => {
      mockOrderModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(createMockOrderDoc(OrderStatus.READY)),
      });

      await expect(
        ordersService.updateOrderStatus(orderId.toString(), OrderStatus.PREPARING),
      ).rejects.toThrow(ConflictException);
    });

    it('15. should reject transition from terminal state COMPLETED with 409', async () => {
      mockOrderModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(createMockOrderDoc(OrderStatus.COMPLETED)),
      });

      await expect(
        ordersService.updateOrderStatus(orderId.toString(), OrderStatus.READY),
      ).rejects.toThrow(ConflictException);
    });

    it('16. should reject transition from terminal state CANCELLED with 409', async () => {
      mockOrderModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(createMockOrderDoc(OrderStatus.CANCELLED)),
      });

      await expect(
        ordersService.updateOrderStatus(orderId.toString(), OrderStatus.NEW),
      ).rejects.toThrow(ConflictException);
    });

    it('17. should reject idempotent transition to the same status with 409', async () => {
      mockOrderModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(createMockOrderDoc(OrderStatus.NEW)),
      });

      await expect(
        ordersService.updateOrderStatus(orderId.toString(), OrderStatus.NEW),
      ).rejects.toThrow(ConflictException);
    });

    it('18. should throw NotFoundException if order does not exist', async () => {
      mockOrderModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      await expect(
        ordersService.updateOrderStatus(
          new Types.ObjectId().toString(),
          OrderStatus.ACCEPTED,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('19. should handle concurrent database update collision with 409', async () => {
      const initial = createMockOrderDoc(OrderStatus.NEW);

      // findById sees NEW
      mockOrderModel.findById
        .mockReturnValueOnce({
          exec: vi.fn().mockResolvedValue(initial),
        })
        .mockReturnValueOnce({
          // Next findById sees PREPARING (another admin raced ahead)
          exec: vi.fn().mockResolvedValue({ ...initial, status: OrderStatus.PREPARING }),
        });

      // findOneAndUpdate fails because status was changed
      mockOrderModel.findOneAndUpdate.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      await expect(
        ordersService.updateOrderStatus(orderId.toString(), OrderStatus.ACCEPTED),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Phase 12: Real-time Socket Event Emission Integration', () => {
    const validOrderId = new Types.ObjectId().toString();
    const foodId = new Types.ObjectId().toString();

    it('1. Successful order creation emits one admin event', async () => {
      mockOrderCounterModel.findOneAndUpdate.mockReturnValue({
        exec: vi.fn().mockResolvedValue({ sequence: 10 }),
      });

      mockFoodItemModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          _id: new Types.ObjectId(foodId),
          name: 'Ice Cream Cup',
          price: 5000,
          isAvailable: true,
        }),
      });

      const res = await ordersService.create({
        tableNumber: 3,
        items: [{ foodItemId: foodId, quantity: 2 }],
      });

      expect(res).toBeDefined();
      expect(mockOrdersGateway.emitOrderCreated).toHaveBeenCalledTimes(1);
      expect(mockOrdersGateway.emitOrderCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          tableNumber: 3,
          total: 10000,
          status: OrderStatus.NEW,
        }),
      );
    });

    it('2. Failed order creation emits no event', async () => {
      // Missing items
      await expect(
        ordersService.create({
          tableNumber: 3,
          items: [],
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockOrdersGateway.emitOrderCreated).not.toHaveBeenCalled();

      // Unavailable food item
      mockFoodItemModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          _id: new Types.ObjectId(foodId),
          name: 'Sold Out Item',
          price: 5000,
          isAvailable: false,
        }),
      });

      await expect(
        ordersService.create({
          tableNumber: 3,
          items: [{ foodItemId: foodId, quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockOrdersGateway.emitOrderCreated).not.toHaveBeenCalled();
    });

    it('3. Successful status update emits an update event', async () => {
      const initial = {
        _id: new Types.ObjectId(validOrderId),
        orderNumber: '#010',
        orderDate: '2026-10-16',
        tableNumber: 4,
        items: [],
        subtotal: 5000,
        total: 5000,
        status: OrderStatus.NEW,
        createdAt: new Date('2026-10-16T10:00:00.000Z'),
        updatedAt: new Date('2026-10-16T10:00:00.000Z'),
      };

      const updated = {
        ...initial,
        status: OrderStatus.ACCEPTED,
        updatedAt: new Date('2026-10-16T10:05:00.000Z'),
      };

      mockOrderModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(initial),
      });

      mockOrderModel.findOneAndUpdate.mockReturnValue({
        exec: vi.fn().mockResolvedValue(updated),
      });

      const res = await ordersService.updateOrderStatus(
        validOrderId,
        OrderStatus.ACCEPTED,
      );

      expect(res.status).toBe(OrderStatus.ACCEPTED);
      expect(mockOrdersGateway.emitOrderStatusUpdated).toHaveBeenCalledTimes(1);
      expect(mockOrdersGateway.emitOrderStatusUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          id: validOrderId,
          status: OrderStatus.ACCEPTED,
        }),
      );
    });

    it('4. Invalid status transition emits no event', async () => {
      const initial = {
        _id: new Types.ObjectId(validOrderId),
        orderNumber: '#010',
        orderDate: '2026-10-16',
        tableNumber: 4,
        items: [],
        subtotal: 5000,
        total: 5000,
        status: OrderStatus.NEW,
        createdAt: new Date('2026-10-16T10:00:00.000Z'),
        updatedAt: new Date('2026-10-16T10:00:00.000Z'),
      };

      mockOrderModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(initial),
      });

      // NEW -> COMPLETED is illegal
      await expect(
        ordersService.updateOrderStatus(validOrderId, OrderStatus.COMPLETED),
      ).rejects.toThrow(ConflictException);

      expect(mockOrdersGateway.emitOrderStatusUpdated).not.toHaveBeenCalled();
    });

    it('5. Failed concurrent update emits no event', async () => {
      const initial = {
        _id: new Types.ObjectId(validOrderId),
        orderNumber: '#010',
        orderDate: '2026-10-16',
        tableNumber: 4,
        items: [],
        subtotal: 5000,
        total: 5000,
        status: OrderStatus.NEW,
        createdAt: new Date('2026-10-16T10:00:00.000Z'),
        updatedAt: new Date('2026-10-16T10:00:00.000Z'),
      };

      mockOrderModel.findById
        .mockReturnValueOnce({
          exec: vi.fn().mockResolvedValue(initial),
        })
        .mockReturnValueOnce({
          exec: vi.fn().mockResolvedValue({
            ...initial,
            status: OrderStatus.CANCELLED,
          }),
        });

      // Atomic update returns null due to concurrent change
      mockOrderModel.findOneAndUpdate.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      await expect(
        ordersService.updateOrderStatus(validOrderId, OrderStatus.ACCEPTED),
      ).rejects.toThrow(ConflictException);

      expect(mockOrdersGateway.emitOrderStatusUpdated).not.toHaveBeenCalled();
    });
  });

  describe('Optional Category Snapshot Capture on Order Creation', () => {
    it('attaches categoryIdSnapshot and categoryNameSnapshot when categoryModel is injected', async () => {
      const catId = new Types.ObjectId();
      const foodId = new Types.ObjectId();

      let savedPayload: Record<string, unknown> | null = null;
      function CapturingOrderModel(this: unknown, dto: Record<string, unknown>) {
        savedPayload = dto;
        Object.assign(this as object, mockOrderInstance, dto, {
          _id: new Types.ObjectId('670d00000000000000000099'),
          save: vi.fn().mockImplementation(function (this: unknown) {
            return Promise.resolve(this);
          }),
        });
      }

      const localCounter = {
        findOneAndUpdate: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue({ sequence: 3 }),
        }),
      };
      const localFood = {
        findById: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue({
            _id: foodId,
            categoryId: catId,
            name: 'Brownie Sundae',
            price: 18000,
            isAvailable: true,
          }),
        }),
      };
      const localCat = {
        findById: vi.fn().mockReturnValue({
          exec: vi.fn().mockResolvedValue({
            _id: catId,
            name: 'Sundae',
          }),
        }),
      };

      const svc = new OrdersService(
        CapturingOrderModel as never,
        localCounter as never,
        localFood as never,
        undefined,
        localCat as never,
      );

      await svc.create({
        tableNumber: 2,
        items: [{ foodItemId: foodId.toString(), quantity: 2 }],
      });

      const items = (savedPayload as unknown as { items: Array<Record<string, unknown>> })?.items;
      expect(items).toHaveLength(1);
      expect(items[0].categoryIdSnapshot).toEqual(catId);
      expect(items[0].categoryNameSnapshot).toBe('Sundae');
    });
  });
});

