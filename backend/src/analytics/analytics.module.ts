import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module.js';
import { Order, OrderSchema } from '../orders/schemas/order.schema.js';
import {
  FoodItem,
  FoodItemSchema,
} from '../menu/schemas/food-item.schema.js';
import {
  Category,
  CategorySchema,
} from '../menu/schemas/category.schema.js';
import { AnalyticsController } from './analytics.controller.js';
import { AnalyticsService } from './analytics.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: FoodItem.name, schema: FoodItemSchema },
      { name: Category.name, schema: CategorySchema },
    ]),
    AuthModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

