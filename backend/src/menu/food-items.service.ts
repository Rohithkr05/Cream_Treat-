import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FoodItem, FoodItemDocument } from './schemas/food-item.schema.js';
import { Category, CategoryDocument } from './schemas/category.schema.js';
import { CreateFoodItemDto } from './dto/create-food-item.dto.js';
import { UpdateFoodItemDto } from './dto/update-food-item.dto.js';

@Injectable()
export class FoodItemsService {
  constructor(
    @InjectModel(FoodItem.name)
    private readonly foodItemModel: Model<FoodItemDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  /**
   * Public: List available food items, optionally filtered by category
   */
  async findAvailable(categoryId?: string): Promise<FoodItem[]> {
    const filter: Record<string, unknown> = { isAvailable: true };

    if (categoryId) {
      filter.categoryId = new Types.ObjectId(categoryId);
    }

    return this.foodItemModel
      .find(filter)
      .populate('categoryId', 'name displayOrder isActive')
      .sort({ displayOrder: 1, name: 1 })
      .exec();
  }

  /**
   * Admin: List all food items (including unavailable items), optionally filtered by category
   */
  async findAll(categoryId?: string): Promise<FoodItem[]> {
    const filter: Record<string, unknown> = {};

    if (categoryId) {
      filter.categoryId = new Types.ObjectId(categoryId);
    }

    return this.foodItemModel
      .find(filter)
      .populate('categoryId', 'name displayOrder isActive')
      .sort({ displayOrder: 1, name: 1 })
      .exec();
  }

  /**
   * Public: Retrieve a single available food item by ID
   */
  async findByIdPublic(id: string): Promise<FoodItem> {
    const item = await this.foodItemModel
      .findOne({ _id: new Types.ObjectId(id), isAvailable: true })
      .populate('categoryId', 'name displayOrder isActive')
      .exec();

    if (!item) {
      throw new NotFoundException(
        `Available food item with ID "${id}" was not found`,
      );
    }
    return item;
  }

  /**
   * Admin: Retrieve any food item by ID
   */
  async findById(id: string): Promise<FoodItemDocument> {
    const item = await this.foodItemModel
      .findById(id)
      .populate('categoryId', 'name displayOrder isActive')
      .exec();

    if (!item) {
      throw new NotFoundException(`Food item with ID "${id}" not found`);
    }
    return item;
  }

  /**
   * Admin: Create a new food item with category validation
   */
  async create(dto: CreateFoodItemDto): Promise<FoodItem> {
    const categoryExists = await this.categoryModel.exists({
      _id: new Types.ObjectId(dto.categoryId),
    });

    if (!categoryExists) {
      throw new BadRequestException(
        `Referenced category with ID "${dto.categoryId}" does not exist`,
      );
    }

    const foodItem = new this.foodItemModel({
      categoryId: new Types.ObjectId(dto.categoryId),
      name: dto.name.trim(),
      description: dto.description?.trim() || '',
      price: dto.price,
      imageUrl: dto.imageUrl?.trim() || '',
      isAvailable: dto.isAvailable ?? true,
      displayOrder: dto.displayOrder ?? 0,
    });

    const saved = await foodItem.save();
    return saved.populate('categoryId', 'name displayOrder isActive');
  }

  /**
   * Admin: Update food item details, price, or availability
   */
  async update(id: string, dto: UpdateFoodItemDto): Promise<FoodItem> {
    const updatePayload: Record<string, unknown> = {};

    if (dto.categoryId !== undefined) {
      const categoryExists = await this.categoryModel.exists({
        _id: new Types.ObjectId(dto.categoryId),
      });
      if (!categoryExists) {
        throw new BadRequestException(
          `Referenced category with ID "${dto.categoryId}" does not exist`,
        );
      }
      updatePayload.categoryId = new Types.ObjectId(dto.categoryId);
    }

    if (dto.name !== undefined) updatePayload.name = dto.name.trim();
    if (dto.description !== undefined)
      updatePayload.description = dto.description.trim();
    if (dto.price !== undefined) updatePayload.price = dto.price;
    if (dto.imageUrl !== undefined) updatePayload.imageUrl = dto.imageUrl.trim();
    if (dto.isAvailable !== undefined) updatePayload.isAvailable = dto.isAvailable;
    if (dto.displayOrder !== undefined)
      updatePayload.displayOrder = dto.displayOrder;

    const updated = await this.foodItemModel
      .findByIdAndUpdate(id, { $set: updatePayload }, { new: true })
      .populate('categoryId', 'name displayOrder isActive')
      .exec();

    if (!updated) {
      throw new NotFoundException(`Food item with ID "${id}" not found`);
    }
    return updated;
  }

  /**
   * Admin: Delete a food item permanently
   */
  async remove(id: string): Promise<{ message: string; id: string }> {
    const deleted = await this.foodItemModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`Food item with ID "${id}" not found`);
    }
    return {
      message: `Food item "${deleted.name}" successfully deleted`,
      id,
    };
  }
}
