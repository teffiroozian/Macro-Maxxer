import baconEggCheeseBagel from "@/data/restaurants/mcdonalds/research/ordering/raw/bacon-egg-cheese-bagel-item-page.json";
import eggCheeseBagel from "@/data/restaurants/mcdonalds/research/ordering/raw/egg-cheese-bagel-item-page.json";
import sausageEggCheeseBagel from "@/data/restaurants/mcdonalds/research/ordering/raw/sausage-egg-cheese-bagel-item-page.json";
import steakEggCheeseBagel from "@/data/restaurants/mcdonalds/research/ordering/raw/steak-egg-cheese-bagel-item-page.json";
import baconEggCheeseBiscuit from "@/data/restaurants/mcdonalds/research/ordering/raw/bacon-egg-cheese-biscuit-item-page.json";
import eggCheeseBiscuit from "@/data/restaurants/mcdonalds/research/ordering/raw/egg-cheese-biscuit-item-page.json";
import sausageBiscuitWithEgg from "@/data/restaurants/mcdonalds/research/ordering/raw/sausage-biscuit-with-egg-item-page.json";
import sausageBiscuit from "@/data/restaurants/mcdonalds/research/ordering/raw/sausage-biscuit-item-page.json";
import baconEggCheeseMcGriddles from "@/data/restaurants/mcdonalds/research/ordering/raw/bacon-egg-cheese-mcgriddles-item-page.json";
import sausageEggCheeseMcGriddles from "@/data/restaurants/mcdonalds/research/ordering/raw/sausage-egg-cheese-mcgriddles-item-page.json";
import sausageMcGriddles from "@/data/restaurants/mcdonalds/research/ordering/raw/sausage-mcgriddles-item-page.json";
import eggMcMuffin from "@/data/restaurants/mcdonalds/research/ordering/raw/egg-mcmuffin-item-page.json";
import sausageMcMuffinWithEgg from "@/data/restaurants/mcdonalds/research/ordering/raw/sausage-mcmuffin-with-egg-item-page.json";
import sausageMcMuffin from "@/data/restaurants/mcdonalds/research/ordering/raw/sausage-mcmuffin-item-page.json";
import ranchSnackWrap from "@/data/restaurants/mcdonalds/research/ordering/raw/ranch-snack-wrap-item-page.json";
import spicySnackWrap from "@/data/restaurants/mcdonalds/research/ordering/raw/spicy-snack-wrap-item-page.json";
import bigBreakfast from "@/data/restaurants/mcdonalds/research/ordering/raw/big-breakfast-item-page.json";
import bigBreakfastWithHotcakes from "@/data/restaurants/mcdonalds/research/ordering/raw/big-breakfast-with-hotcakes-item-page.json";
import sausageBurrito from "@/data/restaurants/mcdonalds/research/ordering/raw/sausage-burrito-item-page.json";
import type { IngredientCategoryRule, IngredientItem, ItemCustomizationOverride } from "@/types/menu";
import type { Nutrition } from "@/types/nutrition";

type Option = { id: string; name: string };
type Group = { id: string; name: string; type: string; options: Option[] };
type Capture = { data: { itemPage: { itemHeader: { name: string }; optionLists: Group[] } } };

const CHEESE: Nutrition = { calories: 50.113645, protein: 2.5979595, carbs: 1.362864, totalFat: 3.8188585 };
const BACON: Nutrition = { calories: 71.8990763346, protein: 3.9121939386, carbs: 0.671915538, totalFat: 5.9608507014 };
const TWO_TOMATO_SLICES: Nutrition = { calories: 3.0816, protein: 0.150656, carbs: 0.665968, totalFat: 0.03424 };

const BREAKFAST_CAPTURE_BY_ITEM_ID: Record<string, Capture> = {
  "mcd-item-200424": baconEggCheeseBagel as Capture,
  "mcd-item-200876": eggCheeseBagel as Capture,
  "mcd-item-201030": sausageEggCheeseBagel as Capture,
  "mcd-item-200145": steakEggCheeseBagel as Capture,
  "mcd-item-200300": baconEggCheeseBiscuit as Capture,
  "mcd-item-201256": eggCheeseBiscuit as Capture,
  "mcd-item-200302": sausageBiscuitWithEgg as Capture,
  "mcd-item-200301": sausageBiscuit as Capture,
  "mcd-item-200304": baconEggCheeseMcGriddles as Capture,
  "mcd-item-200307": sausageEggCheeseMcGriddles as Capture,
  "mcd-item-200306": sausageMcGriddles as Capture,
  "mcd-item-200298": eggMcMuffin as Capture,
  "mcd-item-200161": sausageMcMuffinWithEgg as Capture,
  "mcd-item-200449": sausageMcMuffin as Capture,
};
const WRAP_CAPTURE_BY_ITEM_ID: Record<string, Capture> = {
  "mcd-item-204401": ranchSnackWrap as Capture,
  "mcd-item-204402": spicySnackWrap as Capture,
};
const BIG_BREAKFAST_CAPTURE_BY_ITEM_ID: Record<string, Capture> = {
  "mcd-item-200322": bigBreakfast as Capture,
  "mcd-item-200323": bigBreakfastWithHotcakes as Capture,
};

export type SafeCustomizationData = {
  ingredients: IngredientItem[];
  byItemId: Record<string, { ingredients: string[]; customization: ItemCustomizationOverride }>;
  categoryRules: Record<string, IngredientCategoryRule>;
};

const negate = (nutrition: Nutrition): Nutrition => Object.fromEntries(
  Object.entries(nutrition).map(([key, value]) => [key, -(value ?? 0)]),
) as Nutrition;

export function buildMcDonaldsRemainingSafeCustomization(): SafeCustomizationData {
  const ingredients: IngredientItem[] = [];
  const byItemId: SafeCustomizationData["byItemId"] = {};
  const categoryRules: Record<string, IngredientCategoryRule> = {};

  for (const [itemId, capture] of Object.entries(BREAKFAST_CAPTURE_BY_ITEM_ID)) {
    const itemName = capture.data.itemPage.itemHeader.name;
    const groups = capture.data.itemPage.optionLists.filter((group) => group.type === "multi_select" || group.type === "extra_option");
    const remove = groups.find((group) => /^Remove from /.test(group.name));
    const extra = groups.find((group) => /^Extra for /.test(group.name));
    const ids: string[] = [];
    for (const kind of ["American Cheese", "2 Half Strips Bacon"] as const) {
      const removeOption = remove?.options.find((option) => option.name === `No ${kind}`);
      const increaseOption = extra?.options.find((option) => option.name === `Extra ${kind}` || option.name === `Add ${kind}`);
      if (!removeOption && !increaseOption) continue;
      const isCheese = kind === "American Cheese";
      // Bagels contain two cheese slices, but the captured No/Extra action is
      // one 50-calorie slice. Model the one adjustable slice (the other stays
      // in the base recipe) so every reachable UI count has a real action ID.
      const defaultCount = isCheese
        ? (/Cheese/.test(itemName) ? 1 : 0)
        : (/Bacon/.test(itemName) ? 1 : 0);
      const nutrition = isCheese ? CHEESE : BACON;
      const ingredientId = `mcd-safe-${itemId.replace("mcd-item-", "")}-${isCheese ? "american-cheese" : "bacon"}`;
      const orderingOptionIdByCount: Record<number, string> = {};
      const orderingGroupIdByCount: Record<number, string> = {};
      const nutritionDeltaByCount: Record<number, Nutrition> = {};
      if (removeOption && remove) {
        orderingOptionIdByCount[defaultCount - 1] = removeOption.id;
        orderingGroupIdByCount[defaultCount - 1] = remove.id;
        nutritionDeltaByCount[defaultCount - 1] = negate(nutrition);
      }
      if (increaseOption && extra) {
        orderingOptionIdByCount[defaultCount + 1] = increaseOption.id;
        orderingGroupIdByCount[defaultCount + 1] = extra.id;
        nutritionDeltaByCount[defaultCount + 1] = nutrition;
      }
      ingredients.push({
        id: ingredientId,
        canonicalIngredientId: isCheese ? "mcd-component-301518" : "mcd-component-300163",
        name: isCheese && /Bagel/.test(itemName) ? "American Cheese Slice" : kind,
        categories: [isCheese ? "Cheeses" : "Toppings"],
        nutrition,
        maxQuantity: defaultCount + (increaseOption ? 1 : 0),
        defaultOrder: 8100 + ids.length,
        orderingOptionIdByCount,
        orderingGroupIdByCount,
        nutritionDeltaByCount,
      });
      ids.push(ingredientId);
    }
    const categories = ["Cheeses", "Toppings"].flatMap((name) => {
      const categoryIngredients = ids.filter((id) => ingredients.find((ingredient) => ingredient.id === id)?.categories.includes(name));
      if (!categoryIngredients.length) return [];
      const id = `mcd-${itemId}-safe-${name.toLowerCase()}`;
      categoryRules[id] = { maxQuantity: 3, allowNone: false };
      return [{ id, name, ingredients: categoryIngredients, allowNone: false }];
    });
    byItemId[itemId] = {
      ingredients: ids.map((id) => {
        const defaultCount = /american-cheese/.test(id) ? (/Cheese/.test(itemName) ? 1 : 0) : (/Bacon/.test(itemName) ? 1 : 0);
        return defaultCount === 1 ? id : "";
      }).filter(Boolean),
      customization: { ingredientCategories: categories },
    };
  }

  for (const [itemId, capture] of Object.entries(WRAP_CAPTURE_BY_ITEM_ID)) {
    const group = capture.data.itemPage.optionLists.find((candidate) => /^Extra for /.test(candidate.name))!;
    const safeOptions = group.options.filter((option) => option.name === "Add 2 Half Strips Bacon" || option.name === "Add x2 Slc Tomato");
    const ids = safeOptions.map((option, index) => {
      const isBacon = option.name.includes("Bacon");
      const id = `mcd-safe-${itemId.replace("mcd-item-", "")}-${isBacon ? "bacon" : "tomato-x2"}`;
      ingredients.push({
        id,
        canonicalIngredientId: isBacon ? "mcd-component-300163" : "mcd-component-301407-x2",
        name: isBacon ? "2 Half Strips Bacon" : "2 Tomato Slices",
        categories: ["Add-ons"],
        nutrition: isBacon ? BACON : TWO_TOMATO_SLICES,
        maxQuantity: 1,
        defaultOrder: 8200 + index,
        orderingOptionIdByCount: { 1: option.id },
        orderingGroupIdByCount: { 1: group.id },
      });
      return id;
    });
    const categoryId = `mcd-${itemId}-safe-add-ons`;
    categoryRules[categoryId] = { maxQuantity: 2, allowNone: true };
    byItemId[itemId] = { ingredients: [], customization: { ingredientCategories: [{ id: categoryId, name: "Add-ons", ingredients: ids, allowNone: true }] } };
  }

  for (const [itemId, capture] of Object.entries(BIG_BREAKFAST_CAPTURE_BY_ITEM_ID)) {
    const group = capture.data.itemPage.optionLists.find((candidate) => candidate.name === "Extra for Hash Browns")!;
    const option = group.options.find((candidate) => candidate.name === "Add Ketchup Packet")!;
    const ingredientId = `mcd-safe-${itemId.replace("mcd-item-", "")}-ketchup-packet`;
    ingredients.push({
      id: ingredientId,
      canonicalIngredientId: "mcd-item-200268",
      name: "Ketchup Packet",
      categories: ["Add-ons"],
      nutrition: { calories: 10, protein: 0, carbs: 2, totalFat: 0 },
      maxQuantity: 1,
      defaultOrder: 8300,
      orderingOptionIdByCount: { 1: option.id },
      orderingGroupIdByCount: { 1: group.id },
    });
    const categoryId = `mcd-${itemId}-safe-add-ons`;
    categoryRules[categoryId] = { maxQuantity: 1, allowNone: true };
    byItemId[itemId] = { ingredients: [], customization: { ingredientCategories: [{ id: categoryId, name: "Add-ons", ingredients: [ingredientId], allowNone: true }] } };
  }

  {
    const itemId = "mcd-item-200267";
    const group = (sausageBurrito as Capture).data.itemPage.optionLists.find((candidate) => candidate.name === "Select Sauce")!;
    const ids = group.options.filter((option) => option.name === "Ketchup Packet" || option.name === "No Sauce").map((option, index) => {
      const id = `mcd-safe-200267-${option.name === "No Sauce" ? "no-sauce" : "ketchup-packet"}`;
      ingredients.push({
        id,
        canonicalIngredientId: option.name === "No Sauce" ? "mcd-no-sauce" : "mcd-item-200268",
        name: option.name,
        categories: ["Sauce"],
        nutrition: option.name === "No Sauce" ? { calories: 0, protein: 0, carbs: 0, totalFat: 0 } : { calories: 10, protein: 0, carbs: 2, totalFat: 0 },
        maxQuantity: 1,
        defaultOrder: 8400 + index,
        orderingOptionIdByCount: { 1: option.id },
        orderingGroupIdByCount: { 1: group.id },
      });
      return id;
    });
    const categoryId = "mcd-mcd-item-200267-safe-sauce";
    categoryRules[categoryId] = { minQuantity: 1, maxQuantity: 1, allowNone: false };
    byItemId[itemId] = { ingredients: [], customization: { ingredientCategories: [{ id: categoryId, name: "Sauce", ingredients: ids, allowNone: false }] } };
  }
  return { ingredients, byItemId, categoryRules };
}
