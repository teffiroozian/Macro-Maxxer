import type { MenuItem } from "@/types/menu";
import type { MenuSizeSelectorCapability } from "@/types/restaurant";

export const ALL_MENU_SIZES = "all-sizes";
export type MenuSizeSelectorControl = {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
};

// Discover the connected size vocabulary from actual families containing the
// configured default. Unrelated packaging units and component picks are not
// exposed as menu-wide preferences.
export function getMenuSizeOptions(items: MenuItem[], capability?: MenuSizeSelectorCapability) {
  if (!capability?.enabled) return [];
  const sizes = new Set<string>([capability.defaultValue.toLowerCase()]);
  const families = items.filter((item) => !item.sourceOnly && item.variantGroupKind !== "component" && (item.variants?.length ?? 0) > 1);
  let changed = true;
  while (changed) {
    changed = false;
    for (const family of families) {
      if (!family.variants?.some((variant) => sizes.has(variant.label.trim().toLowerCase()))) continue;
      for (const variant of family.variants) {
        const size = variant.label.trim().toLowerCase();
        if (!sizes.has(size)) { sizes.add(size); changed = true; }
      }
    }
  }
  const actual = new Map<string, string>();
  for (const family of families) for (const variant of family.variants ?? []) {
    const key = variant.label.trim().toLowerCase();
    if (sizes.has(key)) actual.set(key, variant.label.trim());
  }
  const labels = capability.allowedValues
    ? capability.allowedValues.filter((label) => actual.has(label.toLowerCase())).map((label) => actual.get(label.toLowerCase())!)
    : [...actual.values()];
  return labels.map((label) => ({ value: label, label })).concat({ value: ALL_MENU_SIZES, label: "All sizes" });
}
