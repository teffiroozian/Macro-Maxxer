export const PROTEIN_SCORE_COLOR = "#047857";
export const FIBER_COLOR = "#047857";

// Cyan is reserved for Protein Score ranking icons, not tier badges.
export const proteinScoreColorTokens = { value: "text-[#0891B2] dark:text-slate-300" } as const;

// Existing dark theme colors for inline range fills. Keep light fills
// untouched; callers expose the dark value separately to the stylesheet.
export function getDarkRangeColor(light: string): string {
  switch (light.toLowerCase()) {
    case "#111318": case "#0f172a": return "var(--foreground)";
    case "#c2410c": return "#f96306";
    case "#ca8a04": return "#f9c406";
    case "#2563eb": return "#336dfa";
    case "#047857": return "var(--product-accent-strong)";
    default: return "var(--color-slate-300)";
  }
}
