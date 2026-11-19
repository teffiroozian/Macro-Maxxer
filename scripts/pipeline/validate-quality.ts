import { addFinding, type ValidationContext } from "../validate/shared";
import {
  ALL_NUTRIENTS, CORE_NUTRIENTS,
  type CompositionComponent, type DraftItem, type NutritionRecord,
  type PartialNutrition, type RestaurantDraft, type SourceRef,
} from "./contracts";
import { composeNutrition, macroEnergyCalories, resolveSelectionNutrition, type CompositionPart } from "./nutrition";
import type { DraftCheck } from "./validate";

const STATUSES = ["valid", "incomplete", "conflicting", "unsupported"] as const;
type Status = (typeof STATUSES)[number];
type RecordKind = "item" | "ingredient" | "variant" | "group" | "option" | "portion" | "component";
type Entry = {
  id: string;
  kind: RecordKind;
  status: Status;
  reasons: string[];
  missingCore?: string[];
  verificationSourceIds?: string[];
  discrepancies?: Array<{ nutrient: string; published: number; composed: number; sourceId: string }>;
};

const EPSILON = 1e-8;
const day = 86_400_000;
const kcalTolerance = (published: number) => Math.min(20, Math.max(5, published * 0.02));
const validAmount = (value: number) => Number.isFinite(value) && value > 0;

export function macroEnergyIssue(values: PartialNutrition): string | undefined {
  const { calories, protein, carbs, totalFat } = values;
  if (calories === undefined || protein === undefined || carbs === undefined || totalFat === undefined) return undefined;
  if (![calories, protein, carbs, totalFat].every((value) => Number.isFinite(value) && value >= 0)) return undefined;
  const estimated = macroEnergyCalories(protein, carbs, totalFat);
  if (calories > 0 && estimated === 0 && (values.sodium ?? 0) === 0) return "placeholder_zero_macros";
  if (calories === 0 && estimated > 5) return "zero_calories_with_macros";
  // A broad plausibility screen, using the existing calculator adapter's
  // tolerance. Label calories can use different energy factors and rounding.
  if (Math.abs(calories - estimated) > Math.max(50, calories * 0.35)) return "calorie_macro_discrepancy";
  return undefined;
}

export function auditDraftQuality(draft: RestaurantDraft, context: ValidationContext<DraftCheck>, now: number, freshnessDays: number) {
  const sources = new Map(draft.sources.map((source) => [source.id, source]));
  const usableSource = (ref: SourceRef) => sources.has(ref.sourceId) && sources.get(ref.sourceId)?.authority !== "third_party";
  const stale = (ref: SourceRef) => {
    const source = sources.get(ref.sourceId);
    return ref.flags?.includes("needs_verification") || [source?.retrievedAt, source?.sourceUpdatedAt]
      .some((date) => date && now - Date.parse(date) > freshnessDays * day);
  };
  const items = new Map(draft.items.map((item) => [item.id, item]));
  const ingredients = new Map(draft.ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const entries: Entry[] = [];
  const blockingIssues = new Map<string, Set<string>>();
  const issueCodesByEntity = new Map<string, Set<string>>();
  const blockingCustomization = new Set([
    "selection_rule_invalid", "duplicate_option_id", "required_group_unsatisfiable", "defaults_exceed_max",
    "portion_default_invalid", "composition_cycle", "ingredient_reference_missing",
    "selection_rule_conflict",
  ]);
  for (const issue of draft.issues) {
    if (!blockingCustomization.has(issue.code)) continue;
    // Group-level engine findings give the item then the implicated group/option.
    const id = issue.entityIds?.[1] ?? issue.entityIds?.[0];
    if (!id) continue;
    const codes = issueCodesByEntity.get(id) ?? new Set<string>();
    codes.add(issue.code);
    issueCodesByEntity.set(id, codes);
  }

  function entry(id: string, kind: RecordKind, status: Status, reasons: string[], block = true, detail: Partial<Entry> = {}) {
    entries.push({ id, kind, status, reasons, ...detail });
    if (block && status !== "valid") {
      const codes = blockingIssues.get(id) ?? new Set<string>();
      for (const reason of reasons) codes.add(reason);
      blockingIssues.set(id, codes);
    }
  }

  function nutrition(id: string, kind: RecordKind, record: NutritionRecord, expected: boolean) {
    const conflicts = record.conflicts.filter((conflict) => !conflict.resolvedBySourceId);
    const eligible = record.observations.filter((observation) =>
      !observation.comparisonOnly && !stale(observation.source) && usableSource(observation.source));
    const verificationSourceIds = [...new Set(record.observations.filter((observation) => stale(observation.source)).map((observation) => observation.source.sourceId))];
    const missingCore = CORE_NUTRIENTS.filter((nutrient) => record.values[nutrient] === undefined);
    const reasons = new Set(issueCodesByEntity.get(id));
    const detail = { missingCore, ...(verificationSourceIds.length ? { verificationSourceIds } : {}) };
    const hasValues = ALL_NUTRIENTS.some((nutrient) => record.values[nutrient] !== undefined);
    if (ALL_NUTRIENTS.some((nutrient) => {
      const value = record.values[nutrient];
      return value !== undefined && (!Number.isFinite(value) || value < 0);
    })) reasons.add("invalid_normalized_nutrition");
    const energyIssue = macroEnergyIssue(record.values);
    if (energyIssue) reasons.add(energyIssue);
    for (const observation of eligible) {
      const code = macroEnergyIssue(observation.values);
      if (code) reasons.add(code);
      if (observation.basis?.amount !== undefined && !validAmount(observation.basis.amount)) reasons.add("invalid_serving_amount");
    }
    const explicitBases = new Set(eligible.flatMap(({ basis, values }) =>
      basis?.amount !== undefined && basis.unit && Object.keys(values).length
        ? [`${basis.amount} ${basis.unit.trim().toLowerCase()}`] : []));
    if (explicitBases.size > 1) reasons.add("incompatible_serving_bases");
    if (!record.derivation && ALL_NUTRIENTS.some((nutrient) =>
      record.values[nutrient] !== undefined && !eligible.some((observation) => observation.values[nutrient] === record.values[nutrient]))) {
      reasons.add("value_without_verified_source");
    }
    if (!expected && !hasValues && !conflicts.length && !reasons.size) {
      entry(id, kind, "unsupported", ["no_standalone_nutrition_expected"], false, detail);
    } else if (conflicts.length) {
      entry(id, kind, "conflicting", [...reasons, "unresolved_source_conflict"], expected, detail);
    } else if (reasons.size) {
      entry(id, kind, "unsupported", [...reasons], expected, detail);
    } else if (missingCore.length) {
      entry(id, kind, verificationSourceIds.length && !hasValues ? "unsupported" : "incomplete",
        ["missing_core_nutrition", ...(verificationSourceIds.length ? ["needs_verification"] : [])], expected, detail);
    } else {
      entry(id, kind, "valid", [], false, detail);
    }
  }

  function groups(item: DraftItem) {
    return [...item.groups, ...item.variants.flatMap((variant) => variant.groups ?? [])];
  }

  function components(owner: DraftItem, id: string, record: NutritionRecord, parts: CompositionComponent<NutritionRecord>[] | undefined, expected: boolean) {
    if (!parts?.length) return;
    const panels: CompositionPart[] = [];
    for (const [index, part] of parts.entries()) {
      const ref = part.ref;
      let panel = part.nutrition;
      if (ref?.kind === "ingredient") panel = ingredients.get(ref.id)?.nutrition;
      if (ref?.kind === "item") {
        const target = items.get(ref.id);
        panel = ref.variantId ? target?.variants.find((variant) => variant.id === ref.variantId)?.nutrition : target?.nutrition;
      }
      if (ref?.kind === "option") {
        const option = groups(owner).flatMap((group) => group.options).find((choice) => choice.id === ref.id);
        panel = option ? resolveSelectionNutrition(option, ref.portionId) ?? undefined : undefined;
      }
      const reasons = [
        ...(!validAmount(part.quantity) ? ["invalid_component_quantity"] : []),
        ...(!panel ? ["component_target_missing_or_without_nutrition"] : []),
      ];
      const componentId = `${id}#component:${index + 1}`;
      if (!ref && panel) nutrition(componentId, "component", panel, expected);
      if (reasons.length) entry(ref ? componentId : `${componentId}:relationship`, "component", "unsupported", reasons, expected);
      panels.push({ label: part.label, role: part.role, quantity: part.quantity, record: panel && !reasons.length ? panel : null });
    }
    const { total } = composeNutrition(panels, record, 0);
    const discrepancies: NonNullable<Entry["discrepancies"]> = [];
    for (const observation of record.observations) {
      if (observation.comparisonOnly || stale(observation.source) || !usableSource(observation.source)) continue;
      for (const nutrient of ALL_NUTRIENTS) {
        const published = observation.values[nutrient];
        const composed = total[nutrient];
        if (published === undefined || composed === undefined) continue;
        const tolerance = nutrient === "calories" ? kcalTolerance(published) : nutrient === "sodium" || nutrient === "cholesterol" ? 10 : 1;
        if (Math.abs(composed - published) > tolerance + EPSILON) {
          discrepancies.push({ nutrient, published, composed, sourceId: observation.source.sourceId });
        }
      }
    }
    if (discrepancies.length) {
      entry(`${id}#component-total`, "component", "conflicting", ["published_component_nutrition_discrepancy"], expected, { discrepancies });
    }
  }

  for (const ingredient of draft.ingredients) {
    nutrition(ingredient.id, "ingredient", ingredient.nutrition, !ingredient.contextualNutritionOnly && !ingredient.preparationOnly);
  }
  for (const item of draft.items) {
    const active = item.isAvailable && !item.sourceOnly && !item.nonNutritionComponent;
    const rootExpected = active && (Boolean(item.composition?.length) || item.variants.length === 0);
    nutrition(item.id, "item", item.nutrition, rootExpected);
    components(item, item.id, item.nutrition, item.composition, rootExpected);
    if ((item.requirePublishedDefaultVariant || (item.model === "build-your-own" && item.variants.length > 0)) &&
        item.variants.filter((variant) => variant.isDefault).length !== 1) {
      entry(`${item.id}#variant-default`, "variant", "unsupported", ["invalid_required_default_variant"], active);
    }
    for (const variant of item.variants) {
      nutrition(variant.id, "variant", variant.nutrition, active);
      components(item, variant.id, variant.nutrition, variant.composition, active);
    }
    for (const group of groups(item)) {
      const reasons = new Set(issueCodesByEntity.get(group.id));
      const bounds = [group.minSelections, group.maxSelections];
      if (bounds.some((bound) => bound !== null && !Number.isInteger(bound))) reasons.add("noninteger_selection_limit");
      const minimum = group.minSelections ?? 0;
      if (minimum > 1 && group.options.filter((option) => option.isAvailable && !option.isExclusive).length < minimum) {
        reasons.add("required_group_unsatisfiable");
      }
      if (group.options.some((option) => option.isDefault && !option.isAvailable)) reasons.add("default_option_unavailable");
      if (group.options.some((option) => option.isDefault && option.isExclusive) && group.options.filter((option) => option.isDefault).length > 1) reasons.add("exclusive_default_combination");
      entry(group.id, "group", reasons.size ? "unsupported" : "valid", [...reasons], active);
      for (const option of group.options) {
        const offered = active && option.isAvailable;
        const expected = offered && group.role !== "preparation" && !option.isExclusive;
        nutrition(option.id, "option", option.nutrition, expected && !option.portions?.length);
        components(item, option.id, option.nutrition, option.composition, expected);
        const problems = new Set(issueCodesByEntity.get(option.id));
        if (option.ingredientId && !ingredients.has(option.ingredientId)) problems.add("ingredient_reference_missing");
        const portionIds = option.portions?.map((portion) => portion.id) ?? [];
        if (new Set(portionIds).size !== portionIds.length) problems.add("duplicate_portion_id");
        if (problems.size) entry(`${option.id}#relationship`, "option", "unsupported", [...problems], offered);
        for (const portion of option.portions ?? []) {
          nutrition(portion.id, "portion", portion.nutrition, expected);
          components(item, portion.id, portion.nutrition, portion.composition, expected);
          if ((portion.multiplier !== undefined && !validAmount(portion.multiplier)) ||
              (portion.nutrition.derivation?.method === "scaled" && !portion.nutrition.derivation.evidence)) {
            entry(`${portion.id}#relationship`, "portion", "unsupported", ["unverified_portion_multiplier"], expected);
          }
        }
      }
    }
  }

  if (draft.issues.some((issue) => issue.code === "topping_calories_not_additive_verified")) {
    entry(draft.restaurant.id, "item", "unsupported", ["topping_calories_not_additive_verified"]);
  }
  const byReason = new Map<string, Set<string>>();
  for (const [id, codes] of blockingIssues) for (const code of codes) {
    const ids = byReason.get(code) ?? new Set<string>();
    ids.add(id);
    byReason.set(code, ids);
  }
  const blockers = Object.fromEntries([...byReason].map(([code, ids]) => [code, ids.size]));
  for (const [code, ids] of byReason) {
    addFinding(context, "warning", "readiness", code, `${ids.size} validation record(s) require review for ${code}.`,
      { affectedCount: ids.size, recordIds: [...ids].slice(0, 20) });
  }
  const counts = Object.fromEntries(STATUSES.map((status) => [status, 0])) as Record<Status, number>;
  for (const result of entries) counts[result.status]++;
  return { counts, blockers, records: entries };
}
