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
import generatedRestaurant from "@/data/restaurants/mcdonalds/generated/restaurant.json";
import type { IngredientCategoryRule, IngredientItem, ItemCustomizationOverride } from "@/types/menu";
import type { Nutrition } from "@/types/nutrition";

type Option = { id: string; name: string; caloricInfoDisplayString?: string };
type Group = { id: string; name: string; type: string; options: Option[] };
type Capture = { data: { itemPage: { itemHeader: { name: string }; optionLists: Group[] } } };

const CHEESE: Nutrition = { calories: 50.113645, protein: 2.5979595, carbs: 1.362864, totalFat: 3.8188585 };
const BACON: Nutrition = { calories: 71.8990763346, protein: 3.9121939386, carbs: 0.671915538, totalFat: 5.9608507014 };
const TWO_TOMATO_SLICES: Nutrition = { calories: 3.0816, protein: 0.150656, carbs: 0.665968, totalFat: 0.03424 };
const WRAP_LETTUCE: Nutrition = { calories: 1.9838, protein: 0.12753, carbs: 0.420849, totalFat: 0.019838 };
const scaleNutrition = (nutrition: Nutrition, factor: number): Nutrition => Object.fromEntries(
  Object.entries(nutrition).map(([key, value]) => [key, (value ?? 0) * factor]),
) as Nutrition;
const WRAP_SPICY_SAUCE = scaleNutrition(
  { calories: 107.343824, protein: 0.274512, carbs: 1.437576, totalFat: 11.177936 },
  70 / 107.343824,
);
const WRAP_RANCH_SAUCE = scaleNutrition(
  { calories: 60.7776, protein: 0.2208, carbs: 0.87, totalFat: 6.3888 },
  80 / 60.7776,
);
const SPICY_PEPPER_SAUCE: Nutrition = {
  calories: 107.343824,
  protein: 0.274512,
  carbs: 1.437576,
  totalFat: 11.177936,
};
const IMAGE_ROOT = "https://s7d1.scene7.com/is/image/mcdonalds";

const BREAKFAST_COMPONENT: Record<string, { name: string; category: string; calories: number; image?: string }> = {
  "300036": { name: "Hash Browns", category: "Potatoes", calories: 140, image: "hash_brown.png" },
  "300067": { name: "Round Egg", category: "Protein", calories: 80, image: "round_egg.png" },
  "300091": { name: "Light Cream", category: "Toppings", calories: 60, image: "DC_Ingredient_202111_05370-012__0276_LightCream_1564x1564.png" },
  "300123": { name: "Oatmeal", category: "Oatmeal", calories: 210, image: "oatmeal.png" },
  "300131": { name: "Biscuit", category: "Bread", calories: 260, image: "DC_Ingredient_202111_02813-081__0064_Biscuit_1564x1564.png" },
  "300163": { name: "2 Half Strips Bacon", category: "Protein", calories: 70, image: "DC_Ingredient_202110_00507-009__6020_ThickCutApplewoodSmokedBacon_1564x1564.png" },
  "300165": { name: "Cranberry Raisin Blend", category: "Toppings", calories: 70, image: "cranberry_raisin.png" },
  "300167": { name: "Diced Apples", category: "Toppings", calories: 15, image: "diced_apples.png" },
  "300168": { name: "Breakfast Steak Patty", category: "Protein", calories: 140, image: "breakfast_steak.png" },
  "300310": { name: "Salted Butter", category: "Sauces", calories: 35, image: "ButterPad_180x180.jpg" },
  "300422": { name: "Flour Tortilla", category: "Bread", calories: 140, image: "tortilla.png" },
  "300524": { name: "Scrambled Eggs", category: "Protein", calories: 150, image: "DC_Ingredient_202110_03952-058__0030_ScrambledEggs_1564x1564.png" },
  "300654": { name: "Clarified Butter", category: "Sauces", calories: 0, image: "ClarifiedButter_180x180.jpg" },
  "300666": { name: "McGriddles Cakes", category: "Bread", calories: 240, image: "DC_Ingredient_202110_02913-033__4024_GriddleCake_1564x1564.png" },
  "300694": { name: "Sausage Patty", category: "Protein", calories: 190, image: "DC_Ingredient_202111_00071-126__0033_SausagePatty_1564x1564.png" },
  "300757": { name: "Hotcakes", category: "Hotcakes", calories: 330, image: "DC_Ingredient_202111_05358-060__1790_Hotcake_1564x1564.png" },
  "300759": { name: "Hotcake Syrup", category: "Sauces", calories: 180, image: "DC_Ingredient_202111_00033-079__0969_HotcakeSyrup_1564x1564.png" },
  "300777": { name: "Scrambled Egg, Sausage & Vegetable Mix", category: "Protein", calories: 110, image: "DC_Ingredient_202111_02232-015_ScrambledEggs_SausgeandVegetableMix_1564x1564.png" },
  "301425": { name: "Breakfast Sauce", category: "Sauces", calories: 35, image: "BreakfastSauce_180x180.jpg" },
  "301462": { name: "Folded Egg", category: "Protein", calories: 70, image: "folded_egg.png" },
  "301518": { name: "American Cheese", category: "Cheeses", calories: 50, image: "ingredient_american_cheese_180x180.png" },
  "301533": { name: "English Muffin", category: "Bread", calories: 140, image: "english_muffin.png" },
  "301601": { name: "Grilled Onions", category: "Toppings", calories: 25, image: "grilled_onions.png" },
  "301639": { name: "Canadian Bacon", category: "Protein", calories: 15, image: "canadian_bacon.png" },
  "301643": { name: "Salted Whipped Butter", category: "Sauces", calories: 70, image: "butter_salted.png" },
  "302369": { name: "Plain Bagel", category: "Bread", calories: 270, image: "PlainBagel_180x180.jpg" },
};

type BreakfastActionDefinition = {
  key: string;
  componentId?: string;
  name: string;
  category: "Bread" | "Cheeses" | "Protein" | "Toppings" | "Sauces";
  image?: string;
  exactNutrition?: Nutrition;
  includedWithoutComponent?: boolean;
};

const BREAKFAST_ACTION_BY_CAPTURED_NAME: Record<string, BreakfastActionDefinition> = {
  "butter": { key: "butter", componentId: "300310", name: "Salted Butter", category: "Sauces" },
  "american cheese": { key: "american-cheese", componentId: "301518", name: "American Cheese", category: "Cheeses", exactNutrition: CHEESE },
  "2 half strips bacon": { key: "bacon", componentId: "300163", name: "2 Half Strips Bacon", category: "Protein", exactNutrition: BACON },
  "folded egg": { key: "folded-egg", componentId: "301462", name: "Folded Egg", category: "Protein" },
  "breakfast sauce": { key: "breakfast-sauce", componentId: "301425", name: "Breakfast Sauce", category: "Sauces" },
  "bagel": { key: "bagel", componentId: "302369", name: "Plain Bagel", category: "Bread" },
  "spicy pepper sauce": { key: "spicy-pepper-sauce", componentId: "302376", name: "Spicy Pepper Sauce", category: "Sauces", image: "t-original-spicy-sauce.jpg", exactNutrition: SPICY_PEPPER_SAUCE },
  "round egg": { key: "round-egg", componentId: "300067", name: "Round Egg", category: "Protein" },
  "sausage": { key: "sausage", componentId: "300694", name: "Sausage Patty", category: "Protein" },
  "steak": { key: "steak", componentId: "300168", name: "Breakfast Steak Patty", category: "Protein" },
  "slivered onions": { key: "onions", componentId: "301601", name: "Grilled Onions", category: "Toppings" },
  "salt": { key: "salt", name: "Salt", category: "Sauces", includedWithoutComponent: true },
  "biscuit": { key: "biscuit", componentId: "300131", name: "Biscuit", category: "Bread" },
  "canadian bacon": { key: "canadian-bacon", componentId: "301639", name: "Canadian Bacon", category: "Protein" },
  "mcgriddles": { key: "mcgriddles-cakes", componentId: "300666", name: "McGriddles Cakes", category: "Bread" },
  "english mcmuffin": { key: "english-muffin", componentId: "301533", name: "English Muffin", category: "Bread" },
};

function normalizeBreakfastActionName(optionName: string) {
  return optionName
    .replace(/^(?:No|Extra|Add)\s+/i, "")
    .replace(/[®™]/g, "")
    .trim()
    .toLocaleLowerCase("en-US");
}

function capturedCalories(option?: Option) {
  const match = option?.caloricInfoDisplayString?.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : undefined;
}

function incompleteNutrition(calories: number): Nutrition {
  // The current domain requires all four core macro keys. Zero here means
  // "not available in this captured modifier", not an inferred zero-value
  // nutrient; exact calorie evidence is still retained for the live total.
  return { calories, protein: 0, carbs: 0, totalFat: 0 };
}


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

// The platter captures use "English McMuffin" for the bread removal even
// though the official DNA recipe exposes the served component as Biscuit.
// Keep the source recipe label, but retain the captured removal identity.
const BIG_BREAKFAST_REMOVE_NAME_BY_COMPONENT_ID: Record<string, string> = {
  "300131": "english mcmuffin",
  "300524": "scrambled eggs",
  "300694": "sausage",
  "300757": "hotcakes",
};

export type SafeCustomizationData = {
  ingredients: IngredientItem[];
  byItemId: Record<string, { ingredients: string[]; readOnlyIngredientIds?: string[]; customization: ItemCustomizationOverride }>;
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
    const generatedItems = (generatedRestaurant as unknown as {
      items: Array<{ id: string; source?: { generated?: { menu?: { componentItemIds?: (string | number)[] } } } }>;
    }).items;
    const sourceComponentIds = new Set((generatedItems
      .find((item) => item.id === itemId)?.source?.generated?.menu?.componentItemIds ?? []).map(String));
    const groups = capture.data.itemPage.optionLists.filter((group) => group.type === "multi_select" || group.type === "extra_option");
    const remove = groups.find((group) => /^Remove from /.test(group.name));
    const extra = groups.find((group) => /^Extra for /.test(group.name));
    const ids: string[] = [];
    const defaultCountById = new Map<string, number>();
    const capturedActionNames = [...new Set([
      ...(remove?.options ?? []).map((option) => normalizeBreakfastActionName(option.name)),
      ...(extra?.options ?? []).map((option) => normalizeBreakfastActionName(option.name)),
    ])];
    for (const capturedName of capturedActionNames) {
      const action = BREAKFAST_ACTION_BY_CAPTURED_NAME[capturedName];
      if (!action) throw new Error(`Unmapped captured breakfast action "${capturedName}" for ${itemId}`);
      const removeOption = remove?.options.find((option) => normalizeBreakfastActionName(option.name) === capturedName);
      const increaseOption = extra?.options.find((option) => normalizeBreakfastActionName(option.name) === capturedName);
      // Bagels contain two cheese slices, but the captured No/Extra action is
      // one 50-calorie slice. Model the one adjustable slice (the other stays
      // in the base recipe) so every reachable UI count has a real action ID.
      const defaultCount = (action.componentId && sourceComponentIds.has(action.componentId)) || action.includedWithoutComponent ? 1 : 0;
      const ingredientId = `mcd-safe-${itemId.replace("mcd-item-", "")}-${action.key}`;
      const orderingOptionIdByCount: Record<number, string> = {};
      const orderingGroupIdByCount: Record<number, string> = {};
      const nutritionDeltaByCount: Record<number, Nutrition> = {};
      const component = action.componentId ? BREAKFAST_COMPONENT[action.componentId] : undefined;
      const baseNutrition = action.exactNutrition ?? incompleteNutrition(component?.calories ?? capturedCalories(increaseOption ?? removeOption) ?? 0);
      if (removeOption && remove) {
        orderingOptionIdByCount[defaultCount - 1] = removeOption.id;
        orderingGroupIdByCount[defaultCount - 1] = remove.id;
        const removeNutrition = action.exactNutrition ?? incompleteNutrition(capturedCalories(removeOption) ?? baseNutrition.calories);
        nutritionDeltaByCount[defaultCount - 1] = negate(removeNutrition);
      }
      if (increaseOption && extra) {
        orderingOptionIdByCount[defaultCount + 1] = increaseOption.id;
        orderingGroupIdByCount[defaultCount + 1] = extra.id;
        nutritionDeltaByCount[defaultCount + 1] = action.exactNutrition ?? incompleteNutrition(capturedCalories(increaseOption) ?? baseNutrition.calories);
      }
      ingredients.push({
        id: ingredientId,
        canonicalIngredientId: action.componentId ? `mcd-component-${action.componentId}` : `mcd-breakfast-${action.key}`,
        name: action.key === "american-cheese" && /Bagel/.test(itemName) ? "American Cheese Slice" : action.name,
        image: action.image || component?.image
          ? `${IMAGE_ROOT}/${(action.image ?? component!.image!).replace(/\.[^.]+$/, "")}?fmt=png-alpha`
          : undefined,
        categories: [action.category],
        nutrition: baseNutrition,
        maxQuantity: defaultCount + (increaseOption ? 1 : 0),
        defaultOrder: 8100 + ids.length,
        orderingOptionIdByCount,
        orderingGroupIdByCount,
        nutritionDeltaByCount,
      });
      ids.push(ingredientId);
      defaultCountById.set(ingredientId, defaultCount);
    }
    const categories = ["Bread", "Cheeses", "Protein", "Toppings", "Sauces"].flatMap((name) => {
      const categoryIngredients = ids.filter((id) => ingredients.find((ingredient) => ingredient.id === id)?.categories.includes(name));
      if (!categoryIngredients.length) return [];
      const id = `mcd-${itemId}-safe-${name.toLowerCase()}`;
      categoryRules[id] = {
        // `1` means radio/single-select to the shared renderer. Breakfast
        // modifiers are independent quantity controls even when a tab happens
        // to contain only one removable bread or add-only sauce.
        maxQuantity: Math.max(2, categoryIngredients.reduce((total, ingredientId) =>
          total + (ingredients.find((ingredient) => ingredient.id === ingredientId)?.maxQuantity ?? 1), 0)),
        allowNone: false,
      };
      return [{ id, name, ingredients: categoryIngredients, allowNone: false }];
    });
    byItemId[itemId] = {
      ingredients: ids.filter((id) => defaultCountById.get(id) === 1),
      customization: { ingredientCategories: categories },
    };
  }

  for (const [itemId, capture] of Object.entries(WRAP_CAPTURE_BY_ITEM_ID)) {
    const isRanch = itemId === "mcd-item-204401";
    const removeGroup = capture.data.itemPage.optionLists.find((candidate) => /^Remove from /.test(candidate.name))!;
    const group = capture.data.itemPage.optionLists.find((candidate) => /^Extra for /.test(candidate.name))!;
    const defaultDefinitions = [
      { key: "chicken-strip", name: "McCrispy Chicken Strip", category: "Protein", nutrition: { calories: 130, protein: 0, carbs: 0, totalFat: 0 }, image: "https://s7d1.scene7.com/is/image/mcdonalds/DC_202605_25157_3PieceMcCrispyStrips_Protein_1564x1564?fmt=png-alpha", canonicalId: "mcd-component-302687" },
      { key: "flour-tortilla", name: "Flour Tortilla", category: "Bread", nutrition: { calories: 140, protein: 0, carbs: 0, totalFat: 0 }, image: "https://s7d1.scene7.com/is/image/mcdonalds/tortilla?fmt=png-alpha", canonicalId: "mcd-component-300422" },
      { key: "sauce", name: isRanch ? "McCrispy Ranch Sauce" : "Spicy Pepper Sauce", category: "Sauces", nutrition: isRanch ? WRAP_RANCH_SAUCE : WRAP_SPICY_SAUCE, interactive: true, image: isRanch
        ? "https://s7d1.scene7.com/is/image/mcdonalds/DC_Ingredient_Condiment_202203_02861-036__0922_CreamyRanch_1564x1564-1?fmt=png-alpha"
        : "https://s7d1.scene7.com/is/image/mcdonalds/t-original-spicy-sauce?fmt=png-alpha", canonicalId: isRanch ? "mcd-component-302502" : "mcd-component-302376" },
      { key: "lettuce", name: "Shredded Lettuce", category: "Toppings", nutrition: WRAP_LETTUCE, interactive: true, image: "https://s7d1.scene7.com/is/image/mcdonalds/shredded_lettuce?fmt=png-alpha", canonicalId: "mcd-component-300098" },
      { key: "shredded-cheese", name: "Shredded Cheese", category: "Cheeses", nutrition: { calories: 50, protein: 0, carbs: 0, totalFat: 0 }, interactive: true, image: "https://s7d1.scene7.com/is/image/mcdonalds/shredded_cheddar_jack_cheese?fmt=png-alpha", canonicalId: "mcd-component-302615" },
    ];
    const defaultIds = defaultDefinitions.map((definition, index) => {
      const id = `mcd-safe-${itemId.replace("mcd-item-", "")}-${definition.key}`;
      const actionName = definition.key === "sauce"
        ? (isRanch ? "McCrispy™ Ranch Sauce" : "Spicy Pepper Sauce")
        : definition.name;
      const removeOption = definition.interactive
        ? removeGroup.options.find((option) => option.name === `No ${actionName}`)
        : undefined;
      const extraOption = definition.interactive
        ? group.options.find((option) => option.name === `Extra ${actionName}`)
        : undefined;
      ingredients.push({
        id, canonicalIngredientId: definition.canonicalId, name: definition.name,
        image: definition.image, categories: [definition.category],
        nutrition: definition.nutrition,
        maxQuantity: definition.interactive ? 2 : 1, defaultOrder: 8200 + index,
        orderingOptionIdByCount: removeOption && extraOption ? { 0: removeOption.id, 2: extraOption.id } : {},
        orderingGroupIdByCount: removeOption && extraOption ? { 0: removeGroup.id, 2: group.id } : {},
        nutritionDeltaByCount: removeOption && extraOption
          ? { 0: negate(definition.nutrition), 2: definition.nutrition }
          : {},
      });
      return id;
    });
    const safeOptions = group.options.filter((option) => option.name === "Add 2 Half Strips Bacon" || option.name === "Add x2 Slc Tomato");
    const addOnIds = safeOptions.map((option, index) => {
      const isBacon = option.name.includes("Bacon");
      const id = `mcd-safe-${itemId.replace("mcd-item-", "")}-${isBacon ? "bacon" : "tomato-x2"}`;
      ingredients.push({
        id,
        canonicalIngredientId: isBacon ? "mcd-component-300163" : "mcd-component-301407-x2",
        name: isBacon ? "2 Half Strips Bacon" : "2 Tomato Slices",
        image: `${IMAGE_ROOT}/${isBacon
          ? "DC_Ingredient_202110_00507-009__6020_ThickCutApplewoodSmokedBacon_1564x1564"
          : "Ingredients_Tomato_180x180"}?fmt=png-alpha`,
        categories: ["Toppings"],
        nutrition: isBacon ? BACON : TWO_TOMATO_SLICES,
        maxQuantity: 1,
        defaultOrder: 8210 + index,
        orderingOptionIdByCount: { 1: option.id },
        orderingGroupIdByCount: { 1: group.id },
      });
      return id;
    });
    const allIds = [...defaultIds, ...addOnIds];
    const categoryNames = ["Bread", "Cheeses", "Protein", "Toppings", "Sauces"];
    const categories = categoryNames.map((name) => {
      const categoryIngredients = allIds.filter((id) => ingredients.find((ingredient) => ingredient.id === id)?.categories.includes(name));
      const categoryId = `mcd-${itemId}-safe-${name.toLowerCase()}`;
      categoryRules[categoryId] = { maxQuantity: name === "Toppings" ? 3 : 2, allowNone: name === "Toppings" };
      return { id: categoryId, name, ingredients: categoryIngredients, allowNone: name === "Toppings" };
    });
    byItemId[itemId] = {
      ingredients: defaultIds,
      readOnlyIngredientIds: defaultIds.filter((id) => {
        const ingredient = ingredients.find((candidate) => candidate.id === id)!;
        return Object.keys(ingredient.orderingOptionIdByCount ?? {}).length === 0;
      }),
      customization: { ingredientCategories: categories },
    };
  }

  for (const [itemId, capture] of Object.entries(BIG_BREAKFAST_CAPTURE_BY_ITEM_ID)) {
    const group = capture.data.itemPage.optionLists.find((candidate) => candidate.name === "Extra for Hash Browns")!;
    const option = group.options.find((candidate) => candidate.name === "Add Ketchup Packet")!;
    const ingredientId = `mcd-safe-${itemId.replace("mcd-item-", "")}-ketchup-packet`;
    ingredients.push({
      id: ingredientId,
      canonicalIngredientId: "mcd-item-200268",
      name: "Ketchup Packet",
      categories: ["Sauces"],
      nutrition: { calories: 10, protein: 0, carbs: 2, totalFat: 0 },
      maxQuantity: 1,
      defaultOrder: 8300,
      orderingOptionIdByCount: { 1: option.id },
      orderingGroupIdByCount: { 1: group.id },
    });
    const categoryId = `mcd-${itemId}-safe-add-ons`;
    categoryRules[categoryId] = { maxQuantity: 1, allowNone: true };
    byItemId[itemId] = { ingredients: [], customization: { ingredientCategories: [{ id: categoryId, name: "Sauces", ingredients: [ingredientId], allowNone: true }] } };
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
        categories: ["Sauces"],
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
    byItemId[itemId] = { ingredients: [], customization: { ingredientCategories: [{ id: categoryId, name: "Sauces", ingredients: ids, allowNone: false }] } };
  }
  // Family-level breakfast presentation pass. The generated source already
  // carries every item's official DNA component ids, so build complete
  // recipes from that relationship instead of maintaining item-by-item UI
  // exceptions. Exact cheese/bacon actions created above stay interactive;
  // all other captured defaults remain visible and read-only until a full
  // four-macro modifier portion is available.
  const breakfastRecipeItemIds = new Set([
    ...Object.keys(BREAKFAST_CAPTURE_BY_ITEM_ID),
    "mcd-item-201306", "mcd-item-200267", "mcd-item-200322", "mcd-item-200323",
    "mcd-item-200325", "mcd-item-200258", "mcd-item-200284",
  ]);
  const generatedItems = (generatedRestaurant as unknown as { items: Array<{
    id: string;
    source?: { generated?: { menu?: { componentItemIds?: string[] } } };
  }> }).items;
  const categoryOrder = ["Bread", "Cheeses", "Protein", "Toppings", "Sauces", "Potatoes", "Hotcakes", "Oatmeal"];

  for (const itemId of breakfastRecipeItemIds) {
    const sourceItem = generatedItems.find((item) => item.id === itemId);
    const componentIds = sourceItem?.source?.generated?.menu?.componentItemIds ?? [];
    const current = byItemId[itemId] ?? { ingredients: [], customization: { ingredientCategories: [] } };
    const existingIds = current.customization.ingredientCategories?.flatMap((category) => category.ingredients) ?? [];
    const existingCanonicalIds = new Set(existingIds.map((id) => ingredients.find((ingredient) => ingredient.id === id)?.canonicalIngredientId));
    const readOnlyIds = [...(current.readOnlyIngredientIds ?? [])];
    const bigBreakfastCapture = BIG_BREAKFAST_CAPTURE_BY_ITEM_ID[itemId];
    const bigBreakfastRemoveGroup = bigBreakfastCapture?.data.itemPage.optionLists.find((group) => /^Remove from /.test(group.name));

    for (const componentId of componentIds) {
      const definition = BREAKFAST_COMPONENT[componentId];
      if (!definition || existingCanonicalIds.has(`mcd-component-${componentId}`)) continue;
      const ingredientId = `mcd-breakfast-${itemId.replace("mcd-item-", "")}-${componentId}`;
      const capturedRemoveName = BIG_BREAKFAST_REMOVE_NAME_BY_COMPONENT_ID[componentId];
      const capturedRemoveOption = capturedRemoveName
        ? bigBreakfastRemoveGroup?.options.find((candidate) => normalizeBreakfastActionName(candidate.name) === capturedRemoveName)
        : undefined;
      const orderingOptionIdByCount: Record<number, string> = capturedRemoveOption ? { 0: capturedRemoveOption.id } : {};
      const orderingGroupIdByCount: Record<number, string> = capturedRemoveOption && bigBreakfastRemoveGroup
        ? { 0: bigBreakfastRemoveGroup.id }
        : {};
      ingredients.push({
        id: ingredientId,
        canonicalIngredientId: `mcd-component-${componentId}`,
        name: definition.name,
        image: definition.image ? `${IMAGE_ROOT}/${definition.image.replace(/\.[^.]+$/, "")}?fmt=png-alpha` : undefined,
        categories: [definition.category],
        nutrition: { calories: definition.calories, protein: 0, carbs: 0, totalFat: 0 },
        maxQuantity: 1,
        defaultOrder: 8500 + readOnlyIds.length,
        ...(bigBreakfastCapture && componentId !== "300036" ? {
          nutritionDeltaByCount: { 0: negate(incompleteNutrition(definition.calories)) },
          orderingOptionIdByCount,
          orderingGroupIdByCount,
        } : {}),
        // Bagel sandwiches retain their contextual component records, while
        // the standalone plain-bagel source supplies the single Ingredients
        // view card for this shared component.
        hideFromIngredientView: componentId === "302369" && itemId !== "mcd-item-201306",
      });
      current.ingredients.push(ingredientId);
      if (!bigBreakfastCapture || componentId === "300036") readOnlyIds.push(ingredientId);
      existingIds.push(ingredientId);
    }

    // Included rows follow the official DNA recipe, while the category tabs
    // still retain every captured add-only action after their defaults.
    const idByCanonical = new Map(current.ingredients.map((id) => [
      ingredients.find((ingredient) => ingredient.id === id)?.canonicalIngredientId,
      id,
    ]));
    const recipeOrderedIds = componentIds.flatMap((componentId) => {
      const id = idByCanonical.get(`mcd-component-${componentId}`);
      return id ? [id] : [];
    });
    current.ingredients = [
      ...recipeOrderedIds,
      ...current.ingredients.filter((id) => !recipeOrderedIds.includes(id)),
    ];

    const categories = categoryOrder.flatMap((name) => {
      const categoryIngredients = existingIds.filter((id) => ingredients.find((ingredient) => ingredient.id === id)?.categories.includes(name));
      if (!categoryIngredients.length) return [];
      const capturedRequiredCategory = itemId === "mcd-item-200267" && name === "Sauces"
        ? current.customization.ingredientCategories?.find((category) => category.name === "Sauces")
        : undefined;
      if (capturedRequiredCategory) return [{ ...capturedRequiredCategory, ingredients: categoryIngredients }];
      const categoryId = `mcd-${itemId}-breakfast-${name.toLowerCase()}`;
      categoryRules[categoryId] = { maxQuantity: Math.max(2, categoryIngredients.length + 1), allowNone: false };
      return [{ id: categoryId, name, ingredients: categoryIngredients, allowNone: false }];
    });
    byItemId[itemId] = {
      ingredients: current.ingredients,
      readOnlyIngredientIds: readOnlyIds,
      customization: { ingredientCategories: categories },
    };
  }

  return { ingredients, byItemId, categoryRules };
}
