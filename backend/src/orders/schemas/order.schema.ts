import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { OrderItem, OrderItemSchema } from './order-item.schema.js';

export enum OrderStatus {
  NEW = 'NEW',
  ACCEPTED = 'ACCEPTED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export type OrderDocument = HydratedDocument<Order>;

@Schema({ timestamps: true })
export class Order {
  /**
   * Daily sequence order number (e.g. "#001", "#002").
   * Combined with orderDate for daily uniqueness.
   */
  @Prop({ required: true, trim: true })
  orderNumber!: string;

  /**
   * Date string in YYYY-MM-DD format representing the restaurant service day.
   */
  @Prop({ required: true, trim: true, index: true })
  orderDate!: string;

  /**
   * Positive integer table number (e.g. 1, 2, 5).
   */
  @Prop({
    required: true,
    min: 1,
    validate: Number.isInteger,
    index: true,
  })
  tableNumber!: number;

  /**
   * Snapshot array of ordered items. Must contain at least one item.
   */
  @Prop({
    type: [OrderItemSchema],
    required: true,
    validate: {
      validator: (items: OrderItem[]) => Array.isArray(items) && items.length > 0,
      message: 'Order must contain at least one item',
    },
  })
  items!: OrderItem[];

  /**
   * Subtotal amount in integer paise.
   */
  @Prop({ required: true, min: 0 })
  subtotal!: number;

  /**
   * Total amount in integer paise.
   */
  @Prop({ required: true, min: 0 })
  total!: number;

  /**
   * Current lifecycle status of the order.
   */
  @Prop({
    type: String,
    enum: Object.values(OrderStatus),
    default: OrderStatus.NEW,
    index: true,
  })
  status!: OrderStatus;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// Compound unique index ensuring order numbers reset daily and are unique per day
OrderSchema.index({ orderDate: 1, orderNumber: 1 }, { unique: true });

// Index for kitchen and admin dashboard sorting by status and creation time
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ tableNumber: 1, createdAt: -1 });
