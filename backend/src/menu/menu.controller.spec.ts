import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MenuController } from './menu.controller.js';
import { AdminMenuController } from './admin-menu.controller.js';
import { CategoriesService } from './categories.service.js';
import { FoodItemsService } from './food-items.service.js';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe.js';

describe('Menu Controllers & Pipes', () => {
  let menuController: MenuController;
  let adminMenuController: AdminMenuController;

  const mockCategoriesService = {
    findActive: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  const mockFoodItemsService = {
    findAvailable: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn(),
    findByIdPublic: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MenuController, AdminMenuController],
      providers: [
        {
          provide: CategoriesService,
          useValue: mockCategoriesService,
        },
        {
          provide: FoodItemsService,
          useValue: mockFoodItemsService,
        },
      ],
    }).compile();

    menuController = module.get<MenuController>(MenuController);
    adminMenuController = module.get<AdminMenuController>(AdminMenuController);
  });

  describe('ParseObjectIdPipe', () => {
    const pipe = new ParseObjectIdPipe();

    it('should allow valid 24-character hexadecimal ObjectId string', () => {
      const validId = '507f1f77bcf86cd799439011';
      expect(pipe.transform(validId)).toBe(validId);
    });

    it('should reject invalid strings with BadRequestException', () => {
      expect(() => pipe.transform('invalid-id')).toThrow(BadRequestException);
      expect(() => pipe.transform('')).toThrow(BadRequestException);
      expect(() => pipe.transform('12345')).toThrow(BadRequestException);
    });
  });

  describe('MenuController (Public)', () => {
    it('getCategories should return active categories', async () => {
      mockCategoriesService.findActive.mockResolvedValue([
        { name: 'Momos', isActive: true },
      ]);

      const res = await menuController.getCategories();

      expect(mockCategoriesService.findActive).toHaveBeenCalled();
      expect(res).toEqual([{ name: 'Momos', isActive: true }]);
    });

    it('getItems should pass category filter to service', async () => {
      mockFoodItemsService.findAvailable.mockResolvedValue([]);

      await menuController.getItems({ categoryId: '507f1f77bcf86cd799439011' });

      expect(mockFoodItemsService.findAvailable).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
    });

    it('getItemById should call findByIdPublic', async () => {
      mockFoodItemsService.findByIdPublic.mockResolvedValue({
        name: 'Veg Momos',
      });

      const res = await menuController.getItemById('507f1f77bcf86cd799439011');

      expect(mockFoodItemsService.findByIdPublic).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
      expect(res).toEqual({ name: 'Veg Momos' });
    });
  });

  describe('AdminMenuController', () => {
    it('getAllCategories should call findAll', async () => {
      mockCategoriesService.findAll.mockResolvedValue([]);
      await adminMenuController.getAllCategories();
      expect(mockCategoriesService.findAll).toHaveBeenCalled();
    });

    it('createCategory should call create with dto', async () => {
      const dto = { name: 'Desserts', displayOrder: 1 };
      mockCategoriesService.create.mockResolvedValue(dto);

      const res = await adminMenuController.createCategory(dto);

      expect(mockCategoriesService.create).toHaveBeenCalledWith(dto);
      expect(res).toEqual(dto);
    });

    it('updateCategory should call update with id and dto', async () => {
      const dto = { name: 'Ice Creams' };
      mockCategoriesService.update.mockResolvedValue(dto);

      await adminMenuController.updateCategory('507f1f77bcf86cd799439011', dto);

      expect(mockCategoriesService.update).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        dto,
      );
    });

    it('removeCategory should call remove with id', async () => {
      mockCategoriesService.remove.mockResolvedValue({ deleted: true });

      const res = await adminMenuController.removeCategory(
        '507f1f77bcf86cd799439011',
      );

      expect(mockCategoriesService.remove).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
      expect(res.deleted).toBe(true);
    });

    it('createItem should call create with food item dto', async () => {
      const dto = {
        categoryId: '507f1f77bcf86cd799439011',
        name: 'Paneer Momos',
        price: 14000,
      };
      mockFoodItemsService.create.mockResolvedValue(dto);

      const res = await adminMenuController.createItem(dto);

      expect(mockFoodItemsService.create).toHaveBeenCalledWith(dto);
      expect(res).toEqual(dto);
    });

    it('removeItem should call remove with id', async () => {
      mockFoodItemsService.remove.mockResolvedValue({ id: '507f1f77bcf86cd799439011' });

      await adminMenuController.removeItem('507f1f77bcf86cd799439011');

      expect(mockFoodItemsService.remove).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
    });
  });
});
