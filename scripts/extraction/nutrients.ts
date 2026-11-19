// Reading nutrient labels and printed values. Restaurant-independent.
//
// A value is kept as a number only when the source printed a clean number.
// Anything else ("< 1", "10w", "—", "N/A") keeps its raw text, is flagged,
// and is left out of `values`. Nothing is estimated or rounded.
import { CORE_NUTRIENTS, type NutrientKey, type PartialNutrition, type ServingBasis } from "../pipeline/contracts";
import { NUTRIENT_LABELS, nutrientForKey } from "../discovery/vocabulary";
import type { ExtractedNutrition, UncleanValue } from "./contracts";

export { nutrientForKey };

// Column header → nutrient. "Calories From Fat" and "% DV" columns are not
// nutrients this pipeline stores, so they are recognised and ignored.
export function nutrientForLabel(label: string): NutrientKey | undefined {
  const text = label.replace(/\s+/g, " ").replace(/\bfats\b/gi, "fat").trim();
  if (!text || /calories?\s+from\s+fat|fat\s+cal|%|daily\s+value|\bdv\b/i.test(text)) return undefined;
  for (const [nutrient, pattern] of Object.entries(NUTRIENT_LABELS) as Array<[NutrientKey, RegExp]>) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      pattern.lastIndex = 0;
      // "Total Fat" must not match satFat/transFat labels first.
      if (nutrient === "totalFat" && /sat|trans/i.test(text)) continue;
      return nutrient;
    }
  }
  return undefined;
}

export type ParsedCell = { value?: number; range?: [number, number]; unclean?: UncleanValue };

const CLEAN_NUMBER = /^\d{1,5}(?:,\d{3})*(?:\.\d+)?$/;

// Units printed in a cell or its header ("9g", "600 mg", "320 cal").
const UNIT_SUFFIX = /\s*(?:g|mg|kcal|cal|calories)\s*$/i;

export function parseCell(nutrient: NutrientKey, raw: string): ParsedCell {
  const text = raw.replace(/ /g, " ").trim().replace(UNIT_SUFFIX, "").trim();
  if (CLEAN_NUMBER.test(text)) return { value: Number(text.replace(/,/g, "")) };
  const range = text.match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)$/);
  if (range) return { range: [Number(range[1]), Number(range[2])] };
  const leading = text.match(/^(\d+(?:\.\d+)?)/);
  return { unclean: { nutrient, raw: raw.trim(), ...(leading ? { parsed: Number(leading[1]) } : {}) } };
}

// Builds an ExtractedNutrition from raw cells. Empty cells mean "not printed".
export function nutritionFromCells(cells: Partial<Record<NutrientKey, string>>, basis?: ServingBasis): ExtractedNutrition | undefined {
  const values: PartialNutrition = {};
  const raw: ExtractedNutrition["raw"] = {};
  const unclean: UncleanValue[] = [];
  const ranges: NonNullable<ExtractedNutrition["ranges"]> = {};
  for (const [nutrient, text] of Object.entries(cells) as Array<[NutrientKey, string | undefined]>) {
    if (text === undefined || !String(text).trim()) continue;
    raw[nutrient] = String(text).trim();
    const parsed = parseCell(nutrient, String(text));
    if (parsed.value !== undefined) values[nutrient] = parsed.value;
    else if (parsed.range) ranges[nutrient] = parsed.range;
    else if (parsed.unclean) unclean.push(parsed.unclean);
  }
  if (Object.keys(raw).length === 0) return undefined;
  return {
    values,
    raw,
    unclean,
    missingCore: CORE_NUTRIENTS.filter((nutrient) => values[nutrient] === undefined),
    ...(basis ? { basis } : {}),
    ...(Object.keys(ranges).length ? { ranges } : {}),
  };
}

export function nutritionFlags(nutrition: ExtractedNutrition | undefined): string[] {
  if (!nutrition) return [];
  const flags: string[] = [];
  if (nutrition.unclean.length) flags.push("unclean_value");
  if (nutrition.ranges) flags.push("range_value");
  return flags;
}
