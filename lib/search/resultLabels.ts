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
  if (restaurantId === "starbucks" || !showVariant || !variantLabel) {
    return itemName;
  }

  return `${itemName} (${variantLabel})`;
}
