import { orderPlaceName } from "@/components/native/home/orderPresentation";
import NativeRestaurantLogo from "@/components/native/restaurants/NativeRestaurantLogo";
import { mealMeta, restaurantIds } from "@/lib/native/savedLibrary";
import type { CartItem } from "@/types/cart";
import type { RestaurantIndexEntry } from "@/types/restaurant";

export default function SavedPlace({ items, restaurants, size = 18, withCount = false, label, className = "" }: {
  items: CartItem[];
  restaurants: RestaurantIndexEntry[];
  size?: number;
  withCount?: boolean;
  // Replaces the restaurant name beside the logos.
  label?: string;
  className?: string;
}) {
  const logos = restaurantIds(items).flatMap((id) => restaurants.find((r) => r.id === id) ?? []).slice(0, 3);
  return (
    <span className={`flex items-center gap-1.5 ${className}`}>
      {logos.length ? (
        <span className="flex shrink-0">
          {logos.map((restaurant, index) => <span key={restaurant.id} className={`flex rounded-full ${index ? "-ml-1.5" : ""}`}><NativeRestaurantLogo src={restaurant.logo} size={size} /></span>)}
        </span>
      ) : null}
      <span className="truncate">{label ?? (withCount ? mealMeta(items, restaurants) : orderPlaceName(items, restaurants))}</span>
    </span>
  );
}
