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
