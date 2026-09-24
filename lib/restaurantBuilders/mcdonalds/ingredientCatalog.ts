import type { IngredientItem } from "@/types/menu";

const COMPONENT_ID_PATTERN = /(?:mcd-component-|component-)(\d+)(?:-x(\d+))?$/;

const CANONICAL_NAME_BY_COMPONENT_ID: Record<string, string> = {
  "300038": "100% Beef Patty",
  "301574": "Quarter Pound 100% Beef Patty",
  "301518": "American Cheese",
  "300716": "American Cheese Half Slice",
  "300042": "Pickle",
  "302415": "Crinkle Cut Pickle",
  "301578": "Regular Bun",
  "301516": "Sesame Seed Bun",
  "302402": "Potato Roll",
};

const CATEGORY_BY_COMPONENT_ID: Record<string, string> = {
  "300038": "Protein", "301574": "Protein", "300163": "Protein",
  "300067": "Protein", "300168": "Protein", "300524": "Protein",
  "300694": "Protein", "300777": "Protein", "301462": "Protein",
  "301639": "Protein", "302309": "Protein", "302687": "Protein",
  "301518": "Cheeses", "300716": "Cheeses", "302615": "Cheeses",
  "301516": "Bread", "301533": "Bread", "301578": "Bread",
  "302369": "Bread", "302402": "Bread", "300131": "Bread",
  "300422": "Bread", "300666": "Bread",
};

function componentIdFor(ingredient: IngredientItem) {
  const identity = ingredient.canonicalIngredientId ?? ingredient.id;
  return identity.match(COMPONENT_ID_PATTERN)?.[1] ?? ingredient.id.match(/-component-(\d+)/)?.[1];
}

function normalizedName(name: string) {
  return name.replace(/[®™]/g, "").replace(/\s+/g, " ").trim().toLocaleLowerCase("en-US");
}

function baconPortionKey(ingredient: IngredientItem) {
  const calories = ingredient.nutrition?.calories ?? 0;
  return calories >= 90 ? "three-half-strips" : "two-half-strips";
}

function logicalIngredientKey(ingredient: IngredientItem) {
  const componentId = componentIdFor(ingredient);
  if (componentId === "300163") return `component:${componentId}:${baconPortionKey(ingredient)}`;
  if (componentId === "300716") return "component:american-cheese-half-slice";
  if (componentId === "301407" && /(?:-x2|2 tomato slices)/i.test(`${ingredient.canonicalIngredientId ?? ""} ${ingredient.name}`)) {
    return "component:tomato-two-slices";
  }
  // The sandwich and Snack Wrap captures use different component ids for
  // the same customer-facing ranch sauce. They share official artwork and
  // logical product identity in the ingredient catalog.
  if (componentId === "204161" || componentId === "302502") return "component:mccrispy-ranch-sauce";
  if (componentId) return `component:${componentId}`;
  if (ingredient.canonicalIngredientId) return `canonical:${ingredient.canonicalIngredientId}`;
  return `name:${normalizedName(ingredient.name)}`;
}

function imageScore(image?: string) {
  if (!image) return 0;
  let score = image.includes("s7d1.scene7.com/is/image/mcdonalds/") ? 100 : 10;
  if (/1564x1564|DC_Ingredient|DC_202/i.test(image)) score += 20;
  if (/180x180/i.test(image)) score -= 5;
  return score;
}

function representativeScore(ingredient: IngredientItem) {
  const nutrition = ingredient.nutrition;
  const completeMacros = nutrition && [nutrition.calories, nutrition.protein, nutrition.carbs, nutrition.totalFat]
    .every((value) => Number.isFinite(value));
  return imageScore(ingredient.image) +
    (completeMacros ? 10 : 0) +
    (ingredient.id.startsWith("mcd-breakfast-") ? 5 : 0) -
    ingredient.defaultOrder / 1_000_000;
}

function canonicalPresentation(ingredient: IngredientItem): IngredientItem {
  const componentId = componentIdFor(ingredient);
  const baconPortion = componentId === "300163" ? baconPortionKey(ingredient) : undefined;
  const name = baconPortion
    ? (baconPortion === "three-half-strips" ? "Bacon (3 Half Strips)" : "Bacon (2 Half Strips)")
    : CANONICAL_NAME_BY_COMPONENT_ID[componentId ?? ""] ?? ingredient.name.replace(/[®™]/g, "").trim();
  const category = CATEGORY_BY_COMPONENT_ID[componentId ?? ""] ?? ingredient.categories[0];
  return {
    ...ingredient,
    ingredientViewName: name,
    ingredientViewImage: ingredient.image,
    ingredientViewCategories: category ? [category] : ingredient.categories,
  };
}

/**
 * Keeps every parent-specific record addressable while exposing one best
 * representative per logical ingredient in the Ingredients view.
 */
export function applyMcDonaldsIngredientCatalogPresentation(source: IngredientItem[]): IngredientItem[] {
  const isInternalSentinel = (ingredient: IngredientItem) =>
    ingredient.canonicalIngredientId === "mcd-no-sauce" || normalizedName(ingredient.name) === "no sauce";
  const visibleCandidates = source.filter((ingredient) => !ingredient.hideFromIngredientView && !isInternalSentinel(ingredient));
  const groups = Map.groupBy(visibleCandidates, logicalIngredientKey);
  const representativeIds = new Set(
    [...groups.values()].map((group) => [...group].sort((left, right) =>
      representativeScore(right) - representativeScore(left) ||
      left.defaultOrder - right.defaultOrder ||
      left.id.localeCompare(right.id)
    )[0].id),
  );

  return source.map((ingredient) => {
    if (isInternalSentinel(ingredient)) return { ...ingredient, hideFromIngredientView: true };
    if (ingredient.hideFromIngredientView) return ingredient;
    if (!representativeIds.has(ingredient.id)) return { ...ingredient, hideFromIngredientView: true };
    return canonicalPresentation(ingredient);
  });
}
