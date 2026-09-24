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
  "Ketchup Packet": "mcd-item-200268",
  "Creamy Ranch Sauce": "mcd-item-200293",
  "Spicy Buffalo": "mcd-item-200295",
  "Honey Mustard": "mcd-item-200411",
  "Mighty Hot Sauce": "mcd-item-203834",
  "Creamy Chili McCrispy™ Strip Dip": "mcd-item-204377",
  "No Sauce": null,
};

const ZERO_NUTRITION: Nutrition = { calories: 0, protein: 0, carbs: 0, totalFat: 0 };

function ingredientId(variantId: string, groupId: string, optionId: string) {
  return `mcd-sauce-${variantId.replace(/^mcd-item-/, "")}-${groupId}-${optionId}`;
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
    const categories = capture.data.itemPage.optionLists
      .filter((group) => group.type === "extra_option" && /^Select Sauce/.test(group.name))
      .map((group, slotIndex) => {
        const categoryId = `mcd-${variantId}-sauce-slot-${slotIndex + 1}`;
        const categoryName = `Sauce ${slotIndex + 1}`;
        const optionIngredientIds = group.options.flatMap((option, optionIndex) => {
          if (!(option.name in CATALOG_ITEM_ID_BY_SAUCE_NAME)) return [];
          const catalogItemId = CATALOG_ITEM_ID_BY_SAUCE_NAME[option.name];
          const catalogItem = catalogItemId ? catalogById.get(catalogItemId) : undefined;
          if (catalogItemId && !catalogItem) {
            throw new Error(`Missing validated McDonald's sauce catalog item ${catalogItemId}`);
          }
          const id = ingredientId(variantId, group.id, option.id);
          ingredients.push({
            id,
            canonicalIngredientId: catalogItemId ?? "mcd-no-sauce",
            name: option.name,
            image: catalogItem?.image,
            categories: [categoryName],
            nutrition: catalogItem?.nutrition ?? ZERO_NUTRITION,
            maxQuantity: 1,
            defaultOrder: 7000 + slotIndex * 100 + optionIndex,
            orderingOptionIdByCount: { 1: option.id },
            orderingGroupIdByCount: { 1: group.id },
          });
          return [id];
        });
        categoryRules[categoryId] = {
          minQuantity: group.minNumOptions,
          maxQuantity: group.maxNumOptions,
          allowNone: group.isOptional,
        };
        return { id: categoryId, name: categoryName, ingredients: optionIngredientIds, allowNone: false };
      });
    customizationByVariantId[variantId] = { ingredientCategories: categories };
  }

  return { ingredients, customizationByVariantId, categoryRules };
}
