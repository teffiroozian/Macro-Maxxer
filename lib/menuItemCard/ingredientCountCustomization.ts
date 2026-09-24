import { getDefaultIngredientCounts } from "@/lib/menuItemCalculations";
import type { ResolvedPanelIngredient } from "@/lib/itemDetails/types";
import type { CartCustomization } from "@/types/cart";
import type { MenuItem, RestaurantCustomizationRules } from "@/types/menu";
import { resolveIngredientCategoryRule, resolveItemCustomization } from "@/lib/ingredientTabs";

export function incrementIngredientCountWithinCategoryLimit({
  ingredientId,
  resolvedIngredients,
  ingredientCounts,
  categoryMaxQuantity,
}: {
  ingredientId: string;
  resolvedIngredients: ResolvedPanelIngredient[];
  ingredientCounts: Record<string, number>;
  categoryMaxQuantity?: number;
}) {
  const ingredient = resolvedIngredients.find((candidate) => candidate.id === ingredientId);
  if (!ingredient || typeof ingredient.maxQuantity !== "number") return ingredientCounts;
  const current = ingredientCounts[ingredientId] ?? ingredient.defaultCount;
  if (current >= ingredient.maxQuantity) return ingredientCounts;
  if (typeof categoryMaxQuantity === "number" && ingredient.tabLabel) {
    const categoryTotal = resolvedIngredients
      .filter((candidate) => candidate.tabLabel === ingredient.tabLabel && !candidate.isNoneOption)
      .reduce((sum, candidate) => sum + (ingredientCounts[candidate.id] ?? candidate.defaultCount), 0);
    if (categoryTotal >= categoryMaxQuantity) return ingredientCounts;
  }
  return { ...ingredientCounts, [ingredientId]: current + 1 };
}

export function formatIngredientCountCustomizationLabel(ingredientName: string, count: number) {
  return count === 0 ? `${ingredientName}: Removed` : `${ingredientName}: ${count}x`;
}

export function getSelectedIngredientCountsFromCustomizations(
  resolvedIngredients: ResolvedPanelIngredient[],
  customizations: string[] | undefined,
  structuredCustomizations?: CartCustomization[],
) {
  const baseCounts = getDefaultIngredientCounts(resolvedIngredients);

  if ((!customizations || customizations.length === 0) && !structuredCustomizations?.length) {
    return baseCounts;
  }

  const ingredientLookup = new Map<string, string>();
  const ingredientById = new Map<string, ResolvedPanelIngredient>();
  resolvedIngredients.forEach((ingredient) => {
    ingredientLookup.set(ingredient.id.trim().toLowerCase(), ingredient.id);
    ingredientLookup.set(ingredient.label.trim().toLowerCase(), ingredient.id);
    ingredientById.set(ingredient.id, ingredient);
  });

  const hasStructuredIngredientSelections = structuredCustomizations?.some(
    (customization) => customization.kind === "ingredient" && Boolean(customization.ingredientId),
  );
  const customizedIngredientIds = new Set<string>();
  const parsedCounts = (hasStructuredIngredientSelections ? [] : customizations ?? []).reduce<Record<string, number>>((acc, label) => {
    const match = label.match(/^(.*?):\s*(Removed|(\d+(?:\.\d+)?)x|Remove|Extra)$/i);
    if (!match) return acc;

    const ingredientKey = match[1].trim().toLowerCase();
    const ingredientId = ingredientLookup.get(ingredientKey);
    if (!ingredientId || !(ingredientId in baseCounts)) return acc;

    const rawValue = match[2].trim().toLowerCase();
    const nextCount =
      rawValue === "removed" || rawValue === "remove"
        ? 0
        : rawValue === "extra"
          ? 2
          : Number.parseFloat(match[3] ?? "");

    if (!Number.isFinite(nextCount)) return acc;

    acc[ingredientId] = nextCount;
    customizedIngredientIds.add(ingredientId);
    return acc;
  }, { ...baseCounts });

  const ingredientsByTab = resolvedIngredients.reduce<Map<string, ResolvedPanelIngredient[]>>((acc, ingredient) => {
    const tabLabel = ingredient.tabLabel?.trim();
    if (!tabLabel) return acc;

    const tabIngredients = acc.get(tabLabel) ?? [];
    tabIngredients.push(ingredient);
    acc.set(tabLabel, tabIngredients);
    return acc;
  }, new Map());

  ingredientsByTab.forEach((tabIngredients) => {
    const noneOption = tabIngredients.find((ingredient) => ingredient.isNoneOption);
    if (!noneOption) return;

    const customizedIngredientsInTab = tabIngredients.filter((ingredient) => customizedIngredientIds.has(ingredient.id));
    if (customizedIngredientsInTab.length === 0) return;

    const selectedIngredient = [...customizedIngredientsInTab]
      .reverse()
      .find((ingredient) => (parsedCounts[ingredient.id] ?? ingredientById.get(ingredient.id)?.defaultCount ?? 0) > 0);

    if (selectedIngredient) {
      tabIngredients.forEach((ingredient) => {
        parsedCounts[ingredient.id] = ingredient.id === selectedIngredient.id ? 1 : 0;
      });
      return;
    }

    tabIngredients.forEach((ingredient) => {
      parsedCounts[ingredient.id] = ingredient.id === noneOption.id ? 1 : 0;
    });
  });

  for (const customization of structuredCustomizations ?? []) {
    if (customization.kind !== "ingredient" || !customization.ingredientId) continue;
    if (!ingredientById.has(customization.ingredientId)) continue;
    parsedCounts[customization.ingredientId] = customization.quantity ?? 1;
  }

  return parsedCounts;
}

export function areRequiredIngredientSelectionsComplete({
  item,
  selectedVariantId,
  resolvedIngredients,
  ingredientCounts,
  customizationRules,
}: {
  item: MenuItem;
  selectedVariantId?: string;
  resolvedIngredients: ResolvedPanelIngredient[];
  ingredientCounts: Record<string, number>;
  customizationRules?: RestaurantCustomizationRules;
}) {
  const customization = resolveItemCustomization(item, selectedVariantId);
  return (customization?.ingredientCategories ?? []).every((category) => {
    const rule = resolveIngredientCategoryRule(
      category.name,
      customizationRules,
      { ...item, customization },
    );
    const minimum = rule?.minQuantity ?? 0;
    if (minimum <= 0) return true;
    const selected = resolvedIngredients
      .filter((ingredient) => ingredient.tabLabel === category.name)
      .reduce((sum, ingredient) => sum + (ingredientCounts[ingredient.id] ?? ingredient.defaultCount), 0);
    return selected >= minimum;
  });
}
