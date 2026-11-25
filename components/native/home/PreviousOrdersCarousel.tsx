import { useState } from "react";
import NativeRestaurantLogo from "@/components/native/restaurants/NativeRestaurantLogo";
import Dialog from "@/components/ui/Dialog";
import RestaurantItemImage from "@/components/ui/RestaurantItemImage";
import { useOrderHistory } from "@/hooks/useHomeCollections";
import { buildCartMacroTotals, hasPartialCartNutritionData } from "@/lib/cart/nutrition";
import type { PastOrder } from "@/lib/native/homeCollections";
import type { RestaurantIndexEntry } from "@/types/restaurant";
import HomeMacroRow from "./HomeMacroRow";
import { formatOrderDate, orderItemNames, orderPhotos, orderPlaceName } from "./orderPresentation";

export default function PreviousOrdersCarousel({ restaurants }: { restaurants: RestaurantIndexEntry[] }) {
  const orders = useOrderHistory();
  const [viewing, setViewing] = useState<PastOrder | null>(null);
  if (!orders.length) return null;

  return (
    <section className="native-home-reveal mt-5">
      <h2 className="flex h-11 items-center px-0.5 text-xl font-bold text-slate-900">Previous orders</h2>
      <div className="native-home-carousel" aria-label="Previous orders">
        {orders.slice(0, 8).map((order) => {
          const logo = restaurants.find((r) => r.id === order.items[0].restaurantId)?.logo;
          return (
            <article key={order.id} className="w-[312px] max-w-full shrink-0 snap-start rounded-3xl border border-black/8 bg-white px-4 pb-4 pt-3.5 shadow-elev-2">
              <div className="flex h-[30px] items-center gap-2">
                {logo ? <NativeRestaurantLogo src={logo} size={28} /> : null}
                <h3 className="min-w-0 flex-1 truncate text-[15px] font-bold">{orderPlaceName(order.items, restaurants)}</h3>
                <time dateTime={new Date(order.placedAt).toISOString()} className="shrink-0 text-[13px] text-slate-500">{formatOrderDate(order.placedAt)}</time>
              </div>
              <p className="mt-2.5 truncate text-sm font-semibold leading-[19px]">{orderItemNames(order.items)}</p>
              <div className="mt-2 flex h-14 gap-1.5" aria-hidden="true">
                {orderPhotos(order.items).map((item) => (
                  <RestaurantItemImage key={item.id} src={item.image} alt="" imagePresentation={item.imagePresentation} fallbackClassName="object-cover" containerClassName="size-14 overflow-hidden rounded-2xl bg-slate-100" />
                ))}
              </div>
              <div className="mt-3.5"><HomeMacroRow totals={buildCartMacroTotals(order.items)} approximate={hasPartialCartNutritionData(order.items)} /></div>
              <button type="button" onClick={() => setViewing(order)} className="mt-3.5 flex h-11 w-full cursor-pointer items-center justify-center rounded-[14px] bg-accent-soft text-[15px] font-bold text-accent-strong active:opacity-70 focus-ring">View order</button>
            </article>
          );
        })}
      </div>
      {viewing ? (
        <Dialog onClose={() => setViewing(null)} titleId="previous-order-title" presentation="bottom-sheet" panelClassName="max-h-[85dvh] overflow-y-auto">
          <h2 id="previous-order-title" className="font-heading text-lg font-bold">{orderPlaceName(viewing.items, restaurants)}</h2>
          <p className="mt-1 text-[13px] text-slate-500">{formatOrderDate(viewing.placedAt)}</p>
          <ul className="mt-4 divide-y divide-slate-200">
            {viewing.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-3">
                <RestaurantItemImage src={item.image} alt="" imagePresentation={item.imagePresentation} fallbackClassName="object-cover" containerClassName="size-12 shrink-0 overflow-hidden rounded-[14px] bg-slate-100" />
                <span className="min-w-0 flex-1 text-[15px] font-semibold">{item.name}</span>
                <span className="text-sm text-slate-500">×{item.quantity}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3"><HomeMacroRow totals={buildCartMacroTotals(viewing.items)} approximate={hasPartialCartNutritionData(viewing.items)} /></div>
          <button type="button" onClick={() => setViewing(null)} className="mt-5 flex h-12 w-full cursor-pointer items-center justify-center rounded-2xl bg-accent-strong text-base font-bold text-white active:opacity-80 focus-ring">Done</button>
        </Dialog>
      ) : null}
    </section>
  );
}
