import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ShopAddressDto {
  @IsString()
  line1!: string;

  @IsOptional()
  @IsString()
  line2?: string;

  @IsString()
  city!: string;

  @IsString()
  state!: string;

  @IsString()
  @Matches(/^[0-9]{2}$/, {
    message: 'State code must be a valid 2-digit GST state code (e.g. 29 for Karnataka)',
  })
  stateCode!: string;

  @IsString()
  @Matches(/^[0-9]{6}$/, {
    message: 'Pincode must be a 6-digit postal code',
  })
  pincode!: string;
}

export class UpdateGstSettingsDto {
  @IsString()
  shopName!: string;

  @IsOptional()
  @IsString()
  legalName?: string;

  /**
   * GSTIN: 15 alphanumeric characters matching Indian GSTIN format
   */
  @IsString()
  @Matches(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    {
      message:
        'Invalid GSTIN format. Must be 15 characters matching standard GSTIN format (e.g. 29AAAAA0000A1Z5)',
    },
  )
  gstin!: string;

  @IsOptional()
  @IsString()
  pan?: string;

  @IsString()
  phone!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @ValidateNested()
  @Type(() => ShopAddressDto)
  address!: ShopAddressDto;

  /**
   * Default HSN or SAC code (e.g. 996331 for restaurant services)
   */
  @IsString()
  defaultHsnSac!: string;

  /**
   * GST rate percentage (e.g. 5 for restaurant 5% GST, or 18)
   */
  @IsNumber()
  @Min(0)
  @Max(28)
  gstRate!: number;

  @IsBoolean()
  isTaxInclusive!: boolean;

  @IsOptional()
  @IsString()
  invoicePrefix?: string;

  @IsOptional()
  @IsString()
  financialYear?: string;

  @IsOptional()
  @IsString({ each: true })
  termsAndConditions?: string[];
}

