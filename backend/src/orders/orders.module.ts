import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schemas/order.schema.js';
import {
  OrderCounter,
  OrderCounterSchema,
} from './schemas/order-counter.schema.js';
import {
  FoodItem,
  FoodItemSchema,
} from '../menu/schemas/food-item.schema.js';
import { OrdersService } from './orders.service.js';
import { OrdersController } from './orders.controller.js';
import { AdminOrdersController } from './admin-orders.controller.js';
import { OrdersGateway } from './orders.gateway.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: OrderCounter.name, schema: OrderCounterSchema },
      { name: FoodItem.name, schema: FoodItemSchema },
    ]),
    AuthModule,
  ],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService, OrdersGateway],
  exports: [OrdersService, OrdersGateway, MongooseModule],
})
export class OrdersModule {}
