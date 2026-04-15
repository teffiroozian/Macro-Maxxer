import type {
  ChipotleBuildConfiguration,
  ChipotleEntreeId,
  ChipotleTacoShell,
} from "@/lib/chipotleBuild";
import type { IngredientItem, MenuItem } from "@/types/menu";
import { parseIncludedIngredientEntry } from "@/lib/itemIngredients";

function resolveHighProteinEntree(item: MenuItem): ChipotleEntreeId {
  const id = (item.id ?? "").toLowerCase();
  if (id.includes("burrito")) return "burrito";
  if (id.includes("taco")) return "tacos";
  return "bowl";
}

function resolveHighProteinTacoShell(item: MenuItem): ChipotleTacoShell {
  const ingredients = item.ingredients ?? [];
  return ingredients.some((entry) => entry.toLowerCase().startsWith("soft-flour-tortilla"))
    ? "soft"
    : "crispy";
}

export function isChipotleHighProteinMenuItem(item: MenuItem, restaurantId: string) {
  return restaurantId === "chipotle" && item.entreeGroup === "high-protein-menu";
}

function getProteinIngredientIds(ingredientItems: IngredientItem[] = []) {
  return new Set(
    ingredientItems
      .filter((ingredient) => {
        const categories = ingredient.categories ?? (ingredient.category ? [ingredient.category] : []);
        return categories.some((category) => category.trim().toLowerCase() === "proteins");
      })
      .map((ingredient) => (ingredient.id ?? ingredient.name).toLowerCase())
  );
}

export function buildHighProteinBuildConfiguration(
  item: MenuItem,
  ingredientItems: IngredientItem[] = []
): ChipotleBuildConfiguration {
  const highProteinEntree = resolveHighProteinEntree(item);
  const selectedIngredientItems = (item.ingredients ?? []).reduce<Record<string, { quantity: number }>>(
    (acc, entry) => {
      const parsed = parseIncludedIngredientEntry(entry);
      if (!parsed || parsed.defaultCount <= 0) return acc;
      acc[parsed.ingredientId] = { quantity: parsed.defaultCount };
      return acc;
    },
    {}
  );
  const proteinIngredientIds = getProteinIngredientIds(ingredientItems);
  const selectedProteinEntries = Object.entries(selectedIngredientItems)
    .filter(([ingredientId]) => proteinIngredientIds.has(ingredientId.toLowerCase()));
  const shouldUseDoubleProteinMode =
    selectedProteinEntries.length === 1 && selectedProteinEntries[0][1].quantity >= 2;
  const shouldForceSingleProteinForTacos =
    highProteinEntree === "tacos" && selectedProteinEntries.length === 1 && selectedProteinEntries[0][1].quantity >= 2;

  if (shouldUseDoubleProteinMode || shouldForceSingleProteinForTacos) {
    const [proteinIngredientId] = selectedProteinEntries[0];
    selectedIngredientItems[proteinIngredientId] = { quantity: 1 };
  }

  return {
    selectedEntree: highProteinEntree,
    selectedIngredientItems,
    selectedIngredientVariantIds: {},
    proteinPortionMode: shouldUseDoubleProteinMode && !shouldForceSingleProteinForTacos ? "double" : "normal",
    splitPortionModeById: {},
    selectedTacoShell: resolveHighProteinTacoShell(item),
    selectedTacoCount: 1,
    selectedKidsMeal: "build-your-own",
  };
}
