import Link from "next/link";
import { Plus } from "lucide-react";
import NativeRestaurantLogo from "@/components/native/restaurants/NativeRestaurantLogo";
import type { CartItem } from "@/types/cart";
import type { RestaurantIndexEntry } from "@/types/restaurant";
import OrderItemCard from "./OrderItemCard";

export default function OrderGroup({ restaurant, items, loadingId, onEdit, onRemove, onQuantity }: {
  restaurant?: RestaurantIndexEntry;
  items: CartItem[];
  loadingId: string | null;
  onEdit: (item: CartItem) => void;
  onRemove: (item: CartItem) => void;
  onQuantity: (item: CartItem, quantity: number) => void;
}) {
  const name = restaurant?.name ?? "Restaurant";
  return (
    <section aria-label={name} className="px-[18px] pt-[18px]">
      <div className="flex h-[46px] items-center gap-2.5">
        {restaurant ? <NativeRestaurantLogo src={restaurant.logo} size={28} /> : null}
        <h2 className="min-w-0 flex-1 truncate text-lg font-bold">{name}</h2>
        {restaurant ? (
          <Link href={`/restaurant/${restaurant.id}`} aria-label={`Add items from ${name}`} className="flex h-11 shrink-0 items-center gap-1.5 px-1 text-[15px] font-semibold text-accent-strong active:opacity-70 focus-ring">
            <Plus size={16} strokeWidth={2.8} aria-hidden="true" />Add items
          </Link>
        ) : null}
      </div>
      <ul className="flex flex-col gap-3 pt-0.5">
        {items.map((item) => (
          <li key={item.id}>
            <OrderItemCard item={item} loading={loadingId === item.id} onEdit={() => onEdit(item)} onRemove={() => onRemove(item)} onQuantity={(quantity) => onQuantity(item, quantity)} />
          </li>
        ))}
      </ul>
    </section>
  );
}
