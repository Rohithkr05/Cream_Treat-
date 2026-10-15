import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from './schemas/order.schema.js';
import {
  OrderCounter,
  OrderCounterDocument,
} from './schemas/order-counter.schema.js';
import {
  FoodItem,
  FoodItemDocument,
} from '../menu/schemas/food-item.schema.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto.js';
import { OrderItem } from './schemas/order-item.schema.js';
import { OrdersGateway } from './orders.gateway.js';

export interface FormattedOrderItem {
  foodItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  itemTotal: number;
}

export interface FormattedOrderResponse {
  id: string;
  orderNumber: string;
  displayOrderNumber: string;
  orderDate: string;
  tableNumber: number;
  status: OrderStatus;
  items: FormattedOrderItem[];
  subtotal: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  itemTotal: number;
  foodItemId?: string;
}

export interface AdminOrderDetails {
  id: string;
  orderNumber: string;
  orderDate: string;
  tableNumber: number;
  items: AdminOrderItem[];
  subtotal: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrdersPaginatedResponse {
  data: AdminOrderDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.NEW]: [OrderStatus.ACCEPTED, OrderStatus.CANCELLED],
  [OrderStatus.ACCEPTED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(OrderCounter.name)
    private readonly orderCounterModel: Model<OrderCounterDocument>,
    @InjectModel(FoodItem.name)
    private readonly foodItemModel: Model<FoodItemDocument>,
    @Optional()
    private readonly ordersGateway?: OrdersGateway,
  ) {}

  /**
   * Returns current calendar date in restaurant local timezone (Asia/Kolkata).
   * Format: YYYY-MM-DD
   */
  getRestaurantLocalDate(
    date: Date = new Date(),
    timeZone: string = 'Asia/Kolkata',
  ): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  }

  /**
   * Generates a concurrency-safe atomic daily order number sequence.
   * Resets every calendar day (Asia/Kolkata).
   * Example: 1 -> "#001", 42 -> "#042", 1005 -> "#1005"
   */
  async getNextOrderNumber(orderDate: string): Promise<string> {
    const key = `ORDER-${orderDate}`;
    const counter = await this.orderCounterModel
      .findOneAndUpdate(
        { key },
        { $inc: { sequence: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();

    const seq = counter?.sequence ?? 1;
    return seq < 1000 ? `#${seq.toString().padStart(3, '0')}` : `#${seq}`;
  }

  /**
   * Validates items, calculates totals from current DB prices,
   * generates daily sequence number, and persists the new order.
   */
  async create(createOrderDto: CreateOrderDto): Promise<FormattedOrderResponse> {
    if (
      !createOrderDto.tableNumber ||
      !Number.isInteger(createOrderDto.tableNumber) ||
      createOrderDto.tableNumber < 1 ||
      createOrderDto.tableNumber > 999
    ) {
      throw new BadRequestException('tableNumber must be an integer between 1 and 999');
    }

    if (!createOrderDto.items || createOrderDto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    // Step 1: Normalize duplicate foodItemId entries by summing quantities
    const itemQuantityMap = new Map<string, number>();
    for (const item of createOrderDto.items) {
      if (!item || !Number.isInteger(item.quantity) || item.quantity < 1) {
        throw new BadRequestException('Item quantity must be a positive integer');
      }
      const current = itemQuantityMap.get(item.foodItemId) ?? 0;
      itemQuantityMap.set(item.foodItemId, current + item.quantity);
    }

    // Step 2: Validate each item and calculate subtotal using database prices
    const orderItems: OrderItem[] = [];
    let subtotal = 0;

    for (const [foodItemId, quantity] of itemQuantityMap.entries()) {
      if (!Types.ObjectId.isValid(foodItemId)) {
        throw new BadRequestException(`Invalid food item ID format: ${foodItemId}`);
      }

      const foodItem = await this.foodItemModel.findById(foodItemId).exec();
      if (!foodItem) {
        throw new NotFoundException(`Food item not found`);
      }

      if (!foodItem.isAvailable) {
        throw new BadRequestException(
          `Food item "${foodItem.name}" is currently unavailable`,
        );
      }

      // Security: Always use current DB price and name for immutable snapshot
      const priceSnapshot = foodItem.price;
      const nameSnapshot = foodItem.name;
      const itemTotal = priceSnapshot * quantity;
      subtotal += itemTotal;

      orderItems.push({
        foodItemId: foodItem._id as Types.ObjectId,
        nameSnapshot,
        priceSnapshot,
        quantity,
        itemTotal,
      });
    }

    // Subtotal = Total (no taxes, delivery fees, or discounts in current scope)
    const total = subtotal;

    // Step 3: Determine restaurant local date and atomic sequence order number
    const orderDate = this.getRestaurantLocalDate();
    const orderNumber = await this.getNextOrderNumber(orderDate);

    // Step 4: Persist the order document
    const order = new this.orderModel({
      orderNumber,
      orderDate,
      tableNumber: createOrderDto.tableNumber,
      items: orderItems,
      subtotal,
      total,
      status: OrderStatus.NEW,
    });

    const savedOrder = await order.save();
    const formatted = this.formatOrderResponse(savedOrder);

    // Emit real-time notification to admin room
    try {
      this.ordersGateway?.emitOrderCreated(formatted);
    } catch {
      // Non-blocking real-time notification
    }

    return formatted;
  }

  /**
   * Retrieves an order by its MongoDB ObjectId.
   */
  async findById(id: string): Promise<FormattedOrderResponse> {
    const order = await this.orderModel.findById(id).exec();
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return this.formatOrderResponse(order);
  }

  /**
   * Retrieves a sanitized customer-safe order for status tracking.
   * Excludes any internal database or sensitive data.
   */
  async findCustomerOrderById(id: string): Promise<FormattedOrderResponse> {
    return this.findById(id);
  }

  /**
   * Helper to format order document into clean, public-facing representation.
   */
  formatOrderResponse(order: OrderDocument): FormattedOrderResponse {
    const orderObj = order.toObject ? order.toObject() : order;
    const createdAt = (orderObj as { createdAt?: Date | string }).createdAt;
    const updatedAt = (orderObj as { updatedAt?: Date | string }).updatedAt;

    const createdAtIso =
      createdAt instanceof Date
        ? createdAt.toISOString()
        : typeof createdAt === 'string'
          ? createdAt
          : new Date().toISOString();

    const updatedAtIso =
      updatedAt instanceof Date
        ? updatedAt.toISOString()
        : typeof updatedAt === 'string'
          ? updatedAt
          : createdAtIso;

    return {
      id: order._id.toString(),
      orderNumber: order.orderNumber,
      displayOrderNumber: order.orderNumber,
      orderDate: order.orderDate,
      tableNumber: order.tableNumber,
      status: order.status,
      items: order.items.map((item) => ({
        foodItemId: item.foodItemId.toString(),
        name: item.nameSnapshot,
        quantity: item.quantity,
        unitPrice: item.priceSnapshot,
        itemTotal: item.itemTotal,
      })),
      subtotal: order.subtotal,
      total: order.total,
      createdAt: createdAtIso,
      updatedAt: updatedAtIso,
    };
  }

  /**
   * Retrieves a paginated list of orders for the admin dashboard.
   * Supports filtering by status and date, sorted newest first.
   */
  async findAdminOrders(
    query: AdminOrderQueryDto,
  ): Promise<AdminOrdersPaginatedResponse> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 50) : 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.status) {
      filter.status = query.status;
    }
    if (query.date) {
      filter.orderDate = query.date;
    }

    const [orders, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1, orderDate: -1, orderNumber: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);

    return {
      data: orders.map((order) => this.formatAdminOrder(order)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Retrieves a single order by ID for the admin order detail view.
   */
  async findAdminOrderById(id: string): Promise<AdminOrderDetails> {
    const order = await this.orderModel.findById(id).exec();
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return this.formatAdminOrder(order);
  }

  /**
   * Helper to format an order into a clean admin-safe response without Mongoose internals.
   */
  formatAdminOrder(order: OrderDocument): AdminOrderDetails {
    const orderObj = order.toObject ? order.toObject() : order;
    const createdAt = (orderObj as { createdAt?: Date | string }).createdAt;
    const updatedAt = (orderObj as { updatedAt?: Date | string }).updatedAt;

    const createdAtIso =
      createdAt instanceof Date
        ? createdAt.toISOString()
        : typeof createdAt === 'string'
          ? createdAt
          : new Date().toISOString();

    const updatedAtIso =
      updatedAt instanceof Date
        ? updatedAt.toISOString()
        : typeof updatedAt === 'string'
          ? updatedAt
          : createdAtIso;

    return {
      id: order._id.toString(),
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      tableNumber: order.tableNumber,
      items: order.items.map((item) => ({
        name: item.nameSnapshot,
        quantity: item.quantity,
        unitPrice: item.priceSnapshot,
        itemTotal: item.itemTotal,
        foodItemId: item.foodItemId ? item.foodItemId.toString() : undefined,
      })),
      subtotal: order.subtotal,
      total: order.total,
      status: order.status,
      createdAt: createdAtIso,
      updatedAt: updatedAtIso,
    };
  }

  /**
   * Updates an order status with strict lifecycle transition enforcement,
   * idempotency detection, and atomic concurrency protection.
   */
  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
  ): Promise<AdminOrderDetails> {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    if (order.status === newStatus) {
      throw new ConflictException(`Order is already ${newStatus}.`);
    }

    const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[order.status] || [];
    if (!allowedTransitions.includes(newStatus)) {
      throw new ConflictException(
        `Invalid order status transition from ${order.status} to ${newStatus}.`,
      );
    }

    // Atomic update ensuring no race conditions from concurrent admin actions
    const updatedOrder = await this.orderModel
      .findOneAndUpdate(
        { _id: order._id, status: order.status },
        { $set: { status: newStatus } },
        { new: true, runValidators: true },
      )
      .exec();

    if (!updatedOrder) {
      const latestOrder = await this.orderModel.findById(orderId).exec();
      throw new ConflictException(
        `Order was updated concurrently. Current status is ${
          latestOrder?.status || 'unknown'
        }.`,
      );
    }

    const formatted = this.formatAdminOrder(updatedOrder);

    // Emit real-time status update to admin room and customer order room
    try {
      this.ordersGateway?.emitOrderStatusUpdated(formatted);
    } catch {
      // Non-blocking real-time notification
    }

    return formatted;
  }
}


