import type { MenuItem } from "@/types/menu";
import type { Filters } from "@/lib/menuSections/filterOptions";
import { RESTAURANT_MAIN_MENU_CATEGORIES } from "@/data/restaurantControlPresets";
import { countItemsByCategory } from "@/lib/menuSections/sorting";
import { getRankedChildCategories } from "@/lib/menuSections/filtering";

export type CategoryPresetId = "main" | "sides" | "drinks" | "shareables" | "sauces" | "all";
export type CategoryPreset = { id: CategoryPresetId; label: string; ids: string[] };

export function getCategoryPresets(items: MenuItem[], restaurantId: string): CategoryPreset[] {
  const available = Object.keys(countItemsByCategory(items));
  const buckets = getRankedChildCategories(items);
  const present = (ids: readonly string[]) => [...new Set(ids)].filter((id) => available.includes(id));
  const configured = present(RESTAURANT_MAIN_MENU_CATEGORIES[restaurantId] ?? []);
  const main = configured.length ? configured : present([...buckets["main-entrees"], ...buckets.breakfast]).filter((id) => id !== "shareables");
  return [
    { id: "main", label: "Main entrées", ids: main },
    { id: "sides", label: "Sides", ids: present(buckets.sides) },
    { id: "drinks", label: "Drinks", ids: present(buckets.drinks) },
    { id: "shareables", label: "Shareables", ids: present(["shareables"]) },
    { id: "sauces", label: "Sauces", ids: present(["sauces"]) },
    { id: "all", label: "All items", ids: [...main, ...available.filter((id) => !main.includes(id))] },
  ];
}

export function getSelectedCategoryPreset(filters: Filters, presets: CategoryPreset[]): CategoryPreset | undefined {
  if (filters.categoryPreset === "custom" || filters.rankingGroups !== undefined) return undefined;
  const selected = filters.categories ?? presets.find((preset) => preset.id === "all")?.ids ?? [];
  const matches = (preset: CategoryPreset) => selected.length === preset.ids.length && selected.every((id) => preset.ids.includes(id));
  return filters.categoryPreset
    ? presets.find((preset) => preset.id === filters.categoryPreset && matches(preset))
    : presets.find(matches);
}

export function selectCategoryPreset(filters: Filters, preset: CategoryPreset): Filters {
  return { ...filters, categories: [...preset.ids], categoryPreset: preset.id, rankingGroups: undefined };
}

export function selectCustomCategories(filters: Filters, categories: string[]): Filters {
  return { ...filters, categories: [...new Set(categories)], categoryPreset: "custom", rankingGroups: undefined };
}
