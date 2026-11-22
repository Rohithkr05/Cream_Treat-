import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';
import { ShopAddress, ShopAddressSchema } from './gst-settings.schema.js';

export type InvoiceDocument = HydratedDocument<Invoice>;

export enum InvoiceStatus {
  ISSUED = 'ISSUED',
  CANCELLED = 'CANCELLED',
}

export enum SupplyType {
  INTRA_STATE = 'INTRA_STATE',
  INTER_STATE = 'INTER_STATE',
}

export enum PaymentMode {
  CASH = 'CASH',
  UPI = 'UPI',
  CARD = 'CARD',
  ONLINE = 'ONLINE',
}

export enum PaymentStatus {
  PAID = 'PAID',
  UNPAID = 'UNPAID',
}

@Schema({ _id: false })
export class InvoiceShopSnapshot {
  @Prop({ required: true, trim: true })
  shopName!: string;

  @Prop({ default: '', trim: true })
  legalName?: string;

  @Prop({ required: true, trim: true, uppercase: true })
  gstin!: string;

  @Prop({ default: '', trim: true, uppercase: true })
  pan?: string;

  @Prop({ default: '', trim: true })
  phone!: string;

  @Prop({ default: '', trim: true })
  email?: string;

  @Prop({ type: ShopAddressSchema, required: true })
  address!: ShopAddress;
}
export const InvoiceShopSnapshotSchema = SchemaFactory.createForClass(InvoiceShopSnapshot);

@Schema({ _id: false })
export class InvoiceCustomerSnapshot {
  @Prop({ default: '', trim: true })
  name?: string;

  @Prop({ default: '', trim: true })
  phone?: string;

  @Prop({ default: '', trim: true, uppercase: true })
  gstin?: string;

  @Prop({ default: '', trim: true })
  address?: string;

  @Prop({ default: '', trim: true })
  state?: string;

  @Prop({ default: '', trim: true })
  stateCode?: string;
}
export const InvoiceCustomerSnapshotSchema = SchemaFactory.createForClass(InvoiceCustomerSnapshot);

@Schema({ _id: false })
export class InvoiceItemSnapshot {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'FoodItem', required: true })
  foodItemId!: Types.ObjectId;

  /**
   * Name snapshot from the order
   */
  @Prop({ required: true, trim: true })
  nameSnapshot!: string;

  /**
   * Quantity ordered
   */
  @Prop({ required: true, min: 1, validate: Number.isInteger })
  quantity!: number;

  /**
   * Original unit price snapshot in integer paise
   */
  @Prop({ required: true, min: 0 })
  unitPrice!: number;

  /**
   * Taxable value in integer paise before GST
   */
  @Prop({ required: true, min: 0 })
  taxableAmount!: number;

  /**
   * Applicable HSN or SAC code for the item
   */
  @Prop({ default: '', trim: true })
  hsnSacCode!: string;

  /**
   * Total GST percentage (e.g. 5)
   */
  @Prop({ required: true, min: 0 })
  gstRate!: number;

  @Prop({ default: 0, min: 0 })
  cgstRate!: number;

  /**
   * CGST amount in integer paise
   */
  @Prop({ default: 0, min: 0 })
  cgstAmount!: number;

  @Prop({ default: 0, min: 0 })
  sgstRate!: number;

  /**
   * SGST amount in integer paise
   */
  @Prop({ default: 0, min: 0 })
  sgstAmount!: number;

  @Prop({ default: 0, min: 0 })
  igstRate!: number;

  /**
   * IGST amount in integer paise (for inter-state supply)
   */
  @Prop({ default: 0, min: 0 })
  igstAmount!: number;

  /**
   * Item total in integer paise
   */
  @Prop({ required: true, min: 0 })
  totalAmount!: number;
}
export const InvoiceItemSnapshotSchema = SchemaFactory.createForClass(InvoiceItemSnapshot);

@Schema({ timestamps: true })
export class Invoice {
  /**
   * Unique formatted tax invoice number (e.g. "CT/2026-27/0001")
   */
  @Prop({ required: true, unique: true, trim: true })
  invoiceNumber!: string;

  /**
   * Integer sequence counter value
   */
  @Prop({ required: true, min: 1 })
  sequence!: number;

  /**
   * Associated restaurant order ObjectId
   */
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Order', required: true })
  orderId!: Types.ObjectId;

  /**
   * Snapshot of daily order number (e.g. "#001")
   */
  @Prop({ required: true, trim: true })
  orderNumber!: string;

  /**
   * Service date of the order (YYYY-MM-DD)
   */
  @Prop({ required: true, trim: true })
  orderDate!: string;

  /**
   * Restaurant table number
   */
  @Prop({ required: true, min: 1 })
  tableNumber!: number;

  /**
   * Snapshot of business GST details at time of invoice creation
   */
  @Prop({ type: InvoiceShopSnapshotSchema, required: true })
  shopInfo!: InvoiceShopSnapshot;

  /**
   * Optional customer details (name, phone, GSTIN)
   */
  @Prop({ type: InvoiceCustomerSnapshotSchema, default: () => ({}) })
  customerInfo!: InvoiceCustomerSnapshot;

  /**
   * Supply classification (INTRA_STATE for CGST+SGST, INTER_STATE for IGST)
   */
  @Prop({
    type: String,
    enum: Object.values(SupplyType),
    default: SupplyType.INTRA_STATE,
  })
  supplyType!: SupplyType;

  /**
   * Indicates whether menu prices were calculated as tax-inclusive
   */
  @Prop({ required: true, default: true })
  isTaxInclusive!: boolean;

  /**
   * Default SAC/HSN code applied (e.g. 996331)
   */
  @Prop({ default: '', trim: true })
  defaultHsnSac!: string;

  /**
   * Array of food item snapshots with tax breakdown
   */
  @Prop({ type: [InvoiceItemSnapshotSchema], required: true })
  items!: InvoiceItemSnapshot[];

  /**
   * Total taxable value in integer paise
   */
  @Prop({ required: true, min: 0 })
  taxableAmount!: number;

  /**
   * Total CGST in integer paise
   */
  @Prop({ required: true, min: 0, default: 0 })
  cgstTotal!: number;

  /**
   * Total SGST in integer paise
   */
  @Prop({ required: true, min: 0, default: 0 })
  sgstTotal!: number;

  /**
   * Total IGST in integer paise
   */
  @Prop({ required: true, min: 0, default: 0 })
  igstTotal!: number;

  /**
   * Total GST in integer paise (CGST + SGST + IGST)
   */
  @Prop({ required: true, min: 0 })
  totalGst!: number;

  /**
   * Round off difference in integer paise (if applicable)
   */
  @Prop({ default: 0 })
  rounding!: number;

  /**
   * Final grand total in integer paise
   */
  @Prop({ required: true, min: 0 })
  grandTotal!: number;

  /**
   * Payment status
   */
  @Prop({
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PAID,
    index: true,
  })
  paymentStatus!: PaymentStatus;

  /**
   * Payment method used
   */
  @Prop({
    type: String,
    enum: Object.values(PaymentMode),
    default: PaymentMode.UPI,
  })
  paymentMode!: PaymentMode;

  /**
   * Invoice lifecycle status
   */
  @Prop({
    type: String,
    enum: Object.values(InvoiceStatus),
    default: InvoiceStatus.ISSUED,
    index: true,
  })
  status!: InvoiceStatus;

  /**
   * Optional notes on invoice
   */
  @Prop({ default: '', trim: true })
  notes?: string;

  /**
   * Terms and conditions printed on invoice footer
   */
  @Prop({ type: [String], default: [] })
  termsAndConditions!: string[];

  /**
   * Official generation timestamp
   */
  @Prop({ required: true, default: Date.now, index: true })
  issuedAt!: Date;

  /**
   * Administrator who generated the invoice
   */
  @Prop({ type: SchemaTypes.ObjectId, ref: 'AdminUser', required: false })
  issuedBy?: Types.ObjectId;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

// Fast lookups (invoiceNumber unique index is created via @Prop({ unique: true }))
InvoiceSchema.index({ orderId: 1 });
InvoiceSchema.index({ status: 1, createdAt: -1 });
InvoiceSchema.index({ issuedAt: -1 });

