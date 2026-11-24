import mongoose from 'mongoose';
import { CategorySchema } from '../menu/schemas/category.schema.js';
import { FoodItemSchema } from '../menu/schemas/food-item.schema.js';
import { sanitizeMongoUri } from './database.module.js';

export interface SeedMenuResult {
  success: boolean;
  categoriesUpserted: number;
  itemsUpserted: number;
}

/**
 * Authoritative Cream Treat Real Menu Data extracted directly from restaurant menu images.
 * Prices are strictly stored in integer paise (e.g. ₹160 = 16000 paise).
 */
export const REAL_CREAM_TREAT_MENU = [
  {
    category: {
      name: 'Sundae',
      description: 'Sweet Tooth',
      displayOrder: 1,
      isActive: true,
    },
    items: [
      {
        name: 'Chocolava Cake Sundae',
        price: 16000, // ₹160
        description: 'Warm molten chocolava cake topped with vanilla ice cream and hot fudge',
        displayOrder: 1,
        isAvailable: true,
        imageUrl: '/menu/chocolava-cake-sundae.jpg',
      },
      {
        name: 'Death by Chocolate',
        price: 24500, // ₹245
        description: 'Decadent chocolate sundae layered with ice cream, brownie chunks, and rich chocolate fudge',
        displayOrder: 2,
        isAvailable: true,
        imageUrl: '/menu/death-by-chocolate.jpg',
      },
      {
        name: 'Brownie Sundae',
        price: 18000, // ₹180
        description: 'Rich chocolate brownie topped with vanilla ice cream and chocolate drizzle',
        displayOrder: 3,
        isAvailable: true,
        imageUrl: '/menu/brownie-sundae.jpg',
      },
      {
        name: 'Hot Chocolate Fudge',
        price: 20000, // ₹200
        description: 'Classic vanilla ice cream scoops drenched in warm rich chocolate fudge',
        displayOrder: 4,
        isAvailable: true,
        imageUrl: '/menu/hot-chocolate-fudge.jpg',
      },
      {
        name: 'Banana Split',
        price: 19500, // ₹195
        description: 'Fresh sliced banana with trio of ice cream scoops, nuts, syrups, and cherries',
        displayOrder: 5,
        isAvailable: true,
        imageUrl: '/menu/banana-split.jpg',
      },
      {
        name: 'Rose Falooda',
        price: 22000, // ₹220
        description: 'Fragrant rose syrup infused milk with sabja seeds, vermicelli, and ice cream',
        displayOrder: 6,
        isAvailable: true,
        imageUrl: '/menu/rose-falooda.jpg',
      },
      {
        name: 'Royal Falooda',
        price: 22000, // ₹220
        description: 'Traditional layered dessert with mixed nuts, saffron syrup, and kulfi scoop',
        displayOrder: 7,
        isAvailable: true,
        imageUrl: '/menu/royal-falooda.jpg',
      },
      {
        name: 'Gadbud',
        price: 20000, // ₹200
        description: 'Legendary Mangalore multi-layered sundae with fruits, jelly, and dry fruit ice creams',
        displayOrder: 8,
        isAvailable: true,
        imageUrl: '/menu/gadbud.jpg',
      },
      {
        name: 'Biscoff Sundae',
        price: 22500, // ₹225
        description: 'Lotus Biscoff cookie crumble and creamy spread with premium dairy ice cream',
        displayOrder: 9,
        isAvailable: true,
        imageUrl: '/menu/biscoff-sundae.jpg',
      },
    ],
  },
  {
    category: {
      name: 'Milkshake',
      description: 'Madness',
      displayOrder: 2,
      isActive: true,
    },
    items: [
      {
        name: 'Hazelnut Bubble Milk',
        price: 19000, // ₹190
        description: 'Rich hazelnut milk tea with brown sugar chewy tapioca boba pearls',
        displayOrder: 1,
        isAvailable: true,
        imageUrl: '/menu/hazelnut-bubble-milk-v2.jpg',
      },
      {
        name: 'Strawberry Milkshake',
        price: 11000, // ₹110
        description: 'Chilled strawberry milkshake topped with whipped cream and chocolate shavings',
        displayOrder: 2,
        isAvailable: true,
        imageUrl: '/menu/strawberry-milkshake-v2.jpg',
      },
      {
        name: 'Oreo Milkshake',
        price: 11500, // ₹115
        description: 'Creamy Oreo cookie shake drizzled with chocolate and whipped cream',
        displayOrder: 3,
        isAvailable: true,
        imageUrl: '/menu/oreo-milkshake-v2.jpg',
      },
      {
        name: 'Classic Cold Coffee',
        price: 11000, // ₹110
        description: 'Brewed espresso chilled with whole milk, vanilla cream, and ice cubes',
        displayOrder: 4,
        isAvailable: true,
        imageUrl: '/menu/classic-cold-coffee-v2.jpg',
      },
      {
        name: 'Rose Milk',
        price: 8500, // ₹85
        description: 'Fragrant aromatic rose milk served ice-cold',
        displayOrder: 5,
        isAvailable: true,
        imageUrl: '/menu/rose-milk-v2.jpg',
      },
      {
        name: 'Chocolate Milkshake',
        price: 11000, // ₹110
        description: 'Classic rich Dutch cocoa blended with creamy dairy ice cream',
        displayOrder: 6,
        isAvailable: true,
        imageUrl: '/menu/chocolate-milkshake-v2.jpg',
      },
      {
        name: 'Vanilla Milkshake',
        price: 11000, // ₹110
        description: 'Pure Madagascar vanilla cream shake',
        displayOrder: 7,
        isAvailable: true,
        imageUrl: '/menu/vanilla-milkshake-v2.jpg',
      },
      {
        name: 'Kitkat Milkshake',
        price: 12000, // ₹120
        description: 'Crispy wafer Kitkat chocolate bars blended thick and creamy',
        displayOrder: 8,
        isAvailable: true,
        imageUrl: '/menu/kitkat-milkshake-v2.jpg',
      },
      {
        name: 'Biscoff Milkshake',
        price: 12500, // ₹125
        description: 'Caramelized Belgian speculoos cookie butter shake',
        displayOrder: 9,
        isAvailable: true,
        imageUrl: '/menu/biscoff-milkshake-v2.jpg',
      },
      {
        name: 'Nutella Milkshake',
        price: 13500, // ₹135
        description: 'Creamy hazelnut cocoa Nutella blended with fresh dairy milk',
        displayOrder: 10,
        isAvailable: true,
        imageUrl: '/menu/nutella-milkshake-v2.jpg',
      },
      {
        name: 'Hazelnut Cold Coffee',
        price: 12500, // ₹125
        description: 'Chilled roasted hazelnut flavored espresso with cold milk',
        displayOrder: 11,
        isAvailable: true,
        imageUrl: '/menu/hazelnut-cold-coffee-v2.jpg',
      },
      {
        name: 'Salted Caramel Cold Coffee',
        price: 12500, // ₹125
        description: 'Sweet and salty buttery caramel drizzled into rich cold brew',
        displayOrder: 12,
        isAvailable: true,
        imageUrl: '/menu/salted-caramel-cold-coffee-v2.jpg',
      },
      {
        name: 'Chocolate Bubble Milk',
        price: 18000, // ₹180
        description: 'Velvety chocolate milk with chewy sweet boba pearls',
        displayOrder: 13,
        isAvailable: true,
        imageUrl: '/menu/chocolate-bubble-milk-v2.jpg',
      },
      {
        name: 'Coffee Bubble Milk',
        price: 17000, // ₹170
        description: 'Iced latte with brown sugar tapioca boba pearls',
        displayOrder: 14,
        isAvailable: true,
        imageUrl: '/menu/coffee-bubble-milk-v2.jpg',
      },
      {
        name: 'Berry Blast Bubble Milk',
        price: 19000, // ₹190
        description: 'Mixed wild berry milk tea with chewy tapioca pearls',
        displayOrder: 15,
        isAvailable: true,
        imageUrl: '/menu/berry-blast-bubble-milk-v2.jpg',
      },
    ],
  },
  {
    category: {
      name: 'Mains',
      description: 'Mustly Mains',
      displayOrder: 3,
      isActive: true,
    },
    items: [
      {
        name: 'Veg Grilled Sandwich',
        price: 9500, // ₹95
        description: 'Toasted sandwich layered with seasoned vegetables',
        displayOrder: 1,
        isAvailable: true,
        imageUrl: '/menu/veg-grilled-sandwich-v2.jpg',
      },
      {
        name: 'Chocolate Sandwich',
        price: 9500, // ₹95
        description: 'Decadent melted chocolate layered between crisp toasted bread',
        displayOrder: 2,
        isAvailable: true,
        imageUrl: '/menu/chocolate-sandwich.jpg',
      },
      {
        name: 'Chilli Cheese Sandwich',
        price: 7500, // ₹75
        description: 'Spicy green chillies and melted cheese grilled to golden perfection',
        displayOrder: 3,
        isAvailable: true,
        imageUrl: '/menu/chilli-cheese-sandwich-v2.jpg',
      },
      {
        name: 'Corn Cheese Sandwich',
        price: 10500, // ₹105
        description: 'Sweet corn kernels paired with creamy melted cheese',
        displayOrder: 4,
        isAvailable: true,
        imageUrl: '/menu/corn-cheese-sandwich-v2.jpg',
      },
      {
        name: 'Pizza Sandwich',
        price: 11500, // ₹115
        description: 'Italian herb seasoned pizza sauce, veggies, and mozzarella grilled toast',
        displayOrder: 5,
        isAvailable: true,
        imageUrl: '/menu/pizza-sandwich-v2.jpg',
      },
      {
        name: 'Paneer Grilled Sandwich',
        price: 13500, // ₹135
        description: 'Spiced paneer filling grilled between buttery golden toast',
        displayOrder: 6,
        isAvailable: true,
        imageUrl: '/menu/paneer-grilled-sandwich.jpg',
      },
      {
        name: 'Veg Burger',
        price: 12000, // ₹120
        description: 'Crispy veggie patty with fresh lettuce, onions, and signature dressing',
        displayOrder: 7,
        isAvailable: true,
        imageUrl: '/menu/veg-burger.jpg',
      },
      {
        name: 'Herb Chilli Burger',
        price: 11500, // ₹115
        description: 'Herbed spicy vegetable patty topped with signature sauce',
        displayOrder: 8,
        isAvailable: true,
        imageUrl: '/menu/herb-chilli-burger.jpg',
      },
      {
        name: 'Paneer Burger',
        price: 15000, // ₹150
        description: 'Golden crusted cottage cheese patty with crisp lettuce and mayo',
        displayOrder: 9,
        isAvailable: true,
        imageUrl: '/menu/paneer-burger.jpg',
      },
    ],
  },
  {
    category: {
      name: 'Cheat Meal',
      description: 'Feel-Good',
      displayOrder: 4,
      isActive: true,
    },
    items: [
      {
        name: 'Cheese Maggie',
        price: 7000, // ₹70
        description: 'Classic hot spiced noodles smothered with melted cheese and chilli flakes',
        displayOrder: 1,
        isAvailable: true,
        imageUrl: '/menu/cheese-maggi.jpg',
      },
      {
        name: 'Classic French Fries',
        price: 11000, // ₹110
        description: 'Crispy golden salted potato fries served piping hot',
        displayOrder: 2,
        isAvailable: true,
        imageUrl: '/menu/classic-french-fries.jpg',
      },
      {
        name: 'Corn Cheese Maggie',
        price: 7500, // ₹75
        description: 'Sweet juicy corn kernels tossed with melted cheese and hot noodles',
        displayOrder: 3,
        isAvailable: true,
        imageUrl: '/menu/corn-cheese-maggi.jpg',
      },
      {
        name: 'Cheese French Fries',
        price: 14000, // ₹140
        description: 'Golden fries drenched in warm savory melted cheese sauce and herbs',
        displayOrder: 4,
        isAvailable: true,
        imageUrl: '/menu/cheese-french-fries.jpg',
      },
      {
        name: 'Masala Maggie',
        price: 5500, // ₹55
        description: 'Authentic street-style seasoned vegetable spice noodles',
        displayOrder: 5,
        isAvailable: true,
        imageUrl: '/menu/masala-maggi-v2.jpg',
      },
      {
        name: 'Chilli Oil Maggie',
        price: 8000, // ₹80
        description: 'Fiery roasted garlic chilli oil drizzled over steaming noodles',
        displayOrder: 6,
        isAvailable: true,
        imageUrl: '/menu/chilli-oil-maggi.jpg',
      },
      {
        name: 'Veg Maggie',
        price: 8000, // ₹80
        description: 'Fresh crunchy vegetables cooked with aromatic noodle spices',
        displayOrder: 7,
        isAvailable: true,
        imageUrl: '/menu/veg-maggi-v2.jpg',
      },
      {
        name: 'Lemon Coriander Maggie',
        price: 8500, // ₹85
        description: 'Zesty fresh lemon and fragrant chopped coriander noodles',
        displayOrder: 8,
        isAvailable: true,
        imageUrl: '/menu/lemon-coriander-maggi.jpg',
      },
      {
        name: 'Peri Peri French Fries',
        price: 12500, // ₹125
        description: 'Crisp potato fries dusted with zesty African bird eye peri peri spice',
        displayOrder: 9,
        isAvailable: true,
        imageUrl: '/menu/peri-peri-french-fries.jpg',
      },
    ],
  },
  {
    category: {
      name: 'Sides',
      description: 'Situationship',
      displayOrder: 5,
      isActive: true,
    },
    items: [
      {
        name: 'Onion Rings',
        price: 12500, // ₹125
        description: 'Crispy batter-fried golden sweet onion rings served with dip',
        displayOrder: 1,
        isAvailable: true,
        imageUrl: '/menu/onion-rings.jpg',
      },
      {
        name: 'Hara Bara Bites',
        price: 11500, // ₹115
        description: 'Spiced spinach, pea and paneer patties served with mint chutney',
        displayOrder: 2,
        isAvailable: true,
        imageUrl: '/menu/hara-bara-bites.jpg',
      },
      {
        name: 'Chilli Garlic Potato Bites',
        price: 13000, // ₹130
        description: 'Crisp potato nuggets seasoned with garlic and spicy red chilli flakes',
        displayOrder: 3,
        isAvailable: true,
        imageUrl: '/menu/chilli-garlic-potato-bites.jpg',
      },
      {
        name: 'Potato Cheese Shots',
        price: 9500, // ₹95
        description: 'Crunchy crumbed potato balls filled with molten stretchy mozzarella cheese',
        displayOrder: 4,
        isAvailable: true,
        imageUrl: '/menu/potato-cheese-shots.jpg',
      },
      {
        name: 'Cheese Jalapeno Bites',
        price: 12500, // ₹125
        description: 'Cheesy bites loaded with diced spicy pickled jalapeno peppers',
        displayOrder: 5,
        isAvailable: true,
        imageUrl: '/menu/cheese-jalapeno-bites.jpg',
      },
      {
        name: 'Lebanese Falafels Bites',
        price: 12500, // ₹125
        description: 'Traditional herbed chickpea patties served with tahini sauce',
        displayOrder: 6,
        isAvailable: true,
        imageUrl: '/menu/lebanese-falafels-bites.jpg',
      },
      {
        name: 'Veg Fingers',
        price: 12500, // ₹125
        description: 'Breaded crunchy vegetable fingers served with garlic dip',
        displayOrder: 7,
        isAvailable: true,
        imageUrl: '/menu/veg-fingers.jpg',
      },
      {
        name: 'Veg Nuggets',
        price: 11500, // ₹115
        description: 'Golden fried crispy vegetarian nuggets',
        displayOrder: 8,
        isAvailable: true,
        imageUrl: '/menu/veg-nuggets.jpg',
      },
    ],
  },
  {
    category: {
      name: 'Mojito',
      description: 'Magic',
      displayOrder: 6,
      isActive: true,
    },
    items: [
      {
        name: 'Mint Mojito',
        price: 10000, // ₹100
        description: 'Fresh mint leaves and muddled lime topped with chilled sparkling soda',
        displayOrder: 1,
        isAvailable: true,
        imageUrl: '/menu/mint-mojito-v2.jpg',
      },
      {
        name: 'Blue Lime Mojito',
        price: 10000, // ₹100
        description: 'Electric blue citrus cooler with mint, lime, and crushed ice',
        displayOrder: 2,
        isAvailable: true,
        imageUrl: '/menu/blue-lime-mojito-v2.jpg',
      },
      {
        name: 'Passionfruit Mojito',
        price: 11000, // ₹110
        description: 'Tropical passionfruit blend with fresh lime, mint, and soda',
        displayOrder: 3,
        isAvailable: true,
        imageUrl: '/menu/passionfruit-mojito-v2.jpg',
      },
      {
        name: 'Green Apple Mojito',
        price: 11000, // ₹110
        description: 'Crisp tart green apple syrup infused with mint and crushed ice',
        displayOrder: 4,
        isAvailable: true,
        imageUrl: '/menu/green-apple-mojito-v2.jpg',
      },
      {
        name: 'Cranberry Mojito',
        price: 11000, // ₹110
        description: 'Tangy cranberry splash with mint and sparkling soda',
        displayOrder: 5,
        isAvailable: true,
        imageUrl: '/menu/cranberry-mojito-v2.jpg',
      },
      {
        name: 'Sweet Lassi',
        price: 7000, // ₹70
        description: 'Traditional churned creamy sweet yogurt drink',
        displayOrder: 6,
        isAvailable: true,
        imageUrl: '/menu/sweet-lassi-v2.jpg',
      },
      {
        name: 'Mango Lassi',
        price: 8500, // ₹85
        description: 'Rich mango pulp blended with fresh chilled yogurt',
        displayOrder: 7,
        isAvailable: true,
        imageUrl: '/menu/mango-lassi-v2.jpg',
      },
      {
        name: 'Strawberry Lassi',
        price: 8500, // ₹85
        description: 'Sweet strawberry fruit blend with smooth thick yogurt',
        displayOrder: 8,
        isAvailable: true,
        imageUrl: '/menu/strawberry-lassi-v2.jpg',
      },
      {
        name: 'Rose Lassi',
        price: 8500, // ₹85
        description: 'Delicate rose petal syrup infused with velvety churned yogurt',
        displayOrder: 9,
        isAvailable: true,
        imageUrl: '/menu/rose-lassi-v2.jpg',
      },
    ],
  },
];

export async function runMenuSeed(
  customDatabaseUrl?: string,
): Promise<SeedMenuResult> {
  try {
    if (typeof process.loadEnvFile === 'function') {
      try {
        process.loadEnvFile('.env.local');
      } catch {
        try {
          process.loadEnvFile('.env');
        } catch {
          // No .env file, rely on existing environment
        }
      }
    }
  } catch {
    // Ignore environment file loading errors
  }

  const databaseUrl =
    customDatabaseUrl ||
    process.env.DATABASE_URL ||
    'mongodb://localhost:27017/cream-treat';

  console.log(
    `[Menu Seed] Connecting to MongoDB: ${sanitizeMongoUri(databaseUrl)}`,
  );

  const connection = await mongoose.createConnection(databaseUrl, {
    serverSelectionTimeoutMS: 5000,
  }).asPromise();

  try {
    const CategoryModel = connection.model('Category', CategorySchema);
    const FoodItemModel = connection.model('FoodItem', FoodItemSchema);

    // Clean up any legacy categories not in the official 6-page PDF menu
    const activeCategoryNames = REAL_CREAM_TREAT_MENU.map((c) => c.category.name);
    const oldCategories = await CategoryModel.find({ name: { $nin: activeCategoryNames } });
    if (oldCategories.length > 0) {
      const oldIds = oldCategories.map((c) => c._id);
      await FoodItemModel.deleteMany({ categoryId: { $in: oldIds } });
      await CategoryModel.deleteMany({ _id: { $in: oldIds } });
      console.log(`[Menu Seed] Removed ${oldCategories.length} legacy non-menu categories.`);
    }

    let categoriesUpserted = 0;
    let itemsUpserted = 0;

    for (const group of REAL_CREAM_TREAT_MENU) {
      // 1. Upsert Category idempotently by name
      const categoryDoc = await CategoryModel.findOneAndUpdate(
        { name: group.category.name },
        {
          $set: {
            description: group.category.description,
            displayOrder: group.category.displayOrder,
            isActive: group.category.isActive,
          },
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
      );

      categoriesUpserted++;
      console.log(
        `[Menu Seed] Category "${categoryDoc.name}" ready (ID: ${categoryDoc._id}).`,
      );

      // 2. Upsert Food Items idempotently by name
      for (const item of group.items) {
        const escapedName = item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        await FoodItemModel.findOneAndUpdate(
          {
            categoryId: categoryDoc._id,
            name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
          },
          {
            $set: {
              categoryId: categoryDoc._id,
              name: item.name,
              price: item.price,
              description: item.description,
              displayOrder: item.displayOrder,
              isAvailable: item.isAvailable,
              imageUrl: item.imageUrl || '',
            },
          },
          { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
        );
        itemsUpserted++;
      }
    }

    console.log(
      `[Menu Seed] Successfully seeded ${categoriesUpserted} categories and ${itemsUpserted} food items from PDF.`,
    );

    return {
      success: true,
      categoriesUpserted,
      itemsUpserted,
    };
  } finally {
    await connection.close();
    console.log('[Menu Seed] Database connection closed.');
  }
}

const isMainModule =
  process.argv[1] &&
  (process.argv[1].endsWith('seed-menu.js') ||
    process.argv[1].endsWith('seed-menu.ts'));

if (isMainModule) {
  runMenuSeed()
    .then(() => {
      console.log('[Menu Seed] Real menu seeding completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error(
        `[Menu Seed] Seeding failed: ${error.message || 'Unknown database error'}`,
      );
      process.exit(1);
    });
}
