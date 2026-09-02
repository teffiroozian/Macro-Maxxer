import type {
  ChipotleBuildConfiguration,
  ChipotleEntreeId,
  ChipotleTacoShell,
} from "@/lib/restaurantBuilders/chipotle";
import type { IngredientItem, MenuItem } from "@/types/menu";
import { parseIncludedIngredientEntry } from "@/lib/itemIngredients";
import {
  chipotleBrowseCategoriesForCompatibleId,
  chipotlePresentationGroupForCompatibleId,
} from "@/data/restaurants/chipotle-generated-presentation";

function resolveGeneratedBuildBaseItemId(item: MenuItem) {
  const value = item.source?.generated?.menu.buildBaseItemId;
  return typeof value === "string" ? value.toLowerCase() : "";
}

function resolveHighProteinEntree(item: MenuItem): ChipotleEntreeId {
  const baseItemId = resolveGeneratedBuildBaseItemId(item);
  if (baseItemId.includes("kids-")) return "kids-meal";
  if (baseItemId.includes("burrito")) return "burrito";
  if (baseItemId.includes("quesadilla")) return "quesadilla";
  if (baseItemId.includes("salad")) return "salad";
  if (baseItemId.includes("taco")) return "tacos";

  // Compatibility fallback for the former hand-authored preset IDs.
  const id = (item.id ?? "").toLowerCase();
  if (id.includes("burrito")) return "burrito";
  if (id.includes("taco")) return "tacos";
  return "bowl";
}

function resolveHighProteinTacoShell(item: MenuItem): ChipotleTacoShell {
  const ingredients = item.ingredients ?? [];
  return ingredients.some((entry) => entry.toLowerCase().includes("soft-flour-tortilla"))
    ? "soft"
    : "crispy";
}

export function isChipotleHighProteinMenuItem(item: MenuItem, restaurantId: string) {
  return (
    restaurantId === "chipotle" &&
    chipotlePresentationGroupForCompatibleId(item.id) === "high-protein-menu"
  );
}

export function isChipotleProteinCupItem(item: MenuItem, restaurantId: string) {
  return (
    isChipotleHighProteinMenuItem(item, restaurantId) &&
    chipotleBrowseCategoriesForCompatibleId(item.id).includes("Protein Cups")
  );
}

// Editable High Protein Meals (e.g. bowls/burritos/tacos) are built from a
// configured ingredient list, so their real nutrition comes from summing
// those ingredients. Protein Cups share the same presentation navigation
// group but are single pre-portioned items with their own nutrition and no
// ingredients array to sum — they must never take the ingredient-based path.
export function isChipotleEditablePresetBuildItem(item: MenuItem, restaurantId: string) {
  return (
    isChipotleHighProteinMenuItem(item, restaurantId) &&
    !isChipotleProteinCupItem(item, restaurantId) &&
    (item.ingredients?.length ?? 0) > 0
  );
}

// Protein Meals (the "Josh Hart's High Protein Burrito" style cards) use
// wide 3:2 editorial photography — food composited alongside an athlete
// portrait — unlike every other Chipotle image (near-square product shots),
// including this group's own Protein Cups. Squeezed into the app's square
// image boxes with plain object-contain, that composition reads as tiny and
// letterboxed; a naive centered object-cover crop instead cuts into either
// the food or the athlete's face. This flag isolates exactly that artwork so
// its object-fit/position treatment (see CHIPOTLE_PRESET_MEAL_IMAGE_CLASSNAME)
// never touches normal item/ingredient images or Protein Cups.
export function isChipotleHighProteinPresetMealArtwork(item: MenuItem, restaurantId: string) {
  return (
    isChipotleHighProteinMenuItem(item, restaurantId) &&
    !isChipotleProteinCupItem(item, restaurantId)
  );
}

// Shared object-fit/object-position pair for preset-meal editorial images.
// The 3:2 source is wider than every container it renders in, so cover only
// ever crops horizontally (full height always survives) — object-[60%_50%]
// biases that horizontal crop right-of-center to favor the athlete's face
// (explicitly the thing to protect from awkward cropping) while still
// keeping most of the food composition on the left in frame.
export const CHIPOTLE_PRESET_MEAL_IMAGE_CLASSNAME = "object-cover object-[60%_50%]";

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
    selectedTacoCount: resolveGeneratedBuildBaseItemId(item).includes("tacos-3") ? 3 : 1,
    selectedKidsMeal: resolveGeneratedBuildBaseItemId(item).includes("kids-quesadilla")
      ? "quesadilla"
      : "build-your-own",
  };
}
