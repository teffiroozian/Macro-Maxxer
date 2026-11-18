import type { Nutrition } from "@/types/nutrition";
import type { OrderingGroup, OrderingOption, OrderingPlan, SavedOrdering } from "@/types/ordering";

const CORE = ["calories", "protein", "carbs", "totalFat"] as const;
const OPTIONAL = ["satFat", "transFat", "cholesterol", "sodium", "fiber", "sugars"] as const;

export type ActiveOrderingOption = {
  path: string;
  option: OrderingOption;
  quantity: number;
  parentQuantity: number;
  children: ActiveOrderingGroup[];
  instances: Array<{ path: string; quantity: number; children: ActiveOrderingGroup[] }>;
};

export type ActiveOrderingGroup = {
  path: string;
  group: OrderingGroup;
  options: ActiveOrderingOption[];
};

export function evaluateOrdering(plan: OrderingPlan, quantities: SavedOrdering["quantities"], parentPath = "") {
  const errors: string[] = [];
  const nutrition: Partial<Nutrition> = { ...plan.baseNutrition };
  const activeQuantities: SavedOrdering["quantities"] = {};
  const ancestorGroups = new Set<OrderingGroup>();
  const validBound = (value: number) => Number.isSafeInteger(value) && value >= 0;

  const apply = (panel: Nutrition, units: number) => {
    for (const nutrient of [...CORE, ...OPTIONAL]) {
      const value = panel[nutrient];
      if (value === undefined || nutrition[nutrient] === undefined) delete nutrition[nutrient];
      else nutrition[nutrient] += value * units;
    }
  };

  function walk(groups: OrderingGroup[], parent: string, multiplier: number): ActiveOrderingGroup[] {
    const groupIds = new Set<string>();
    return groups.flatMap((group) => {
      const path = `${parent}/${encodeURIComponent(group.id)}`;
      if (groupIds.has(group.id) || ancestorGroups.has(group) || parent.split("/").length > 64) {
        errors.push(`${group.label}: duplicate or recursive choice group.`);
        return [];
      }
      groupIds.add(group.id);
      ancestorGroups.add(group);
      const optionIds = new Set<string>();
      let count = 0;
      const options = group.options.flatMap((option): ActiveOrderingOption[] => {
        const optionPath = `${path}/${encodeURIComponent(option.id)}`;
        if (optionIds.has(option.id)) {
          errors.push(`${group.label}: duplicate option ${option.label}.`);
          return [];
        }
        optionIds.add(option.id);
        const defaultQuantity = option.defaultQuantity ?? 0;
        const requested = Object.hasOwn(quantities, optionPath) ? quantities[optionPath] : defaultQuantity;
        if (!validBound(defaultQuantity) || !validBound(requested) ||
            (option.min !== undefined && (!validBound(option.min) || requested < option.min)) ||
            (option.max !== undefined && (!validBound(option.max) || requested > option.max))) {
          errors.push(`${option.label}: quantity outside the allowed range.`);
        }
        const quantity = validBound(requested) ? requested : 0;
        activeQuantities[optionPath] = quantity;
        count += quantity;
        const { effect } = option;
        if (effect.kind !== "none") {
          const delta = effect.kind === "included" ? quantity - defaultQuantity : quantity;
          if (CORE.some((key) => !Number.isFinite(effect.nutrition[key]) || effect.nutrition[key] < 0)) {
            errors.push(`${option.label}: source nutrition is incomplete.`);
          } else if (delta) {
            apply(effect.nutrition, delta * multiplier);
          }
        }
        const copies = option.independentCopies ? Math.min(quantity, option.max ?? 0, 32) : Number(quantity > 0);
        const instances = Array.from({ length: copies }, (_, index) => {
          // Instance routes cannot collide with source IDs, which are URI encoded.
          const scope = option.independentCopies ? `${optionPath}/@${index + 1}` : optionPath;
          const units = option.independentCopies ? 1 : quantity;
          return { path: scope, quantity: units, children: option.groups ? walk(option.groups, scope, units * multiplier) : [] };
        });
        return [{ path: optionPath, option, quantity, parentQuantity: multiplier, instances, children: instances.flatMap((instance) => instance.children) }];
      });
      ancestorGroups.delete(group);
      if (group.selectionMode === "single-component" && count !== 1) {
        errors.push(`${group.label}: choose one component for this preview.`);
      }
      if (!validBound(group.min) || count < group.min || (group.max !== null && (!validBound(group.max) || count > group.max))) {
        errors.push(`${group.label}: select ${group.min}${group.max === null ? " or more" : group.min === group.max ? "" : `–${group.max}`}.`);
      }
      return [{ path, group, options }];
    });
  }

  const groups = walk(plan.groups, parentPath, 1);
  if (CORE.some((key) => !Number.isFinite(nutrition[key]) || nutrition[key]! < 0)) {
    errors.push("This selection has incomplete or inconsistent nutrition.");
  }
  for (const nutrient of OPTIONAL) {
    const value = nutrition[nutrient];
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) delete nutrition[nutrient];
  }
  return { groups, quantities: activeQuantities, errors, nutrition: errors.length ? undefined : nutrition as Nutrition };
}

export function canRestoreSavedOrdering(plan: OrderingPlan, saved: SavedOrdering): boolean {
  if (saved.planId !== plan.id) return false;
  const restored = evaluateOrdering(plan, saved.quantities);
  return Boolean(restored.nutrition) && Object.entries(saved.quantities).every(
    ([path, quantity]) => Object.hasOwn(restored.quantities, path) && restored.quantities[path] === quantity,
  ) && Object.entries(restored.quantities).every(
    ([path, quantity]) => quantity === 0 || Object.hasOwn(saved.quantities, path),
  );
}

// When a branch closes, remove its prior choices from saved state.
export function updateOrderingQuantities(plan: OrderingPlan, quantities: SavedOrdering["quantities"], changes: SavedOrdering["quantities"]) {
  const current = evaluateOrdering(plan, quantities);
  const activeChanges = Object.fromEntries(Object.entries(changes).filter(([path]) => Object.hasOwn(current.quantities, path)));
  return evaluateOrdering(plan, { ...current.quantities, ...activeChanges }).quantities;
}

// Validate all branches at import time, including choices hidden by defaults.
export function validateOrderingPlan(plan: OrderingPlan): string[] {
  const errors: string[] = [];
  const validCount = (value: number) => Number.isSafeInteger(value) && value >= 0;
  const validPanel = (panel: Nutrition) =>
    CORE.every((key) => Number.isFinite(panel[key]) && panel[key] >= 0) &&
    OPTIONAL.every((key) => panel[key] === undefined || (Number.isFinite(panel[key]) && panel[key] >= 0));
  const ancestors = new Set<OrderingGroup>();

  function visit(groups: OrderingGroup[], path: string, depth: number) {
    const seen = new Set<string>();
    for (const group of groups) {
      const scope = `${path}/${group.id}`;
      if (!group.id || seen.has(group.id) || ancestors.has(group) || depth > 32) {
        errors.push(`${scope}: invalid, duplicate or recursive group.`);
        continue;
      }
      seen.add(group.id);
      const min = group.min;
      const max = group.max ?? Infinity;
      if (!validCount(min) || (group.max !== null && !validCount(max)) || min > max) {
        errors.push(`${scope}: invalid group bounds.`);
      }
      if (group.selectionMode === "single-component" && (min > 1 || max < 1)) {
        errors.push(`${scope}: source bounds conflict with the single-component picker.`);
      }
      const optionIds = new Set<string>();
      let defaults = 0;
      let minimumAvailable = 0;
      let maximumAvailable = 0;
      ancestors.add(group);
      for (const option of group.options) {
        const edge = `${scope}/${option.id}`;
        if (!option.id || optionIds.has(option.id)) errors.push(`${edge}: invalid or duplicate option ID.`);
        optionIds.add(option.id);
        const floor = option.min ?? 0;
        const ceiling = option.max ?? Infinity;
        const initial = option.defaultQuantity ?? 0;
        if (!validCount(floor) || (option.max !== undefined && !validCount(ceiling)) ||
            !validCount(initial) || floor > ceiling || initial < floor || initial > ceiling) {
          errors.push(`${edge}: invalid option bounds or default.`);
        }
        if (option.independentCopies && (option.max === undefined || option.max > 32 || !option.groups?.length)) {
          errors.push(`${edge}: independent copies require child groups and a limit of at most 32.`);
        }
        defaults += initial;
        minimumAvailable += floor;
        maximumAvailable += ceiling;
        if (option.effect.kind !== "none" && !validPanel(option.effect.nutrition)) {
          errors.push(`${edge}: incomplete or invalid source nutrition.`);
        }
        if (option.groups) visit(option.groups, edge, depth + 1);
      }
      const effectiveMin = group.selectionMode === "single-component" ? 1 : min;
      const effectiveMax = group.selectionMode === "single-component" ? 1 : max;
      if (defaults > effectiveMax || minimumAvailable > effectiveMax || maximumAvailable < effectiveMin) {
        errors.push(`${scope}: incompatible option and group bounds.`);
      }
      ancestors.delete(group);
    }
  }

  if (!plan.id || !validPanel(plan.baseNutrition)) errors.push("Invalid plan ID or base nutrition.");
  visit(plan.groups, plan.id, 0);
  return errors;
}
