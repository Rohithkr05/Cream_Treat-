import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidMongoObjectId,
  resolveApiBaseUrl,
  sanitizeCartItems,
  validateCheckoutSubmission,
  formatOrderApiError,
  formatOrderNetworkError,
  addCartItem,
  decrementCartItem,
  deleteCartItem,
  setCartItemQuantity,
  executeProtectedCheckout,
} from './checkout.ts';
import type { CartItem, FoodItem, OrderResponse } from '../types/menu';

const makeValidItem = (overrides: Partial<FoodItem> = {}): FoodItem => ({
  _id: '507f1f77bcf86cd799439011',
  categoryId: '507f1f77bcf86cd799439001',
  name: 'Chocolava Cake Sundae',
  price: 16000,
  isAvailable: true,
  displayOrder: 1,
  ...overrides,
});

describe('Frontend Checkout Validation & Error Handling', () => {
  it('1. validates 24-char MongoDB ObjectIds and rejects synthetic client_* IDs', () => {
    assert.equal(isValidMongoObjectId('507f1f77bcf86cd799439011'), true);
    assert.equal(isValidMongoObjectId('67321a9bcdef0123456789ab'), true);
    assert.equal(isValidMongoObjectId('client_chocolavacakesundae'), false);
    assert.equal(isValidMongoObjectId(''), false);
    assert.equal(isValidMongoObjectId('12345'), false);
    assert.equal(isValidMongoObjectId(null), false);
  });

  it('2. sanitizes localStorage cart by dropping legacy client_* items while keeping valid items', () => {
    const valid = makeValidItem();
    const rawStored = [
      { foodItem: makeValidItem({ _id: 'client_browniesundae', name: 'Brownie Sundae' }), quantity: 1 },
      { foodItem: valid, quantity: 2 },
      { foodItem: null, quantity: 1 },
      { foodItem: makeValidItem({ _id: '67321a9bcdef0123456789cd' }), quantity: 0 },
    ];

    const result = sanitizeCartItems(rawStored);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].foodItem._id, '507f1f77bcf86cd799439011');
    assert.equal(result.items[0].quantity, 2);
    assert.equal(result.removedInvalidCount, 3);
  });

  it('3. builds clean POST /orders payload without frontend price/total manipulation', () => {
    const items: CartItem[] = [
      { foodItem: makeValidItem({ _id: '507f1f77bcf86cd799439011', price: 1 }), quantity: 2 },
      { foodItem: makeValidItem({ _id: '507f1f77bcf86cd799439012', name: 'Gadbud' }), quantity: 1 },
    ];

    const validation = validateCheckoutSubmission(5, items);
    assert.equal(validation.valid, true);
    assert.deepEqual(validation.payload, {
      tableNumber: 5,
      items: [
        { foodItemId: '507f1f77bcf86cd799439011', quantity: 2 },
        { foodItemId: '507f1f77bcf86cd799439012', quantity: 1 },
      ],
    });
  });

  it('4. blocks invalid checkout inputs: missing table, empty cart, client_* item, quantity > 99', () => {
    const validCart: CartItem[] = [{ foodItem: makeValidItem(), quantity: 1 }];

    assert.equal(validateCheckoutSubmission(null, validCart).valid, false);
    assert.equal(validateCheckoutSubmission(0, validCart).valid, false);
    assert.equal(validateCheckoutSubmission(1000, validCart).valid, false);
    assert.equal(validateCheckoutSubmission(5, []).valid, false);

    const syntheticCart: CartItem[] = [
      {
        foodItem: makeValidItem({ _id: 'client_rosefalooda', name: 'Rose Falooda' }),
        quantity: 1,
      },
    ];
    const syntheticCheck = validateCheckoutSubmission(5, syntheticCart);
    assert.equal(syntheticCheck.valid, false);
    assert.equal(syntheticCheck.invalidItems.length, 1);
    assert.match(syntheticCheck.error || '', /refresh your menu/i);

    const overMaxCart: CartItem[] = [{ foodItem: makeValidItem(), quantity: 100 }];
    const qtyCheck = validateCheckoutSubmission(5, overMaxCart);
    assert.equal(qtyCheck.valid, false);
    assert.match(qtyCheck.error || '', /99/);
  });

  it('5. maps backend HTTP errors into specific customer-safe messages without stack traces', () => {
    const dbDownMsg = formatOrderApiError(503, {
      statusCode: 503,
      message: 'Database service is temporarily unavailable.',
    });
    assert.match(dbDownMsg, /temporarily unavailable/i);

    const objectIdMsg = formatOrderApiError(400, {
      statusCode: 400,
      message: ['items.0.foodItemId must be a valid MongoDB ObjectId'],
    });
    assert.equal(
      objectIdMsg,
      'Some items in your cart are no longer available. Please refresh your menu.',
    );

    const unavailableMsg = formatOrderApiError(400, {
      statusCode: 400,
      message: 'Food item "Rose Falooda" is currently unavailable',
    });
    assert.match(unavailableMsg, /Rose Falooda/);
    assert.match(unavailableMsg, /unavailable/i);

    const notFoundMsg = formatOrderApiError(404, {
      statusCode: 404,
      message: 'Food item not found',
    });
    assert.equal(
      notFoundMsg,
      'Some items in your cart are no longer available. Please refresh your menu.',
    );

    const serverErrMsg = formatOrderApiError(500, {
      statusCode: 500,
      message: 'Internal server error',
    });
    assert.equal(serverErrMsg, "We couldn't place your order right now. Please try again.");
  });

  it('6. resolves API URL consistently and formats network errors cleanly', () => {
    assert.equal(
      resolveApiBaseUrl({
        envUrl: 'http://localhost:4999/',
        windowHostname: 'localhost',
        windowProtocol: 'http:',
      }),
      'http://localhost:4999',
    );

    assert.equal(
      resolveApiBaseUrl({
        envUrl: 'http://localhost:3001',
        windowHostname: '192.168.1.50',
        windowProtocol: 'http:',
      }),
      'http://192.168.1.50:3001',
    );

    const netMsg = formatOrderNetworkError(new TypeError('Failed to fetch'));
    assert.equal(
      netMsg,
      'Unable to connect to the shop. Please check your internet connection.',
    );
  });

  it('7. manages cart items cleanly: add, increase, decrease, remove, and reject client_* items', () => {
    const valid = makeValidItem();
    const synthetic = makeValidItem({ _id: 'client_fake', name: 'Fake Sundae' });

    let cart = addCartItem([], synthetic);
    assert.equal(cart.length, 0);

    cart = addCartItem(cart, valid);
    assert.equal(cart.length, 1);
    assert.equal(cart[0].quantity, 1);

    cart = addCartItem(cart, valid);
    assert.equal(cart[0].quantity, 2);

    cart = setCartItemQuantity(cart, valid._id, 5);
    assert.equal(cart[0].quantity, 5);

    cart = decrementCartItem(cart, valid._id);
    assert.equal(cart[0].quantity, 4);

    cart = deleteCartItem(cart, valid._id);
    assert.equal(cart.length, 0);
  });

  it('8. prevents duplicate checkout submissions and clears cart only after backend confirms success', async () => {
    const items: CartItem[] = [{ foodItem: makeValidItem(), quantity: 2 }];
    const lock = { current: false };
    let cleared = false;
    let calls = 0;

    // Slow failing checkout preserves cart and releases lock
    const failOutcome = await executeProtectedCheckout({
      lock,
      tableNumber: 7,
      items,
      submitOrder: async () => {
        calls++;
        throw new Error('One or more items are currently unavailable. Please update your cart.');
      },
      onSuccess: () => {
        cleared = true;
      },
    });
    assert.equal(failOutcome.status, 'failed');
    assert.equal(cleared, false);
    assert.equal(lock.current, false);

    // Concurrent double-click only triggers ONE API request and clears cart once on success
    let resolvePending!: (value: OrderResponse) => void;
    const firstPromise = executeProtectedCheckout({
      lock,
      tableNumber: 7,
      items,
      submitOrder: () => {
        calls++;
        return new Promise((resolve) => {
          resolvePending = resolve;
        });
      },
      onSuccess: () => {
        cleared = true;
      },
    });

    const duplicateOutcome = await executeProtectedCheckout({
      lock,
      tableNumber: 7,
      items,
      submitOrder: async () => {
        calls++;
        throw new Error('Should not run');
      },
      onSuccess: () => {
        cleared = true;
      },
    });

    assert.equal(duplicateOutcome.status, 'duplicate_ignored');
    assert.equal(cleared, false);
    assert.equal(calls, 2); // 1 failed call earlier + 1 in-flight call

    resolvePending({
      id: '670d00000000000000000099',
      orderNumber: '#001',
      displayOrderNumber: '#001',
      orderDate: '2026-11-12',
      tableNumber: 7,
      status: 'NEW',
      items: [],
      subtotal: 32000,
      total: 32000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const successOutcome = await firstPromise;
    assert.equal(successOutcome.status, 'submitted');
    assert.equal(cleared, true);
  });
});
