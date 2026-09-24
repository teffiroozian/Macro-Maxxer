import nuggets4 from "@/data/restaurants/mcdonalds/research/ordering/raw/chicken-mcnuggets-4-piece-item-page.json";
import nuggets6 from "@/data/restaurants/mcdonalds/research/ordering/raw/chicken-mcnuggets-6-piece-item-page.json";
import nuggets10 from "@/data/restaurants/mcdonalds/research/ordering/raw/chicken-mcnuggets-10-piece-item-page.json";
import nuggets20 from "@/data/restaurants/mcdonalds/research/ordering/raw/chicken-mcnuggets-20-piece-item-page.json";
import nuggets40 from "@/data/restaurants/mcdonalds/research/ordering/raw/chicken-mcnuggets-40-piece-item-page.json";
import strips3 from "@/data/restaurants/mcdonalds/research/ordering/raw/mccrispy-strips-3-piece-item-page.json";
import strips4 from "@/data/restaurants/mcdonalds/research/ordering/raw/mccrispy-strips-4-piece-item-page.json";
import type { IngredientCategoryRule, IngredientItem, ItemCustomizationOverride, MenuItem } from "@/types/menu";
import type { Nutrition } from "@/types/nutrition";

type CapturedOption = { id: string; name: string };
type CapturedGroup = {
  type: string;
  id: string;
  name: string;
  minNumOptions: number;
  maxNumOptions: number;
  isOptional: boolean;
  options: CapturedOption[];
};
type Capture = { data: { itemPage: { optionLists: CapturedGroup[] } } };

const CAPTURE_BY_VARIANT_ID: Record<string, Capture> = {
  "mcd-item-200692": nuggets4 as Capture,
  "mcd-item-200574": nuggets6 as Capture,
  "mcd-item-200567": nuggets10 as Capture,
  "mcd-item-200573": nuggets20 as Capture,
  "mcd-item-200577": nuggets40 as Capture,
  "mcd-item-204386": strips3 as Capture,
  "mcd-item-204385": strips4 as Capture,
};

const CATALOG_ITEM_ID_BY_SAUCE_NAME: Record<string, string | null> = {
  "Hot Mustard Dipping Sauce": "mcd-item-200169",
  "Tangy BBQ Dipping Sauce": "mcd-item-200412",
  "Sweet N Sour Dipping Sauce": "mcd-item-200315",
  "Honey Packet": "mcd-item-200313",
  "Ketchup Packet": "mcd-item-200268",
  "Creamy Ranch Sauce": "mcd-item-200293",
  "Spicy Buffalo": "mcd-item-200295",
  "Honey Mustard": "mcd-item-200411",
  "Mighty Hot Sauce": "mcd-item-203834",
  "Creamy Chili McCrispy™ Strip Dip": "mcd-item-204377",
  "No Sauce": null,
};

const IMAGE_BY_SAUCE_NAME: Partial<Record<string, string>> = {
  "Hot Mustard Dipping Sauce": "https://s7d1.scene7.com/is/image/mcdonalds/t-hot-mustard-sauce?fmt=png-alpha",
};

const ZERO_NUTRITION: Nutrition = { calories: 0, protein: 0, carbs: 0, totalFat: 0 };

function ingredientId(variantId: string, catalogItemId: string) {
  return `mcd-sauce-${variantId.replace(/^mcd-item-/, "")}-${catalogItemId.replace(/^mcd-item-/, "")}`;
}

export type McDonaldsSauceSelectionData = {
  ingredients: IngredientItem[];
  customizationByVariantId: Record<string, ItemCustomizationOverride>;
  categoryRules: Record<string, IngredientCategoryRule>;
};

export function buildMcDonaldsSauceSelection(catalogItems: MenuItem[]): McDonaldsSauceSelectionData {
  const catalogById = new Map(catalogItems.map((item) => [item.id, item]));
  const ingredients: IngredientItem[] = [];
  const customizationByVariantId: Record<string, ItemCustomizationOverride> = {};
  const categoryRules: Record<string, IngredientCategoryRule> = {};

  for (const [variantId, capture] of Object.entries(CAPTURE_BY_VARIANT_ID)) {
    const groups = capture.data.itemPage.optionLists
      .filter((group) => group.type === "extra_option" && /^Select Sauce/.test(group.name));
    const allowance = groups.length;
    const categoryId = `mcd-${variantId}-sauces`;
    const optionsByName = new Map<string, Array<{ group: CapturedGroup; option: CapturedOption }>>();
    groups.forEach((group) => group.options.forEach((option) => {
      if (option.name === "No Sauce" || !(option.name in CATALOG_ITEM_ID_BY_SAUCE_NAME)) return;
      optionsByName.set(option.name, [...(optionsByName.get(option.name) ?? []), { group, option }]);
    }));

    const optionIngredientIds = [...optionsByName.entries()].map(([name, occurrences], optionIndex) => {
      const catalogItemId = CATALOG_ITEM_ID_BY_SAUCE_NAME[name];
      const catalogItem = catalogItemId ? catalogById.get(catalogItemId) : undefined;
      if (!catalogItemId || !catalogItem) {
        throw new Error(`Missing validated McDonald's sauce catalog item ${catalogItemId ?? name}`);
      }
      const id = ingredientId(variantId, catalogItemId);
      ingredients.push({
        id,
        canonicalIngredientId: catalogItemId,
        name,
        image: IMAGE_BY_SAUCE_NAME[name] ?? catalogItem.image,
        categories: ["Sauces"],
        nutrition: catalogItem.nutrition ?? ZERO_NUTRITION,
        maxQuantity: allowance,
        defaultOrder: 7000 + optionIndex,
        orderingOptionIdByCount: Object.fromEntries(occurrences.map(({ option }, index) => [index + 1, option.id])),
        orderingGroupIdByCount: Object.fromEntries(occurrences.map(({ group }, index) => [index + 1, group.id])),
      });
      return id;
    });
    categoryRules[categoryId] = { minQuantity: 0, maxQuantity: allowance, allowNone: true };
    customizationByVariantId[variantId] = {
      ingredientCategories: [{
        id: categoryId,
        name: "Sauces",
        ingredients: optionIngredientIds,
        allowNone: true,
        sectionTitle: "Dipping Sauces",
        helperText: `Choose up to ${allowance} sauce${allowance === 1 ? "" : "s"}`,
      }],
    };
  }

  return { ingredients, customizationByVariantId, categoryRules };
}
