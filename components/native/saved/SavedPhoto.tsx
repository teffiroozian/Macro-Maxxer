import { CutleryIcon } from "@/components/icons/SearchScopeIcons";
import RestaurantItemImage from "@/components/ui/RestaurantItemImage";
import { getCartItemImagePresentation } from "@/lib/cart/cartItemLookup";
import type { CartItem } from "@/types/cart";

export default function SavedPhoto({ item, className }: { item: CartItem; className: string }) {
  return (
    <RestaurantItemImage
      src={item.image}
      alt=""
      imagePresentation={getCartItemImagePresentation(item)}
      fallbackClassName="object-cover"
      containerClassName={`flex items-center justify-center overflow-hidden bg-slate-100 ${item.image ? "dark:bg-image-placeholder" : "dark:bg-surface-hover"} ${className}`}
      fallback={<CutleryIcon className="size-6 text-slate-400" />}
    />
  );
}

// A meal leads with its first photographed item.
export const leadItem = (items: CartItem[]) => items.find((item) => item.image) ?? items[0];
