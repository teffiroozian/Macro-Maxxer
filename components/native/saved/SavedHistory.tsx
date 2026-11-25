import { orderItemNames } from "@/components/native/home/orderPresentation";
import type { PastOrder } from "@/lib/native/homeCollections";
import { formatOrderTime, groupOrders } from "@/lib/native/savedLibrary";
import type { RestaurantIndexEntry } from "@/types/restaurant";
import { SavedInlineMacros } from "./SavedMacros";
import SavedPlace from "./SavedPlace";
import { card, muted, pressable, soft } from "./savedStyles";

export default function SavedHistory({ orders, restaurants, onOpen }: {
  orders: PastOrder[];
  restaurants: RestaurantIndexEntry[];
  onOpen: (order: PastOrder) => void;
}) {
  return groupOrders(orders).map((month) => (
    <section key={month.key} aria-label={month.label}>
      <h2 className={`flex h-9 items-center px-5 text-[15px] font-bold ${soft}`}>{month.label}</h2>
      <div className="flex flex-col gap-2.5 px-[18px] pb-2">
        {month.days.map((day) => (
          <div key={day.key} className="flex gap-2.5">
            <div className="w-[38px] shrink-0 pt-3 text-center">
              <p className="font-heading text-xl font-bold leading-6 tracking-[-0.02em] tabular-nums">{day.day}</p>
              <p className={`text-[13px] leading-[17px] ${muted}`}>{day.weekday}</p>
            </div>
            <ul className="flex min-w-0 flex-1 flex-col gap-2.5">
              {day.orders.map((order) => (
                <li key={order.id}>
                  <button type="button" onClick={() => onOpen(order)} className={`block w-full cursor-pointer rounded-[22px] px-3.5 py-3 text-left focus-ring ${card} ${pressable}`}>
                    <span className="flex items-center gap-2">
                      <SavedPlace items={order.items} restaurants={restaurants} size={22} className="min-w-0 flex-1 text-[15px] font-bold" />
                      <time dateTime={new Date(order.placedAt).toISOString()} className={`shrink-0 text-[13px] ${muted}`}>{formatOrderTime(order.placedAt)}</time>
                    </span>
                    <span className={`mt-[5px] block truncate text-sm leading-[18px] ${soft}`}>{orderItemNames(order.items)}</span>
                    <SavedInlineMacros items={order.items} className="mt-1.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  ));
}
