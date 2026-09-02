import type { IngredientItem, MenuItem } from "@/types/menu";
import { resolveEffectiveIngredientNutrition } from "@/lib/ingredientNutrition";
import {
  normalizeIngredientCategory,
  scaleNutritionValues,
  type ChipotleBuilderConfig,
  type ChipotleEntreeSelection,
  type ChipotleKidsMealId,
} from "@/lib/restaurantBuilders/chipotle";

// chipotle-cmg-4026's generated name ("Double Wrap with Tortilla") only
// describes what selecting it means on a Burrito (an extra tortilla on top
// of the burrito's own wrap) — everywhere else it's rendered (Quesadilla's
// included base, the entree-agnostic "View All Ingredients" comparison) it
// is just the plain tortilla component, so those get the generic label and
// only the Burrito's optional-extra context gets the specific one.
// `selectedEntree` omitted (the comparison view has none) always resolves
// to the generic label, matching "no page outside the Burrito optional-
// extra context displays 'Double Wrap with Tortilla'". Exported so cart/
// build-summary rendering (lib/cart/cartItemLookup.ts), which re-resolves a
// persisted build's ingredients against the live catalog rather than
// through the builder view, applies the exact same contextual label instead
// of duplicating this mapping.
export function resolveChipotleIngredientDisplayName(
  ingredient: { id: string; name: string },
  builderConfig: ChipotleBuilderConfig | undefined,
  selectedEntree?: ChipotleEntreeSelection,
): string {
  const tortillaSideIngredientId = builderConfig?.chipotle?.tortillaSideIngredientId;
  if (!tortillaSideIngredientId || ingredient.id !== tortillaSideIngredientId) {
    return ingredient.name;
  }
  const entreeLabel = selectedEntree
    ? builderConfig?.chipotle?.tortillaSideLabelByEntree?.[selectedEntree]
    : undefined;
  return (
    entreeLabel ??
    builderConfig?.chipotle?.tortillaSideGenericLabel ??
    ingredient.name
  );
}

// View All Ingredients only: several official Chipotle tortilla records are
// the exact same product at different serving contexts (1 Taco / 3 Tacos /
// Kids), generated as separate ids because the per-entree builder needs to
// pick the right one for the current build. That distinction is meaningless
// for an entree-agnostic browse/compare card, so this presentation-only
// grouping folds each family's context records into one card exposed as
// selectable variants — the generated ids/nutrition underneath are untouched
// and still drive the actual builder via buildChipotleIngredientMenuItems.
// Reused below for a handful of Toppings that have the same "one real
// product, several generated context ids" shape.
type ContextVariantFamilyMember = { id: string; label: string };
type ContextVariantFamily = { primaryId: string; variants: ContextVariantFamilyMember[] };

const CHIPOTLE_ALL_INGREDIENTS_TORTILLA_FAMILIES: ContextVariantFamily[] = [
  {
    primaryId: "chipotle-tortilla-crispy-corn-taco",
    variants: [
      { id: "chipotle-tortilla-crispy-corn-taco", label: "1 Taco" },
      // chipotle-cmg-5403 is the official 2-tortilla Kids serving, which is
      // nutritionally the "2 tacos" quantity — labeled consistently with
      // its 1/3-taco siblings rather than as a separate "Kids" concept.
      { id: "chipotle-cmg-5403", label: "2 Tacos" },
      { id: "chipotle-tortilla-crispy-corn-tacos-3", label: "3 Tacos" },
    ],
  },
  {
    primaryId: "chipotle-tortilla-soft-flour-taco",
    variants: [
      { id: "chipotle-tortilla-soft-flour-taco", label: "1 Taco" },
      { id: "chipotle-cmg-5404", label: "2 Tacos" },
      { id: "chipotle-tortilla-soft-flour-tacos-3", label: "3 Tacos" },
      // No separate "Kids Quesadilla" variant: Kids Quesadilla's included
      // tortilla now uses this same 1-Taco record's exact macros (see
      // kidsQuesadillaIncludedIngredientIds in generatedRuntimeAdapter.ts),
      // so chipotle-cmg-5401 (the old, less accurate 80-cal record) is
      // retired from this card — see CHIPOTLE_ALL_INGREDIENTS_HIDDEN_DUPLICATE_IDS.
    ],
  },
];
const chipotleAllIngredientsTortillaFamilyByPrimaryId = new Map(
  CHIPOTLE_ALL_INGREDIENTS_TORTILLA_FAMILIES.map((family) => [family.primaryId, family]),
);
const chipotleAllIngredientsTortillaVariantMemberIds = new Set(
  CHIPOTLE_ALL_INGREDIENTS_TORTILLA_FAMILIES.flatMap((family) =>
    family.variants
      .map((variant) => variant.id)
      .filter((id) => id !== family.primaryId),
  ),
);
// chipotle-cmg-4026 ("Double Wrap with Tortilla") and
// chipotle-cmg-4026-burrito-base ("Tortilla") are the identical official
// tortilla under two generated ids (Burrito's optional extra vs. the
// Burrito/Quesadilla included base) — resolveChipotleIngredientDisplayName
// already renders both as the same generic "Tortilla" name here (no
// selectedEntree), so only the base record gets a standalone comparison
// card instead of two duplicate "Tortilla" cards with identical nutrition.
const CHIPOTLE_ALL_INGREDIENTS_HIDDEN_DUPLICATE_IDS = new Set([
  "chipotle-cmg-4026",
  // Superseded by chipotle-tortilla-soft-flour-taco's exact 1-Taco panel
  // (83 cal/3g fat/2g protein/13g carbs) — no longer used anywhere,
  // presentation or builder, so it doesn't get its own duplicate card.
  "chipotle-cmg-5401",
  // Toppings: several of the same real product exist under multiple
  // generated ids because different entrees' own customization lists
  // reference different context records for it. Where every such id
  // shares identical nutrition with the canonical one used by
  // Bowl/Burrito/Salad (the regular builder's own common topping list),
  // only the canonical id gets a card.
  "chipotle-cmg-5301", // Guacamole — identical to chipotle-cmg-1001
  "chipotle-cmg-1207", // Guacamole (single-Taco context) — identical to chipotle-cmg-1001
  "chipotle-cmg-1034", // Queso Blanco (single-Taco context) — identical to chipotle-cmg-1029
  "chipotle-cmg-5354", // Chipotle-Honey Vinaigrette (Quesadilla context) — identical to chipotle-cmg-5353
]);

// Toppings whose *other* generated context id is a real, currently-used
// standard-builder value with genuinely different nutrition (not a
// duplicate — see CHIPOTLE_ALL_INGREDIENTS_HIDDEN_DUPLICATE_IDS above for
// the identical ones) — kept as variants on the one card instead of a
// second duplicate-looking card.
const CHIPOTLE_ALL_INGREDIENTS_TOPPING_FAMILIES: ContextVariantFamily[] = [
  {
    // Queso Blanco: Bowl/Burrito/Salad/Tacos all use the same 120cal
    // standard addon; Quesadilla's own Addons list uses a distinct 240cal
    // record instead.
    primaryId: "chipotle-cmg-1029",
    variants: [
      { id: "chipotle-cmg-1029", label: "Standard" },
      { id: "chipotle-cmg-4134", label: "Quesadilla" },
    ],
  },
  {
    // Cilantro Lime Sauce: Bowl/Burrito/Salad use an 80cal topping;
    // Quesadilla and Tacos/Tacos(3) both use a distinct 160cal addon.
    primaryId: "chipotle-cmg-5412",
    variants: [
      { id: "chipotle-cmg-5412", label: "Standard" },
      { id: "chipotle-cmg-5414", label: "Quesadilla & Tacos" },
    ],
  },
];
const chipotleAllIngredientsToppingFamilyByPrimaryId = new Map(
  CHIPOTLE_ALL_INGREDIENTS_TOPPING_FAMILIES.map((family) => [family.primaryId, family]),
);
const chipotleAllIngredientsToppingVariantMemberIds = new Set(
  CHIPOTLE_ALL_INGREDIENTS_TOPPING_FAMILIES.flatMap((family) =>
    family.variants
      .map((variant) => variant.id)
      .filter((id) => id !== family.primaryId),
  ),
);

// Each real protein's generated primary record already carries its own
// Normal/Half/Extra portion variants, and the per-entree builder also
// generates separate Taco/Kids *context* records so it can pick the right
// one for the current build. On this entree-agnostic comparison page none
// of that belongs on the card as a "variant" — the normal builder's own
// per-entree ingredient tab only ever exposes proteins as a plain
// Normal/Double portion toggle (see isProteinIngredientItem/
// allIngredientsPortionModeOptionsById in ChipotleRestaurantBuilderView),
// so this page matches that: one card per protein, no `variants` array at
// all, with Normal/Double handled by that same portion-multiplier toggle.
// This set only exists to hide the context duplicates from rendering as
// their own separate cards — none of their labels are shown anywhere here.
type ProteinFamily = { primaryId: string; contextDuplicateIds: string[] };

const CHIPOTLE_ALL_INGREDIENTS_PROTEIN_SLUGS = [
  "steak",
  "chicken",
  "carnitas",
  "beef-barbacoa",
  "sofritas",
  "pollo-asado",
];
const CHIPOTLE_ALL_INGREDIENTS_PROTEIN_FAMILIES: ProteinFamily[] =
  CHIPOTLE_ALL_INGREDIENTS_PROTEIN_SLUGS.map((slug) => ({
    primaryId: `chipotle-protein-${slug}`,
    contextDuplicateIds: [
      `chipotle-protein-${slug}-taco`,
      `chipotle-protein-${slug}-tacos-3`,
      `chipotle-protein-${slug}-kids-byo`,
      `chipotle-protein-${slug}-kids-quesadilla`,
    ],
  }));
const chipotleAllIngredientsProteinPrimaryIds = new Set(
  CHIPOTLE_ALL_INGREDIENTS_PROTEIN_FAMILIES.map((family) => family.primaryId),
);
const chipotleAllIngredientsProteinVariantMemberIds = new Set(
  CHIPOTLE_ALL_INGREDIENTS_PROTEIN_FAMILIES.flatMap(
    (family) => family.contextDuplicateIds,
  ),
);
// Kids meal "protein slot" alternatives — a kid can pick Guacamole or Queso
// Blanco instead of a real protein, so the generated data tags them with
// the Proteins category for selection purposes, but they aren't proteins
// and shouldn't appear in the Proteins comparison list.
const CHIPOTLE_ALL_INGREDIENTS_NON_PROTEIN_IDS = new Set([
  "chipotle-protein-guacamole-kids-byo",
  "chipotle-protein-guacamole-kids-quesadilla",
  "chipotle-protein-queso-blanco-kids-byo",
]);

// The full, entree-agnostic ingredient set used by the "View All
// Ingredients" comparison state — every real ingredient (including things
// like taco shells that the per-entree builder above only surfaces when
// they're relevant to the currently selected entree) shown under its real
// category, with base nutrition and no included/locked/portion-multiplier
// logic, since this view is for browsing and comparing, not building.
export function buildAllChipotleIngredientMenuItems({
  restaurantId,
  ingredients,
  builderConfig,
}: {
  restaurantId: string;
  ingredients: IngredientItem[];
  builderConfig?: ChipotleBuilderConfig;
}): MenuItem[] {
  const ingredientsById = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));

  return ingredients
    .filter((ingredient) => !ingredient.hideFromIngredientView)
    // The Side and Beverages presentation categories aren't a useful
    // comparison here (side-portion/drink-container records, not
    // ingredients a build actually customizes) — they stay fully intact in
    // generated/runtime data and the normal builder, just excluded from
    // this page's list, counts, and category navigation.
    .filter((ingredient) => !ingredient.categories?.includes("Side"))
    .filter((ingredient) => !chipotleAllIngredientsTortillaVariantMemberIds.has(ingredient.id))
    .filter((ingredient) => !CHIPOTLE_ALL_INGREDIENTS_HIDDEN_DUPLICATE_IDS.has(ingredient.id))
    .filter((ingredient) => !chipotleAllIngredientsProteinVariantMemberIds.has(ingredient.id))
    .filter((ingredient) => !CHIPOTLE_ALL_INGREDIENTS_NON_PROTEIN_IDS.has(ingredient.id))
    .filter((ingredient) => !chipotleAllIngredientsToppingVariantMemberIds.has(ingredient.id))
    .map((ingredient, index) => {
      const effectiveNutrition = resolveEffectiveIngredientNutrition(ingredient);
      if (!effectiveNutrition) {
        throw new Error(
          `Chipotle ingredient ${ingredient.id} has no effective nutrition.`,
        );
      }
      const ingredientId =
        ingredient.id ??
        `${restaurantId}-ingredient-${ingredient.name}-${index}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-");
      const categories = (
        ingredient.categories?.map((category) => category.trim()).filter(Boolean) ?? []
      ).map((category) => (category === "Included Ingredients" ? "Base" : category));

      const resolveFamilyVariant = (variantDef: ContextVariantFamilyMember) => {
        const source = ingredientsById.get(variantDef.id);
        const sourceNutrition = source && resolveEffectiveIngredientNutrition(source);
        if (!source || !sourceNutrition) {
          throw new Error(
            `Chipotle View All Ingredients card ${ingredientId} references missing ingredient ${variantDef.id}.`,
          );
        }
        return {
          id: variantDef.id,
          label: variantDef.label,
          nutrition: scaleNutritionValues(sourceNutrition, 1),
          image: source.image ?? ingredient.image ?? "",
          categories,
          source: source.source,
        };
      };

      const tortillaFamily = chipotleAllIngredientsTortillaFamilyByPrimaryId.get(ingredientId);
      const toppingFamily = chipotleAllIngredientsToppingFamilyByPrimaryId.get(ingredientId);
      const contextVariantFamily = tortillaFamily ?? toppingFamily;
      const isProteinPrimary = chipotleAllIngredientsProteinPrimaryIds.has(ingredientId);
      const variants = contextVariantFamily
        ? contextVariantFamily.variants.map(resolveFamilyVariant)
        : isProteinPrimary
          ? undefined
          : ingredient.variants;

      const menuItem: MenuItem = {
        id: ingredientId,
        name: resolveChipotleIngredientDisplayName(ingredient, builderConfig),
        nutrition: scaleNutritionValues(effectiveNutrition, 1),
        defaultOrder: ingredient.defaultOrder ?? index,
        variants,
        defaultVariantId: contextVariantFamily
          ? ingredientId
          : isProteinPrimary
            ? undefined
            : ingredient.defaultVariantId,
        hideVariantSelector: true,
        image: ingredient.image ?? "",
        categories: categories.length > 0 ? categories : ["Other"],
        servingType: "addon",
      };
      return menuItem;
    });
}

export type BuildChipotleIngredientMenuItemsOptions = {
  restaurantId: string;
  ingredients: IngredientItem[];
  selectedEntree: ChipotleEntreeSelection;
  selectedTacoCount: 1 | 3;
  selectedKidsMeal: ChipotleKidsMealId;
  selectedIncludedIngredientIds: string[];
  tacoShellIngredientIds: string[];
  getIngredientPortionMultiplier: (ingredientId?: string) => number;
  getSelectedIngredientPortionMultiplier: (ingredientId: string, category: string) => number;
  builderConfig?: ChipotleBuilderConfig;
};

export function buildChipotleIngredientMenuItems({
  restaurantId,
  ingredients,
  selectedEntree,
  selectedTacoCount,
  selectedKidsMeal,
  selectedIncludedIngredientIds,
  tacoShellIngredientIds,
  getIngredientPortionMultiplier,
  getSelectedIngredientPortionMultiplier,
  builderConfig,
}: BuildChipotleIngredientMenuItemsOptions): MenuItem[] {
  const presentationCategory = (ingredient: IngredientItem) => {
    const categories = ingredient.categories.map((category) => category.trim());
    if (categories.some((category) => category.toLowerCase() === "proteins")) {
      return "Proteins";
    }
    if (categories.some((category) => category.toLowerCase() === "rice")) {
      return "Rice";
    }
    if (categories.some((category) => category.toLowerCase() === "beans")) {
      return "Beans";
    }
    if (
      categories.some((category) =>
        // "side" covers ingredients that already arrive pre-mapped to the
        // Side presentation bucket (e.g. the generated runtime adapter's
        // own Tortillas/Beverages -> "Side" mapping) — "tortillas"/
        // "beverages" remain for any caller still passing raw source
        // categories directly.
        ["tortillas", "beverages", "side"].includes(category.toLowerCase()),
      )
    ) {
      return "Side";
    }
    return "Toppings";
  };
  const normalizeIngredientCategories = (ingredient: IngredientItem) => {
    const normalizedCategories =
      ingredient.categories
        ?.map((category) => category.trim())
        .filter(Boolean) ?? [];
    if (normalizedCategories.length > 0) {
      return normalizedCategories;
    }

    return ["Other"];
  };

  const resolveIngredientCategory = (ingredient: IngredientItem) => {
    normalizeIngredientCategories(ingredient);
    return presentationCategory(ingredient);
  };

  const tacoShellIngredientIdsByCount =
    builderConfig?.chipotle?.tacoShellIngredientIdsByCount;
  const adultContextualTacoShellIds = new Set(
    Object.values(tacoShellIngredientIdsByCount ?? {}).flatMap((idsByShell) =>
      Object.values(idsByShell ?? {}).flat(),
    ),
  );
  const selectedAdultTacoShellIds = new Set(
    Object.values(
      tacoShellIngredientIdsByCount?.[selectedTacoCount] ?? {},
    ).flat(),
  );
  const quesadillaTripleCheeseVariantId =
    builderConfig?.chipotle?.specialVariantIds?.quesadillaTripleCheese ??
    "quesadilla-triple-cheese";
  const tortillaSideIngredientId =
    builderConfig?.chipotle?.tortillaSideIngredientId ?? "tortilla";
  const cheeseIngredientId =
    builderConfig?.chipotle?.cheeseIngredientId ?? "cheese";
  const eligibilityKey =
    selectedEntree === "kids-meal"
      ? selectedKidsMeal === "quesadilla"
        ? "kids-quesadilla"
        : "kids-build-your-own"
      : selectedEntree;
  const eligibleIngredientIds = eligibilityKey
    ? builderConfig?.chipotle?.ingredientIdsByEntree?.[eligibilityKey]
    : undefined;
  const eligibleIngredientIdSet = eligibleIngredientIds
    ? new Set(eligibleIngredientIds)
    : undefined;
  const includedIngredientOrderById = new Map(
    selectedIncludedIngredientIds.map(
      (ingredientId, index) => [ingredientId, index] as const,
    ),
  );

  const mappedIngredientItems = ingredients
    .filter((ingredient) => {
      if (ingredient.hideFromIngredientView) {
        return false;
      }
      if (eligibleIngredientIdSet && !eligibleIngredientIdSet.has(ingredient.id)) {
        return false;
      }
      if (
        selectedEntree === "tacos" &&
        adultContextualTacoShellIds.has(ingredient.id) &&
        !selectedAdultTacoShellIds.has(ingredient.id)
      ) {
        return false;
      }

      const shouldHideFromKidsBuildYourOwn =
        selectedEntree === "kids-meal" &&
        selectedKidsMeal === "build-your-own" &&
        ingredient.id === tortillaSideIngredientId;
      if (shouldHideFromKidsBuildYourOwn) {
        return false;
      }

      const shouldHideTortillaSideForEntree =
        ingredient.id === tortillaSideIngredientId &&
        (selectedEntree === "salad" || selectedEntree === "tacos");
      if (shouldHideTortillaSideForEntree) {
        return false;
      }

      const isTacoShellIngredient = ingredient.id
        ? tacoShellIngredientIds.includes(ingredient.id)
        : false;
      const isKidsBuildYourOwnTacoShellOption =
        isTacoShellIngredient &&
        selectedEntree === "kids-meal" &&
        selectedKidsMeal === "build-your-own";
      const isIncludedForCurrentBuild = ingredient.id
        ? selectedIncludedIngredientIds.includes(ingredient.id)
        : false;
      if (
        isTacoShellIngredient &&
        selectedEntree !== "tacos" &&
        !isKidsBuildYourOwnTacoShellOption &&
        !isIncludedForCurrentBuild
      ) {
        return false;
      }

      return true;
    })
    .map((ingredient, index) => {
      const ingredientId =
        ingredient.id ??
        `${restaurantId}-ingredient-${ingredient.name}-${index}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-");
      const resolvedCategory = resolveIngredientCategory(ingredient);
      // Tacos and Kid's Build Your Own both offer a crispy/soft choice
      // rendered as included-ingredient radio cards — both options need to
      // stay pinned to Included Ingredients regardless of which is
      // currently selected (selectedIncludedIngredientIds only ever holds
      // the selected one).
      const isTacoShellChoiceContext =
        selectedEntree === "tacos" ||
        (selectedEntree === "kids-meal" && selectedKidsMeal === "build-your-own");
      const shouldPinToIncludedCategory =
        selectedIncludedIngredientIds.includes(ingredientId) ||
        (isTacoShellChoiceContext &&
          tacoShellIngredientIds.includes(ingredientId));
      const displayCategory = shouldPinToIncludedCategory
        ? "Included Ingredients"
        : resolvedCategory;
      const includedIngredientOrder =
        includedIngredientOrderById.get(ingredientId);
      const isQuesadillaCheeseIncludedIngredient =
        ingredientId === cheeseIngredientId &&
        shouldPinToIncludedCategory &&
        selectedEntree === "quesadilla";
      const hasCustomVariants = Boolean(ingredient.variants?.length);
      const ingredientPortionMultiplier =
        getSelectedIngredientPortionMultiplier(
          ingredientId,
          normalizeIngredientCategory(resolvedCategory),
        );
      const effectiveNutrition = resolveEffectiveIngredientNutrition(ingredient);
      if (!effectiveNutrition) {
        throw new Error(
          `Chipotle ingredient ${ingredientId} has no effective nutrition.`,
        );
      }
      const ingredientBaseNutrition = scaleNutritionValues(
        effectiveNutrition,
        getIngredientPortionMultiplier(ingredient.id) *
          ingredientPortionMultiplier,
      );
      const variants = hasCustomVariants
        ? ingredient.variants?.map((variant) => ({
            ...variant,
            nutrition: scaleNutritionValues(
              variant.nutrition,
              getIngredientPortionMultiplier(ingredient.id) *
                ingredientPortionMultiplier,
            ),
          }))
        : undefined;
      const tripleCheeseVariant = isQuesadillaCheeseIncludedIngredient
        ? {
            id: quesadillaTripleCheeseVariantId,
            label: "",
            categories: [displayCategory],
            nutrition: scaleNutritionValues(
              ingredientBaseNutrition,
              3,
            ),
          }
        : null;
      const defaultVariantId = tripleCheeseVariant
        ? quesadillaTripleCheeseVariantId
        : ingredient.defaultVariantId;

      const menuItem: MenuItem = {
        id: ingredientId,
        name: resolveChipotleIngredientDisplayName(
          ingredient,
          builderConfig,
          selectedEntree,
        ),
        nutrition: ingredientBaseNutrition,
        defaultOrder:
          shouldPinToIncludedCategory &&
          !isTacoShellChoiceContext &&
          typeof includedIngredientOrder === "number"
            ? includedIngredientOrder
            : (ingredient.defaultOrder ?? index),
        variants: tripleCheeseVariant
          ? [...(variants ?? []), tripleCheeseVariant]
          : variants,
        defaultVariantId,
        hideVariantSelector:
          ingredient.hideVariantSelector ||
          isQuesadillaCheeseIncludedIngredient,
        image: ingredient.image ?? "",
        categories: [displayCategory],
        servingType: "addon",
      };
      return menuItem;
    });

  return mappedIngredientItems;
}
