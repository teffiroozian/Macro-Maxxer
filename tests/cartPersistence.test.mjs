import test from 'node:test';
import assert from 'node:assert/strict';
import { deserializeCartItems, serializeCartItems } from '../lib/cart/persistence.ts';

const standardItem = {
  id: 'meal-1',
  restaurantId: 'restaurant-1',
  itemId: 'entree-1',
  name: 'Customized Meal',
  image: '/meal.png',
  variantId: 'large',
  quantity: 2,
  macrosPerItem: { calories: 600, protein: 40, carbs: 55, totalFat: 20 },
  nutritionPerItem: { calories: 600, protein: 40, carbs: 55, totalFat: 20, sodium: 900 },
  selection: {
    type: 'standard',
    variantId: 'large',
    variantLabel: 'Large',
    optionSelections: [
      { optionId: 'side', itemId: 'fries', label: 'Fries', quantity: 1 },
      { optionId: 'drink', itemId: 'tea', label: 'Iced Tea', quantity: 1 },
    ],
  },
  customizations: [
    { action: 'extra', kind: 'ingredient', ingredientId: 'sauce', ingredientLabel: 'Sauce', quantity: 2 },
  ],
};

const buildItem = {
  ...standardItem,
  id: 'build-1',
  itemId: 'bowl',
  selection: {
    type: 'build-your-own',
    buildConfiguration: {
      baseItemId: 'bowl',
      variantId: 'regular',
      ingredients: [
        { id: 'chicken', quantity: 2, portion: 'extra', variantId: 'double' },
        { id: 'rice', quantity: 1, portion: 'light' },
      ],
      options: { tortilla: false, sauce: 'hot' },
    },
  },
};

test('cart persistence round-trips standard and build selections without flattening them', () => {
  const restored = deserializeCartItems(serializeCartItems([standardItem, buildItem]));
  assert.deepEqual(restored, [standardItem, buildItem]);
});

test('one invalid saved item is skipped without wiping valid cart entries', () => {
  const serialized = JSON.stringify({
    version: 1,
    items: [standardItem, { id: 'broken-item' }, buildItem],
  });
  assert.deepEqual(deserializeCartItems(serialized), [standardItem, buildItem]);
});

test('a saved empty cart remains a valid permanent clear', () => {
  assert.deepEqual(deserializeCartItems(serializeCartItems([])), []);
});

test('corrupt or unsupported storage is ignored rather than interpreted as an empty cart', () => {
  assert.equal(deserializeCartItems('{not json'), null);
  assert.equal(deserializeCartItems(JSON.stringify({ version: 99, items: [standardItem] })), null);
});
