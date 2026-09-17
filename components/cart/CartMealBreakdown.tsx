import SectionEyebrow from "@/components/ui/SectionEyebrow";
import {
  MEAL_DETAILS_SECTION_LABEL_CLASSNAME,
  MealDetailItemRow,
  SelectionSummaryShell,
} from "@/components/item-route-modal/SelectionSummaryPanels";
import { formatCartItemName, summarizeItem } from "@/lib/cart/displayLabels";
import type { CartItem, CartMacros } from "@/types/cart";
import { getRestaurantImagePresentation } from "@/lib/restaurantPresentation";
import { getCartItemImagePresentation, resolveCartItemMacroBreakdown } from "@/lib/cart/cartItemLookup";

type CartMealBreakdownProps = {
  items: CartItem[];
  totals: CartMacros;
  onPreviewItem: (cartItem: CartItem) => void;
};

export default function CartMealBreakdown({ items, totals, onPreviewItem }: CartMealBreakdownProps) {
  return (
    <SelectionSummaryShell
      title="Meal Breakdown"
      totals={totals}
      proteinScoreItems={items.map((item) => {
        // Every macro value here — the item's own totals and each nested
        // row's — is scaled by quantity, matching how `totals` (the cart's
        // grand total, also quantity-scaled) is computed, so a ×2 item's
        // contribution bar/percentage against that total comes out right.
        const quantityMultiplier = Math.max(item.quantity, 1);
        const breakdown = resolveCartItemMacroBreakdown(item);
        return {
          id: item.id,
          name: formatCartItemName(item),
          image: item.image,
          // Item-level override only here — the cart can mix items from
          // several restaurants in one list, so there's no single
          // restaurant-level default that would be correct for all of them.
          imagePresentation: getCartItemImagePresentation(item),
          calories: item.nutritionPerItem.calories * quantityMultiplier,
          protein: item.nutritionPerItem.protein * quantityMultiplier,
          carbs: item.nutritionPerItem.carbs * quantityMultiplier,
          totalFat: item.nutritionPerItem.totalFat * quantityMultiplier,
          nestedKind: breakdown.kind,
          nestedItems: breakdown.entries.map((entry) => ({
            ...entry,
            calories: entry.calories * quantityMultiplier,
            protein: entry.protein * quantityMultiplier,
            carbs: entry.carbs * quantityMultiplier,
            totalFat: entry.totalFat * quantityMultiplier,
          })),
        };
      })}
      beforeList={<SectionEyebrow className={MEAL_DETAILS_SECTION_LABEL_CLASSNAME}>Items</SectionEyebrow>}
    >
      {items.length === 0 ? (
        <ul className="grid list-none gap-2 pl-0" aria-hidden="true">
          {[0, 1].map((placeholderKey) => (
            <li
              key={`meal-breakdown-skeleton-${placeholderKey}`}
              className="flex min-w-0 items-center gap-3 rounded-xl border border-black/10 bg-white px-3 py-2"
            >
              <div className="h-10 w-10 shrink-0 rounded-lg bg-neutral-100" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="h-3 w-3/5 rounded-full bg-neutral-100" />
                <div className="h-2.5 w-2/5 rounded-full bg-neutral-100" />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid list-none gap-2 pl-0">
          {items.map((item) => {
            const restaurantImagePresentation = getRestaurantImagePresentation(item.restaurantId);
            const detailLine = summarizeItem(item);
            const displayName = formatCartItemName(item);
            return (
              <MealDetailItemRow
                key={`${item.id}-breakdown`}
                name={displayName}
                secondaryText={detailLine}
                quantity={item.quantity}
                image={item.image}
                imagePresentation={getCartItemImagePresentation(item)}
                imageFallbackClassName={restaurantImagePresentation.itemThumbnailImageClassName ?? "object-contain p-1"}
                imageFallbackBackgroundColor={restaurantImagePresentation.imageBackgroundColor}
                onClick={() => onPreviewItem(item)}
              />
            );
          })}
        </ul>
      )}
    </SelectionSummaryShell>
  );
}
