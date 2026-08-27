import type { CartSelection, CartSelectionOption } from "@/types/cart";
import type { MenuItem, ResolvedAddonGroups } from "@/types/menu";
import { parseOptionLabelCounts, type OptionLabelCountMap } from "@/lib/cartOptionLabels";
import { addonGroupUsesQuantitySelection, findQuantitySelectionAddon } from "@/lib/addonGroups";

// Persisted cart selections store every quantity-mode addon (not just one
// restaurant's literal "sauces" group — see addonGroupUsesQuantitySelection)
// under this one optionId, matching the single flat selectedSauceCounts
// state they're all read from at runtime. Kept as the literal "sauces"
// string for backward compatibility with already-persisted cart entries.
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

export function buildStructuredOptionSelections(
  selectedAddons: Partial<Record<string, MenuItem>>,
  selectedSauceCounts: Record<string, number>,
  addons?: ResolvedAddonGroups
): CartSelectionOption[] | undefined {
  const selections: CartSelectionOption[] = [];

  Object.entries(selectedAddons).forEach(([optionId, addon]) => {
    if (!addon || addon.name === "None") return;
    selections.push({ optionId, itemId: addon.id, label: addon.name, quantity: 1 });
  });

  Object.entries(selectedSauceCounts)
    .filter(([, quantity]) => quantity > 0)
    .forEach(([name, quantity]) => {
      const addon = findQuantitySelectionAddon(addons, name);
      selections.push({ optionId: sauceRef, itemId: addon?.id ?? name, label: addon?.name ?? name, quantity });
    });

  return selections.length > 0 ? selections : undefined;
}

function getSelectedOptionQuantityByItemId(selection: CartSelection | undefined) {
  const quantities = new Map<string, number>();
  if (selection?.type !== "standard") return quantities;

  for (const option of selection.optionSelections ?? []) {
    if (!option.itemId) continue;
    const quantity = option.quantity && option.quantity > 0 ? option.quantity : 1;
    quantities.set(option.itemId, (quantities.get(option.itemId) ?? 0) + quantity);
  }

  return quantities;
}

export function getSelectedAddonsFromSelection(item: MenuItem, addons: ResolvedAddonGroups | undefined, selection: CartSelection | undefined) {
  const selectedQuantities = getSelectedOptionQuantityByItemId(selection);
  if (selectedQuantities.size === 0) {
    return getSelectedAddonsFromLabel(item, addons, selection ? getSelectionLabelFallback(selection) : undefined);
  }

  const selectedMap: Partial<Record<string, MenuItem>> = {};
  for (const ref of item.addonRefs ?? []) {
    if (addonGroupUsesQuantitySelection(ref)) continue;
    const matched = (addons?.[ref]?.items ?? []).find((addon) => (selectedQuantities.get(addon.id) ?? 0) > 0);
    if (matched) selectedMap[ref] = matched;
  }

  return selectedMap;
}

function resolveQuantitySelectionOptions(item: MenuItem, addons: ResolvedAddonGroups | undefined) {
  const seen = new Set<string>();
  const options: MenuItem[] = [];
  for (const ref of item.addonRefs ?? []) {
    if (!addonGroupUsesQuantitySelection(ref)) continue;
    for (const addon of addons?.[ref]?.items ?? []) {
      const key = addon.id ?? addon.name;
      if (seen.has(key)) continue;
      seen.add(key);
      options.push(addon);
    }
  }
  return options;
}

export function getSelectedSauceCountsFromSelection(item: MenuItem, addons: ResolvedAddonGroups | undefined, selection: CartSelection | undefined) {
  const selectedQuantities = getSelectedOptionQuantityByItemId(selection);
  if (selectedQuantities.size === 0) {
    return getSelectedSauceCountsFromLabel(item, addons, selection ? getSelectionLabelFallback(selection) : undefined);
  }

  const quantityOptions = resolveQuantitySelectionOptions(item, addons);
  if (quantityOptions.length === 0) {
    return {} as Record<string, number>;
  }

  return quantityOptions.reduce<Record<string, number>>((acc, addon) => {
    const quantity = selectedQuantities.get(addon.id) ?? 0;
    if (quantity > 0) acc[addon.name] = quantity;
    return acc;
  }, {});
}

function getSelectionLabelFallback(selection: CartSelection) {
  if (selection.type !== "standard") return undefined;
  const labels = (selection.optionSelections ?? []).map((option) =>
    option.quantity && option.quantity > 1 ? `${option.label} x${option.quantity}` : option.label
  );
  return labels.length > 0 ? labels.join(" + ") : undefined;
}

export function getSelectedAddonsFromLabel(item: MenuItem, addons: ResolvedAddonGroups | undefined, selectionDetailsLabel?: string) {
  if (!selectionDetailsLabel) return {} as Partial<Record<string, MenuItem>>;

  const selectedCounts = parseOptionLabelCounts(selectionDetailsLabel);
  const selectedMap: Partial<Record<string, MenuItem>> = {};

  for (const ref of item.addonRefs ?? []) {
    if (addonGroupUsesQuantitySelection(ref)) continue;
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
  const quantityOptions = resolveQuantitySelectionOptions(item, addons);

  if (quantityOptions.length === 0) {
    return {} as Record<string, number>;
  }

  return quantityOptions.reduce<Record<string, number>>((acc, addon) => {
    const quantity = selectedCounts[addon.name] ?? 0;
    if (quantity > 0) acc[addon.name] = quantity;
    return acc;
  }, {});
}
