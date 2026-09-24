import type { Nutrition } from "@/types/nutrition";

export type McDonaldsNutrients = Record<string, number>;

export type McDonaldsComponentNutritionContext = {
  id: string;
  componentId: string;
  parentItemId: string;
  name: string;
  nutrients: McDonaldsNutrients;
  displayedNutrients: McDonaldsNutrients;
  sourceExpression: string;
};

export type McDonaldsCustomizationAction = "remove" | "extra" | "add";

export type McDonaldsOrderingOption = {
  id: string;
  groupId: string;
  groupName: string;
  action: McDonaldsCustomizationAction;
  name: string;
  componentId: string;
  nutritionContextId: string;
  priceCents: number;
  currency: string;
  calorieLabel: string;
  chargeAbove: number;
  available: boolean;
  defaultQuantity: number;
  minQuantity: number | null;
  maxQuantity: number | null;
};

export type McDonaldsCustomizationModel = {
  schemaVersion: 1;
  itemId: string;
  orderingItemId: string;
  defaultComponents: Array<{ componentId: string; nutritionContextId: string; quantity: number }>;
  componentContexts: McDonaldsComponentNutritionContext[];
  groups: Array<{
    id: string;
    name: string;
    minOptions: number;
    maxOptions: number;
    optional: boolean;
    optionIds: string[];
  }>;
  options: McDonaldsOrderingOption[];
};

export type McDonaldsOptionSelection = { optionId: string; quantity?: number };

export type McDonaldsSelectionIssue = { code: string; message: string; groupId?: string; optionId?: string };

function addScaled(target: McDonaldsNutrients, source: McDonaldsNutrients, multiplier: number): void {
  for (const [key, value] of Object.entries(source)) target[key] = (target[key] ?? 0) + value * multiplier;
}

export function calculateMcDonaldsCustomizationNutrition(
  model: McDonaldsCustomizationModel,
  selections: McDonaldsOptionSelection[],
): McDonaldsNutrients {
  const contexts = new Map(model.componentContexts.map((context) => [context.id, context]));
  const options = new Map(model.options.map((option) => [option.id, option]));
  let contributions = model.defaultComponents.map((component) => ({ ...component }));
  const orderedSelections = [...selections].sort((left, right) => {
    const leftAction = options.get(left.optionId)?.action;
    const rightAction = options.get(right.optionId)?.action;
    return Number(leftAction !== "remove") - Number(rightAction !== "remove");
  });
  for (const selection of orderedSelections) {
    const option = options.get(selection.optionId);
    if (!option) throw new Error(`Unknown McDonald's customization option ${selection.optionId}`);
    const quantity = selection.quantity ?? 1;
    if (!Number.isInteger(quantity) || quantity < 0) throw new Error(`Invalid quantity for option ${selection.optionId}`);
    if (option.action === "remove") {
      const existing = contributions.find((component) => component.componentId === option.componentId);
      if (existing) existing.quantity = Math.max(0, existing.quantity - quantity);
      contributions = contributions.filter((component) => component.quantity > 0);
      continue;
    }
    const existing = contributions.find((component) =>
      component.componentId === option.componentId && component.nutritionContextId === option.nutritionContextId
    );
    if (existing && option.action === "add") existing.quantity = quantity;
    else if (existing) existing.quantity += quantity;
    else contributions.push({ componentId: option.componentId, nutritionContextId: option.nutritionContextId, quantity });
  }
  const result: McDonaldsNutrients = {};
  for (const { nutritionContextId, quantity } of contributions) {
    const context = contexts.get(nutritionContextId);
    if (!context) throw new Error(`Missing McDonald's component nutrition context ${nutritionContextId}`);
    addScaled(result, context.nutrients, quantity);
  }
  return result;
}

export function validateMcDonaldsCustomizationSelections(
  model: McDonaldsCustomizationModel,
  selections: McDonaldsOptionSelection[],
): McDonaldsSelectionIssue[] {
  const options = new Map(model.options.map((option) => [option.id, option]));
  const issues: McDonaldsSelectionIssue[] = [];
  const countByGroup = new Map<string, number>();
  for (const selection of selections) {
    const option = options.get(selection.optionId);
    if (!option) { issues.push({ code: "unknown_option", optionId: selection.optionId, message: `Unknown option ${selection.optionId}` }); continue; }
    const quantity = selection.quantity ?? 1;
    if (!option.available) issues.push({ code: "unavailable_option", optionId: option.id, message: `${option.name} is unavailable` });
    if (!Number.isInteger(quantity) || quantity < 0) issues.push({ code: "invalid_quantity", optionId: option.id, message: `${option.name} has invalid quantity ${quantity}` });
    if (option.minQuantity !== null && quantity < option.minQuantity) issues.push({ code: "below_option_min", optionId: option.id, message: `${option.name} requires at least ${option.minQuantity}` });
    if (option.maxQuantity !== null && quantity > option.maxQuantity) issues.push({ code: "above_option_max", optionId: option.id, message: `${option.name} allows at most ${option.maxQuantity}` });
    countByGroup.set(option.groupId, (countByGroup.get(option.groupId) ?? 0) + quantity);
  }
  for (const group of model.groups) {
    const count = countByGroup.get(group.id) ?? 0;
    if (count < group.minOptions) issues.push({ code: "below_group_min", groupId: group.id, message: `${group.name} requires at least ${group.minOptions}` });
    if (count > group.maxOptions) issues.push({ code: "above_group_max", groupId: group.id, message: `${group.name} allows at most ${group.maxOptions}` });
  }
  return issues;
}

export function toMacroMaxxerNutrition(nutrients: McDonaldsNutrients): Nutrition {
  return {
    calories: nutrients.calories ?? 0,
    protein: nutrients.protein ?? 0,
    carbs: nutrients.carbohydrate ?? 0,
    totalFat: nutrients.fat ?? 0,
    ...(nutrients.saturated_fat !== undefined ? { satFat: nutrients.saturated_fat } : {}),
    ...(nutrients.trans_fat !== undefined ? { transFat: nutrients.trans_fat } : {}),
    ...(nutrients.cholesterol !== undefined ? { cholesterol: nutrients.cholesterol } : {}),
    ...(nutrients.sodium !== undefined ? { sodium: nutrients.sodium } : {}),
    ...(nutrients.fibre !== undefined ? { fiber: nutrients.fibre } : {}),
    ...(nutrients.sugars !== undefined ? { sugars: nutrients.sugars } : {}),
  };
}
