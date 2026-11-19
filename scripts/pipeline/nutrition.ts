import type { Nutrition } from "../../types/nutrition";
import {
  ALL_NUTRIENTS,
  CORE_NUTRIENTS,
  type NutrientKey,
  type CompositionRole,
  type NutritionConflict,
  type NutritionDerivation,
  type NutritionInput,
  type NutritionRecord,
  type PartialNutrition,
  type PortionPolicy,
  type SelectionOption,
} from "./contracts";

export function reconcileNutrition(input: NutritionInput, precedence: readonly string[] = []): NutritionRecord {
  const eligible = input.filter((observation) => !observation.comparisonOnly &&
    !observation.source.flags?.includes("needs_verification"));
  const values: PartialNutrition = {};
  const conflicts: NutritionConflict[] = [];

  for (const nutrient of ALL_NUTRIENTS) {
    const seen = eligible.flatMap((observation) => {
      const value = observation.values[nutrient];
      return typeof value === "number" && Number.isFinite(value)
        ? [{ sourceId: observation.source.sourceId, value, basis: observation.basis }]
        : [];
    });
    if (seen.length === 0) continue;
    if (new Set(seen.map((entry) => entry.value)).size === 1) {
      values[nutrient] = seen[0].value;
      continue;
    }
    const preferredSourceId = precedence.find((sourceId) => seen.some((entry) => entry.sourceId === sourceId));
    const preferred = seen.filter((entry) => entry.sourceId === preferredSourceId);
    // Precedence only settles a conflict when the preferred source is itself
    // unambiguous.
    if (preferredSourceId && new Set(preferred.map((entry) => entry.value)).size === 1) {
      values[nutrient] = preferred[0].value;
      conflicts.push({ nutrient, observations: seen, resolvedBySourceId: preferredSourceId });
    } else {
      conflicts.push({ nutrient, observations: seen });
    }
  }

  const missingCore = CORE_NUTRIENTS.filter((nutrient) => values[nutrient] === undefined);
  return {
    values,
    completeness:
      missingCore.length === 0 ? "complete" : Object.keys(values).length === 0 ? "none" : "partial",
    missingCore,
    conflicts,
    observations: input,
  };
}

export function unresolvedConflicts(record: NutritionRecord): NutritionConflict[] {
  return record.conflicts.filter((conflict) => conflict.resolvedBySourceId === undefined);
}

// Runtime nutrition exists only when all four core macros are known.
export function toRuntimeNutrition(record: NutritionRecord): Nutrition | null {
  if (record.completeness !== "complete") return null;
  return record.values as Nutrition;
}

export type NutritionTotal = {
  values: PartialNutrition;
  // Nutrients at least one part does not publish; no total is given for them.
  unknown: NutrientKey[];
};

// A nutrient is totalled only when every part publishes it. A missing value
// is never treated as zero.
export function sumNutrition(parts: readonly NutritionRecord[]): NutritionTotal {
  const values: PartialNutrition = {};
  const unknown: NutrientKey[] = [];
  for (const nutrient of ALL_NUTRIENTS) {
    const partValues = parts.map((part) => part.values[nutrient]);
    if (partValues.every((value): value is number => value !== undefined)) {
      values[nutrient] = partValues.reduce((total, value) => total + value, 0);
    } else if (partValues.some((value) => value !== undefined) || (CORE_NUTRIENTS as readonly string[]).includes(nutrient)) {
      unknown.push(nutrient);
    }
  }
  return { values, unknown };
}

function recordFromValues(
  values: PartialNutrition,
  own: Pick<NutritionRecord, "conflicts" | "observations">,
  derivation: NutritionDerivation,
): NutritionRecord {
  const missingCore = CORE_NUTRIENTS.filter((nutrient) => values[nutrient] === undefined);
  return {
    values,
    completeness: missingCore.length === 0 ? "complete" : Object.keys(values).length === 0 ? "none" : "partial",
    missingCore,
    conflicts: own.conflicts,
    observations: own.observations,
    derivation,
  };
}

export type PortionCalculation = {
  // The portion's own reconciled observations.
  published: NutritionRecord;
  policy: PortionPolicy;
  isDefault: boolean;
  multiplier?: number;
  evidence?: string;
  // The default portion the factor is relative to.
  base?: { id: string; record: NutritionRecord };
};

// Final nutrition for one portion. A complete published panel always wins.
// Only a multiplier-policy portion without one is calculated, and only when
// a factor is given; otherwise whatever was published is returned unchanged.
export function calculatePortionNutrition(calculation: PortionCalculation): NutritionRecord {
  const { published, policy, isDefault, multiplier, base } = calculation;
  if (policy !== "multiplier" || isDefault || published.completeness === "complete") return published;
  if (multiplier === undefined || !base) return published;
  const values: PartialNutrition = {};
  for (const nutrient of ALL_NUTRIENTS) {
    const value = base.record.values[nutrient];
    if (value !== undefined) values[nutrient] = value * multiplier;
  }
  return recordFromValues(values, published, {
    method: "scaled",
    baseId: base.id,
    factor: multiplier,
    ...(calculation.evidence ? { evidence: calculation.evidence } : {}),
  });
}

export type CompositionPart = {
  label: string;
  quantity: number;
  role: CompositionRole;
  refId?: string;
  evidence?: string;
  // null when the component points at a record that does not exist.
  record: NutritionRecord | null;
};

export type ComposedNutrition = {
  record: NutritionRecord;
  // Component sum before any published value was preferred.
  total: PartialNutrition;
  // Published values that disagree with the component sum.
  mismatches: Array<{ nutrient: NutrientKey; published: number; composed: number }>;
  // Components that keep at least one core macro out of the total.
  incompleteParts: string[];
};

// Totals an item from its components. A nutrient is totalled only when every
// component has it. Wherever the item itself publishes a value that agrees
// with the total (calories within `calorieTolerance`, other nutrients
// exactly), or publishes a nutrient the total lacks, the published value is
// used; a published value that disagrees is reported and the total is kept.
export function composeNutrition(
  parts: readonly CompositionPart[],
  published: NutritionRecord,
  calorieTolerance: number,
): ComposedNutrition {
  const total: PartialNutrition = {};
  for (const nutrient of ALL_NUTRIENTS) {
    const amounts = parts.map((part) => {
      const value = part.record?.values[nutrient];
      return value === undefined ? undefined : value * part.quantity;
    });
    if (parts.length > 0 && amounts.every((value): value is number => value !== undefined)) {
      total[nutrient] = amounts.reduce((sum, value) => sum + value, 0);
    }
  }

  const values: PartialNutrition = { ...total };
  const publishedNutrients: NutrientKey[] = [];
  const mismatches: ComposedNutrition["mismatches"] = [];
  for (const nutrient of ALL_NUTRIENTS) {
    const publishedValue = published.values[nutrient];
    if (publishedValue === undefined) continue;
    const composed = total[nutrient];
    const tolerance = nutrient === "calories" ? calorieTolerance : 0;
    if (composed === undefined || Math.abs(publishedValue - composed) <= tolerance) {
      values[nutrient] = publishedValue;
      publishedNutrients.push(nutrient);
    } else {
      mismatches.push({ nutrient, published: publishedValue, composed });
    }
  }

  return {
    record: recordFromValues(values, published, {
      method: "composed",
      components: parts.map(({ label, quantity, role, refId, evidence }) => ({
        label,
        quantity,
        role,
        ...(refId ? { refId } : {}),
        ...(evidence ? { evidence } : {}),
      })),
      publishedNutrients,
    }),
    total,
    mismatches,
    incompleteParts: parts
      .filter((part) => !part.record || CORE_NUTRIENTS.some((nutrient) => part.record?.values[nutrient] === undefined))
      .map((part) => part.label),
  };
}

// Nutrition contributed by one selected option at one portion, as the engine
// finalized it. Returns null for an unknown portion or one with no nutrition
// at all: "Extra" is never derived from "Regular" without a factor.
export function resolveSelectionNutrition(
  option: SelectionOption<NutritionRecord>,
  portionId?: string,
): NutritionRecord | null {
  if (!option.portions || option.portions.length === 0) return option.nutrition;
  const portion = portionId
    ? option.portions.find((entry) => entry.id === portionId)
    : option.portions.find((entry) => entry.isDefault);
  if (!portion || portion.nutrition.completeness === "none") return null;
  return portion.nutrition;
}
