import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type InvoiceCounterDocument = HydratedDocument<InvoiceCounter>;

@Schema({ timestamps: true })
export class InvoiceCounter {
  /**
   * Sequence key identifier (e.g. "INVOICE-CT-2026-27").
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

export const InvoiceCounterSchema = SchemaFactory.createForClass(InvoiceCounter);

