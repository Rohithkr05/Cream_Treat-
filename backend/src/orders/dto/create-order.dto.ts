import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from './create-order-item.dto.js';

export class CreateOrderDto {
  @IsNotEmpty({ message: 'tableNumber is required' })
  @IsInt({ message: 'tableNumber must be an integer' })
  @Min(1, { message: 'tableNumber must be at least 1' })
  @Max(999, { message: 'tableNumber cannot exceed 999' })
  tableNumber!: number;

  @IsNotEmpty({ message: 'items array is required' })
  @IsArray({ message: 'items must be an array' })
  @ArrayMinSize(1, { message: 'Order must contain at least 1 item' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
