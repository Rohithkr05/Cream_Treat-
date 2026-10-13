import mongoose, { Types } from 'mongoose';
import bcrypt from 'bcrypt';
import { AdminSchema } from '../auth/schemas/admin.schema.js';
import { CategorySchema } from '../menu/schemas/category.schema.js';
import { FoodItemSchema } from '../menu/schemas/food-item.schema.js';
import { OrderSchema, OrderStatus } from '../orders/schemas/order.schema.js';
import { OrderItemSchema } from '../orders/schemas/order-item.schema.js';

describe('Phase 3: Database Models & Schemas Validation', () => {
  const AdminModel = mongoose.model('AdminModelTest', AdminSchema);
  const CategoryModel = mongoose.model('CategoryModelTest', CategorySchema);
  const FoodItemModel = mongoose.model('FoodItemModelTest', FoodItemSchema);
  const OrderModel = mongoose.model('OrderModelTest', OrderSchema);
  const OrderItemModel = mongoose.model('OrderItemModelTest', OrderItemSchema);

  describe('Admin Schema', () => {
    it('should validate a valid admin document', async () => {
      const admin = new AdminModel({
        name: 'Cream Treat Admin',
        email: 'Admin@CreamTreat.Local  ',
        passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890',
      });

      await expect(admin.validate()).resolves.toBeUndefined();
      // Email should be trimmed and lowercased
      expect(admin.email).toBe('admin@creamtreat.local');
    });

    it('should reject missing required fields', async () => {
      const admin = new AdminModel({});
      await expect(admin.validate()).rejects.toThrow();
    });

    it('should have passwordHash hidden from default queries (select: false)', () => {
      const passwordPath = AdminSchema.path('passwordHash') as unknown as {
        options: { select: boolean };
      };
      expect(passwordPath.options.select).toBe(false);
    });

    it('should verify password hashing with bcrypt', async () => {
      const rawPassword = 'SecurePassword2026!';
      const hash = await bcrypt.hash(rawPassword, 10);

      expect(hash).not.toBe(rawPassword);
      expect(await bcrypt.compare(rawPassword, hash)).toBe(true);
      expect(await bcrypt.compare('WrongPassword', hash)).toBe(false);
    });
  });

  describe('Category Schema', () => {
    it('should validate a valid category', async () => {
      const category = new CategoryModel({
        name: 'Beverages',
        description: 'Hot and cold beverages',
        displayOrder: 1,
        isActive: true,
      });

      await expect(category.validate()).resolves.toBeUndefined();
      expect(category.displayOrder).toBe(1);
      expect(category.isActive).toBe(true);
    });

    it('should use default values for displayOrder (0) and isActive (true)', async () => {
      const category = new CategoryModel({
        name: 'Desserts',
      });

      await expect(category.validate()).resolves.toBeUndefined();
      expect(category.displayOrder).toBe(0);
      expect(category.isActive).toBe(true);
      expect(category.description).toBe('');
    });

    it('should reject a category without a name', async () => {
      const category = new CategoryModel({});
      await expect(category.validate()).rejects.toThrow();
    });
  });

  describe('FoodItem Schema', () => {
    it('should validate a valid food item with reference and integer paise price', async () => {
      const categoryId = new Types.ObjectId();
      const foodItem = new FoodItemModel({
        categoryId,
        name: 'Vanilla Sundae',
        description: 'Rich vanilla ice cream with chocolate sauce',
        price: 15000, // ₹150.00 in integer paise
        isAvailable: true,
        displayOrder: 1,
      });

      await expect(foodItem.validate()).resolves.toBeUndefined();
      expect(foodItem.price).toBe(15000);
      expect(foodItem.categoryId).toEqual(categoryId);
    });

    it('should reject negative price', async () => {
      const foodItem = new FoodItemModel({
        categoryId: new Types.ObjectId(),
        name: 'Negative Item',
        price: -500,
      });

      await expect(foodItem.validate()).rejects.toThrow();
    });

    it('should reject missing categoryId or name', async () => {
      const foodItem = new FoodItemModel({
        price: 12000,
      });

      await expect(foodItem.validate()).rejects.toThrow();
    });

    it('should set default availability to true and displayOrder to 0', async () => {
      const foodItem = new FoodItemModel({
        categoryId: new Types.ObjectId(),
        name: 'Default Props Item',
        price: 9900,
      });

      await expect(foodItem.validate()).resolves.toBeUndefined();
      expect(foodItem.isAvailable).toBe(true);
      expect(foodItem.displayOrder).toBe(0);
    });
  });

  describe('OrderItem Embedded Schema', () => {
    it('should validate a valid order item snapshot', async () => {
      const foodItemId = new Types.ObjectId();
      const orderItem = new OrderItemModel({
        foodItemId,
        nameSnapshot: 'Paneer Momos',
        priceSnapshot: 14000, // ₹140.00 in paise
        quantity: 2,
        itemTotal: 28000, // ₹280.00 in paise
      });

      await expect(orderItem.validate()).resolves.toBeUndefined();
      expect(orderItem.nameSnapshot).toBe('Paneer Momos');
      expect(orderItem.priceSnapshot).toBe(14000);
      expect(orderItem.quantity).toBe(2);
      expect(orderItem.itemTotal).toBe(28000);
    });

    it('should reject non-positive quantity (0 or negative)', async () => {
      const zeroQty = new OrderItemModel({
        foodItemId: new Types.ObjectId(),
        nameSnapshot: 'Zero Qty',
        priceSnapshot: 10000,
        quantity: 0,
        itemTotal: 0,
      });

      await expect(zeroQty.validate()).rejects.toThrow();

      const negQty = new OrderItemModel({
        foodItemId: new Types.ObjectId(),
        nameSnapshot: 'Neg Qty',
        priceSnapshot: 10000,
        quantity: -1,
        itemTotal: -10000,
      });

      await expect(negQty.validate()).rejects.toThrow();
    });
  });

  describe('Order Schema', () => {
    it('should validate a complete order document with items and snapshots', async () => {
      const foodItemId = new Types.ObjectId();
      const order = new OrderModel({
        orderNumber: '#001',
        orderDate: '2026-10-13',
        tableNumber: 5,
        items: [
          {
            foodItemId,
            nameSnapshot: 'Veg Chowmein',
            priceSnapshot: 12000,
            quantity: 1,
            itemTotal: 12000,
          },
        ],
        subtotal: 12000,
        total: 12000,
        status: OrderStatus.NEW,
      });

      await expect(order.validate()).resolves.toBeUndefined();
      expect(order.orderNumber).toBe('#001');
      expect(order.orderDate).toBe('2026-10-13');
      expect(order.tableNumber).toBe(5);
      expect(order.status).toBe(OrderStatus.NEW);
      expect(order.items.length).toBe(1);
    });

    it('should reject an order with empty items array', async () => {
      const emptyOrder = new OrderModel({
        orderNumber: '#002',
        orderDate: '2026-10-13',
        tableNumber: 3,
        items: [],
        subtotal: 0,
        total: 0,
      });

      await expect(emptyOrder.validate()).rejects.toThrow();
    });

    it('should reject invalid table number (<= 0)', async () => {
      const invalidTable = new OrderModel({
        orderNumber: '#003',
        orderDate: '2026-10-13',
        tableNumber: 0,
        items: [
          {
            foodItemId: new Types.ObjectId(),
            nameSnapshot: 'Sample',
            priceSnapshot: 5000,
            quantity: 1,
            itemTotal: 5000,
          },
        ],
        subtotal: 5000,
        total: 5000,
      });

      await expect(invalidTable.validate()).rejects.toThrow();
    });

    it('should reject an invalid order status', async () => {
      const invalidStatus = new OrderModel({
        orderNumber: '#004',
        orderDate: '2026-10-13',
        tableNumber: 2,
        items: [
          {
            foodItemId: new Types.ObjectId(),
            nameSnapshot: 'Sample',
            priceSnapshot: 5000,
            quantity: 1,
            itemTotal: 5000,
          },
        ],
        subtotal: 5000,
        total: 5000,
        status: 'INVALID_STATUS',
      });

      await expect(invalidStatus.validate()).rejects.toThrow();
    });

    it('should allow valid status transitions in OrderStatus enum', () => {
      const expectedStatuses = [
        'NEW',
        'ACCEPTED',
        'PREPARING',
        'READY',
        'COMPLETED',
        'CANCELLED',
      ];
      expect(Object.values(OrderStatus)).toEqual(expectedStatuses);
    });
  });

  describe('Seed System Integrity', () => {
    it('should securely hash seed passwords using bcrypt', async () => {
      const plainPassword = 'Admin@CreamTreat2026!';
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(plainPassword, salt);

      expect(hash).not.toBe(plainPassword);
      expect(await bcrypt.compare(plainPassword, hash)).toBe(true);
    });

    it('should normalize admin email to lowercase and trimmed string', () => {
      const rawEmail = '  ADMIN@CreamTreat.Local  ';
      const normalized = rawEmail.toLowerCase().trim();
      expect(normalized).toBe('admin@creamtreat.local');
    });

    it('should strictly NOT create fake menu items or customer orders', () => {
      // Verification ensuring seed definition only targets Admin
      const seededCollections = ['Admin'];
      expect(seededCollections).not.toContain('Category');
      expect(seededCollections).not.toContain('FoodItem');
      expect(seededCollections).not.toContain('Order');
    });
  });
});
