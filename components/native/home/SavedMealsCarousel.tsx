import Link from "next/link";
import NativeRestaurantLogo from "@/components/native/restaurants/NativeRestaurantLogo";
import RestaurantItemImage from "@/components/ui/RestaurantItemImage";
import { useSavedMeals } from "@/hooks/useHomeCollections";
import { buildCartMacroTotals, hasPartialCartNutritionData } from "@/lib/cart/nutrition";
import type { RestaurantIndexEntry } from "@/types/restaurant";
import HomeMacroRow from "./HomeMacroRow";

const FOOD = "/restaurants/chipotle/menu/high-protein";
const EMPTY_PHOTOS = [`${FOOD}/high-protein-low-calorie-bowl.jpg`, `${FOOD}/double-high-protein-bowl.jpg`, `${FOOD}/double-high-protein-burrito.jpg`];

export default function SavedMealsCarousel({ restaurants }: { restaurants: RestaurantIndexEntry[] }) {
  const meals = useSavedMeals();

  return (
    <section className="mt-5">
      <div className="flex h-11 items-center justify-between px-0.5">
        <h2 className="text-xl font-bold text-slate-900">Saved meals</h2>
        {meals.length ? <Link href="/saved" className="flex h-11 items-center text-[15px] font-semibold text-accent-strong focus-ring">See all</Link> : null}
      </div>
      {meals.length ? (
        <div className="native-home-carousel" aria-label="Saved meals">
          {meals.slice(0, 8).map((meal) => {
            const brands = [...new Set(meal.items.map((i) => i.restaurantId))].flatMap((id) => restaurants.find((r) => r.id === id) ?? []);
            const hero = meal.items[0];
            return (
              <Link key={meal.id} href="/saved" className="w-[300px] shrink-0 snap-start overflow-hidden rounded-[28px] border border-black/8 bg-white shadow-elev-2 active:scale-[.98] focus-ring">
                <RestaurantItemImage src={hero.image} alt="" imagePresentation={hero.imagePresentation} fallbackClassName="object-cover" containerClassName="h-[200px] overflow-hidden bg-slate-100" />
                <div className="px-[18px] pb-5 pt-4">
                  <h3 className="font-heading truncate text-lg font-bold leading-6 tracking-[-0.02em]">{meal.name}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-[13px] text-slate-500">
                    {brands[0] ? <NativeRestaurantLogo src={brands[0].logo} size={18} /> : null}
                    <span className="truncate">{brands.length > 1 ? `${brands.length} restaurants` : brands[0]?.name ?? "Restaurant"}</span>
                  </p>
                  <div className="mt-[18px]"><HomeMacroRow totals={buildCartMacroTotals(meal.items)} large approximate={hasPartialCartNutritionData(meal.items)} /></div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[28px] border border-black/8 bg-white px-5 pb-5 pt-6 text-center">
          <div className="flex justify-center" aria-hidden="true">
            {EMPTY_PHOTOS.map((src, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="" className={`relative size-24 rounded-full border-4 border-white object-cover ${index ? "-ml-[18px]" : ""}`} />
            ))}
          </div>
          <h3 className="font-heading mt-4 text-[17px] font-bold leading-6 tracking-[-0.02em]">Make a meal worth repeating</h3>
          <p className="mt-1.5 text-[15px] leading-[21px] text-slate-600">Build it once, save it, and reorder it from here.</p>
          <Link href="/restaurants" className="mt-[18px] flex h-[50px] items-center justify-center rounded-2xl bg-accent-strong text-base font-bold text-white active:opacity-80 focus-ring">Build a meal</Link>
        </div>
      )}
    </section>
  );
}
