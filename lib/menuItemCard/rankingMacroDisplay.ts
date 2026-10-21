import type { RankMetric } from "@/lib/menuSections/sortOptions";

export type CardDisplayMode = "standard" | "fiber";

// An explicit choice survives sort changes; absence follows the active metric.
export function resolveCardDisplayMode(metric?: RankMetric, override?: CardDisplayMode): CardDisplayMode {
  return override ?? (metric === "fiber" ? "fiber" : "standard");
}

export function getRankingCardMacroKeys(metric?: RankMetric, override?: CardDisplayMode) {
  return resolveCardDisplayMode(metric, override) === "fiber"
    ? ["calories", "protein", "fiber"] as const
    : ["calories", "protein", "carbs", "totalFat"] as const;
}
