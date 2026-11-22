import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CategoriesService } from './categories.service.js';
import { FoodItemsService } from './food-items.service.js';
import { Category } from './schemas/category.schema.js';
import { FoodItem } from './schemas/food-item.schema.js';

describe('CategoriesService & FoodItemsService', () => {
  let categoriesService: CategoriesService;
  let foodItemsService: FoodItemsService;

  const mockCategoryModel = {
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
    exists: vi.fn(),
    create: vi.fn(),
  };

  const mockFoodItemModel = {
    find: vi.fn(),
    findOne: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
    countDocuments: vi.fn(),
    create: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        FoodItemsService,
        {
          provide: getModelToken(Category.name),
          useValue: mockCategoryModel,
        },
        {
          provide: getModelToken(FoodItem.name),
          useValue: mockFoodItemModel,
        },
      ],
    }).compile();

    categoriesService = module.get<CategoriesService>(CategoriesService);
    foodItemsService = module.get<FoodItemsService>(FoodItemsService);
  });

  describe('CategoriesService', () => {
    it('findActive should query only active categories sorted by displayOrder', async () => {
      const exec = vi.fn().mockResolvedValue([{ name: 'Momos', isActive: true }]);
      const sort = vi.fn().mockReturnValue({ exec });
      mockCategoryModel.find.mockReturnValue({ sort });

      const result = await categoriesService.findActive();

      expect(mockCategoryModel.find).toHaveBeenCalledWith({ isActive: true });
      expect(sort).toHaveBeenCalledWith({ displayOrder: 1, name: 1 });
      expect(result).toEqual([{ name: 'Momos', isActive: true }]);
    });

    it('findAll should query all categories sorted', async () => {
      const exec = vi.fn().mockResolvedValue([
        { name: 'Momos', isActive: true },
        { name: 'Seasonal', isActive: false },
      ]);
      const sort = vi.fn().mockReturnValue({ exec });
      mockCategoryModel.find.mockReturnValue({ sort });

      const result = await categoriesService.findAll();

      expect(mockCategoryModel.find).toHaveBeenCalledWith();
      expect(result.length).toBe(2);
    });

    it('findById should throw NotFoundException when category is missing', async () => {
      mockCategoryModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      await expect(
        categoriesService.findById('507f1f77bcf86cd799439011'),
      ).rejects.toThrow(NotFoundException);
    });

    it('update should throw NotFoundException when category to update is missing', async () => {
      mockCategoryModel.findByIdAndUpdate.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      await expect(
        categoriesService.update('507f1f77bcf86cd799439011', { name: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('remove should deactivate category if food items exist', async () => {
      const mockCategory = {
        name: 'Beverages',
        isActive: true,
        save: vi.fn().mockResolvedValue(true),
      };

      mockCategoryModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockCategory),
      });
      mockFoodItemModel.countDocuments.mockResolvedValue(3);

      const res = await categoriesService.remove('507f1f77bcf86cd799439011');

      expect(mockCategory.isActive).toBe(false);
      expect(mockCategory.save).toHaveBeenCalled();
      expect(res.deleted).toBe(false);
      expect(res.message).toContain('deactivated instead of deleted');
    });

    it('remove should permanently delete category if no items exist', async () => {
      const mockCategory = {
        name: 'Empty Category',
        isActive: true,
      };

      mockCategoryModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockCategory),
      });
      mockFoodItemModel.countDocuments.mockResolvedValue(0);
      mockCategoryModel.findByIdAndDelete.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockCategory),
      });

      const res = await categoriesService.remove('507f1f77bcf86cd799439011');

      expect(res.deleted).toBe(true);
      expect(mockCategoryModel.findByIdAndDelete).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
    });
  });

  describe('FoodItemsService', () => {
    it('findAvailable should query only available food items with populated category', async () => {
      const exec = vi.fn().mockResolvedValue([{ name: 'Veg Momos', price: 12000 }]);
      const sort = vi.fn().mockReturnValue({ exec });
      const populate = vi.fn().mockReturnValue({ sort });
      mockFoodItemModel.find.mockReturnValue({ populate });

      const result = await foodItemsService.findAvailable();

      expect(mockFoodItemModel.find).toHaveBeenCalledWith({ isAvailable: true });
      expect(populate).toHaveBeenCalledWith(
        'categoryId',
        'name displayOrder isActive',
      );
      expect(result).toEqual([{ name: 'Veg Momos', price: 12000 }]);
    });

    it('findAvailable should exclude items whose populated category is deactivated', async () => {
      const activeItem = {
        name: 'Veg Momos',
        price: 12000,
        categoryId: { name: 'Momos', displayOrder: 1, isActive: true },
      };
      const inactiveCatItem = {
        name: 'Old Seasonal Item',
        price: 9000,
        categoryId: { name: 'Seasonal', displayOrder: 9, isActive: false },
      };
      const exec = vi.fn().mockResolvedValue([activeItem, inactiveCatItem]);
      const sort = vi.fn().mockReturnValue({ exec });
      const populate = vi.fn().mockReturnValue({ sort });
      mockFoodItemModel.find.mockReturnValue({ populate });

      const result = await foodItemsService.findAvailable();

      expect(result).toEqual([activeItem]);
    });

    it('findAvailable with categoryId should filter by categoryId', async () => {
      const catId = '507f1f77bcf86cd799439011';
      const exec = vi.fn().mockResolvedValue([]);
      const sort = vi.fn().mockReturnValue({ exec });
      const populate = vi.fn().mockReturnValue({ sort });
      mockFoodItemModel.find.mockReturnValue({ populate });

      await foodItemsService.findAvailable(catId);

      expect(mockFoodItemModel.find).toHaveBeenCalledWith({
        isAvailable: true,
        categoryId: new Types.ObjectId(catId),
      });
    });

    it('findByIdPublic should throw NotFoundException when item not found or unavailable', async () => {
      const exec = vi.fn().mockResolvedValue(null);
      const populate = vi.fn().mockReturnValue({ exec });
      mockFoodItemModel.findOne.mockReturnValue({ populate });

      await expect(
        foodItemsService.findByIdPublic('507f1f77bcf86cd799439011'),
      ).rejects.toThrow(NotFoundException);
    });

    it('create should reject if referenced category does not exist', async () => {
      mockCategoryModel.exists.mockResolvedValue(null);

      await expect(
        foodItemsService.create({
          categoryId: '507f1f77bcf86cd799439011',
          name: 'Ice Cream',
          price: 8000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('update should throw NotFoundException when item does not exist', async () => {
      const exec = vi.fn().mockResolvedValue(null);
      const populate = vi.fn().mockReturnValue({ exec });
      mockFoodItemModel.findByIdAndUpdate.mockReturnValue({ populate });

      await expect(
        foodItemsService.update('507f1f77bcf86cd799439011', {
          name: 'Updated Name',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('remove should throw NotFoundException if item does not exist', async () => {
      mockFoodItemModel.findByIdAndDelete.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      await expect(
        foodItemsService.remove('507f1f77bcf86cd799439011'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
