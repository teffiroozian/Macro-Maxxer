export const GRID_TITLE_REVEAL_SPEED = 40;
export const GRID_TITLE_RESET_DURATION_MS = 140;

// Presentation-only: never change IDs, selection labels, or catalog variants.
export function isGenericSingleServingLabel(label?: string): boolean {
  const normalized = label?.normalize("NFKC").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\(s\)/g, "s").replace(/\s+/g, " ");
  return Boolean(normalized && /^(?:1(?:\.0+)?|one|single) serv(?:ing|e)s?$/.test(normalized));
}
export function getDisplayVariantLabel(label?: string): string | undefined {
  return isGenericSingleServingLabel(label) ? undefined : label;
}
export function getCleanMenuItemName(name: string): string {
  return name.replace(/\s*\(([^()]*)\)\s*$/, (suffix, label: string) => isGenericSingleServingLabel(label) ? "" : suffix);
}

// Shared by ranked List and Grid cards; avoid repeating an existing variant.
export function getRankedMenuItemTitle(name: string, variantLabel?: string): string {
  name = getCleanMenuItemName(name);
  variantLabel = getDisplayVariantLabel(variantLabel);
  const normalized = variantLabel?.trim().replace(/\b(\d+)\s*(?:ct|count)\b/gi, "$1 ct");
  const included = normalized && (name.toLocaleLowerCase().includes(normalized.toLocaleLowerCase()) || name.toLocaleLowerCase().includes(variantLabel!.toLocaleLowerCase()));
  return normalized && !included ? `${name} (${normalized})` : name;
}

export function getGridTitleRevealDuration(distance: number): number {
  return Math.max(0, distance) / GRID_TITLE_REVEAL_SPEED * 1000;
}
