import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Category, CategorySchema } from './schemas/category.schema.js';
import { FoodItem, FoodItemSchema } from './schemas/food-item.schema.js';
import { CategoriesService } from './categories.service.js';
import { FoodItemsService } from './food-items.service.js';
import { MenuController } from './menu.controller.js';
import { AdminMenuController } from './admin-menu.controller.js';

import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      { name: FoodItem.name, schema: FoodItemSchema },
    ]),
    AuthModule,
  ],
  controllers: [MenuController, AdminMenuController],
  providers: [CategoriesService, FoodItemsService],
  exports: [CategoriesService, FoodItemsService, MongooseModule],
})
export class MenuModule {}
