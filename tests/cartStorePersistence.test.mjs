import test from 'node:test';
import assert from 'node:assert/strict';
import { CART_STORAGE_KEY } from '../lib/cart/persistence.ts';
import { __cartStoreTestUtils } from '../stores/cartStore.ts';

const savedWindow = globalThis.window;
const storage = new Map();

globalThis.window = {
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  },
  addEventListener() {},
  removeEventListener() {},
};

const customizedItem = {
  id: 'custom-1',
  restaurantId: 'chipotle',
  itemId: 'bowl',
  name: 'Custom Bowl',
  image: '/bowl.png',
  quantity: 1,
  macrosPerItem: { calories: 700, protein: 55, carbs: 65, totalFat: 22 },
  nutritionPerItem: { calories: 700, protein: 55, carbs: 65, totalFat: 22 },
  selection: {
    type: 'build-your-own',
    buildConfiguration: {
      baseItemId: 'bowl',
      ingredients: [
        { id: 'chicken', quantity: 2, portion: 'extra' },
        { id: 'rice', quantity: 1, portion: 'light' },
      ],
      options: { side: 'chips', drink: 'cola', sauce: 'hot' },
    },
  },
};

test.after(() => {
  if (savedWindow === undefined) delete globalThis.window;
  else globalThis.window = savedWindow;
});

test.beforeEach(() => {
  storage.clear();
  __cartStoreTestUtils.resetCartState();
  __cartStoreTestUtils.resetPersistenceForTests();
});

test('saved structured cart hydrates after a simulated app reload', () => {
  __cartStoreTestUtils.addItem(customizedItem);
  assert.ok(storage.has(CART_STORAGE_KEY));

  __cartStoreTestUtils.resetCartState();
  __cartStoreTestUtils.resetPersistenceForTests();
  __cartStoreTestUtils.hydrateCartFromStorage();

  assert.deepEqual(__cartStoreTestUtils.getSnapshot().items, [customizedItem]);
});

test('an early mutation hydrates first instead of overwriting the saved cart', () => {
  __cartStoreTestUtils.addItem(customizedItem);
  __cartStoreTestUtils.resetCartState();
  __cartStoreTestUtils.resetPersistenceForTests();

  __cartStoreTestUtils.addItem({ ...customizedItem, id: 'second-item', itemId: 'tacos' });
  assert.deepEqual(
    __cartStoreTestUtils.getSnapshot().items.map((item) => item.id),
    ['custom-1', 'second-item'],
  );
});

test('clear cart persists an empty cart across the next hydration', () => {
  __cartStoreTestUtils.addItem(customizedItem);
  __cartStoreTestUtils.clearCart();
  __cartStoreTestUtils.resetCartState({ items: [customizedItem] });
  __cartStoreTestUtils.resetPersistenceForTests();
  __cartStoreTestUtils.hydrateCartFromStorage();

  assert.deepEqual(__cartStoreTestUtils.getSnapshot().items, []);
});
