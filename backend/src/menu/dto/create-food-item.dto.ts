import {
  IsBoolean,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateFoodItemDto {
  @IsMongoId({ message: 'categoryId must be a valid 24-character hexadecimal MongoDB ObjectId' })
  @IsNotEmpty()
  categoryId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  /**
   * Price in integer paise (e.g. ₹120.00 = 12000 paise).
   */
  @IsInt({ message: 'price must be an integer represented in paise (e.g. ₹120 = 12000)' })
  @Min(0, { message: 'price cannot be negative' })
  price!: number;

  @IsString()
  @IsOptional()
  @MaxLength(2048)
  imageUrl?: string;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;
}
