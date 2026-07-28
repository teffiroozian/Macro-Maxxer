// Central reference for Macro Maxxer's color roles (Slice 1). Values live
// wherever they're actually consumed rather than being duplicated:
//
// - Global product accent (soft green) + semantic roles (success/info/
//   warning/error) are Tailwind tokens defined in app/globals.css —
//   use them as `bg-accent`, `text-accent`, `bg-accent-soft`,
//   `text-accent-strong`, `bg-success`, `text-info`, `text-warning`,
//   `text-error`, etc.
// - Macro colors (calories/protein/carbs/fat) live in
//   components/nutrition/macroColorTokens.ts and stay the single source
//   for anything macro-value-colored.
// - Restaurant brand colors are below. Scoped to that restaurant's own
//   card/CTA/ring only — never used as a global interface color.
export const RESTAURANT_BRAND_COLORS: Record<string, string> = {
  chickfila: "#E51636",
  chipotle: "#A81612",
};

export const DEFAULT_BRAND_ACCENT = "#111318";
