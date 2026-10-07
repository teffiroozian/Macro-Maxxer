import { filterMenuItems } from "@/lib/menuSections/filtering";
import { getVariantSettings, type Filters } from "@/lib/menuSections/filterOptions";
import { getNutritionDisplayData, getActiveCategoryCalorieData } from "@/lib/menuSections/nutritionDisplayRange";

export type NutritionShortcut = { label: string; value?: number };
const proteinBands: Array<[number, number[]]> = [
  [10, [5]], [15, [5, 10]], [20, [5, 10, 15]], [30, [10, 15, 20]],
  [40, [10, 20, 30]], [50, [20, 30, 40]], [60, [20, 40, 50]],
  [80, [20, 40, 60]], [100, [25, 50, 75]], [150, [50, 75, 100]],
  [Infinity, [50, 100, 150]],
];
const calorieBands: Array<[number, number[]]> = [
  [300, [100, 200, 250]], [500, [200, 300, 400]], [700, [300, 500, 600]],
  [900, [300, 500, 700]], [1200, [400, 700, 1000]], [Infinity, [500, 1000, 1500]],
];
export function getProteinShortcuts(maximum: number, displayMaximum = Infinity): NutritionShortcut[] {
  const values = proteinBands.find(([limit]) => maximum <= limit)![1];
  return [{ label: "Any" }, ...values.filter((value) => value <= maximum && value <= displayMaximum).map((value) => ({ label: `${value}g+`, value }))];
}
export function getCalorieShortcuts(maximum: number, displayMaximum = Infinity): NutritionShortcut[] {
  const preferred = calorieBands.find(([limit]) => maximum <= limit)![1];
  let values = preferred;
  if (preferred[2] > displayMaximum) {
    // Keep three distinct 10-calorie shortcuts inside the robust display
    // range when rare outliers select a band extending beyond that range.
    let previous = -10;
    const ceiling = Math.floor(displayMaximum / 10) * 10;
    values = preferred.map((value, index) => {
      const scaled = Math.floor(value / preferred[2] * ceiling / 10) * 10;
      const cap = ceiling - (2 - index) * 10;
      const next = Math.max(previous + 10, Math.min(scaled, cap));
      previous = next;
      return next;
    });
  }
  return [{ label: "Any" }, ...values.map((value) => ({ label: `≤ ${value}`, value }))];
}

export function getNutritionControlData(input: Parameters<typeof filterMenuItems>[0]) {
  const eligible = filterMenuItems({ ...input, items: input.items.filter((item) => !item.sourceOnly), searchTerms: [], filters: {
    ...getVariantSettings(input.filters), categories: input.filters.categories,
    categoryTags: input.filters.categoryTags, categoryExclusions: input.filters.categoryExclusions,
    rankingGroups: input.filters.rankingGroups,
  } });
  const display = getNutritionDisplayData(eligible);
  const calories = getActiveCategoryCalorieData(eligible);
  const calorieBounds = { ...calories.calorieBounds, max: Math.max(20, calories.calorieBounds.max) };
  const maxCalories = Math.max(0, ...display.calories);
  const maxProtein = Math.max(0, ...display.proteins);
  return {
    ...display, ...calories, calorieBounds, maxCalories, maxProtein, eligibleCount: eligible.length,
    caloriePresets: getCalorieShortcuts(maxCalories, calorieBounds.max),
    proteinPresets: getProteinShortcuts(maxProtein, display.proteinBounds.max),
  };
}

export function reconcileNutritionThresholds(filters: Filters, data: ReturnType<typeof getNutritionControlData>): Filters {
  // Clearing category selections must not erase unrelated nutrition choices.
  if (data.eligibleCount === 0) return filters;
  const caloriesMax = filters.caloriesMax === undefined ? undefined : Math.max(0, Math.min(filters.caloriesMax, data.calorieBounds.max));
  const proteinCeiling = Math.floor(Math.min(data.maxProtein, data.proteinBounds.max));
  const proteinMin = filters.proteinMin === undefined || proteinCeiling <= 0 ? undefined : Math.max(0, Math.min(filters.proteinMin, proteinCeiling));
  if (caloriesMax === filters.caloriesMax && proteinMin === filters.proteinMin) return filters;
  return { ...filters, caloriesMax, proteinMin };
}
