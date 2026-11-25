import { orderItemNames, orderPhotos } from "@/components/native/home/orderPresentation";
import SavedPhoto from "@/components/native/saved/SavedPhoto";
import { card, muted } from "@/components/native/saved/savedStyles";
import { mealMeta } from "@/lib/native/savedLibrary";
import type { CartItem } from "@/types/cart";
import type { RestaurantIndexEntry } from "@/types/restaurant";

export default function OrderSavePreview({ items, restaurants }: { items: CartItem[]; restaurants: RestaurantIndexEntry[] }) {
  const photos = orderPhotos(items);
  return (
    <div className={`mt-3.5 flex items-center gap-3.5 rounded-[22px] p-3 ${card}`}>
      {photos.length ? <span className="flex shrink-0">{photos.map((item, index) => <SavedPhoto key={item.id} item={item} className={`relative size-14 rounded-[17px] border-[3px] border-surface-card ${index ? "-ml-5" : ""}`} />)}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold leading-5">{mealMeta(items, restaurants)}</span>
        <span className={`mt-px block truncate text-sm leading-[18px] ${muted}`}>{orderItemNames(items)}</span>
      </span>
    </div>
  );
}
