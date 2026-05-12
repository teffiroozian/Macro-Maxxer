import type { AddonOption, MenuItem, RestaurantAddons } from "@/types/menu";
import type { AddonRef, CommonChange } from "@/lib/addonTypes";
import { parseOptionLabelCounts, type OptionLabelCountMap } from "@/lib/cartOptionLabels";

const sauceRef: AddonRef = "sauces";

export function formatCommonChangeForCart(label: string) {
  const [firstSegment] = label.split("→");
  const normalized = firstSegment.trim();

  if (!normalized) {
    return label;
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function buildOptionLabelCounts(
  selectedAddons: Partial<Record<AddonRef, AddonOption>>,
  selectedSauceCounts: Record<string, number>
): OptionLabelCountMap {
  const counts: OptionLabelCountMap = {};

  Object.values(selectedAddons)
    .filter((addon): addon is AddonOption => Boolean(addon && addon.name !== "None"))
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

export function getSelectedAddonsFromLabel(item: MenuItem, addons: RestaurantAddons | undefined, optionsLabel?: string) {
  if (!optionsLabel) return {} as Partial<Record<AddonRef, AddonOption>>;

  const selectedCounts = parseOptionLabelCounts(optionsLabel);
  const selectedMap: Partial<Record<AddonRef, AddonOption>> = {};

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

export function getSelectedSauceCountsFromLabel(item: MenuItem, addons: RestaurantAddons | undefined, optionsLabel?: string) {
  const selectedCounts = parseOptionLabelCounts(optionsLabel);
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

export function getSelectedCommonChangeIdsFromCustomizations(
  commonChanges: CommonChange[] | undefined,
  customizations: string[] | undefined
) {
  if (!commonChanges || commonChanges.length === 0 || !customizations || customizations.length === 0) {
    return [];
  }

  const normalizedCustomizations = new Set(customizations.map((label) => label.replace(/^\+\s*/, "").trim().toLowerCase()));

  return commonChanges
    .filter((change) => {
      const normalizedLabel = change.label.trim().toLowerCase();
      const normalizedCartLabel = formatCommonChangeForCart(change.label).trim().toLowerCase();
      return normalizedCustomizations.has(normalizedLabel) || normalizedCustomizations.has(normalizedCartLabel);
    })
    .map((change) => change.id);
}
