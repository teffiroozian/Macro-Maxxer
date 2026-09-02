import type { RestaurantBuilderConfig } from "@/types/builder";

export const CHIPOTLE_ENTREE_IDS = [
  "bowl",
  "burrito",
  "quesadilla",
  "salad",
  "tacos",
  "high-protein-menu",
  "kids-meal",
  "chips-sides",
  "drinks",
] as const;

export type ChipotleEntreeId = (typeof CHIPOTLE_ENTREE_IDS)[number];
export type ChipotleEntreeSelection = ChipotleEntreeId | null;

const CHIPOTLE_ENTREE_ID_SET: ReadonlySet<string> = new Set(CHIPOTLE_ENTREE_IDS);

export function isChipotleEntreeId(value: string): value is ChipotleEntreeId {
  return CHIPOTLE_ENTREE_ID_SET.has(value);
}

export const CHIPOTLE_KIDS_MEAL_IDS = ["build-your-own", "quesadilla"] as const;
export type ChipotleKidsMealId = (typeof CHIPOTLE_KIDS_MEAL_IDS)[number];

export const CHIPOTLE_TACO_SHELL_OPTIONS = ["crispy", "soft"] as const;
export type ChipotleTacoShell = (typeof CHIPOTLE_TACO_SHELL_OPTIONS)[number];

export const CHIPOTLE_TACO_COUNT_OPTIONS = [3, 1] as const;
export type ChipotleTacoCount = (typeof CHIPOTLE_TACO_COUNT_OPTIONS)[number];

export type ProteinPortionMode = "normal" | "double";
export type SplitPortionMode = "light" | "normal" | "extra";

export type ChipotleBuildConfiguration = {
  selectedEntree: ChipotleEntreeSelection;
  selectedIngredientItems: Record<string, { quantity: number }>;
  selectedIngredientVariantIds: Record<string, string>;
  proteinPortionMode: ProteinPortionMode;
  splitPortionModeById: Record<string, SplitPortionMode>;
  selectedTacoShell: ChipotleTacoShell;
  selectedTacoCount: ChipotleTacoCount;
  selectedKidsMeal: ChipotleKidsMealId;
};

export type IncludedIngredientContext = {
  selectedEntree: ChipotleEntreeSelection;
  selectedKidsMeal: ChipotleKidsMealId;
  selectedTacoShell?: ChipotleTacoShell;
};

export type ChipotleSpecificBuilderConfig = {
  tacoShellIngredientIds?: string[];
  tacoShellIngredientIdsByCount?: Partial<
    Record<
      ChipotleTacoCount,
      Partial<Record<ChipotleTacoShell, string[]>>
    >
  >;
  kidsBuildYourOwnTortillaIdsByOption?: Partial<
    Record<ChipotleTacoShell, string[]>
  >;
  kidsQuesadillaIncludedIngredientIds?: string[];
  kidsMealOptions?: Array<{ id: ChipotleKidsMealId; label: string; image: string }>;
  specialVariantIds?: {
    quesadillaTripleCheese?: string;
  };
  ingredientIdsByEntree?: Partial<
    Record<ChipotleEntreeId | "kids-build-your-own" | "kids-quesadilla", string[]>
  >;
  // Ingredient ids that start selected and pinned to "Included Ingredients"
  // (via an entreeOption's includedIngredientIds) but, unlike a true
  // required included ingredient, the user can uncheck and re-check them
  // like any other topping — e.g. Salad's Chipotle-Honey Vinaigrette:
  // selected by default, no lock icon, removable/re-addable, still shown
  // under Included Ingredients either way. Distinct from
  // tacoShellIngredientIds, which is a locked *choice* among alternatives
  // (exactly one always selected), not a single ingredient that can be
  // removed entirely.
  includedRemovableIngredientIds?: string[];
  tortillaSideIngredientId?: string;
  cheeseIngredientId?: string;
  // The tortillaSideIngredientId record's generated name ("Double Wrap with
  // Tortilla") only describes what selecting it means for a Burrito (an
  // extra tortilla on top of the burrito's own wrap). Elsewhere it's just
  // the base tortilla component, so the generic label is the default and
  // only the Burrito's optional-extra context overrides it.
  tortillaSideGenericLabel?: string;
  tortillaSideLabelByEntree?: Partial<Record<ChipotleEntreeId, string>>;
};

export type ChipotleBuilderConfig = RestaurantBuilderConfig & {
  chipotle?: ChipotleSpecificBuilderConfig;
};
