"use client";
import { useGlobalItemPreview } from "@/components/GlobalItemPreviewContext";
import { useMenuItemCartAdapter } from "@/components/menu-item-card/useMenuItemCartAdapter";
import RestaurantItemImage from "@/components/ui/RestaurantItemImage";
import { trackAddToCart } from "@/lib/analytics";
import { getCartItemAddToCartAnalytics } from "@/lib/cart/itemAccessors";
import { buildStandardCartItemPayload } from "@/lib/cart/standardItemConfiguration";
import { getProteinPer100Calories, resolveMenuItemVariantNutrition } from "@/lib/nutrition";
import type { MenuItem } from "@/types/menu";
import NativeMacroRow from "./NativeMacroRow";

export default function NativeCategoryItemCard({ restaurantId, item }: { restaurantId: string; item: MenuItem }) {
  const { openPreview } = useGlobalItemPreview();
  const { requestAddItem, updateQuantity, getMatchingItem } = useMenuItemCartAdapter();
  const variant = item.variants?.find((v) => v.id === item.defaultVariantId) ?? item.variants?.[0];
  const nutrition = resolveMenuItemVariantNutrition(item, variant);
  const score = getProteinPer100Calories(nutrition.protein ?? 0, nutrition.calories ?? 0);

  const add = () => {
    const itemId = item.id ?? item.name;
    const match = getMatchingItem({ restaurantId, itemId, variantId: variant?.id });
    if (match) {
      updateQuantity(match.id, match.quantity + 1, { markAsJustAdded: true });
      trackAddToCart(getCartItemAddToCartAnalytics(match, 1));
      return;
    }
    requestAddItem({
      id: crypto.randomUUID(),
      restaurantId,
      itemId,
      ...buildStandardCartItemPayload({ item, selectedVariant: variant, quantity: 1, nutritionPerItem: nutrition }),
    });
  };

  const open = () => void openPreview(restaurantId, item);
  const label = `${item.name}, ${Math.round(nutrition.calories ?? 0)} calories, ${Math.round(nutrition.protein ?? 0)} grams protein`;
  const press = "block w-full text-left transition-transform duration-120 active:scale-[0.98] motion-reduce:active:scale-100 focus-ring";

  return (
    <div role="listitem" className="w-[172px] flex-none snap-start rounded-[20px] border border-black/8 bg-white p-2 shadow-elev-2">
      <div className="relative">
        <button type="button" onClick={open} aria-label={label} className={press}>
          <RestaurantItemImage src={variant?.image ?? item.image} alt="" imagePresentation={item.imagePresentation} containerClassName="aspect-[1.2] overflow-hidden rounded-[14px] bg-slate-100" />
        </button>
        <button type="button" onClick={add} aria-label={`Add ${item.name}`} className="absolute bottom-0 right-0 flex size-11 items-center justify-center focus-ring">
          <span className="flex size-[30px] items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(15,23,42,0.18)]">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 1.5v9M1.5 6h9" stroke="#047857" strokeWidth="3" strokeLinecap="round" /></svg>
          </span>
        </button>
      </div>
      <button type="button" onClick={open} aria-label={label} className={press}>
        <span className="flex flex-col gap-[3px] px-1 pt-[9px]">
          <span className="truncate text-sm font-bold text-slate-900">{item.name}</span>
          <span className="text-xs text-slate-500" aria-hidden="true">{score === undefined ? "—" : (Math.round(score * 10) / 10).toFixed(1)}g protein / 100 cal</span>
        </span>
        <span className="mt-3 block border-t border-slate-100 px-1 pb-1 pt-3"><NativeMacroRow nutrition={nutrition} variant="grid" /></span>
      </button>
    </div>
  );
}
