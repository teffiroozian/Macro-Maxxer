import { getProteinScore } from "@/lib/native/fullMenu";
import { getCategoryPresets, getSelectedCategoryPreset, selectCategoryPreset, type CategoryPreset } from "@/lib/menuSections/categoryPresets";
import type { Filters } from "@/lib/menuSections/filterOptions";
import { filterMenuItems, getSearchTerms, RANKED_ALL_FILTER_KEYS, type RankedAllFilterKey } from "@/lib/menuSections/filtering";
import { getPrimaryMenuCategory, matchesMenuMembership } from "@/lib/menuSections/memberships";
import { getNutritionControlData, reconcileNutritionThresholds } from "@/lib/menuSections/nutritionPresets";
import { getOfficialRankingItems, selectRankingItems } from "@/lib/menuSections/ranking";
import type { CategorySelectionState } from "@/lib/menuSections/resultCounts";
import { getRankState, isDefaultOrderSort, SORT_OPTION_VALUES, type RankMetric, type SortOption } from "@/lib/menuSections/sortOptions";
import { applyRestaurantMenuSectionOrder, getCategoryLabel, getOrderedMenuSections, sortItems } from "@/lib/menuSections/sorting";
import { getRankedMenuItemTitle } from "@/lib/menuItemCard/titlePresentation";
import { getDefaultMenuItemNutrition } from "@/lib/nutrition";
import type { MenuItem } from "@/types/menu";

// Everything that narrows the menu on a native restaurant page.
export type RestaurantMenuView = { filters: Filters; sort: SortOption; goal: GoalId | null };

const NO_GROUPS = Object.fromEntries(RANKED_ALL_FILTER_KEYS.map((key) => [key, new Set<string>()])) as Record<RankedAllFilterKey, Set<string>>;

// The phone lists one row per item until the sizes or flavors are asked for.
export const NATIVE_VARIANT_DEFAULTS = { showServingSizeVariants: false, showRecipeVariants: false, separateSizesInProteinScore: false } as const;
export type VariantKey = keyof typeof NATIVE_VARIANT_DEFAULTS;

const run = (items: MenuItem[], filters: Filters, searchTerms: string[] = []) =>
  filterMenuItems({ items, filters, searchTerms, rankedChildSelections: NO_GROUPS, isRankingView: false });

const scopeOf = (filters: Filters): Filters => ({ categories: filters.categories, categoryTags: filters.categoryTags, categoryExclusions: filters.categoryExclusions });

const NUTRITION_KEYS = ["caloriesMax", "proteinMin", "proteinScoreMin", "carbsMax", "fatMax", "fiberMin", "sodiumMax", "sugarMax"] as const;
export type NutritionFilterKey = (typeof NUTRITION_KEYS)[number];
export const ADVANCED_KEYS: NutritionFilterKey[] = ["carbsMax", "fatMax", "fiberMin", "sodiumMax", "sugarMax"];

export const countActive = (filters: Filters, keys: readonly NutritionFilterKey[] = NUTRITION_KEYS) => keys.filter((key) => filters[key] !== undefined).length;
export const clearNutrition = (filters: Filters): Filters => ({ ...filters, ...Object.fromEntries(NUTRITION_KEYS.map((key) => [key, undefined])) });
const nutritionOf = (filters: Filters): Filters => Object.fromEntries(NUTRITION_KEYS.map((key) => [key, filters[key]]));

export type RestaurantMenu = {
  restaurantId: string;
  items: MenuItem[];
  // Every size and flavor as its own row, the way the web app ranks them.
  official: MenuItem[];
  presets: CategoryPreset[];
  main: CategoryPreset;
  allIds: string[];
  sizePreference?: string;
  hasFiber: boolean;
};

export function createRestaurantMenu(restaurantId: string, items: MenuItem[], sizePreference?: string): RestaurantMenu {
  const presets = getCategoryPresets(items, restaurantId).filter((preset) => preset.ids.length > 0 || preset.tags?.length);
  const all = presets.find((preset) => preset.id === "all") ?? presets[0] ?? { id: "all" as const, label: "All items", ids: [] };
  return {
    restaurantId,
    items,
    official: getOfficialRankingItems(items),
    presets,
    main: presets.find((preset) => preset.id === "main") ?? all,
    allIds: all.ids,
    sizePreference,
    hasFiber: items.some((item) => (getDefaultMenuItemNutrition(item).fiber ?? 0) > 0),
  };
}

export const defaultView = (menu: RestaurantMenu): RestaurantMenuView => ({
  filters: selectCategoryPreset({ ...NATIVE_VARIANT_DEFAULTS }, menu.main),
  sort: SORT_OPTION_VALUES.DEFAULT_ORDER,
  goal: null,
});

// The chosen part of the menu, one row per listed item or size, before any
// nutrition limit.
export function poolRows(menu: RestaurantMenu, view: Pick<RestaurantMenuView, "filters" | "sort">): MenuItem[] {
  return selectRankingItems(run(menu.official, scopeOf(view.filters)), view.sort, view.filters, menu.sizePreference);
}

export function menuRows(menu: RestaurantMenu, view: Pick<RestaurantMenuView, "filters" | "sort">): { rows: MenuItem[]; pool: number } {
  const pool = poolRows(menu, view);
  const rows = run(pool, nutritionOf(view.filters));
  return { rows: isDefaultOrderSort(view.sort) ? sortItems(rows, view.sort, "menu") : sortItems([...rows].sort((a, b) => a.name.localeCompare(b.name)), view.sort, "menu"), pool: pool.length };
}

export type MenuGroup = { id: string; title: string; rows: MenuItem[] };

// Menu order keeps the restaurant's sections; a ranking is one flat list.
export function groupRows(menu: RestaurantMenu, rows: MenuItem[], sort: SortOption): MenuGroup[] {
  if (!rows.length) return [];
  if (!isDefaultOrderSort(sort)) return [{ id: "ranked", title: "", rows }];
  const byCategory = new Map<string, MenuItem[]>();
  for (const row of rows) {
    const category = getPrimaryMenuCategory(row);
    byCategory.set(category, [...(byCategory.get(category) ?? []), row]);
  }
  const order = applyRestaurantMenuSectionOrder(getOrderedMenuSections(rows, "menu"), menu.restaurantId, "menu");
  const listed = [...order.filter((id) => byCategory.has(id)), ...[...byCategory.keys()].filter((id) => !order.includes(id))];
  return listed.map((id) => ({ id, title: getCategoryLabel(id, "menu"), rows: byCategory.get(id) ?? [] }));
}

export function searchRows(menu: RestaurantMenu, query: string): MenuItem[] {
  const terms = getSearchTerms(query);
  if (!terms.length) return [];
  const rows = run(selectRankingItems(run(menu.official, {}), SORT_OPTION_VALUES.DEFAULT_ORDER, { ...NATIVE_VARIANT_DEFAULTS }, menu.sizePreference), {}, terms);
  const first = query.trim().toLowerCase();
  const place = (item: MenuItem) => { const at = item.name.toLowerCase().indexOf(first); return at < 0 ? Infinity : at; };
  return rows.map((item, index) => ({ item, index, at: place(item) })).sort((a, b) => (a.at === b.at ? a.index - b.index : a.at - b.at)).map((entry) => entry.item);
}

// A size other than the item's usual one is named on the card.
export function rowTitle(item: MenuItem, variantsShown: boolean): string {
  const variant = item.variants?.length === 1 ? item.variants[0] : undefined;
  const unusual = variant && item.rankingFamilyDefaultVariantId !== undefined && item.rankingFamilyDefaultVariantId !== variant.id;
  return getRankedMenuItemTitle(item.name, variant && (unusual || variantsShown) ? variant.label : undefined);
}
export const rowKey = (item: MenuItem) => `${item.id ?? item.name}:${item.defaultVariantId ?? ""}`;

export type MenuCategory = { id: string; label: string; count: number; state: CategorySelectionState };

// Counts follow the nutrition limits, like the web filters.
export function menuCategories(menu: RestaurantMenu, filters: Filters): MenuCategory[] {
  const totals = new Map<string, number>();
  for (const row of countRows(menu, filters, {})) totals.set(getPrimaryMenuCategory(row), (totals.get(getPrimaryMenuCategory(row)) ?? 0) + 1);
  return menu.allIds.map((id) => {
    const rows = menu.official.filter((row) => getPrimaryMenuCategory(row) === id);
    const included = rows.filter((row) => matchesMenuMembership(row, filters.categories, filters.categoryTags, filters.categoryExclusions)).length;
    return { id, label: getCategoryLabel(id, "menu"), count: totals.get(id) ?? 0, state: included === 0 ? "none" : included === rows.length ? "all" : "some" };
  });
}

// One row per item in each category, so a family shows up wherever it has a size.
function countRows(menu: RestaurantMenu, filters: Filters, scope: Filters): MenuItem[] {
  const seen = new Set<string>();
  const settings = { showServingSizeVariants: filters.showServingSizeVariants, showRecipeVariants: filters.showRecipeVariants };
  const inScope = run(menu.official, scope);
  const perCategory = menu.allIds.flatMap((id) => selectRankingItems(inScope.filter((row) => getPrimaryMenuCategory(row) === id), SORT_OPTION_VALUES.DEFAULT_ORDER, settings, menu.sizePreference));
  return run(perCategory, nutritionOf(filters)).filter((row) => {
    const key = `${rowKey(row)}:${getPrimaryMenuCategory(row)}`;
    return !seen.has(key) && Boolean(seen.add(key));
  });
}

export const presetCount = (menu: RestaurantMenu, preset: CategoryPreset, view: RestaurantMenuView) =>
  menuRows(menu, { filters: selectCategoryPreset(view.filters, preset), sort: SORT_OPTION_VALUES.DEFAULT_ORDER }).rows.length;

export const selectedPreset = (menu: RestaurantMenu, filters: Filters) => getSelectedCategoryPreset(filters, menu.presets);

export const hasCategories = (filters: Filters) => Boolean(filters.categories?.length || filters.categoryTags?.length);

export const nutritionControls = (menu: RestaurantMenu, filters: Filters) =>
  getNutritionControlData({ items: menu.items, filters, searchTerms: [], rankedChildSelections: NO_GROUPS, isRankingView: false });

// Keeps limits inside what the chosen categories can show.
export const reconcile = (menu: RestaurantMenu, filters: Filters): Filters => reconcileNutritionThresholds(filters, nutritionControls(menu, filters));

export const METRIC_LABELS: Record<RankMetric, string> = { protein: "Protein", calories: "Calories", "protein-score": "Protein Score", carbs: "Carbs", fat: "Fat", fiber: "Fiber" };

export function rankText(sort: SortOption): string {
  if (isDefaultOrderSort(sort)) return "in menu order";
  const { metric, direction } = getRankState(sort);
  const name = metric === "protein-score" ? "Protein Score" : METRIC_LABELS[metric].toLowerCase();
  return `${direction} ${name} first`;
}

export type FilterChip = { key: NutritionFilterKey; label: string };
export function filterChips(filters: Filters): FilterChip[] {
  const label: Record<NutritionFilterKey, (value: string) => string> = {
    caloriesMax: (v) => `Under ${v} cal`,
    proteinMin: (v) => `${v}g+ protein`,
    proteinScoreMin: (v) => `Protein Score ${v}+`,
    carbsMax: (v) => `${v}g carbs or less`,
    fatMax: (v) => `${v}g fat or less`,
    fiberMin: (v) => `${v}g+ fiber`,
    sodiumMax: (v) => `${v}mg sodium or less`,
    sugarMax: (v) => `${v}g sugar or less`,
  };
  return NUTRITION_KEYS.flatMap((key) => {
    const value = filters[key];
    return value === undefined ? [] : [{ key, label: label[key](value.toLocaleString("en-US")) }];
  });
}

export function isNarrowed(menu: RestaurantMenu, view: RestaurantMenuView): boolean {
  return !isDefaultOrderSort(view.sort) || countActive(view.filters) > 0 || selectedPreset(menu, view.filters)?.id !== menu.main.id;
}

// ── Explore by goal ──────────────────────────────────────────────────────

export type GoalId = "high-protein" | "lean-protein" | "low-calorie" | "low-carb" | "high-fiber" | "low-fat";
type GoalRule = { id: GoalId; label: string; sort: SortOption; limits: Filters; photo: SortOption };

const GOALS: GoalRule[] = [
  { id: "high-protein", label: "High protein", sort: "highest-protein", limits: {}, photo: "highest-protein" },
  { id: "lean-protein", label: "Lean protein", sort: "highest-protein-score", limits: {}, photo: "highest-protein-score" },
  { id: "low-calorie", label: "Low calorie", sort: "highest-protein", limits: { caloriesMax: 400 }, photo: "lowest-calories" },
  { id: "low-carb", label: "Low carb", sort: "highest-protein", limits: { carbsMax: 20 }, photo: "lowest-carbs" },
  { id: "high-fiber", label: "High fiber", sort: "highest-fiber", limits: {}, photo: "highest-fiber" },
  { id: "low-fat", label: "Low fat", sort: "highest-protein", limits: { fatMax: 15 }, photo: "lowest-fat" },
];

export function applyGoal(menu: RestaurantMenu, view: RestaurantMenuView, id: GoalId): RestaurantMenuView {
  const rule = GOALS.find((goal) => goal.id === id);
  if (!rule) return view;
  const filters = selectCategoryPreset({ ...clearNutrition(view.filters), cardDisplayOverride: undefined, ...rule.limits }, menu.main);
  return { filters, sort: rule.sort, goal: id };
}

export type Goal = { id: GoalId; label: string; photo?: MenuItem };

// Goals nothing on the menu can meet are left out. Each shows its own photo.
export function exploreGoals(menu: RestaurantMenu): Goal[] {
  const used = new Set<string>();
  const base = defaultView(menu);
  return GOALS.filter((goal) => goal.id !== "high-fiber" || menu.hasFiber).flatMap((goal) => {
    const applied = applyGoal(menu, base, goal.id);
    if (!menuRows(menu, applied).rows.length) return [];
    const ranked = menuRows(menu, { filters: applied.filters, sort: goal.photo }).rows.filter((row) => row.image);
    const photo = ranked.find((row) => !used.has(row.image ?? "")) ?? ranked[0];
    if (photo?.image) used.add(photo.image);
    return [{ id: goal.id, label: goal.label, photo }];
  });
}

export const goalLabel = (id: GoalId) => GOALS.find((goal) => goal.id === id)?.label ?? "";

// ── Featured picks ───────────────────────────────────────────────────────

export type PickReason = "score" | "protein" | "breakfast" | "fiber" | "carbs" | "calories";
export type FeaturedPick = { item: MenuItem; reason: PickReason; label: string };

const PICK_LIMIT = 4;
// Enough protein for a low number to still be a meal.
const MEAL_PROTEIN = 15;

// A label is only used for the item it is true of. When that item is already
// featured, the next strength is tried instead of naming a runner-up.
export function featuredPicks(menu: RestaurantMenu): FeaturedPick[] {
  const { rows } = menuRows(menu, defaultView(menu));
  const n = getDefaultMenuItemNutrition;
  const best = (items: MenuItem[], value: (item: MenuItem) => number | undefined, lowest = false) => {
    const measured = items.flatMap((item) => { const v = value(item); return v === undefined || !Number.isFinite(v) ? [] : [{ item, v }]; });
    return measured.sort((a, b) => (lowest ? a.v - b.v : b.v - a.v) || a.item.name.localeCompare(b.item.name))[0];
  };
  const meals = rows.filter((item) => (n(item).protein ?? 0) >= MEAL_PROTEIN);
  const candidates: { reason: PickReason; label: string; found?: { item: MenuItem; v: number } }[] = [
    { reason: "score", label: "Best Protein Score", found: best(meals, getProteinScore) },
    { reason: "protein", label: "Most protein", found: best(rows, (item) => n(item).protein) },
    { reason: "breakfast", label: "Leanest breakfast", found: best(meals.filter((item) => getPrimaryMenuCategory(item) === "breakfast"), getProteinScore) },
    { reason: "fiber", label: "Most fiber", found: best(rows, (item) => n(item).fiber) },
    { reason: "carbs", label: "Lowest carb meal", found: best(meals, (item) => n(item).carbs, true) },
    { reason: "calories", label: "Lightest meal", found: best(meals, (item) => n(item).calories, true) },
  ];
  const picks: FeaturedPick[] = [];
  for (const { reason, label, found } of candidates) {
    if (!found || found.v <= 0 && reason !== "carbs") continue;
    if (picks.length === PICK_LIMIT || picks.some((pick) => pick.item.id === found.item.id)) continue;
    picks.push({ item: found.item, reason, label });
  }
  return picks;
}
