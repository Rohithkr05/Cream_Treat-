import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OrderCounterDocument = HydratedDocument<OrderCounter>;

@Schema({ timestamps: true })
export class OrderCounter {
  /**
   * Sequence key identifier (e.g. "ORDER-2026-10-14").
   * Unique across the entire collection to guarantee concurrency safety.
   */
  @Prop({ required: true, unique: true, index: true, trim: true })
  key!: string;

  /**
   * Monotonically increasing sequence number for the key.
   */
  @Prop({ required: true, default: 0, min: 0 })
  sequence!: number;
}

export const OrderCounterSchema = SchemaFactory.createForClass(OrderCounter);
