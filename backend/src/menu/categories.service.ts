import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema.js';
import { FoodItem, FoodItemDocument } from './schemas/food-item.schema.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(FoodItem.name)
    private readonly foodItemModel: Model<FoodItemDocument>,
  ) {}

  /**
   * Public: List only active categories for customer menu
   */
  async findActive(): Promise<Category[]> {
    return this.categoryModel
      .find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .exec();
  }

  /**
   * Admin: List all categories (active and inactive)
   */
  async findAll(): Promise<Category[]> {
    return this.categoryModel
      .find()
      .sort({ displayOrder: 1, name: 1 })
      .exec();
  }

  /**
   * Find single category by ID
   */
  async findById(id: string): Promise<CategoryDocument> {
    const category = await this.categoryModel.findById(id).exec();
    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }
    return category;
  }

  /**
   * Admin: Create a new custom category
   */
  async create(dto: CreateCategoryDto): Promise<Category> {
    const category = new this.categoryModel({
      name: dto.name.trim(),
      description: dto.description?.trim() || '',
      displayOrder: dto.displayOrder ?? 0,
      isActive: dto.isActive ?? true,
    });
    return category.save();
  }

  /**
   * Admin: Update category details or display order
   */
  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const updatePayload: Record<string, unknown> = {};

    if (dto.name !== undefined) updatePayload.name = dto.name.trim();
    if (dto.description !== undefined)
      updatePayload.description = dto.description.trim();
    if (dto.displayOrder !== undefined)
      updatePayload.displayOrder = dto.displayOrder;
    if (dto.isActive !== undefined) updatePayload.isActive = dto.isActive;

    const updated = await this.categoryModel
      .findByIdAndUpdate(id, { $set: updatePayload }, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(`Category with ID "${id}" not found`);
    }
    return updated;
  }

  /**
   * Admin: Delete or deactivate category.
   * If food items exist, soft-deactivates the category to protect menu relationships.
   * If no items exist, permanently deletes it.
   */
  async remove(
    id: string,
  ): Promise<{ message: string; deleted: boolean; category: Category }> {
    const category = await this.findById(id);

    const itemCount = await this.foodItemModel.countDocuments({
      categoryId: new Types.ObjectId(id),
    });

    if (itemCount > 0) {
      category.isActive = false;
      await category.save();
      return {
        message: `Category "${category.name}" has ${itemCount} associated food items and was deactivated instead of deleted.`,
        deleted: false,
        category,
      };
    }

    await this.categoryModel.findByIdAndDelete(id).exec();
    return {
      message: `Category "${category.name}" was permanently deleted.`,
      deleted: true,
      category,
    };
  }
}
