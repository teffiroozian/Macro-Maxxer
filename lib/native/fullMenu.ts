import { getDefaultMenuItemNutrition, getProteinPer100Calories, getProteinScoreTier, type ProteinScoreTier } from "@/lib/nutrition";
import type { MenuItem } from "@/types/menu";

export type FullMenuMetric = "protein" | "calories" | "score" | "carbs" | "fat" | "fiber";
export type FullMenuDirection = "high" | "low";
export type FullMenuLayout = "rows" | "grid";
export type FullMenuNutritionFilters = { caloriesMax?: number; proteinMin?: number; scoreMin?: number };

export const MENU_METRICS: { key: FullMenuMetric; label: string }[] = [
  { key: "protein", label: "Protein" },
  { key: "calories", label: "Calories" },
  { key: "score", label: "Protein Score" },
  { key: "carbs", label: "Carbs" },
  { key: "fat", label: "Fat" },
  { key: "fiber", label: "Fiber" },
];

export const CALORIE_STEPS = [300, 450, 600];
export const PROTEIN_STEPS = [20, 30, 40];
export const SCORE_TIERS = [
  { min: undefined, label: "Any", caption: "All", tier: undefined },
  { min: 6, label: "Good", caption: "6+", tier: "good" },
  { min: 9, label: "Excellent", caption: "9+", tier: "excellent" },
  { min: 12, label: "Elite", caption: "12+", tier: "elite" },
] as const;

export const metricLabel = (metric: FullMenuMetric) => MENU_METRICS.find((m) => m.key === metric)?.label ?? "";

export const naturalDirection = (metric: FullMenuMetric): FullMenuDirection =>
  metric === "protein" || metric === "score" || metric === "fiber" ? "high" : "low";

export function parseMetric(value: string | null): FullMenuMetric {
  switch (value) {
    case "highest-protein": return "protein";
    case "lowest-calories": return "calories";
    case "protein-score": case "best-ratio": return "score";
    default: return "score";
  }
}

export function getProteinScore(item: MenuItem): number | undefined {
  const n = getDefaultMenuItemNutrition(item);
  return typeof n.protein === "number" && typeof n.calories === "number" ? getProteinPer100Calories(n.protein, n.calories) : undefined;
}

export function getMetricValue(item: MenuItem, metric: FullMenuMetric): number | undefined {
  if (metric === "score") return getProteinScore(item);
  const n = getDefaultMenuItemNutrition(item);
  const value = metric === "fat" ? n.totalFat : metric === "fiber" ? n.fiber : n[metric];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

// Items missing the metric go last regardless of direction; ties sort A→Z.
export function rankMenuItems(items: MenuItem[], metric: FullMenuMetric, direction: FullMenuDirection): MenuItem[] {
  const sign = direction === "high" ? -1 : 1;
  return items
    .map((item) => ({ item, value: getMetricValue(item, metric) }))
    .sort((a, b) => {
      if (a.value === undefined || b.value === undefined) {
        if (a.value === b.value) return a.item.name.localeCompare(b.item.name);
        return a.value === undefined ? 1 : -1;
      }
      return sign * (a.value - b.value) || a.item.name.localeCompare(b.item.name);
    })
    .map((entry) => entry.item);
}

export function applyNutritionFilters(items: MenuItem[], filters: FullMenuNutritionFilters): MenuItem[] {
  const { caloriesMax, proteinMin, scoreMin } = filters;
  if (caloriesMax === undefined && proteinMin === undefined && scoreMin === undefined) return items;
  return items.filter((item) => {
    const n = getDefaultMenuItemNutrition(item);
    if (caloriesMax !== undefined && !(typeof n.calories === "number" && n.calories <= caloriesMax)) return false;
    if (proteinMin !== undefined && !(typeof n.protein === "number" && n.protein >= proteinMin)) return false;
    if (scoreMin !== undefined) {
      const score = getProteinScore(item);
      if (score === undefined || score < scoreMin) return false;
    }
    return true;
  });
}

export const countNutritionFilters = (f: FullMenuNutritionFilters) =>
  Number(f.caloriesMax !== undefined) + Number(f.proteinMin !== undefined) + Number(f.scoreMin !== undefined);

export const formatScore = (score: number | undefined) => (score === undefined ? "—" : (Math.round(score * 10) / 10).toFixed(1));

export function getScoreTier(score: number | undefined): ProteinScoreTier {
  return getProteinScoreTier(score ?? 0);
}

export const PILL_TIERS: Record<ProteinScoreTier, { chip: string; icon: string; iconFg: string; value: string; suffix: string }> = {
  elite: { chip: "#ECFDF3", icon: "#047857", iconFg: "#fff", value: "#047857", suffix: "#4B7F6B" },
  excellent: { chip: "#EEF4FF", icon: "#4C84C4", iconFg: "#fff", value: "#2F5F85", suffix: "#6E88A3" },
  good: { chip: "#FFFBEB", icon: "#F3E8CE", iconFg: "#B08A3E", value: "#8A6D2F", suffix: "#64748B" },
  moderate: { chip: "#F1F5F9", icon: "#E2E8F0", iconFg: "#64748B", value: "#334155", suffix: "#7C8798" },
  low: { chip: "#F8FAFC", icon: "#EEF2F6", iconFg: "#94A3B8", value: "#64748B", suffix: "#9AA5B1" },
};
