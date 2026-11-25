import Link from "next/link";
import NativeRestaurantLogo from "@/components/native/restaurants/NativeRestaurantLogo";
import type { SavedTab } from "@/lib/native/savedLibrary";
import type { RestaurantIndexEntry } from "@/types/restaurant";
import { card, primaryButton, soft } from "./savedStyles";

const MEALS = "/restaurants/chipotle/menu/high-protein";
const ITEMS = "/restaurants/chickfila/menu";
const COPY: Record<SavedTab, { title: string; body: string; action: string; photos: string[] }> = {
  meals: {
    title: "Make a meal worth repeating",
    body: "Build it once, save it, and load it into your order from here.",
    action: "Build a meal",
    photos: [`${MEALS}/high-protein-low-calorie-bowl.jpg`, `${MEALS}/double-high-protein-bowl.jpg`, `${MEALS}/double-high-protein-burrito.jpg`],
  },
  items: {
    title: "Keep your go-to items",
    body: "Save any menu item with your changes, like extra chicken or no cheese.",
    action: "Browse restaurants",
    photos: [`${ITEMS}/sandwiches/grilled-chicken-sandwich.webp`, `${ITEMS}/chicken/grilled-nuggets.webp`, `${ITEMS}/sides/fruit-cup.webp`],
  },
  history: {
    title: "No orders yet",
    body: "Finished orders show up here, ready to order again or save as a meal.",
    action: "Browse restaurants",
    photos: [],
  },
};

export default function SavedEmpty({ tab, restaurants }: { tab: SavedTab; restaurants: RestaurantIndexEntry[] }) {
  const copy = COPY[tab];
  const circle = (index: number) => `relative flex size-24 shrink-0 overflow-hidden rounded-full border-4 border-surface-card bg-slate-100 dark:bg-image-placeholder ${index ? "-ml-[18px]" : ""}`;
  return (
    <div className={`mx-[18px] mt-4 rounded-[28px] px-5 pb-5 pt-[26px] text-center ${card}`}>
      <div className="flex justify-center" aria-hidden="true">
        {copy.photos.map((src, index) => (
          // eslint-disable-next-line @next/next/no-img-element
          <span key={src} className={circle(index)}><img src={src} alt="" className="size-full object-cover" /></span>
        ))}
        {tab === "history" ? restaurants.slice(0, 3).map((restaurant, index) => <span key={restaurant.id} className={circle(index)}><NativeRestaurantLogo src={restaurant.logo} size={88} /></span>) : null}
      </div>
      <h2 className="mt-[18px] font-heading text-[17px] font-bold leading-6 tracking-[-0.02em]">{copy.title}</h2>
      <p className={`mt-1.5 text-base leading-[22px] ${soft}`}>{copy.body}</p>
      <Link href="/restaurants" className={`mt-5 ${primaryButton}`}>{copy.action}</Link>
    </div>
  );
}
