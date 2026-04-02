export type EntreeSelection =
  | "bowl"
  | "burrito"
  | "quesadilla"
  | "salad"
  | "tacos"
  | "high-protein-menu"
  | "kids-meal"
  | "chips-sides"
  | "drinks"
  | null;

export type TacoShellSelection = "crispy" | "soft";
export type TacoCountSelection = 3 | 1;
export type KidsMealSelection = "build-your-own" | "quesadilla";

export type EntreeConfiguration = {
  label: string;
  imageSrc: string;
  nutritionMultiplier?: number;
  includedIngredientIds?: string[];
  getIncludedIngredientIds?: (options: { tacoShell: TacoShellSelection }) => string[];
};

export const CHIPOTLE_TACO_SHELL_INGREDIENT_IDS = [
  "crispy-corn-tortilla",
  "soft-flour-tortilla",
] as const;

export const CHIPOTLE_ENTREE_CONFIGURATIONS: Record<
  Exclude<EntreeSelection, null>,
  EntreeConfiguration
> = {
  bowl: { label: "Bowl", imageSrc: "/restaurants/chipotle/entrees/burrito-bowl.png" },
  burrito: {
    label: "Burrito",
    imageSrc: "/restaurants/chipotle/entrees/burrito.png",
    includedIngredientIds: ["tortilla"],
  },
  quesadilla: {
    label: "Quesadilla",
    imageSrc: "/restaurants/chipotle/entrees/quesadilla.png",
    includedIngredientIds: ["tortilla", "cheese"],
  },
  salad: {
    label: "Salad",
    imageSrc: "/restaurants/chipotle/entrees/salad.png",
    includedIngredientIds: ["romaine-lettuce"],
  },
  tacos: {
    label: "Tacos",
    imageSrc: "/restaurants/chipotle/entrees/tacos.png",
    getIncludedIngredientIds: ({ tacoShell }) => [
      tacoShell === "crispy" ? "crispy-corn-tortilla" : "soft-flour-tortilla",
    ],
  },
  "high-protein-menu": {
    label: "High Protein Menu",
    imageSrc: "/restaurants/chipotle/entrees/high-protein-menu.png",
  },
  "kids-meal": {
    label: "Kid's Meal",
    imageSrc: "/restaurants/chipotle/entrees/kids-meal.png",
  },
  "chips-sides": {
    label: "Chips & Sides",
    imageSrc: "/restaurants/chipotle/entrees/chips-and-sides.png",
  },
  drinks: {
    label: "Drinks",
    imageSrc: "/restaurants/chipotle/entrees/drinks.png",
  },
};

export const CHIPOTLE_HIDDEN_MENU_SECTIONS_BY_ENTREE: Record<string, string[]> = {
  "chips-sides": ["toppings"],
};

export const CHIPOTLE_CATEGORY_MAX_SELECTIONS: Record<string, number> = {
  proteins: 2,
  rice: 2,
  beans: 2,
};

export const CHIPOTLE_KIDS_QUESADILLA_INCLUDED_INGREDIENT_IDS = [
  "soft-flour-tortilla",
  "cheese",
] as const;

export const CHIPOTLE_KIDS_BUILD_YOUR_OWN_DOUBLE_SIDE_IDS = new Set([
  "crispy-corn-tortilla",
  "soft-flour-tortilla",
]);

export const CHIPOTLE_QUESADILLA_TRIPLE_CHEESE_VARIANT_ID = "quesadilla-triple-cheese";

export const CHIPOTLE_KIDS_MEAL_OPTIONS: Array<{
  id: KidsMealSelection;
  label: string;
  imageSrc: string;
}> = [
  {
    id: "build-your-own",
    label: "Kid's Build Your Own",
    imageSrc: "/restaurants/chipotle/entrees/kids-meal.png",
  },
  {
    id: "quesadilla",
    label: "Kid's Quesadilla",
    imageSrc: "/restaurants/chipotle/entrees/kids-quesadilla.png",
  },
];

export const CHIPOTLE_SELECTED_INGREDIENT_CATEGORY_ORDER = [
  "included ingredient",
  "proteins",
  "rice",
  "beans",
  "toppings",
  "side",
] as const;

export const CHIPOTLE_SELECTED_INGREDIENT_CATEGORY_LABELS: Record<string, string> = {
  "included ingredient": "Included ingredients",
  proteins: "Protein",
  rice: "Rice",
  beans: "Beans",
  toppings: "Toppings",
  side: "Side",
};
