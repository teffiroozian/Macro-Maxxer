import { getVariantSettings, type Filters } from "@/lib/menuSections/filterOptions";
import type { SortOption } from "@/lib/menuSections/sortOptions";
import type { MenuItem } from "@/types/menu";
import { getDefaultMenuItemNutrition, resolveMenuItemVariantNutrition } from "@/lib/nutrition";

// Catalog-only ranking rows. No sort metric participates in choosing an
// item's configuration: every dataset variant remains an independent row.
// Keep this projection separate from manual customization and any future
// optimized-mode implementation.
export function getOfficialRankingItems(items: MenuItem[]): MenuItem[] {
  return items.flatMap((item) => {
    if (!item.variants?.length) return [item];
    return item.variants.map((variant) => {
      const nutrition = resolveMenuItemVariantNutrition(item, variant);
      return {
        ...item,
        image: variant.image ?? item.image,
        categories: variant.categories?.length ? variant.categories : item.categories,
        servingType: variant.servingType ?? item.servingType,
        variants: [{ ...variant, nutrition, nutritionMultiplier: undefined }],
        defaultVariantId: variant.id,
        rankingFamilyDefaultVariantId: item.defaultVariantId ?? item.variants?.[0]?.id,
        disableVariantSelector: true,
        nutrition,
      };
    });
  });
}

// Preserve page filters, but always carry the displayed official variant
// through to both intercepted modals and directly loaded item routes.
export function getMenuItemDetailsHref(itemHref: string, query: string, variantId?: string): string {
  const params = new URLSearchParams(query);
  if (variantId) params.set("variant", variantId);
  else params.delete("variant");
  const suffix = params.toString();
  return suffix ? `${itemHref}?${suffix}` : itemHref;
}


// The parent identifies the product family. Size tokens form the serving
// dimension; remaining label text preserves recipe/flavor distinctions.
function variantDimensions(item: MenuItem): { size: string; recipe: string } {
  const label = item.variants?.[0]?.label.trim().toLowerCase() ?? "";
  if (item.variantGroupKind === "component") return { size: "", recipe: label };
  const sizePattern = /\b(?:small|medium|large|regular|tall|grande|venti|trenta)\b|\b\d+(?:\.\d+)?\s*(?:ct|count|pc|pcs|piece|pieces|oz|fl\s*oz|ml|g)\b/gi;
  const size = label.match(sizePattern)?.join(" ") ?? "";
  const recipe = label.replace(sizePattern, " ").replace(/[®™()[\],-]/g, " ").replace(/\s+/g, " ").trim();
  return { size, recipe };
}

// Exact macro equality only dedupes the serving-size dimension. Component
// choices and recipe/flavor signatures remain distinct regardless of macros.
function dedupeIdenticalServingSizes(items: MenuItem[]): MenuItem[] {
  const rows: MenuItem[] = [];
  const groups = new Map<string, number>();
  items.forEach((item) => {
    const dimensions = variantDimensions(item);
    const nutrition = getDefaultMenuItemNutrition(item);
    const macros = [nutrition.calories, nutrition.protein, nutrition.carbs, nutrition.totalFat];
    if (!dimensions.size || item.variants?.length !== 1 || !macros.every(Number.isFinite)) {
      rows.push(item);
      return;
    }
    const key = JSON.stringify([item.id, dimensions.recipe, ...macros]);
    const position = groups.get(key);
    if (position === undefined) {
      groups.set(key, rows.length);
      rows.push(item);
    } else if (item.defaultVariantId === item.rankingFamilyDefaultVariantId) {
      rows[position] = item;
    }
  });
  return rows;
}

// Group before filters, using the normalized default rather than any metric.
// Local detail/variant state never participates in this stable projection.
export function selectRankingItems(items: MenuItem[], sort: SortOption, filters: Filters = {}): MenuItem[] {
  const settings = getVariantSettings(filters);
  const isProteinScore = sort === "highest-protein-score" || sort === "lowest-protein-score";
  // Protein Score's explicit switch overrides the general serving-size switch.
  const separateSizes = isProteinScore ? settings.separateSizesInProteinScore : settings.showServingSizeVariants;
  const candidates = dedupeIdenticalServingSizes(items);
  if (separateSizes && settings.showRecipeVariants) return candidates;
  const rows: MenuItem[] = [];
  const groups = new Map<string, number>();
  candidates.forEach((item) => {
    const dimensions = variantDimensions(item);
    const key = JSON.stringify([item.id, separateSizes ? dimensions.size : "", settings.showRecipeVariants ? dimensions.recipe : ""]);
    const position = groups.get(key);
    if (position === undefined) {
      groups.set(key, rows.length);
      rows.push(item);
    } else if (item.defaultVariantId === item.rankingFamilyDefaultVariantId) {
      rows[position] = item;
    }
  });
  return rows;
}
