import { Bookmark, History, type LucideIcon } from "lucide-react";
import { formatOrderDate, orderPhotos } from "@/components/native/home/orderPresentation";
import SavedPhoto from "@/components/native/saved/SavedPhoto";
import { card, muted, pressable } from "@/components/native/saved/savedStyles";
import type { PastOrder, SavedMeal } from "@/lib/native/homeCollections";
import { countLabel, itemCount } from "@/lib/native/savedLibrary";
import type { CartItem } from "@/types/cart";

export type YoursTab = "meals" | "orders";

// Shown only for what exists; a single shortcut takes the full width.
export default function RestaurantShortcuts({ meals, orders, onOpen }: { meals: SavedMeal[]; orders: PastOrder[]; onOpen: (tab: YoursTab) => void }) {
  if (!meals.length && !orders.length) return null;
  const shortcut = (tab: YoursTab, Icon: LucideIcon, title: string, text: string, items: CartItem[]) => (
    <button type="button" aria-haspopup="dialog" onClick={() => onOpen(tab)} className={`block min-w-0 flex-1 cursor-pointer rounded-[22px] px-3.5 pb-[13px] pt-3 text-left focus-ring ${card} ${pressable}`}>
      <span className="flex items-center" aria-hidden="true">
        {orderPhotos(items).slice(0, 2).map((item, index) => <span key={item.id} className={`relative rounded-[15px] border-2 border-white dark:border-surface-card ${index ? "-ml-[15px]" : ""}`}><SavedPhoto item={item} className="size-10 rounded-[13px]" /></span>)}
        <Icon size={18} strokeWidth={2.3} className="ml-auto text-accent-strong" />
      </span>
      <span className="mt-2.5 block truncate text-base font-bold leading-5">{title}</span>
      <span className={`mt-px block truncate text-sm leading-[18px] ${muted}`}>{text}</span>
    </button>
  );
  return (
    <div className="flex gap-2.5 px-[18px] pt-3.5">
      {meals.length ? shortcut("meals", Bookmark, "Saved meals", countLabel(meals.length, "meal"), meals.flatMap((meal) => meal.items)) : null}
      {orders.length ? shortcut("orders", History, "Last order", `${formatOrderDate(orders[0].placedAt)}, ${countLabel(itemCount(orders[0].items))}`, orders[0].items) : null}
    </div>
  );
}
