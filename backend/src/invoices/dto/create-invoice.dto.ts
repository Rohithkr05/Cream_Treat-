import {
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { PaymentMode, PaymentStatus } from '../schemas/invoice.schema.js';

export class CreateInvoiceDto {
  @IsMongoId({ message: 'orderId must be a valid 24-character hexadecimal MongoDB ObjectId' })
  orderId!: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  @Matches(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    {
      message:
        'Customer GSTIN format invalid. Must be 15 characters (e.g. 29AAAAA0000A1Z5)',
    },
  )
  customerGstin?: string;

  @IsOptional()
  @IsString()
  customerAddress?: string;

  @IsOptional()
  @IsString()
  customerState?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{2}$/, {
    message: 'Customer state code must be a 2-digit GST state code',
  })
  customerStateCode?: string;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsEnum(PaymentMode)
  paymentMode?: PaymentMode;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class PreviewInvoiceDto extends CreateInvoiceDto {}

