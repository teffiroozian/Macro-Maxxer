import type {
  ChipotleBuildConfiguration,
  ChipotleEntreeId,
  ChipotleTacoShell,
} from "@/lib/restaurantBuilders/chipotle";
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

export function isChipotleProteinCupItem(item: MenuItem, restaurantId: string) {
  return (
    isChipotleHighProteinMenuItem(item, restaurantId) &&
    item.categories.some((category) => category.toLowerCase() === "protein cups")
  );
}

// Editable High Protein Meals (e.g. bowls/burritos/tacos) are built from a
// configured ingredient list, so their real nutrition comes from summing
// those ingredients. Protein Cups share the same entreeGroup but are single
// pre-portioned items with their own authored nutrition in JSON and no
// ingredients array to sum — they must never take the ingredient-based path.
export function isChipotleEditablePresetBuildItem(item: MenuItem, restaurantId: string) {
  return (
    isChipotleHighProteinMenuItem(item, restaurantId) &&
    !isChipotleProteinCupItem(item, restaurantId) &&
    (item.ingredients?.length ?? 0) > 0
  );
}

function getProteinIngredientIds(ingredientItems: IngredientItem[] = []) {
  return new Set(
    ingredientItems
      .filter((ingredient) => {
        const categories = ingredient.categories;
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
