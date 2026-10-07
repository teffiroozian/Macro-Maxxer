import type { MenuItem } from "@/types/menu";
import type { Filters } from "@/lib/menuSections/filterOptions";
import { RESTAURANT_MAIN_MENU_CATEGORIES, RESTAURANT_CATEGORY_PRESETS, DEFAULT_CATEGORY_PRESETS, type CategoryPresetId } from "@/data/restaurantControlPresets";
import { countItemsByCategory } from "@/lib/menuSections/sorting";
import { getRankedChildCategories } from "@/lib/menuSections/filtering";

export type { CategoryPresetId } from "@/data/restaurantControlPresets";
export type CategoryPreset = { id: CategoryPresetId; label: string; ids: string[]; tags?: string[] };

export function getCategoryPresets(items: MenuItem[], restaurantId: string): CategoryPreset[] {
  const available = Object.keys(countItemsByCategory(items));
  const buckets = getRankedChildCategories(items);
  const present = (ids: readonly string[]) => [...new Set(ids)].filter((id) => available.includes(id));
  const configured = present(RESTAURANT_MAIN_MENU_CATEGORIES[restaurantId] ?? []);
  const main = configured.length ? configured : present([...buckets["main-entrees"], ...buckets.breakfast]).filter((id) => id !== "shareables");
  const sources = {
    main,
    sides: present(buckets.sides),
    drinks: present(buckets.drinks),
    all: [...main, ...available.filter((id) => !main.includes(id))],
  };
  return (RESTAURANT_CATEGORY_PRESETS[restaurantId] ?? DEFAULT_CATEGORY_PRESETS).map((preset) => ({
    id: preset.id,
    label: preset.label,
    ...(preset.tags ? { tags: [...preset.tags] } : {}),
    ids: preset.categories ? present(preset.categories) : preset.source ? sources[preset.source] : [],
  }));
}

export function getSelectedCategoryPreset(filters: Filters, presets: CategoryPreset[]): CategoryPreset | undefined {
  if (filters.categoryPreset === "custom" || filters.rankingGroups !== undefined) return undefined;
  const selected = filters.categories ?? presets.find((preset) => preset.id === "all")?.ids ?? [];
  const matches = (preset: CategoryPreset) => selected.length === preset.ids.length && selected.every((id) => preset.ids.includes(id)) && (filters.categoryTags ?? []).length === (preset.tags ?? []).length && (filters.categoryTags ?? []).every((tag) => preset.tags?.includes(tag));
  return filters.categoryPreset
    ? presets.find((preset) => preset.id === filters.categoryPreset && matches(preset))
    : presets.find(matches);
}

export function selectCategoryPreset(filters: Filters, preset: CategoryPreset): Filters {
  return { ...filters, categories: [...preset.ids], categoryTags: preset.tags ? [...preset.tags] : undefined, categoryExclusions: undefined, categoryPreset: preset.id, rankingGroups: undefined };
}

export function selectCustomCategories(filters: Filters, categories: string[]): Filters {
  return { ...filters, categories: [...new Set(categories)], categoryTags: undefined, categoryExclusions: undefined, categoryPreset: "custom", rankingGroups: undefined };
}

// Manual checkbox edits preserve overlapping tag memberships in other
// categories. Explicit exclusions let a fully selected tag category be unchecked.
export function toggleCategoryMembership(filters: Filters, selectedCategories: string[], category: string, state: "none" | "some" | "all"): Filters {
  const full = state === "all";
  const categories = full ? selectedCategories.filter((id) => id !== category) : [...new Set([...selectedCategories, category])];
  const exclusions = new Set(filters.categoryExclusions ?? []);
  if (full && filters.categoryTags?.length) exclusions.add(category);
  else exclusions.delete(category);
  return { ...selectCustomCategories(filters, categories), categoryTags: filters.categoryTags, categoryExclusions: exclusions.size ? [...exclusions] : undefined };
}
