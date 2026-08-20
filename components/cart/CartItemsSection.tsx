import { useMemo } from "react";
import Image from "next/image";
import CartItemCard from "@/components/cart/CartItemCard";
import { formatCartItemName } from "@/lib/cart/displayLabels";
import { getAllRestaurants } from "@/lib/restaurants";
import type { CartItem } from "@/types/cart";

type CartItemsSectionProps = {
  items: CartItem[];
  loadingEditItemId: string | null;
  onUpdateQuantity: (cartItemId: string, quantity: number) => void;
  onPreviewItem: (cartItem: CartItem) => void;
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
  loadingEditItemId,
  onUpdateQuantity,
  onPreviewItem,
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
    <div className="flex flex-col gap-6">
      {groupedItems.map(([restaurantId, restaurantItems], groupIndex) => {
        const restaurant = restaurantsById.get(restaurantId);
        return (
          <section
            key={restaurantId}
            className={groupIndex > 0 ? "border-t border-black/10 pt-6" : ""}
          >
            <div className="mb-3 flex items-center gap-2 px-1">
              <span className="relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md bg-neutral-50">
                {restaurant?.logo ? (
                  <Image src={restaurant.logo} alt="" fill sizes="24px" className="object-cover" />
                ) : null}
              </span>
              <h2 className="text-sm font-semibold text-neutral-600">
                {restaurant?.name ?? "Restaurant"}
              </h2>
            </div>
            <ul className="flex flex-col gap-3">
              {restaurantItems.map((cartItem) => {
                const displayName = formatCartItemName(cartItem);
                return (
                  <CartItemCard
                    key={cartItem.id}
                    cartItem={cartItem}
                    displayName={displayName}
                    isEditLoading={loadingEditItemId === cartItem.id}
                    onPreview={() => onPreviewItem(cartItem)}
                    onEdit={() => onEditItem(cartItem)}
                    onIncrement={() => onUpdateQuantity(cartItem.id, cartItem.quantity + 1)}
                    onDecrement={() => onUpdateQuantity(cartItem.id, cartItem.quantity - 1)}
                  />
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
