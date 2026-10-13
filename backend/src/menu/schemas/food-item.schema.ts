import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type FoodItemDocument = HydratedDocument<FoodItem>;

@Schema({ timestamps: true })
export class FoodItem {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Category',
    required: true,
    index: true,
  })
  categoryId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ trim: true, default: '' })
  description!: string;

  /**
   * Price stored in integer paise (e.g. ₹120.00 = 12000 paise)
   * to eliminate floating-point rounding errors.
   */
  @Prop({ required: true, min: 0 })
  price!: number;

  @Prop({ trim: true, default: '' })
  imageUrl!: string;

  @Prop({ default: true, index: true })
  isAvailable!: boolean;

  @Prop({ default: 0, index: true })
  displayOrder!: number;
}

export const FoodItemSchema = SchemaFactory.createForClass(FoodItem);

// Compound index for querying active items per category in presentation order
FoodItemSchema.index({ categoryId: 1, isAvailable: 1, displayOrder: 1 });
