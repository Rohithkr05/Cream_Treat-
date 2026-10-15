import { IsInt, IsMongoId, IsNotEmpty, Max, Min } from 'class-validator';

export class CreateOrderItemDto {
  @IsNotEmpty({ message: 'foodItemId is required' })
  @IsMongoId({ message: 'foodItemId must be a valid MongoDB ObjectId' })
  foodItemId!: string;

  @IsNotEmpty({ message: 'quantity is required' })
  @IsInt({ message: 'quantity must be an integer' })
  @Min(1, { message: 'quantity must be at least 1' })
  @Max(99, { message: 'quantity cannot exceed 99 per item' })
  quantity!: number;
}
