import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes, Types } from 'mongoose';

export type GstSettingsDocument = HydratedDocument<GstSettings>;

@Schema({ _id: false })
export class ShopAddress {
  @Prop({ default: '', trim: true })
  line1!: string;

  @Prop({ default: '', trim: true })
  line2?: string;

  @Prop({ default: '', trim: true })
  city!: string;

  @Prop({ default: '', trim: true })
  state!: string;

  @Prop({ default: '', trim: true })
  stateCode!: string;

  @Prop({ default: '', trim: true })
  pincode!: string;
}

export const ShopAddressSchema = SchemaFactory.createForClass(ShopAddress);

@Schema({ timestamps: true })
export class GstSettings {
  /**
   * Shop display trade name
   */
  @Prop({ required: true, default: 'Cream Treat', trim: true })
  shopName!: string;

  /**
   * Registered legal business entity name
   */
  @Prop({ default: '', trim: true })
  legalName?: string;

  /**
   * Goods and Services Tax Identification Number (15 chars)
   * Left empty until provided by the administrator.
   */
  @Prop({ default: '', trim: true, uppercase: true })
  gstin!: string;

  /**
   * Permanent Account Number (PAN)
   */
  @Prop({ default: '', trim: true, uppercase: true })
  pan?: string;

  /**
   * Contact phone number
   */
  @Prop({ default: '', trim: true })
  phone!: string;

  /**
   * Contact email address
   */
  @Prop({ default: '', trim: true, lowercase: true })
  email!: string;

  /**
   * Physical store address snapshot
   */
  @Prop({ type: ShopAddressSchema, default: () => ({}) })
  address!: ShopAddress;

  /**
   * Default HSN/SAC code for restaurant food & beverage services.
   * Left empty until provided by the administrator.
   */
  @Prop({ default: '', trim: true })
  defaultHsnSac!: string;

  /**
   * GST tax percentage rate (e.g. 5 for 5% restaurant GST).
   * Default 0 with isConfigured: false until set by administrator.
   */
  @Prop({ default: 0, min: 0, max: 28 })
  gstRate!: number;

  /**
   * Whether menu prices are tax inclusive (standard for cafes)
   * or tax exclusive (tax added on top).
   */
  @Prop({ default: true })
  isTaxInclusive!: boolean;

  /**
   * Prefix for invoice numbering (e.g. "CT")
   */
  @Prop({ default: 'CT', trim: true, uppercase: true })
  invoicePrefix!: string;

  /**
   * Applicable Indian Financial Year string (e.g. "2026-27")
   */
  @Prop({ default: '2026-27', trim: true })
  financialYear!: string;

  /**
   * Flag indicating whether all required GST compliance fields
   * (GSTIN, State Code, SAC Code, GST Rate > 0, Address) are verified.
   * When false, final tax invoice generation is disabled.
   */
  @Prop({ default: false, index: true })
  isConfigured!: boolean;

  /**
   * Custom terms and conditions printed on invoice footer.
   */
  @Prop({
    type: [String],
    default: [
      'Goods/Services once sold cannot be returned or exchanged.',
      'Thank you for dining with Cream Treat!',
    ],
  })
  termsAndConditions!: string[];

  /**
   * Last administrator who updated the settings
   */
  @Prop({ type: SchemaTypes.ObjectId, ref: 'AdminUser', required: false })
  updatedBy?: Types.ObjectId;
}

export const GstSettingsSchema = SchemaFactory.createForClass(GstSettings);

