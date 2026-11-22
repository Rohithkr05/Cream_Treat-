import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types } from 'mongoose';

@Schema({ _id: false })
export class OrderItem {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'FoodItem',
    required: true,
  })
  foodItemId!: Types.ObjectId;

  /**
   * Snapshot of the food item name at time of ordering.
   * Remains immutable even if food item name changes later.
   */
  @Prop({ required: true, trim: true })
  nameSnapshot!: string;

  /**
   * Snapshot of price in integer paise at time of ordering.
   * Remains immutable even if menu prices are updated later.
   */
  @Prop({ required: true, min: 0 })
  priceSnapshot!: number;

  /**
   * Ordered quantity (must be positive integer, minimum 1).
   */
  @Prop({ required: true, min: 1, validate: Number.isInteger })
  quantity!: number;

  /**
   * Item total in integer paise (priceSnapshot * quantity).
   */
  @Prop({ required: true, min: 0 })
  itemTotal!: number;

  /**
   * Optional immutable snapshot of the item's category at order time.
   * Preserved on newly created orders so category renames/reassignments
   * do not rewrite historical category sales; absent on older records.
   */
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Category',
    required: false,
  })
  categoryIdSnapshot?: Types.ObjectId;

  @Prop({ trim: true, required: false })
  categoryNameSnapshot?: string;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);
