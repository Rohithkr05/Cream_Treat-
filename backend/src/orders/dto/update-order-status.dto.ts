import { IsEnum, IsNotEmpty } from 'class-validator';
import { OrderStatus } from '../schemas/order.schema.js';

export class UpdateOrderStatusDto {
  @IsNotEmpty({ message: 'status is required' })
  @IsEnum(OrderStatus, {
    message:
      'status must be a valid order status (NEW, ACCEPTED, PREPARING, READY, COMPLETED, CANCELLED)',
  })
  status!: OrderStatus;
}
