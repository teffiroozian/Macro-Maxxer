import { getDefaultIngredientCounts } from "@/lib/menuItemCalculations";
import type { ResolvedPanelIngredient } from "@/components/ItemDetailsPanel";

export function formatIngredientCountCustomizationLabel(ingredientName: string, count: number) {
  return count === 0 ? `${ingredientName}: Removed` : `${ingredientName}: ${count}x`;
}

export function getSelectedIngredientCountsFromCustomizations(
  resolvedIngredients: ResolvedPanelIngredient[],
  customizations: string[] | undefined
) {
  const baseCounts = getDefaultIngredientCounts(resolvedIngredients);

  if (!customizations || customizations.length === 0) {
    return baseCounts;
  }

  const ingredientLookup = new Map<string, string>();
  const ingredientById = new Map<string, ResolvedPanelIngredient>();
  resolvedIngredients.forEach((ingredient) => {
    ingredientLookup.set(ingredient.id.trim().toLowerCase(), ingredient.id);
    ingredientLookup.set(ingredient.label.trim().toLowerCase(), ingredient.id);
    ingredientById.set(ingredient.id, ingredient);
  });

  const customizedIngredientIds = new Set<string>();
  const parsedCounts = customizations.reduce<Record<string, number>>((acc, label) => {
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

  return parsedCounts;
}
