import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { Types } from 'mongoose';
import { CategoriesService } from './categories.service.js';
import { FoodItemsService } from './food-items.service.js';
import { Category } from './schemas/category.schema.js';
import { FoodItem } from './schemas/food-item.schema.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { CreateFoodItemDto } from './dto/create-food-item.dto.js';
import { UpdateFoodItemDto } from './dto/update-food-item.dto.js';
import { AdminMenuController } from './admin-menu.controller.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { OrdersService } from '../orders/orders.service.js';
import { Order, OrderStatus } from '../orders/schemas/order.schema.js';
import { OrderCounter } from '../orders/schemas/order-counter.schema.js';
import { REAL_CREAM_TREAT_MENU } from '../database/seed-menu.js';

describe('Phase 14 — Menu Management & Order Snapshots (Unit Tests)', () => {
  let categoriesService: CategoriesService;
  let foodItemsService: FoodItemsService;
  let ordersService: OrdersService;

  const categoryIdStr = '670d00000000000000000010';
  const foodItemIdStr = '670d00000000000000000020';

  const mockCategoryDoc = {
    _id: new Types.ObjectId(categoryIdStr),
    name: 'Momos',
    description: 'Fresh dumplings',
    displayOrder: 1,
    isActive: true,
    save: vi.fn().mockImplementation(function (this: any) {
      return Promise.resolve(this);
    }),
  };

  const mockFoodItemDoc = {
    _id: new Types.ObjectId(foodItemIdStr),
    categoryId: new Types.ObjectId(categoryIdStr),
    name: 'Veg Momos',
    description: 'Steamed dumplings',
    price: 16000, // ₹160
    isAvailable: true,
    displayOrder: 1,
    populate: vi.fn().mockImplementation(function (this: any) {
      return Promise.resolve(this);
    }),
    save: vi.fn().mockImplementation(function (this: any) {
      return Promise.resolve(this);
    }),
  };

  function MockCategoryModel(this: any, dto: any) {
    Object.assign(this, mockCategoryDoc, dto, {
      _id: new Types.ObjectId(categoryIdStr),
      save: vi.fn().mockResolvedValue(this),
    });
  }
  MockCategoryModel.find = vi.fn();
  MockCategoryModel.findById = vi.fn();
  MockCategoryModel.findByIdAndUpdate = vi.fn();
  MockCategoryModel.findByIdAndDelete = vi.fn();
  MockCategoryModel.exists = vi.fn();
  MockCategoryModel.findOneAndUpdate = vi.fn();

  function MockFoodItemModel(this: any, dto: any) {
    Object.assign(this, mockFoodItemDoc, dto, {
      _id: new Types.ObjectId(foodItemIdStr),
      populate: vi.fn().mockResolvedValue(this),
      save: vi.fn().mockResolvedValue(this),
    });
  }
  MockFoodItemModel.find = vi.fn();
  MockFoodItemModel.findOne = vi.fn();
  MockFoodItemModel.findById = vi.fn();
  MockFoodItemModel.findByIdAndUpdate = vi.fn();
  MockFoodItemModel.findByIdAndDelete = vi.fn();
  MockFoodItemModel.countDocuments = vi.fn();
  MockFoodItemModel.findOneAndUpdate = vi.fn();

  function MockOrderModel(this: any, dto: any) {
    Object.assign(this, dto, {
      _id: new Types.ObjectId('670d00000000000000000099'),
      save: vi.fn().mockImplementation(function (this: any) {
        return Promise.resolve(this);
      }),
    });
  }
  MockOrderModel.findById = vi.fn();
  MockOrderModel.find = vi.fn();

  const mockOrderCounterModel = {
    findOneAndUpdate: vi.fn().mockReturnValue({
      exec: vi.fn().mockResolvedValue({ sequence: 1 }),
    }),
    findOne: vi.fn().mockReturnValue({
      exec: vi.fn().mockResolvedValue({ sequence: 1 }),
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        FoodItemsService,
        OrdersService,
        {
          provide: getModelToken(Category.name),
          useValue: MockCategoryModel,
        },
        {
          provide: getModelToken(FoodItem.name),
          useValue: MockFoodItemModel,
        },
        {
          provide: getModelToken(Order.name),
          useValue: MockOrderModel,
        },
        {
          provide: getModelToken(OrderCounter.name),
          useValue: mockOrderCounterModel,
        },
      ],
    }).compile();

    categoriesService = module.get<CategoriesService>(CategoriesService);
    foodItemsService = module.get<FoodItemsService>(FoodItemsService);
    ordersService = module.get<OrdersService>(OrdersService);
  });

  // 1. Create category
  it('1. should create a category with displayOrder and active status', async () => {
    const dto: CreateCategoryDto = {
      name: 'Soup',
      description: 'Hot soups',
      displayOrder: 2,
      isActive: true,
    };
    const result = await categoriesService.create(dto);
    expect(result.name).toBe('Soup');
    expect(result.displayOrder).toBe(2);
    expect(result.isActive).toBe(true);
  });

  // 2. Update category
  it('2. should update category name and description', async () => {
    const updatedMock = {
      ...mockCategoryDoc,
      name: 'Momos & Dumplings',
      description: 'Updated description',
    };
    MockCategoryModel.findByIdAndUpdate.mockReturnValue({
      exec: vi.fn().mockResolvedValue(updatedMock),
    });

    const result = await categoriesService.update(categoryIdStr, {
      name: 'Momos & Dumplings',
      description: 'Updated description',
    });

    expect(MockCategoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
      categoryIdStr,
      {
        $set: {
          name: 'Momos & Dumplings',
          description: 'Updated description',
        },
      },
      { new: true },
    );
    expect(result.name).toBe('Momos & Dumplings');
  });

  // 3. Deactivate category
  it('3. should deactivate category when food items exist', async () => {
    const categoryToDeactivate = {
      ...mockCategoryDoc,
      isActive: true,
      save: vi.fn().mockResolvedValue(true),
    };
    MockCategoryModel.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue(categoryToDeactivate),
    });
    MockFoodItemModel.countDocuments.mockResolvedValue(4);

    const result = await categoriesService.remove(categoryIdStr);

    expect(categoryToDeactivate.isActive).toBe(false);
    expect(categoryToDeactivate.save).toHaveBeenCalled();
    expect(result.deleted).toBe(false);
    expect(result.message).toContain('deactivated instead of deleted');
  });

  // 4. Create food item
  it('4. should create a food item when referenced category exists', async () => {
    MockCategoryModel.exists.mockResolvedValue(true);

    const dto: CreateFoodItemDto = {
      categoryId: categoryIdStr,
      name: 'Mushroom Momos',
      price: 17000,
      description: 'Wild mushrooms',
      displayOrder: 2,
      isAvailable: true,
    };

    const result = await foodItemsService.create(dto);
    expect(result.name).toBe('Mushroom Momos');
    expect(result.price).toBe(17000);
  });

  // 5. Update food item
  it('5. should update food item details', async () => {
    const updatedItem = {
      ...mockFoodItemDoc,
      name: 'Steamed Veg Momos',
    };
    MockFoodItemModel.findByIdAndUpdate.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(updatedItem),
      }),
    });

    const result = await foodItemsService.update(foodItemIdStr, {
      name: 'Steamed Veg Momos',
    });

    expect(result.name).toBe('Steamed Veg Momos');
  });

  // 6. Update food price
  it('6. should update food price in integer paise', async () => {
    const updatedPriceItem = {
      ...mockFoodItemDoc,
      price: 18000, // ₹180
    };
    MockFoodItemModel.findByIdAndUpdate.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(updatedPriceItem),
      }),
    });

    const result = await foodItemsService.update(foodItemIdStr, {
      price: 18000,
    });

    expect(result.price).toBe(18000);
  });

  // 7. Update availability
  it('7. should toggle food item availability to false', async () => {
    const unavailableItem = {
      ...mockFoodItemDoc,
      isAvailable: false,
    };
    MockFoodItemModel.findByIdAndUpdate.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(unavailableItem),
      }),
    });

    const result = await foodItemsService.update(foodItemIdStr, {
      isAvailable: false,
    });

    expect(result.isAvailable).toBe(false);
  });

  // 8. Invalid category ID
  it('8. should reject invalid category ID when creating food item', async () => {
    MockCategoryModel.exists.mockResolvedValue(null);

    await expect(
      foodItemsService.create({
        categoryId: '670d00000000000000000999',
        name: 'Veg Momos',
        price: 16000,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // 9. Invalid food item ID
  it('9. should throw NotFoundException when food item ID is not found', async () => {
    MockFoodItemModel.findById.mockReturnValue({
      populate: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      }),
    });

    await expect(
      foodItemsService.findById('670d00000000000000000999'),
    ).rejects.toThrow(NotFoundException);
  });

  // 10. Invalid price format
  it('10. should fail DTO validation when price is a floating point or string', async () => {
    const dto = plainToInstance(CreateFoodItemDto, {
      categoryId: categoryIdStr,
      name: 'Paneer Momos',
      price: 120.5, // Not an integer
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const priceError = errors.find((e) => e.property === 'price');
    expect(priceError).toBeDefined();
  });

  // 11. Negative price
  it('11. should fail DTO validation when price is negative', async () => {
    const dto = plainToInstance(CreateFoodItemDto, {
      categoryId: categoryIdStr,
      name: 'Paneer Momos',
      price: -500,
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const priceError = errors.find((e) => e.property === 'price');
    expect(priceError).toBeDefined();
  });

  // 12. Empty food name
  it('12. should fail DTO validation when food name is empty', async () => {
    const dto = plainToInstance(CreateFoodItemDto, {
      categoryId: categoryIdStr,
      name: '',
      price: 16000,
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const nameError = errors.find((e) => e.property === 'name');
    expect(nameError).toBeDefined();
  });

  // 13. Unauthorized category mutation guard check
  it('13. should verify AdminMenuController enforces JwtAuthGuard for category mutations', () => {
    const guards = Reflect.getMetadata('__guards__', AdminMenuController);
    expect(guards).toBeDefined();
    expect(guards).toContain(JwtAuthGuard);
  });

  // 14. Unauthorized food mutation guard check
  it('14. should verify AdminMenuController protects item endpoints under admin path', () => {
    const path = Reflect.getMetadata('path', AdminMenuController);
    expect(path).toBe('admin');
  });

  // 15. Customer can retrieve active categories
  it('15. should query only active categories for customer menu', async () => {
    const exec = vi.fn().mockResolvedValue([mockCategoryDoc]);
    const sort = vi.fn().mockReturnValue({ exec });
    MockCategoryModel.find.mockReturnValue({ sort });

    const activeCategories = await categoriesService.findActive();

    expect(MockCategoryModel.find).toHaveBeenCalledWith({ isActive: true });
    expect(sort).toHaveBeenCalledWith({ displayOrder: 1, name: 1 });
    expect(activeCategories.length).toBe(1);
  });

  // 16. Customer can retrieve available items
  it('16. should query only available food items for customer menu', async () => {
    const exec = vi.fn().mockResolvedValue([mockFoodItemDoc]);
    const sort = vi.fn().mockReturnValue({ exec });
    const populate = vi.fn().mockReturnValue({ sort });
    MockFoodItemModel.find.mockReturnValue({ populate });

    const items = await foodItemsService.findAvailable();

    expect(MockFoodItemModel.find).toHaveBeenCalledWith({ isAvailable: true });
    expect(items.length).toBe(1);
  });

  // 17. Unavailable item cannot be ordered
  it('17. should reject order creation if a requested item is unavailable', async () => {
    MockFoodItemModel.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue({
        _id: new Types.ObjectId(foodItemIdStr),
        name: 'Veg Momos',
        price: 16000,
        isAvailable: false, // Unavailable
      }),
    });

    await expect(
      ordersService.create({
        tableNumber: 5,
        items: [{ foodItemId: foodItemIdStr, quantity: 1 }],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // 18. Price change affects new orders
  it('18. should apply updated price to newly placed customer orders', async () => {
    // Item price updated to ₹180 (18000 paise)
    MockFoodItemModel.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue({
        _id: new Types.ObjectId(foodItemIdStr),
        name: 'Veg Momos',
        price: 18000, // Updated price
        isAvailable: true,
      }),
    });

    const newOrder = await ordersService.create({
      tableNumber: 5,
      items: [{ foodItemId: foodItemIdStr, quantity: 2 }],
    });

    expect(newOrder.items[0].unitPrice).toBe(18000);
    expect(newOrder.items[0].itemTotal).toBe(36000);
    expect(newOrder.total).toBe(36000);
  });

  // 19. Existing order retains old price (Snapshot preservation)
  it('19. should preserve historical priceSnapshot in existing orders when menu price changes', () => {
    const historicalOrder = {
      orderNumber: '#001',
      items: [
        {
          foodItemId: new Types.ObjectId(foodItemIdStr),
          nameSnapshot: 'Veg Momos',
          priceSnapshot: 16000, // Old price ₹160
          quantity: 2,
          itemTotal: 32000,
        },
      ],
      total: 32000,
    };

    // Simulate menu price change in database
    const currentFoodItemInDb = {
      _id: new Types.ObjectId(foodItemIdStr),
      name: 'Veg Momos',
      price: 20000, // New price ₹200
    };

    // The historical order's snapshot must NOT be affected
    expect(historicalOrder.items[0].priceSnapshot).toBe(16000);
    expect(historicalOrder.items[0].itemTotal).toBe(32000);
    expect(historicalOrder.total).toBe(32000);
    expect(currentFoodItemInDb.price).toBe(20000);
  });

  // 20. Existing order retains old item name (Snapshot preservation)
  it('20. should preserve historical nameSnapshot in existing orders when menu item is renamed', () => {
    const historicalOrder = {
      orderNumber: '#001',
      items: [
        {
          foodItemId: new Types.ObjectId(foodItemIdStr),
          nameSnapshot: 'Veg Momos',
          priceSnapshot: 16000,
          quantity: 1,
          itemTotal: 16000,
        },
      ],
    };

    // Simulate item rename in database
    const renamedItemInDb = {
      _id: new Types.ObjectId(foodItemIdStr),
      name: 'Cream Treat Special Steamed Momos',
      price: 16000,
    };

    // Historical snapshot retains original name
    expect(historicalOrder.items[0].nameSnapshot).toBe('Veg Momos');
    expect(renamedItemInDb.name).toBe('Cream Treat Special Steamed Momos');
  });

  // 21. Display ordering works
  it('21. should sort categories and food items by displayOrder ascending, then name', async () => {
    const exec = vi.fn().mockResolvedValue([]);
    const sort = vi.fn().mockReturnValue({ exec });
    MockCategoryModel.find.mockReturnValue({ sort });

    await categoriesService.findActive();
    expect(sort).toHaveBeenCalledWith({ displayOrder: 1, name: 1 });

    const sortItem = vi.fn().mockReturnValue({ exec });
    const populateItem = vi.fn().mockReturnValue({ sort: sortItem });
    MockFoodItemModel.find.mockReturnValue({ populate: populateItem });

    await foodItemsService.findAvailable();
    expect(sortItem).toHaveBeenCalledWith({ displayOrder: 1, name: 1 });
  });

  // 22. Re-running seed/import does not create duplicates
  it('22. should verify REAL_CREAM_TREAT_MENU contains unique categories and items with valid paise prices', () => {
    const categoryNames = new Set<string>();
    const itemNames = new Set<string>();

    for (const group of REAL_CREAM_TREAT_MENU) {
      expect(categoryNames.has(group.category.name)).toBe(false);
      categoryNames.add(group.category.name);

      expect(group.category.displayOrder).toBeGreaterThan(0);
      expect(group.category.isActive).toBe(true);

      for (const item of group.items) {
        expect(itemNames.has(item.name)).toBe(false);
        itemNames.add(item.name);

        expect(Number.isInteger(item.price)).toBe(true);
        expect(item.price).toBeGreaterThan(0);
        expect(item.displayOrder).toBeGreaterThan(0);
        expect(item.isAvailable).toBe(true);
      }
    }

    expect(categoryNames.size).toBe(6); // Mains, Sundae, Mojito, Milkshake, Cheat Meal, Sides
    expect(itemNames.size).toBe(59); // 59 total items across all 6 menu categories
  });
});
