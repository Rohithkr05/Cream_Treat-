import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { OrdersGateway } from './orders.gateway.js';
import { Order, OrderStatus } from './schemas/order.schema.js';
import { Socket, Server } from 'socket.io';

describe('OrdersGateway', () => {
  let gateway: OrdersGateway;
  let jwtService: JwtService;
  let mockOrderModel: {
    exists: ReturnType<typeof vi.fn>;
  };
  let mockServer: {
    to: ReturnType<typeof vi.fn>;
    emit: ReturnType<typeof vi.fn>;
  };

  const createMockSocket = (options: {
    token?: string;
    authRole?: string;
    queryRole?: string;
    authHeader?: string;
  } = {}): Socket => {
    const socket = {
      id: 'socket-test-123',
      handshake: {
        auth: {
          token: options.token,
          role: options.authRole,
        },
        headers: {
          authorization: options.authHeader,
        },
        query: {
          role: options.queryRole,
        },
      },
      data: {},
      join: vi.fn().mockResolvedValue(undefined),
      leave: vi.fn().mockResolvedValue(undefined),
      emit: vi.fn(),
      disconnect: vi.fn(),
    } as unknown as Socket;

    return socket;
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockOrderModel = {
      exists: vi.fn(),
    };

    mockServer = {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersGateway,
        {
          provide: getModelToken(Order.name),
          useValue: mockOrderModel,
        },
        {
          provide: JwtService,
          useValue: {
            verifyAsync: vi.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn().mockReturnValue('test-jwt-secret'),
          },
        },
      ],
    }).compile();

    gateway = module.get<OrdersGateway>(OrdersGateway);
    jwtService = module.get<JwtService>(JwtService);
    gateway.server = mockServer as unknown as Server;
  });

  describe('Authentication & Authorization on Connection', () => {
    it('should authenticate valid admin JWT and join admin-orders room', async () => {
      const socket = createMockSocket({ token: 'valid-admin-token' });
      vi.spyOn(jwtService, 'verifyAsync').mockResolvedValue({
        sub: 'admin-user-001',
        email: 'admin@creamtreat.local',
        role: 'ADMIN',
      });

      await gateway.handleConnection(socket);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-admin-token', {
        secret: 'test-jwt-secret',
      });
      expect(socket.data.admin).toEqual({
        sub: 'admin-user-001',
        email: 'admin@creamtreat.local',
        role: 'ADMIN',
      });
      expect(socket.join).toHaveBeenCalledWith('admin-orders');
      expect(socket.disconnect).not.toHaveBeenCalled();
    });

    it('should support Bearer token format in authorization header', async () => {
      const socket = createMockSocket({ authHeader: 'Bearer valid-header-token' });
      vi.spyOn(jwtService, 'verifyAsync').mockResolvedValue({
        sub: 'admin-user-002',
        email: 'admin2@creamtreat.local',
        role: 'ADMIN',
      });

      await gateway.handleConnection(socket);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-header-token', {
        secret: 'test-jwt-secret',
      });
      expect(socket.join).toHaveBeenCalledWith('admin-orders');
      expect(socket.disconnect).not.toHaveBeenCalled();
    });

    it('should reject and disconnect socket if JWT is invalid or expired', async () => {
      const socket = createMockSocket({ token: 'expired-or-malformed-token' });
      vi.spyOn(jwtService, 'verifyAsync').mockRejectedValue(
        new Error('jwt expired'),
      );

      await gateway.handleConnection(socket);

      expect(socket.emit).toHaveBeenCalledWith('auth_error', {
        message: 'Unauthorized: Invalid or expired token',
      });
      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('should reject and disconnect socket if token role is not ADMIN', async () => {
      const socket = createMockSocket({ token: 'user-token' });
      vi.spyOn(jwtService, 'verifyAsync').mockResolvedValue({
        sub: 'customer-123',
        email: 'customer@example.com',
        role: 'CUSTOMER',
      });

      await gateway.handleConnection(socket);

      expect(socket.emit).toHaveBeenCalledWith('auth_error', {
        message: 'Forbidden: Admin role required',
      });
      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('should reject clients claiming admin role without a valid token', async () => {
      const socket = createMockSocket({ authRole: 'ADMIN' });

      await gateway.handleConnection(socket);

      expect(socket.emit).toHaveBeenCalledWith('auth_error', {
        message: 'Unauthorized: Missing admin token',
      });
      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('should allow customer connection without token and not join admin-orders', async () => {
      const socket = createMockSocket(); // no token

      await gateway.handleConnection(socket);

      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
      expect(socket.data.admin).toBeUndefined();
      expect(socket.join).not.toHaveBeenCalledWith('admin-orders');
      expect(socket.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('Customer Order Subscriptions', () => {
    it('should reject subscription if orderId format is invalid', async () => {
      const socket = createMockSocket();
      const res = await gateway.handleSubscribeOrder(socket, {
        orderId: 'invalid-id-123',
      });

      expect(res.success).toBe(false);
      expect(res.message).toBe('Invalid order ID format');
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('should reject subscription if order does not exist in database', async () => {
      const validId = new Types.ObjectId().toString();
      mockOrderModel.exists.mockResolvedValue(null);

      const socket = createMockSocket();
      const res = await gateway.handleSubscribeOrder(socket, {
        orderId: validId,
      });

      expect(mockOrderModel.exists).toHaveBeenCalledWith({ _id: validId });
      expect(res.success).toBe(false);
      expect(res.message).toBe('Order does not exist');
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('should allow subscription and join room if order exists in database', async () => {
      const validId = new Types.ObjectId().toString();
      mockOrderModel.exists.mockResolvedValue({ _id: validId });

      const socket = createMockSocket();
      const res = await gateway.handleSubscribeOrder(socket, {
        orderId: validId,
      });

      expect(mockOrderModel.exists).toHaveBeenCalledWith({ _id: validId });
      expect(res.success).toBe(true);
      expect(res.room).toBe(`order:${validId}`);
      expect(socket.join).toHaveBeenCalledWith(`order:${validId}`);
    });

    it('should allow client to unsubscribe from order room', async () => {
      const validId = new Types.ObjectId().toString();
      const socket = createMockSocket();

      const res = await gateway.handleUnsubscribeOrder(socket, {
        orderId: validId,
      });

      expect(res.success).toBe(true);
      expect(res.room).toBe(`order:${validId}`);
      expect(socket.leave).toHaveBeenCalledWith(`order:${validId}`);
    });
  });

  describe('Gateway Event Emissions', () => {
    it('emitOrderCreated should broadcast order.created to admin-orders room with sanitized payload', () => {
      const mockOrder = {
        id: '670d00000000000000000001',
        orderNumber: '#001',
        displayOrderNumber: '#001',
        orderDate: '2026-10-16',
        tableNumber: 5,
        status: OrderStatus.NEW,
        subtotal: 12000,
        total: 12000,
        items: [
          {
            foodItemId: '670a00000000000000000001',
            name: 'Chocolate Sundae',
            quantity: 2,
            unitPrice: 6000,
            itemTotal: 12000,
          },
        ],
        createdAt: '2026-10-16T10:00:00.000Z',
        updatedAt: '2026-10-16T10:00:00.000Z',
      };

      gateway.emitOrderCreated(mockOrder);

      expect(mockServer.to).toHaveBeenCalledWith('admin-orders');
      expect(mockServer.emit).toHaveBeenCalledWith('order.created', {
        id: '670d00000000000000000001',
        orderNumber: '#001',
        orderDate: '2026-10-16',
        tableNumber: 5,
        status: OrderStatus.NEW,
        subtotal: 12000,
        total: 12000,
        items: [
          {
            foodItemId: '670a00000000000000000001',
            name: 'Chocolate Sundae',
            quantity: 2,
            unitPrice: 6000,
            itemTotal: 12000,
          },
        ],
        createdAt: '2026-10-16T10:00:00.000Z',
        updatedAt: '2026-10-16T10:00:00.000Z',
      });
    });

    it('emitOrderStatusUpdated should emit to admin-orders and sanitized update to customer room', () => {
      const mockOrder = {
        id: '670d00000000000000000001',
        orderNumber: '#001',
        orderDate: '2026-10-16',
        tableNumber: 5,
        status: OrderStatus.ACCEPTED,
        subtotal: 12000,
        total: 12000,
        items: [
          {
            name: 'Chocolate Sundae',
            quantity: 2,
            unitPrice: 6000,
            itemTotal: 12000,
          },
        ],
        createdAt: '2026-10-16T10:00:00.000Z',
        updatedAt: '2026-10-16T10:05:00.000Z',
      };

      gateway.emitOrderStatusUpdated(mockOrder);

      // Verify admin emit
      expect(mockServer.to).toHaveBeenCalledWith('admin-orders');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'order.status.updated',
        expect.objectContaining({
          id: '670d00000000000000000001',
          status: OrderStatus.ACCEPTED,
          tableNumber: 5,
          total: 12000,
        }),
      );

      // Verify customer room emit
      expect(mockServer.to).toHaveBeenCalledWith('order:670d00000000000000000001');
      expect(mockServer.emit).toHaveBeenCalledWith('order.status.updated', {
        id: '670d00000000000000000001',
        orderNumber: '#001',
        status: OrderStatus.ACCEPTED,
        updatedAt: '2026-10-16T10:05:00.000Z',
      });
    });
  });
});
