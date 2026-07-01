import type { MenuItem, ResolvedAddonGroups } from "@/types/menu";
import { parseOptionLabelCounts, type OptionLabelCountMap } from "@/lib/cartOptionLabels";

const sauceRef: string = "sauces";

export function buildOptionLabelCounts(
  selectedAddons: Partial<Record<string, MenuItem>>,
  selectedSauceCounts: Record<string, number>
): OptionLabelCountMap {
  const counts: OptionLabelCountMap = {};

  Object.values(selectedAddons)
    .filter((addon): addon is MenuItem => Boolean(addon && addon.name !== "None"))
    .forEach((addon) => {
      counts[addon.name] = (counts[addon.name] ?? 0) + 1;
    });

  Object.entries(selectedSauceCounts)
    .filter(([, count]) => count > 0)
    .forEach(([name, count]) => {
      counts[name] = (counts[name] ?? 0) + count;
    });

  return counts;
}

export function getSelectedAddonsFromLabel(item: MenuItem, addons: ResolvedAddonGroups | undefined, selectionDetailsLabel?: string) {
  if (!selectionDetailsLabel) return {} as Partial<Record<string, MenuItem>>;

  const selectedCounts = parseOptionLabelCounts(selectionDetailsLabel);
  const selectedMap: Partial<Record<string, MenuItem>> = {};

  for (const ref of item.addonRefs ?? []) {
    if (ref === sauceRef) continue;
    const options = addons?.[ref] ?? [];
    const matched = options.find((addon) => (selectedCounts[addon.name] ?? 0) > 0);
    if (matched) {
      selectedMap[ref] = matched;
    }
  }

  return selectedMap;
}

export function getSelectedSauceCountsFromLabel(item: MenuItem, addons: ResolvedAddonGroups | undefined, selectionDetailsLabel?: string) {
  const selectedCounts = parseOptionLabelCounts(selectionDetailsLabel);
  const sauceOptions = addons?.[sauceRef] ?? [];

  if (!(item.addonRefs ?? []).includes(sauceRef) || sauceOptions.length === 0) {
    return {} as Record<string, number>;
  }

  return sauceOptions.reduce<Record<string, number>>((acc, addon) => {
    const quantity = selectedCounts[addon.name] ?? 0;
    if (quantity > 0) acc[addon.name] = quantity;
    return acc;
  }, {});
}
