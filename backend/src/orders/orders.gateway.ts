import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema.js';
import { AdminOrderDetails, FormattedOrderResponse } from './orders.service.js';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface.js';

export interface OrderCreatedEventPayload {
  id: string;
  orderNumber: string;
  orderDate: string;
  tableNumber: number;
  status: string;
  subtotal: number;
  total: number;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    itemTotal: number;
    foodItemId?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface OrderStatusUpdatedAdminPayload {
  id: string;
  orderNumber: string;
  orderDate: string;
  tableNumber: number;
  status: string;
  subtotal: number;
  total: number;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    itemTotal: number;
    foodItemId?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface OrderStatusUpdatedCustomerPayload {
  id: string;
  orderNumber: string;
  status: string;
  updatedAt: string;
}

@WebSocketGateway({
  cors: {
    origin: (
      requestOrigin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!requestOrigin) return callback(null, true);

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      if (requestOrigin === frontendUrl) {
        return callback(null, true);
      }

      if (process.env.NODE_ENV !== 'production') {
        const isLocalOrLan =
          /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(
            requestOrigin,
          );
        if (isLocalOrLan) {
          return callback(null, true);
        }
      }

      const allowedOrigins = frontendUrl.split(',').map((u) => u.trim());
      if (allowedOrigins.includes(requestOrigin)) {
        return callback(null, true);
      }

      callback(null, false);
    },
    credentials: true,
  },
})
export class OrdersGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(OrdersGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Handles incoming socket connection.
   * - If an admin token is provided, validates signature, expiration, and ADMIN role.
   *   If valid, adds socket to 'admin-orders' room.
   *   If invalid/expired/non-admin, disconnects the socket.
   * - If no token is provided, connects as public customer client (cannot join admin room).
   */
  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);

      if (token) {
        const secret =
          this.configService.get<string>('JWT_SECRET') ||
          'cream_treat_dev_secret_key_2026_qr_ordering';

        const payload: JwtPayload = await this.jwtService.verifyAsync(token, {
          secret,
        });

        if (payload.role !== 'ADMIN') {
          this.logger.warn(
            `Rejected non-admin socket connection attempt from ${client.id}`,
          );
          client.emit('auth_error', {
            message: 'Forbidden: Admin role required',
          });
          client.disconnect(true);
          return;
        }

        client.data.admin = payload;
        await client.join('admin-orders');
        this.logger.log(
          `Admin client connected and joined admin-orders: ${client.id} (user: ${payload.sub})`,
        );
      } else {
        const claimedRole =
          client.handshake.auth?.role || client.handshake.query?.role;
        if (claimedRole && String(claimedRole).toUpperCase() === 'ADMIN') {
          this.logger.warn(
            `Rejected admin connection attempt without valid token from ${client.id}`,
          );
          client.emit('auth_error', {
            message: 'Unauthorized: Missing admin token',
          });
          client.disconnect(true);
          return;
        }

        this.logger.log(`Customer client connected: ${client.id}`);
      }
    } catch (err: unknown) {
      this.logger.warn(
        `Socket authentication failed for client ${client.id}: ${
          err instanceof Error ? err.message : 'Invalid token'
        }`,
      );
      client.emit('auth_error', {
        message: 'Unauthorized: Invalid or expired token',
      });
      client.disconnect(true);
    }
  }

  /**
   * Logs client disconnection.
   */
  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Allows customer clients to subscribe to updates for a specific order.
   * Validates ObjectId format and checks MongoDB existence before joining the room.
   */
  @SubscribeMessage('subscribe_order')
  async handleSubscribeOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ): Promise<{ success: boolean; message?: string; room?: string }> {
    const orderId = data?.orderId;
    if (
      !orderId ||
      typeof orderId !== 'string' ||
      !Types.ObjectId.isValid(orderId)
    ) {
      return { success: false, message: 'Invalid order ID format' };
    }

    const orderExists = await this.orderModel.exists({ _id: orderId });
    if (!orderExists) {
      return { success: false, message: 'Order does not exist' };
    }

    const room = `order:${orderId}`;
    await client.join(room);
    this.logger.log(`Client ${client.id} subscribed to ${room}`);
    return { success: true, room };
  }

  /**
   * Allows customer clients to unsubscribe from an order room.
   */
  @SubscribeMessage('unsubscribe_order')
  async handleUnsubscribeOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ): Promise<{ success: boolean; message?: string; room?: string }> {
    const orderId = data?.orderId;
    if (!orderId || typeof orderId !== 'string') {
      return { success: false, message: 'Missing order ID' };
    }

    const room = `order:${orderId}`;
    await client.leave(room);
    this.logger.log(`Client ${client.id} unsubscribed from ${room}`);
    return { success: true, room };
  }

  /**
   * Emits new order event to authenticated administrators.
   */
  emitOrderCreated(order: AdminOrderDetails | FormattedOrderResponse): void {
    if (!this.server) {
      this.logger.warn('Socket server not initialized, skipping order.created emit');
      return;
    }

    const payload: OrderCreatedEventPayload = {
      id: order.id,
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      tableNumber: order.tableNumber,
      status: order.status,
      subtotal: order.subtotal,
      total: order.total,
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        itemTotal: item.itemTotal,
        foodItemId: item.foodItemId,
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };

    this.server.to('admin-orders').emit('order.created', payload);
    this.logger.log(
      `Emitted order.created to admin-orders for order ${order.orderNumber} (ID: ${order.id})`,
    );
  }

  /**
   * Emits status update event to administrators and customer tracking room.
   */
  emitOrderStatusUpdated(order: AdminOrderDetails): void {
    if (!this.server) {
      this.logger.warn('Socket server not initialized, skipping order.status.updated emit');
      return;
    }

    // 1. Emit to admin-orders
    const adminPayload: OrderStatusUpdatedAdminPayload = {
      id: order.id,
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      tableNumber: order.tableNumber,
      status: order.status,
      subtotal: order.subtotal,
      total: order.total,
      items: order.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        itemTotal: item.itemTotal,
        foodItemId: item.foodItemId,
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
    this.server.to('admin-orders').emit('order.status.updated', adminPayload);

    // 2. Emit sanitized update to customer room
    const customerPayload: OrderStatusUpdatedCustomerPayload = {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      updatedAt: order.updatedAt,
    };
    const orderRoom = `order:${order.id}`;
    this.server.to(orderRoom).emit('order.status.updated', customerPayload);

    this.logger.log(
      `Emitted order.status.updated to admin-orders and ${orderRoom} (status: ${order.status})`,
    );
  }

  /**
   * Extracts token safely from handshake auth, headers, or query parameters.
   * Does NOT log tokens.
   */
  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth;
    if (auth && typeof auth.token === 'string' && auth.token.trim()) {
      const t = auth.token.trim();
      return t.startsWith('Bearer ') ? t.substring(7) : t;
    }

    const authHeader = client.handshake.headers?.authorization;
    if (typeof authHeader === 'string' && authHeader.trim()) {
      const t = authHeader.trim();
      return t.startsWith('Bearer ') ? t.substring(7) : t;
    }

    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string' && queryToken.trim()) {
      const t = queryToken.trim();
      return t.startsWith('Bearer ') ? t.substring(7) : t;
    }

    return null;
  }
}
