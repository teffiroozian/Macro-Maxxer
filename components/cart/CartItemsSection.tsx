import { useMemo } from "react";
import Image from "next/image";
import { Pencil, Trash2 } from "lucide-react";
import AppButton from "@/components/ui/AppButton";
import SurfaceCard from "@/components/ui/SurfaceCard";
import QuantityStepper from "@/components/QuantityStepper";
import CartItemPreviewRow from "@/components/cart/CartItemPreviewRow";
import CartItemDetailsPanel from "@/components/cart/CartItemDetailsPanel";
import { formatCartItemName, summarizeItem } from "@/lib/cart/displayLabels";
import { getAllRestaurants } from "@/lib/restaurants";
import type { CartItem } from "@/types/cart";

type CartItemsSectionProps = {
  items: CartItem[];
  expandedItemId: string | null;
  loadingEditItemId: string | null;
  onToggleExpandedItem: (cartItemId: string) => void;
  onUpdateQuantity: (cartItemId: string, quantity: number) => void;
  onEditItem: (cartItem: CartItem) => void;
};

// Groups the flat cart array by restaurantId, keeping restaurants in
// first-seen order and preserving each restaurant's existing item order —
// derived at render time rather than stored, so it can't drift from cart state.
function groupItemsByRestaurant(items: CartItem[]) {
  const groups = new Map<string, CartItem[]>();

  for (const item of items) {
    const existing = groups.get(item.restaurantId);
    if (existing) {
      existing.push(item);
    } else {
      groups.set(item.restaurantId, [item]);
    }
  }

  return Array.from(groups.entries());
}

export default function CartItemsSection({
  items,
  expandedItemId,
  loadingEditItemId,
  onToggleExpandedItem,
  onUpdateQuantity,
  onEditItem,
}: CartItemsSectionProps) {
  const restaurantsById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getAllRestaurants>[number]>();
    for (const restaurant of getAllRestaurants()) {
      map.set(restaurant.id, restaurant);
    }
    return map;
  }, []);

  const groupedItems = useMemo(() => groupItemsByRestaurant(items), [items]);

  return (
    <div className="grid gap-6">
      {groupedItems.map(([restaurantId, restaurantItems]) => {
        const restaurant = restaurantsById.get(restaurantId);
        return (
          <section key={restaurantId}>
            <div className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
              <span className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-50">
                {restaurant?.logo ? (
                  <Image src={restaurant.logo} alt="" fill sizes="28px" className="object-cover" />
                ) : null}
              </span>
              <h2 className="text-sm font-semibold text-slate-900">
                {restaurant?.name ?? "Restaurant"}
              </h2>
            </div>
            <ul className="grid gap-3">
              {restaurantItems.map((cartItem) => {
                const detailLine = summarizeItem(cartItem);
                const displayItem = { ...cartItem, name: formatCartItemName(cartItem) };
                const canCustomize = cartItem.selection.type !== "build-your-own";
                return (
                  <SurfaceCard as="li" key={cartItem.id} padding="default" className="transition hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(15,23,42,0.08)]">
                    <div
                      role="button"
                      tabIndex={0}
                      className="w-full cursor-pointer text-left"
                      onClick={() => onToggleExpandedItem(cartItem.id)}
                      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onToggleExpandedItem(cartItem.id); }}
                      aria-expanded={expandedItemId === cartItem.id}
                    >
                      <CartItemPreviewRow
                        item={displayItem}
                        imageRenderer="native-img"
                        imageFallback="initial"
                        macroStyle="detailed"
                        customizationsText={detailLine}
                        customizationsLineClamp={2}
                        actions={
                          <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
                            {canCustomize ? (
                              <AppButton
                                variant="pill"
                                size="sm"
                                aria-label={`Customize ${cartItem.name}`}
                                title="Customize"
                                onClick={(event) => { event.stopPropagation(); onEditItem(cartItem); }}
                                disabled={loadingEditItemId === cartItem.id}
                                className="h-10 w-10 px-0 py-0 disabled:cursor-wait"
                              >
                                {loadingEditItemId === cartItem.id ? <span className="text-[10px]">...</span> : <Pencil className="h-5 w-5" strokeWidth={2.5} />}
                              </AppButton>
                            ) : null}
                            <QuantityStepper
                              value={cartItem.quantity}
                              onDecrement={() => onUpdateQuantity(cartItem.id, cartItem.quantity - 1)}
                              onIncrement={() => onUpdateQuantity(cartItem.id, cartItem.quantity + 1)}
                              decrementLabel={cartItem.quantity === 1 ? `Remove ${cartItem.name} from cart` : `Decrease quantity of ${cartItem.name}`}
                              incrementLabel={`Increase quantity of ${cartItem.name}`}
                              decrementContent={cartItem.quantity === 1 ? <Trash2 className="h-4 w-4" strokeWidth={2.5} /> : undefined}
                            />
                          </div>
                        }
                      />
                    </div>
                    {expandedItemId === cartItem.id ? <CartItemDetailsPanel cartItem={cartItem} detailLine={detailLine} /> : null}
                  </SurfaceCard>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
