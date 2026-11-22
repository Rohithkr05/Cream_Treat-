import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractItemCategoryId,
  filterMenuItemsByActiveCategories,
  formatMenuApiError,
  formatMenuNetworkError,
} from './checkout.ts';
import type { Category, FoodItem } from '../types/menu';

const CAT_ACTIVE_ID = '507f1f77bcf86cd799439011';
const CAT_INACTIVE_ID = '507f1f77bcf86cd799439012';
const ITEM_1_ID = '607f1f77bcf86cd799439021';
const ITEM_2_ID = '607f1f77bcf86cd799439022';
const ITEM_3_ID = '607f1f77bcf86cd799439023';

test('formatMenuApiError surfaces 503 database outage distinctly from generic 500 or network failure', () => {
  const msg503 = formatMenuApiError(
    503,
    {
      statusCode: 503,
      message: 'Database service is temporarily unavailable. Please ensure MongoDB is running and try again.',
    },
    'menu items',
  );
  assert.match(msg503, /database is offline/i);

  const msg404 = formatMenuApiError(404, { message: 'Cannot GET /menu/items' }, 'menu items');
  assert.match(msg404, /endpoint/i);

  const msg500 = formatMenuApiError(500, { message: 'Unexpected crash' }, 'menu categories');
  assert.match(msg500, /kitchen server encountered an error/i);
  assert.doesNotMatch(msg500, /Unexpected crash/);
});

test('formatMenuNetworkError classifies TypeError and connection refused errors clearly', () => {
  assert.match(
    formatMenuNetworkError(new TypeError('Failed to fetch')),
    /check your connection/i,
  );
  assert.match(
    formatMenuNetworkError(new Error('connect ECONNREFUSED 127.0.0.1:3001')),
    /server is running/i,
  );
});

test('filterMenuItemsByActiveCategories excludes invalid IDs, sold-out items, and items in deactivated categories', () => {
  const categories: Category[] = [
    { _id: CAT_ACTIVE_ID, name: 'Sundae', displayOrder: 1, isActive: true },
    { _id: CAT_INACTIVE_ID, name: 'Seasonal', displayOrder: 2, isActive: false },
  ];

  const items: FoodItem[] = [
    {
      _id: ITEM_1_ID,
      categoryId: { _id: CAT_ACTIVE_ID, name: 'Sundae', isActive: true },
      name: 'Chocolava cake sundae',
      price: 16000,
      imageUrl: '/images/chocolava-cake-sundae.jpg',
      isAvailable: true,
      displayOrder: 1,
    },
    {
      _id: ITEM_2_ID,
      categoryId: { _id: CAT_INACTIVE_ID, name: 'Seasonal', isActive: false },
      name: 'Deactivated Category Shake',
      price: 12000,
      isAvailable: true,
      displayOrder: 2,
    },
    {
      _id: ITEM_3_ID,
      categoryId: CAT_ACTIVE_ID,
      name: 'Sold Out Item',
      price: 9000,
      isAvailable: false,
      displayOrder: 3,
    },
    {
      _id: 'client_synthetic_id',
      categoryId: CAT_ACTIVE_ID,
      name: 'Fake Item',
      price: 5000,
      isAvailable: true,
      displayOrder: 4,
    },
  ];

  assert.equal(extractItemCategoryId(items[0]), CAT_ACTIVE_ID);
  assert.equal(extractItemCategoryId(items[2]), CAT_ACTIVE_ID);

  const filtered = filterMenuItemsByActiveCategories(items, categories);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]._id, ITEM_1_ID);
});
