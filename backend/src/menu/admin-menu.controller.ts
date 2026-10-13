import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CategoriesService } from './categories.service.js';
import { FoodItemsService } from './food-items.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { CreateFoodItemDto } from './dto/create-food-item.dto.js';
import { UpdateFoodItemDto } from './dto/update-food-item.dto.js';
import { QueryFoodItemsDto } from './dto/query-food-items.dto.js';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe.js';

@Controller('admin')
export class AdminMenuController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly foodItemsService: FoodItemsService,
  ) {}

  // ==========================================
  // Category Endpoints
  // ==========================================

  @Get('categories')
  async getAllCategories() {
    return this.categoriesService.findAll();
  }

  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Patch('categories/:id')
  async updateCategory(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, dto);
  }

  @Delete('categories/:id')
  async removeCategory(@Param('id', ParseObjectIdPipe) id: string) {
    return this.categoriesService.remove(id);
  }

  // ==========================================
  // Food Item Endpoints
  // ==========================================

  @Get('items')
  async getAllItems(@Query() query: QueryFoodItemsDto) {
    return this.foodItemsService.findAll(query.categoryId);
  }

  @Get('items/:id')
  async getItemById(@Param('id', ParseObjectIdPipe) id: string) {
    return this.foodItemsService.findById(id);
  }

  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  async createItem(@Body() dto: CreateFoodItemDto) {
    return this.foodItemsService.create(dto);
  }

  @Patch('items/:id')
  async updateItem(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateFoodItemDto,
  ) {
    return this.foodItemsService.update(id, dto);
  }

  @Delete('items/:id')
  async removeItem(@Param('id', ParseObjectIdPipe) id: string) {
    return this.foodItemsService.remove(id);
  }
}
