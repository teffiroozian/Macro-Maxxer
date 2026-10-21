import { getCleanMenuItemName, getDisplayVariantLabel } from "@/lib/menuItemCard/titlePresentation";

export function getMenuItemSearchResultName({
  itemName,
  restaurantId,
  variantLabel,
  showVariant,
}: {
  itemName: string;
  restaurantId: string;
  variantLabel?: string;
  showVariant: boolean;
}) {
  itemName = getCleanMenuItemName(itemName);
  variantLabel = getDisplayVariantLabel(variantLabel);
  if (restaurantId === "starbucks" || !showVariant || !variantLabel) {
    return itemName;
  }

  return `${itemName} (${variantLabel})`;
}
