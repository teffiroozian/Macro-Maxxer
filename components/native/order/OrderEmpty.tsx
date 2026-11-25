import Link from "next/link";
import { formatOrderDate, orderItemNames, orderPlaceName } from "@/components/native/home/orderPresentation";
import SavedMacros from "@/components/native/saved/SavedMacros";
import SavedPlace from "@/components/native/saved/SavedPlace";
import { card, muted, primaryButton, soft } from "@/components/native/saved/savedStyles";
import type { PastOrder } from "@/lib/native/homeCollections";
import type { RestaurantIndexEntry } from "@/types/restaurant";

const FOOD = "/restaurants/chipotle/menu/high-protein";
const PHOTOS = [`${FOOD}/high-protein-low-calorie-bowl.jpg`, `${FOOD}/double-high-protein-bowl.jpg`, `${FOOD}/double-high-protein-burrito.jpg`];
const softButton = "flex w-full cursor-pointer items-center justify-center bg-accent-soft font-bold text-accent-strong active:opacity-70 focus-ring";

export default function OrderEmpty({ orders, restaurants, onChooseMeal, onOrderAgain }: {
  orders: PastOrder[];
  restaurants: RestaurantIndexEntry[];
  onChooseMeal: () => void;
  onOrderAgain: (order: PastOrder) => void;
}) {
  return (
    <div className="px-[18px]">
      <section className={`mt-4 rounded-[28px] px-5 pb-[18px] pt-[22px] text-center ${card}`}>
        <div className="flex justify-center" aria-hidden="true">
          {PHOTOS.map((src, index) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" className={`relative size-20 rounded-full border-4 border-surface-card object-cover ${index ? "-ml-[15px]" : ""}`} />
          ))}
        </div>
        <h2 className="mt-3.5 font-heading text-[17px] font-bold leading-6 tracking-[-0.02em]">Build your next meal</h2>
        <p className={`mt-1.5 text-base leading-[22px] ${soft}`}>Add items from any restaurant and watch the macros add up as you go.</p>
        <Link href="/restaurants" className={`mt-5 ${primaryButton}`}>Browse restaurants</Link>
        <button type="button" onClick={onChooseMeal} className={`mt-2.5 h-[50px] rounded-2xl text-base ${softButton}`}>Choose a saved meal</button>
      </section>
      {orders.length ? (
        <section className="pt-[18px]">
          <h2 className="flex h-11 items-center text-xl font-bold">Previous orders</h2>
          <div className="native-home-carousel" aria-label="Previous orders">
            {orders.slice(0, 8).map((order) => (
              <article key={order.id} className={`w-72 max-w-full shrink-0 snap-start rounded-3xl px-4 pb-4 pt-3.5 ${card}`}>
                <div className="flex h-[30px] items-center gap-2">
                  <h3 className="min-w-0 flex-1 text-[15px] font-bold"><SavedPlace items={order.items} restaurants={restaurants} size={28} label={orderPlaceName(order.items, restaurants)} className="min-w-0" /></h3>
                  <time dateTime={new Date(order.placedAt).toISOString()} className={`shrink-0 text-[13px] ${muted}`}>{formatOrderDate(order.placedAt)}</time>
                </div>
                <p className="mt-2 truncate text-sm font-semibold leading-[19px]">{orderItemNames(order.items)}</p>
                <SavedMacros items={order.items} size="sm" className="mt-3" />
                <button type="button" aria-label={`Order again, ${orderItemNames(order.items)}`} onClick={() => onOrderAgain(order)} className={`mt-3.5 h-11 rounded-[14px] text-[15px] ${softButton}`}>Order again</button>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
