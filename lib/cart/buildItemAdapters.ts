import type { CartItem } from "@/stores/cartStore";
import type { IngredientItem, MenuItem } from "@/types/menu";

function toTitleCase(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeIngredientKey(value: string) {
  return value.trim().toLowerCase();
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
  const selectedIngredientIds = Object.entries(cartItem.buildConfiguration?.selectedIngredientItems ?? {})
    .filter(([, selection]) => selection.quantity > 0)
    .map(([ingredientId]) => ingredientId);

  const ingredientOptionsByCategory = ingredientCatalog.reduce<Record<string, string[]>>((acc, ingredient) => {
    const ingredientId = ingredient.id ?? ingredient.name;
    const tabName = toTitleCase((ingredient.categories[0] ?? "Ingredients").trim());

    if (!acc[tabName]) {
      acc[tabName] = [];
    }

    acc[tabName].push(ingredientId);
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
      ingredientCategories: categoryNames.map((categoryName) => {
        const allowNone = singleSelectCategories.some(
          (candidate) => normalizeIngredientKey(candidate) === normalizeIngredientKey(categoryName)
        );

        return {
          name: categoryName,
          ingredients: ingredientOptionsByCategory[categoryName],
          ...(allowNone ? { allowNone: true } : {}),
        };
      }),
    },
  };
}

export function getIncludedIngredientIdsForChipotleBuild(cartItem: CartItem) {
  if (cartItem.restaurantId !== "chipotle" || !cartItem.buildConfiguration) {
    return [] as string[];
  }

  const configuration = cartItem.buildConfiguration;

  if (configuration.selectedEntree === "burrito") {
    return ["tortilla"];
  }

  if (configuration.selectedEntree === "quesadilla") {
    return ["tortilla", "cheese"];
  }

  if (configuration.selectedEntree === "salad") {
    return ["romaine-lettuce"];
  }

  if (configuration.selectedEntree === "tacos") {
    return [configuration.selectedTacoShell === "crispy" ? "crispy-corn-tortilla" : "soft-flour-tortilla"];
  }

  if (configuration.selectedEntree === "kids-meal" && configuration.selectedKidsMeal === "quesadilla") {
    return ["soft-flour-tortilla", "cheese"];
  }

  return [];
}

export function getBuildIngredientCountCustomizations(cartItem: CartItem, ingredientItems?: IngredientItem[]) {
  if (cartItem.restaurantId !== "chipotle" || !cartItem.buildConfiguration?.selectedIngredientItems) {
    return cartItem.customizations;
  }

  const ingredientNameLookup = new Map<string, string>();
  (ingredientItems ?? []).forEach((ingredient) => {
    const ingredientId = ingredient.id ?? ingredient.name;
    ingredientNameLookup.set(normalizeIngredientKey(ingredientId), ingredient.name);
  });

  const labels = Object.entries(cartItem.buildConfiguration.selectedIngredientItems)
    .filter(([, selection]) => selection.quantity > 1)
    .map(([ingredientId, selection]) => {
      const ingredientLabel = ingredientNameLookup.get(normalizeIngredientKey(ingredientId)) ?? toTitleCase(ingredientId);
      return `${ingredientLabel}: ${selection.quantity}x`;
    });

  return labels.length > 0 ? labels : undefined;
}

export function buildCartMenuItemFromState(cartItem: CartItem, sourceItem: MenuItem | null, ingredientItems?: IngredientItem[]) {
  if (sourceItem) {
    return sourceItem;
  }

  if (cartItem.restaurantId === "chipotle" && cartItem.buildConfiguration) {
    return buildChipotleBuildYourOwnMenuItem(cartItem, ingredientItems);
  }

  return buildCartFallbackMenuItem(cartItem);
}
