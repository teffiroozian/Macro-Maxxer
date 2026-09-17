import generatedRestaurant from "@/data/restaurants/chick-fil-a/generated/restaurant.json";
import type { IngredientItem, MenuItem, RestaurantMenu } from "@/types/menu";

export const CHICKFILA_INGREDIENT_CATEGORY_ORDER = [
  "Proteins",
  "Buns & Bread",
  "Cheese",
  "Toppings",
  "Salad & Fruit Toppings",
  "Milk & Creamers",
  "Syrups & Sweeteners",
  "Dessert Toppings & Mix-ins",
] as const;

type ChickfilaIngredientCategory = (typeof CHICKFILA_INGREDIENT_CATEGORY_ORDER)[number];

const SOURCE_GROUP_SUFFIX = / \[CFA [^\]]+\]$/;

function sourceGroupName(name: string) {
  return name.replace(SOURCE_GROUP_SUFFIX, "");
}

function buildIngredientSourceGroups(items: MenuItem[]) {
  const groupsByIngredient = new Map<string, Set<string>>();

  items.forEach((item) => {
    item.customization?.ingredientCategories?.forEach((group) => {
      const groupName = sourceGroupName(group.name);
      group.ingredients?.forEach((ingredientId) => {
        const groups = groupsByIngredient.get(ingredientId) ?? new Set<string>();
        groups.add(groupName);
        groupsByIngredient.set(ingredientId, groups);
      });
    });
  });

  return groupsByIngredient;
}

function hasAnyGroup(groups: Set<string>, names: readonly string[]) {
  return names.some((name) => groups.has(name));
}

// The source groups describe actions in an ordering flow (paid, remove,
// extra), not browse taxonomy. Precedence resolves ingredients that occur in
// several flows to one stable browse category without exposing those raw
// operational names in the UI.
function canonicalIngredientCategory(groups: Set<string>): ChickfilaIngredientCategory | undefined {
  if (hasAnyGroup(groups, ["Bread Carriers", "Breakfast Bread Carriers"])) {
    return "Buns & Bread";
  }
  if (hasAnyGroup(groups, ["Cheese", "Shredded Cheese Group"])) {
    return "Cheese";
  }
  if (groups.has("Extra Salad Proteins")) {
    return "Proteins";
  }
  if (hasAnyGroup(groups, ["Coffee Removals", "Creamers"])) {
    return "Milk & Creamers";
  }
  if (hasAnyGroup(groups, ["Sweeteners", "Syrup Extra", "Syrup Removal", "Tea & Lemonade Modifiers", "Individual Sauces"])) {
    return "Syrups & Sweeteners";
  }
  if (hasAnyGroup(groups, ["Parfait Modifiers", "Icedream Modifiers", "Inclusions Removal", "Milkshake Modifiers"])) {
    return "Dessert Toppings & Mix-ins";
  }
  if (groups.has("Parfait Fruit Modifier") || groups.has("Paid Salad Toppings")) {
    return "Salad & Fruit Toppings";
  }
  if (hasAnyGroup(groups, ["Add Pickles Mod", "Sandwich Paid Modifiers", "Sandwich Remove Modifiers"])) {
    return "Toppings";
  }
  if (hasAnyGroup(groups, ["Breakfast Removal", "Breakfast Sandwich Modifiers"])) {
    return "Proteins";
  }
}

const sourceMenu = generatedRestaurant as unknown as RestaurantMenu;
const sourceItems = sourceMenu.items ?? [];
const sourceGroupsByIngredient = buildIngredientSourceGroups(sourceItems);

const ingredients = (sourceMenu.ingredients ?? []).map((ingredient): IngredientItem => {
  const category = canonicalIngredientCategory(
    sourceGroupsByIngredient.get(ingredient.id) ?? new Set<string>(),
  );

  return category ? { ...ingredient, categories: [category] } : ingredient;
});

export const CHICKFILA_GENERATED_RUNTIME_MENU: RestaurantMenu = {
  ...sourceMenu,
  ingredients,
};
