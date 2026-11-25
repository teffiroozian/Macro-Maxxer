import Link from "next/link";
import { Plus } from "lucide-react";
import NativeRestaurantLogo from "@/components/native/restaurants/NativeRestaurantLogo";
import { useFavoriteRestaurants } from "@/hooks/useHomeCollections";
import type { RestaurantIndexEntry } from "@/types/restaurant";

export default function FavoriteRestaurants({ restaurants }: { restaurants: RestaurantIndexEntry[] }) {
  const { favorites } = useFavoriteRestaurants();
  const picks = favorites.flatMap((id) => restaurants.find((r) => r.id === id && !r.isComingSoon) ?? []);

  return (
    <section className="relative mt-4">
      <h2 className="flex h-11 items-center px-0.5 text-xl font-bold text-slate-900">Favorites</h2>
      {picks.length ? (
        <>
          {/* Sits under the logos: anywhere else in the section opens Restaurants. */}
          <Link href="/restaurants" aria-label="Manage favorites in Restaurants" className="absolute inset-0 rounded-[22px] focus-ring" />
          <div className="native-home-carousel pointer-events-none relative">
            {picks.map((r) => (
              <Link key={r.id} href={`/restaurant/${r.id}`} className="pointer-events-auto flex w-[calc((100%_-_30px)/4)] shrink-0 snap-start flex-col items-center gap-2 active:opacity-70 focus-ring">
                <span className="flex rounded-full shadow-elev-2"><NativeRestaurantLogo src={r.logo} size={72} /></span>
                <span className="block w-full truncate text-center text-xs font-semibold text-slate-600">{r.name}</span>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <Link href="/restaurants" className="block rounded-[28px] border border-black/8 bg-white px-3 py-4 active:bg-slate-50 focus-ring">
          <span className="grid grid-cols-4 justify-items-center gap-2" aria-hidden="true">
            {[1, 0.75, 0.5, 0.3].map((opacity, index) => (
              <span key={opacity} style={{ opacity }} className="flex size-[68px] items-center justify-center rounded-full border-[1.5px] border-dashed border-slate-500 text-slate-500">
                {index === 0 ? <Plus size={22} strokeWidth={2} /> : null}
              </span>
            ))}
          </span>
          <span className="mt-3.5 block text-center text-[15px] font-semibold text-slate-600">Pick your favorite restaurants</span>
        </Link>
      )}
    </section>
  );
}
