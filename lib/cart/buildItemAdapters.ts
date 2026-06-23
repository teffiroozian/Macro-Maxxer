import { fromUniversalChipotleBuildConfiguration } from "@/lib/restaurantBuilders/chipotle/cartAdapter";
import type { CartItem } from "@/types/cart";
import type { IngredientItem, MenuItem } from "@/types/menu";

function toTitleCase(value: string) {
  return value.replace(/[-_]+/g, " ").trim().replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeIngredientKey(value: string) {
  return value.trim().toLowerCase();
}

function getBuildConfiguration(cartItem: CartItem) {
  return cartItem.selection.type === "build-your-own" ? cartItem.selection.buildConfiguration : null;
}

function getChipotleBuildConfiguration(cartItem: CartItem) {
  const configuration = getBuildConfiguration(cartItem);
  return configuration ? fromUniversalChipotleBuildConfiguration(configuration) : null;
}

function buildCartFallbackMenuItem(cartItem: CartItem): MenuItem {
  return {
    id: cartItem.itemId,
    name: cartItem.name,
    image: cartItem.image ?? "",
    defaultOrder: 0,
    categories: ["Cart"],
    servingType: "single",
    nutrition: {
      calories: cartItem.macrosPerItem.calories,
      protein: cartItem.macrosPerItem.protein,
      carbs: cartItem.macrosPerItem.carbs,
      totalFat: cartItem.macrosPerItem.totalFat,
    },
  };
}

function buildChipotleBuildYourOwnMenuItem(cartItem: CartItem, ingredientItems?: IngredientItem[]): MenuItem {
  const ingredientCatalog = ingredientItems ?? [];
  const configuration = getChipotleBuildConfiguration(cartItem);
  const selectedIngredientIds = Object.entries(configuration?.selectedIngredientItems ?? {})
    .filter(([, selection]) => selection.quantity > 0)
    .map(([ingredientId]) => ingredientId);

  const ingredientOptionsByCategory = ingredientCatalog.reduce<Record<string, string[]>>((acc, ingredient) => {
    const ingredientId = ingredient.id ?? ingredient.name;
    const tabName = toTitleCase((ingredient.categories[0] ?? "Ingredients").trim());
    acc[tabName] = [...(acc[tabName] ?? []), ingredientId];
    return acc;
  }, {});

  const categoryNames = Object.keys(ingredientOptionsByCategory);
  const singleSelectCategories = ["Proteins", "Rice", "Beans", "Shell"].filter((tabName) =>
    categoryNames.some((candidate) => normalizeIngredientKey(candidate) === normalizeIngredientKey(tabName))
  );

  return {
    ...buildCartFallbackMenuItem(cartItem),
    ingredients: selectedIngredientIds,
    customization: {
      ingredientCategories: categoryNames.map((categoryName) => ({
        name: categoryName,
        ingredients: ingredientOptionsByCategory[categoryName],
        allowNone: singleSelectCategories.some(
          (candidate) => normalizeIngredientKey(candidate) === normalizeIngredientKey(categoryName)
        ),
      })),
    },
  };
}

export function getIncludedIngredientIdsForChipotleBuild(cartItem: CartItem) {
  if (cartItem.restaurantId !== "chipotle" || cartItem.selection.type !== "build-your-own") {
    return [] as string[];
  }

  const configuration = fromUniversalChipotleBuildConfiguration(cartItem.selection.buildConfiguration);

  if (configuration.selectedEntree === "burrito") return ["tortilla"];
  if (configuration.selectedEntree === "quesadilla") return ["tortilla", "cheese"];
  if (configuration.selectedEntree === "salad") return ["romaine-lettuce"];
  if (configuration.selectedEntree === "tacos") {
    return [configuration.selectedTacoShell === "crispy" ? "crispy-corn-tortilla" : "soft-flour-tortilla"];
  }
  if (configuration.selectedEntree === "kids-meal" && configuration.selectedKidsMeal === "quesadilla") {
    return ["soft-flour-tortilla", "cheese"];
  }

  return [];
}

export function getBuildIngredientCountCustomizations(cartItem: CartItem, ingredientItems?: IngredientItem[]) {
  if (cartItem.restaurantId !== "chipotle" || cartItem.selection.type !== "build-your-own") {
    return cartItem.customizations;
  }

  const ingredientNameLookup = new Map<string, string>();
  (ingredientItems ?? []).forEach((ingredient) => {
    const ingredientId = ingredient.id ?? ingredient.name;
    ingredientNameLookup.set(normalizeIngredientKey(ingredientId), ingredient.name);
  });

  const configuration = fromUniversalChipotleBuildConfiguration(cartItem.selection.buildConfiguration);
  const labels = Object.entries(configuration.selectedIngredientItems)
    .filter(([, selection]) => selection.quantity > 1)
    .map(([ingredientId, selection]) => {
      const ingredientLabel = ingredientNameLookup.get(normalizeIngredientKey(ingredientId)) ?? toTitleCase(ingredientId);
      return `${ingredientLabel}: ${selection.quantity}x`;
    });

  return labels.length > 0 ? labels : undefined;
}

export function buildCartMenuItemFromState(cartItem: CartItem, sourceItem: MenuItem | null, ingredientItems?: IngredientItem[]) {
  if (sourceItem) return sourceItem;
  if (cartItem.restaurantId === "chipotle" && cartItem.selection.type === "build-your-own") {
    return buildChipotleBuildYourOwnMenuItem(cartItem, ingredientItems);
  }
  return buildCartFallbackMenuItem(cartItem);
}
