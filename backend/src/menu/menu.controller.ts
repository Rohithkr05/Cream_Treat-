import { Controller, Get, Param, Query } from '@nestjs/common';
import { CategoriesService } from './categories.service.js';
import { FoodItemsService } from './food-items.service.js';
import { QueryFoodItemsDto } from './dto/query-food-items.dto.js';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe.js';

@Controller('menu')
export class MenuController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly foodItemsService: FoodItemsService,
  ) {}

  /**
   * Public: List all active categories in presentation order
   */
  @Get('categories')
  async getCategories() {
    return this.categoriesService.findActive();
  }

  /**
   * Public: List available food items, optionally filtered by category
   */
  @Get('items')
  async getItems(@Query() query: QueryFoodItemsDto) {
    return this.foodItemsService.findAvailable(query.categoryId);
  }

  /**
   * Public: Retrieve details of a single available food item
   */
  @Get('items/:id')
  async getItemById(@Param('id', ParseObjectIdPipe) id: string) {
    return this.foodItemsService.findByIdPublic(id);
  }
}
