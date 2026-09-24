import type { IngredientCategoryRule, IngredientItem, ItemCustomizationOverride } from "@/types/menu";
import type { Nutrition } from "@/types/nutrition";
import { toMacroMaxxerNutrition, type McDonaldsComponentNutritionContext, type McDonaldsCustomizationModel, type McDonaldsNutrients, type McDonaldsOrderingOption } from "./customization";

type ComponentGroup = "buns" | "protein" | "cheeses" | "toppings" | "sauces";
const GROUP_ORDER: ComponentGroup[] = ["buns", "cheeses", "protein", "toppings", "sauces"];
const GROUP_LABEL: Record<ComponentGroup, string> = { buns: "Bread", protein: "Protein", cheeses: "Cheeses", toppings: "Toppings", sauces: "Sauces" };
const GROUP_KEYWORDS: Array<[RegExp, ComponentGroup]> = [
  [/bun|roll/i, "buns"], [/beef|patty|filet/i, "protein"], [/cheese/i, "cheeses"],
  [/bacon|lettuce|tomato|onion|pickle/i, "toppings"], [/ketchup|mustard|mayonnaise|mayo|sauce/i, "sauces"],
];

const IMAGE_ROOT = "https://s7d1.scene7.com/is/image/mcdonalds";
// Official attach_product_thumbnail_image values from raw/item-details.json.
const IMAGE_NAME: Record<string, string> = {
  // The Big Mac sauce thumbnail is present in the captured official DNA
  // payload. The bun payload has no dedicated thumbnail, so use the captured
  // official sesame-seed bun artwork rather than a third-party substitute.
  "301554": "DC_Ingredient_202110_00055-080__9049_BigMacSauce_1564x1564.png",
  "302510": "quarter_pounder_bun.png",
  "300038": "DC_Ingredient_202111_00005-086__4259_BigMac_FreshBeefPatty_1564x1564.png",
  "300041": "reconstituted_onions.png",
  "301574": "DC_Ingredient_202111_00006-417__4076_QuarterPound_FreshBeefPatty_1564x1564.png",
  "301516": "quarter_pounder_bun.png", "301578": "regular_bun.png",
  "301518": "ingredient_american_cheese_180x180.png",
  "300037": "DC_Ingredient_202111_02679-243__0912_Ketchup_1564x1564.png", "300042": "pickles.png",
  "301502": "DC_Ingredient_202110_00028-075__0909_SlicedOnions_1564x1564.png",
  "300044": "DC_Ingredient_202110_00026-041__0910_Mustard_1564x1564.png",
  "300163": "DC_Ingredient_202110_00507-009__6020_ThickCutApplewoodSmokedBacon_1564x1564.png",
  "300098": "shredded_lettuce.png", "301407": "Ingredients_Tomato_180x180.png",
  "300430": "DC_Ingredient_202312_01116-309__0918_Mayonaise_1564x1564.png",
  // The sandwich-size ranch portion has no attached thumbnail in the capture;
  // use McDonald's captured official ranch artwork rather than leaving it blank.
  "204161": "DC_Ingredient_Condiment_202203_02861-036__0922_CreamyRanch_1564x1564-1.png",
  "302309": "t-crispy-chicken-fillet.jpg", "302402": "t-potato-roll.jpg",
  "302415": "t-crinkle-cut-pickle.jpg", "302376": "t-original-spicy-sauce.jpg",
  "300708": "mcchicken.png",
  "300055": "fish.png", "302503": "DC_Ingredient_202312_00009-000__9087_TartarSauce_1564x1564.png",
  "300716": "american_cheese_half.png",
};
const DISPLAY_NAME: Record<string, string> = {
  "302510": "Big Mac Bun", "301554": "Mac Sauce", "300041": "Diced Onions",
  "301516": "Sesame Seed Bun", "301518": "American Cheese",
  "300037": "Ketchup", "300042": "Pickle", "301502": "Slivered Onions", "300044": "Mustard",
  "300098": "Shredded Lettuce", "301407": "Tomato", "300430": "Mayonnaise",
  "302309": "McCrispy Filet", "302402": "Potato Roll", "302415": "Crinkle Cut Pickle",
  "300310": "Butter", "302376": "Spicy Pepper Sauce", "204161": "McCrispy Ranch Sauce",
  "300708": "McChicken Patty", "301578": "Regular Bun",
  "300055": "Filet-O-Fish Patty", "302503": "Tartar Sauce", "300716": "American Cheese",
};

function componentDisplayName(componentId: string, defaultCount: number, fallbackName: string): string {
  if (componentId === "300038") return defaultCount > 1 ? "100% Beef Patties" : "100% Beef Patty";
  if (componentId === "301574") return defaultCount > 1
    ? "Quarter Pound 100% Beef Patties"
    : "Quarter Pound 100% Beef Patty";
  return DISPLAY_NAME[componentId] ?? fallbackName;
}

function classifyOption(option: Pick<McDonaldsOrderingOption, "name">): ComponentGroup {
  return GROUP_KEYWORDS.find(([pattern]) => pattern.test(option.name))?.[1] ?? "toppings";
}
function negateNutrition(nutrients: McDonaldsNutrients): Nutrition {
  return toMacroMaxxerNutrition(Object.fromEntries(Object.entries(nutrients).map(([key, value]) => [key, -value])));
}

export const MCDONALDS_INGREDIENT_ID_PREFIX = "mcd-";
export function ingredientIdForOrderingOption(itemId: string, optionId: string): string {
  return `${MCDONALDS_INGREDIENT_ID_PREFIX}${itemId}-opt-${optionId}`;
}
export function ingredientIdForComponent(itemId: string, componentId: string): string {
  return `${MCDONALDS_INGREDIENT_ID_PREFIX}${itemId}-component-${componentId}`;
}
export function orderingOptionIdFromIngredientId(ingredientId: string): string | undefined {
  return ingredientId.match(/-opt-(.+)$/)?.[1];
}
export function orderingOptionIdForIngredientCount(ingredient: Pick<IngredientItem, "orderingOptionIdByCount">, count: number): string | undefined {
  return ingredient.orderingOptionIdByCount?.[count];
}

export type McDonaldsItemCustomizationData = {
  ingredients: IngredientItem[];
  itemIngredientIds: string[];
  readOnlyIngredientIds: string[];
  itemCustomization: ItemCustomizationOverride;
  categoryRules: Record<string, IngredientCategoryRule>;
};

export type McDonaldsSharedSandwichComponent = {
  componentId: string;
  context: McDonaldsComponentNutritionContext;
  maxQuantity?: number;
};

export function buildMcDonaldsItemCustomization(
  model: McDonaldsCustomizationModel,
  menuItemId: string,
  sharedComponents: McDonaldsSharedSandwichComponent[] = [],
): McDonaldsItemCustomizationData {
  const contexts = new Map(model.componentContexts.map((context) => [context.id, context]));
  const defaults = new Map(model.defaultComponents.map((component) => [component.componentId, component]));
  const optionsByComponent = Map.groupBy(model.options, (option) => option.componentId);
  const groupedIngredientIds = new Map<ComponentGroup, string[]>();
  const ingredients: IngredientItem[] = [];
  const itemIngredientIds: string[] = [];
  const readOnlyIngredientIds: string[] = [];

  const sharedByComponent = new Map(sharedComponents
    // Filet-O-Fish models its included half slice as component 300716. Do not
    // add a second full-slice card with the same user-facing cheese identity.
    .filter((entry) => !(entry.componentId === "301518" && defaults.has("300716")))
    .map((entry) => [entry.componentId, entry]));
  const componentIds = [...new Set([
    ...optionsByComponent.keys(),
    ...defaults.keys(),
    ...sharedByComponent.keys(),
  ])];
  componentIds.forEach((componentId, index) => {
    const options = optionsByComponent.get(componentId) ?? [];
    const defaultComponent = defaults.get(componentId);
    const removeOption = options.find((option) => option.action === "remove");
    const increaseOption = options.find((option) => option.action === "extra" || option.action === "add");
    const representative = removeOption ?? increaseOption;
    const defaultContext = defaultComponent ? contexts.get(defaultComponent.nutritionContextId) : undefined;
    const increaseContext = increaseOption ? contexts.get(increaseOption.nutritionContextId) : undefined;
    const sharedComponent = sharedByComponent.get(componentId);
    const sharedContext = sharedComponent?.context;
    if ((defaultComponent && !defaultContext) || (increaseOption && !increaseContext)) return;
    if (!representative && !defaultContext && !sharedContext) return;

    const defaultCount = defaultComponent?.quantity ?? 0;
    // Ordering data supplies one add/extra action, so add-only rows are 0→1
    // and included rows with an extra action are 0→1→2.
    const isSharedAddOnly = !defaultComponent && !representative && Boolean(sharedContext);
    const maxQuantity = increaseOption
      ? defaultCount + 1
      : Math.max(defaultCount, sharedComponent?.maxQuantity ?? (isSharedAddOnly ? 1 : defaultCount));
    const ingredientId = ingredientIdForComponent(model.itemId, componentId);
    const fallbackName = representative?.name.replace(/^(?:No|Extra|Add)\s+/i, "") ?? defaultContext?.name ?? sharedContext!.name;
    const group = classifyOption({ name: fallbackName });
    const baseNutrition = defaultContext?.nutrients ?? increaseContext?.nutrients ?? sharedContext?.nutrients ?? {};
    const nutritionDeltaByCount: Record<number, Nutrition> = {};
    const orderingOptionIdByCount: Record<number, string> = {};
    const orderingGroupIdByCount: Record<number, string> = {};
    if (removeOption && defaultContext) {
      const removeCount = Math.max(0, defaultCount - 1);
      nutritionDeltaByCount[removeCount] = negateNutrition(defaultContext.nutrients);
      orderingOptionIdByCount[removeCount] = removeOption.id;
      orderingGroupIdByCount[removeCount] = removeOption.groupId;
    }
    if (increaseOption && increaseContext) {
      nutritionDeltaByCount[maxQuantity] = toMacroMaxxerNutrition(increaseContext.nutrients);
      orderingOptionIdByCount[maxQuantity] = increaseOption.id;
      orderingGroupIdByCount[maxQuantity] = increaseOption.groupId;
    }

    ingredients.push({
      id: ingredientId,
      name: componentDisplayName(
        componentId,
        defaultCount,
        fallbackName,
      ),
      image: IMAGE_NAME[componentId]
        ? `${IMAGE_ROOT}/${IMAGE_NAME[componentId].replace(/\.[^.]+$/, "")}?fmt=png-alpha`
        : undefined,
      categories: [GROUP_LABEL[group]],
      nutrition: toMacroMaxxerNutrition(baseNutrition),
      maxQuantity,
      defaultOrder: 5000 + index,
      orderingOptionIdByCount,
      orderingGroupIdByCount,
      nutritionDeltaByCount,
    });
    if (defaultCount > 0) itemIngredientIds.push(defaultCount === 2 ? `${ingredientId}:extra` : ingredientId);
    if (!representative && defaultComponent && maxQuantity === defaultCount) readOnlyIngredientIds.push(ingredientId);
    groupedIngredientIds.set(group, [...(groupedIngredientIds.get(group) ?? []), ingredientId]);
  });

  const orderedGroups = GROUP_ORDER.filter((group) => groupedIngredientIds.has(group));
  const itemCustomization: ItemCustomizationOverride = {
    ingredientCategories: orderedGroups.map((group) => ({
      name: GROUP_LABEL[group], id: `mcd-${menuItemId}-${group}`,
      ingredients: groupedIngredientIds.get(group)!, allowNone: false,
    })),
  };
  const categoryRules: Record<string, IngredientCategoryRule> = Object.fromEntries(orderedGroups.map((group) => [
    `mcd-${menuItemId}-${group}`,
    { maxQuantity: Math.max(...groupedIngredientIds.get(group)!.map((id) => ingredients.find((ingredient) => ingredient.id === id)!.maxQuantity)), allowNone: false },
  ]));
  return { ingredients, itemIngredientIds, readOnlyIngredientIds, itemCustomization, categoryRules };
}
