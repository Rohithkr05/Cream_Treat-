import { IsEnum, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '../schemas/order.schema.js';

export class AdminOrderQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(50, { message: 'limit cannot exceed 50' })
  limit: number = 20;

  @IsOptional()
  @IsEnum(OrderStatus, {
    message:
      'status must be a valid order status (NEW, ACCEPTED, PREPARING, READY, COMPLETED, CANCELLED)',
  })
  status?: OrderStatus;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  date?: string;
}
