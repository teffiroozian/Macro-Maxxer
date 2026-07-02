import type { SelectedAddon } from "@/types/cart";
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

function addonId(addon: MenuItem) {
  return addon.id ?? addon.name;
}

export function buildSelectedAddonData(
  selectedAddons: Partial<Record<string, MenuItem>>,
  selectedSauceCounts: Record<string, number>,
  addons: ResolvedAddonGroups | undefined
): SelectedAddon[] | undefined {
  const counts = new Map<string, number>();
  const addCount = (itemId: string | undefined, quantity: number) => {
    if (!itemId || quantity <= 0) return;
    counts.set(itemId, (counts.get(itemId) ?? 0) + quantity);
  };

  Object.values(selectedAddons)
    .filter((addon): addon is MenuItem => Boolean(addon && addon.name !== "None"))
    .forEach((addon) => addCount(addonId(addon), 1));

  const sauceOptions = addons?.[sauceRef]?.items ?? [];
  Object.entries(selectedSauceCounts).forEach(([name, quantity]) => {
    const addon = sauceOptions.find((option) => option.name === name);
    addCount(addon ? addonId(addon) : undefined, quantity);
  });

  const structured = Array.from(counts, ([itemId, quantity]) => ({ itemId, quantity }));
  return structured.length > 0 ? structured : undefined;
}

function selectedAddonQuantityById(selectedAddonData?: SelectedAddon[]) {
  return new Map((selectedAddonData ?? []).map((addon) => [addon.itemId, addon.quantity]));
}

export function getSelectedAddonsFromStructuredData(
  item: MenuItem,
  addons: ResolvedAddonGroups | undefined,
  selectedAddonData?: SelectedAddon[]
) {
  const quantityById = selectedAddonQuantityById(selectedAddonData);
  const selectedMap: Partial<Record<string, MenuItem>> = {};

  for (const ref of item.addonRefs ?? []) {
    if (ref === sauceRef) continue;
    const options = addons?.[ref]?.items ?? [];
    const matched = options.find((addon) => (quantityById.get(addonId(addon)) ?? 0) > 0);
    if (matched) selectedMap[ref] = matched;
  }

  return selectedMap;
}

export function getSelectedSauceCountsFromStructuredData(
  item: MenuItem,
  addons: ResolvedAddonGroups | undefined,
  selectedAddonData?: SelectedAddon[]
) {
  const quantityById = selectedAddonQuantityById(selectedAddonData);
  const sauceOptions = addons?.[sauceRef]?.items ?? [];

  if (!(item.addonRefs ?? []).includes(sauceRef) || sauceOptions.length === 0) {
    return {} as Record<string, number>;
  }

  return sauceOptions.reduce<Record<string, number>>((acc, addon) => {
    const quantity = quantityById.get(addonId(addon)) ?? 0;
    if (quantity > 0) acc[addon.name] = quantity;
    return acc;
  }, {});
}

export function getSelectedAddonsFromLabel(item: MenuItem, addons: ResolvedAddonGroups | undefined, selectionDetailsLabel?: string) {
  if (!selectionDetailsLabel) return {} as Partial<Record<string, MenuItem>>;

  const selectedCounts = parseOptionLabelCounts(selectionDetailsLabel);
  const selectedMap: Partial<Record<string, MenuItem>> = {};

  for (const ref of item.addonRefs ?? []) {
    if (ref === sauceRef) continue;
    const options = addons?.[ref]?.items ?? [];
    const matched = options.find((addon) => (selectedCounts[addon.name] ?? 0) > 0);
    if (matched) {
      selectedMap[ref] = matched;
    }
  }

  return selectedMap;
}

export function getSelectedSauceCountsFromLabel(item: MenuItem, addons: ResolvedAddonGroups | undefined, selectionDetailsLabel?: string) {
  const selectedCounts = parseOptionLabelCounts(selectionDetailsLabel);
  const sauceOptions = addons?.[sauceRef]?.items ?? [];

  if (!(item.addonRefs ?? []).includes(sauceRef) || sauceOptions.length === 0) {
    return {} as Record<string, number>;
  }

  return sauceOptions.reduce<Record<string, number>>((acc, addon) => {
    const quantity = selectedCounts[addon.name] ?? 0;
    if (quantity > 0) acc[addon.name] = quantity;
    return acc;
  }, {});
}
