export const MENU_SECTION_ORDER = [
  "sandwich",
  // Macro Maxxer's standardized Chick-fil-A browse taxonomy — see
  // scripts/importers/chick-fil-a.ts's primaryBrowseCategoryFor. Inserted
  // alongside the existing generic single-word categories above/below
  // rather than replacing them, since other restaurants' generated data
  // still relies on those.
  "sandwiches",
  // Chick-fil-A's Nuggets/Grilled Nuggets/Chick-n-Strips family now renders
  // under "Chicken" (renamed from "Nuggets & Strips" — see
  // scripts/importers/chick-fil-a.ts's primaryBrowseCategoryFor), reusing
  // this existing generic key and its existing icon rather than adding a
  // Chick-fil-A-specific one.
  "chicken",
  "burger",
  "pizza",
  "salad",
  "salads",
  "wrap",
  "wraps",
  "breakfast",
  "side",
  "sides",
  "breakfast sides",
  "single sides",
  "chips & dips",
  "protein meals",
  "protein cups",
  "coffee",
  "drinks",
  "fountain drinks",
  "beverage",
  "beverages",
  "tractor beverages",
  "kids drinks",
  "treats",
  // Positioned after "treats" (rather than near "protein cups") so
  // Chick-fil-A's standalone Kids category sorts per its own taxonomy.
  "kids",
  "dipping sauces",
  "sauces",
  "dressings",
  "condiments",
  "toppings",
] as const;

export const INGREDIENT_SECTION_ORDER = [
  // Chipotle's View All Ingredients "Base" category (its renamed Included
  // Ingredients group — see buildAllChipotleIngredientMenuItems) sorts
  // first, directly under the "All Ingredients" filter chip itself.
  "base",
  "included ingredient",
  "included ingredients",
  "ingredients",
  "buns",
  "breakfast buns",
  "proteins",
  "breakfast proteins",
  "rice",
  "beans",
  "cheeses",
  "eggs",
  "toppings",
  "sandwich toppings",
  "salad toppings",
  "wrap toppings",
  "soup toppings",
  "treat toppings",
  "salad condiments",
  "condiments",
  "sauces",
  "side",
  "breakfast sides",
  "breakfast rolls",
] as const;
