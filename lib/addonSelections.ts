import type { AddonOption, AddonRef, MenuItem, RestaurantAddons } from "@/types/menu";

export type AddonCountMap = Partial<Record<AddonRef, Record<string, number>>>;

type ParsedAddonSelection = {
  name: string;
  quantity: number;
};

function normalizeToken(token: string) {
  return token.trim();
}

export function parseOptionsLabel(optionsLabel?: string): ParsedAddonSelection[] {
  if (!optionsLabel) return [];

  const segments = optionsLabel
    .split("+")
    .map((segment) => normalizeToken(segment))
    .filter(Boolean);

  return segments.map((segment) => {
    const quantityMatch = segment.match(/^(.*)\s+x(\d+)$/i);
    if (!quantityMatch) {
      return { name: segment, quantity: 1 };
    }

    const name = quantityMatch[1]?.trim();
    const quantity = Number.parseInt(quantityMatch[2] ?? "1", 10);

    if (!name) {
      return { name: segment, quantity: 1 };
    }

    return {
      name,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    };
  });
}

export function serializeOptionsLabel(addons: Array<{ addon: AddonOption; quantity: number }>) {
  if (addons.length === 0) return undefined;

  return addons
    .filter(({ addon, quantity }) => addon.name !== "None" && quantity > 0)
    .map(({ addon, quantity }) => (quantity > 1 ? `${addon.name} x${quantity}` : addon.name))
    .join(" + ");
}

export function getSelectedAddonCountsFromLabel(
  item: MenuItem,
  addons: RestaurantAddons | undefined,
  optionsLabel?: string
): AddonCountMap {
  const parsed = parseOptionsLabel(optionsLabel);
  if (parsed.length === 0) return {};

  const parsedQuantities = new Map<string, number>();
  parsed.forEach(({ name, quantity }) => {
    parsedQuantities.set(name, (parsedQuantities.get(name) ?? 0) + quantity);
  });

  const selectedMap: AddonCountMap = {};

  for (const ref of item.addonRefs ?? []) {
    const options = addons?.[ref] ?? [];
    for (const option of options) {
      const quantity = parsedQuantities.get(option.name) ?? 0;
      if (quantity > 0) {
        selectedMap[ref] = {
          ...(selectedMap[ref] ?? {}),
          [option.name]: quantity,
        };
      }
    }
  }

  return selectedMap;
}
