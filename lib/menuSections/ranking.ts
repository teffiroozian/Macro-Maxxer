import type { MenuItem } from "@/types/menu";

export function splitItemsByVariantForRanking(items: MenuItem[]) {
  return items.flatMap((item) => {
    const variants = item.variants ?? [];
    if (variants.length <= 1) {
      return [item];
    }

    const shareableVariants = variants.filter((variant) => variant.servingType === "shareable");
    const splitVariants = variants.filter((variant) => variant.servingType !== "shareable");
    if (splitVariants.length === 0 && shareableVariants.length === 0) {
      return [item];
    }

    // Non-shareable variants need their own rankable rows so each size/nutrition profile can compete;
    // shareable variants stay grouped because the card should still offer the shared serving choices together.
    const splitItems = splitVariants.map((variant) => ({
      ...item,
      defaultVariantId: variant.id,
      disableVariantSelector: true,
      nutrition: variant.nutrition,
    }));

    if (shareableVariants.length === 0) {
      return splitItems;
    }

    return [
      ...splitItems,
      {
        ...item,
        variants: shareableVariants,
        defaultVariantId: shareableVariants[0]?.id,
        nutrition: shareableVariants[0]?.nutrition ?? item.nutrition,
      },
    ];
  });
}
