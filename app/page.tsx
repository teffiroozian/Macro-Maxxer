import Image from "next/image";
import Link from "next/link";
import GlobalMobileNav from "@/components/GlobalMobileNav";
import DesktopNav from "@/components/DesktopNav";
import SurfaceCard from "@/components/ui/SurfaceCard";
import RestaurantSearch from "@/components/home/RestaurantSearch";
import { getAllRestaurants } from "@/lib/restaurants";

const restaurants = getAllRestaurants();

export default function Home() {
  const groupedRestaurants = (() => {
    const normalizeName = (name: string) => name.replace(/^the\s+/i, "");

    const sorted = [...restaurants].sort((a, b) =>
      normalizeName(a.name).localeCompare(normalizeName(b.name))
    );

    const grouped = new Map<string, (typeof restaurants)[number][]>();

    sorted.forEach((restaurant) => {
      const cleanedName = normalizeName(restaurant.name);
      const firstLetter = cleanedName.charAt(0).toUpperCase();

      const existing = grouped.get(firstLetter) ?? [];
      existing.push(restaurant);
      grouped.set(firstLetter, existing);
    });

    return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
  })();

  return (
    <>
      <section>
        <GlobalMobileNav />
        <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-6">
          <DesktopNav />
        </div>
        <div className="mx-auto flex max-w-5xl flex-col gap-12 px-4 p-24 sm:px-6">
          <header className="mx-auto max-w-3xl text-center">
            <h1 className="text-center text-4xl font-semibold leading-tight tracking-tight text-neutral-900">
              Find High-Protein Fast Food Items in Seconds
            </h1>
          </header>

          <RestaurantSearch restaurants={restaurants} />
        </div>
      </section>

      <main className="mx-auto flex max-w-5xl flex-col gap-12 px-4 p-24 sm:px-6">

      <section id="macro-friendly-section" className="flex flex-col gap-8">
        <div>
          <h2 className="text-center text-3xl font-semibold text-neutral-900">
            Macro Friendly Restaurants
          </h2>
        </div>
        <section className="grid gap-4 sm:grid-cols-2">
          {restaurants
            .filter((restaurant) => restaurant.isMacroFriendly)
            .map((restaurant) => {
              const isAvailable = !restaurant.isComingSoon;

              if (isAvailable) {
                return (
                  <Link
                    key={restaurant.id}
                    href={`/restaurant/${restaurant.id}`}
                    scroll
                    className="group cursor-pointer"
                  >
                    <SurfaceCard as="article" padding="none" className="overflow-hidden bg-white/70 transition group-hover:-translate-y-0.5 group-hover:shadow-md">
                      <div className="relative h-44 w-full overflow-hidden">
                        <Image
                          src={restaurant.cover}
                          alt={`${restaurant.name} cover`}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex items-center gap-3 border-t border-black/5 bg-white/80 px-4 py-3">
                        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl">
                          <Image
                            src={restaurant.logo}
                            alt={`${restaurant.name} logo`}
                            width={36}
                            height={36}
                            className="object-contain"
                          />
                        </div>
                        <span className="text-base font-semibold text-neutral-900">
                          {restaurant.name}
                        </span>
                      </div>
                    </SurfaceCard>
                  </Link>
                );
              }

              return (
                <SurfaceCard
                  as="article"
                  key={restaurant.id}
                  aria-disabled="true"
                  padding="none"
                  shadow="none"
                  className="relative overflow-hidden bg-white/70 opacity-40"
                >
                  <div className="relative h-44 w-full overflow-hidden">
                    <Image
                      src={restaurant.cover}
                      alt={`${restaurant.name} cover`}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex items-center gap-3 border-t border-black/5 bg-white/80 px-4 py-3"> 
                    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl">
                      <Image
                        src={restaurant.logo}
                        alt={`${restaurant.name} logo`}
                        width={36}
                        height={36}
                        className="object-contain"
                      />
                    </div>
                    <span className="text-base font-semibold text-neutral-900">
                      {restaurant.name}
                    </span>
                  </div>
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-neutral-700">
                      Coming Soon
                    </span>
                  </div>
                </SurfaceCard>
              );
            })}
        </section>
      </section>

      <section id="all-restaurants-section" className="mt-20 flex flex-col gap-4">
        <div>
          <h2 className="text-center text-3xl font-semibold text-neutral-900">All Restaurants</h2>
        </div>

        <div className="space-y-6">
          {groupedRestaurants.map(([letter, items]) => (
            <section key={letter} className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
                {letter}
              </h3>
              <div className="space-y-2 ">
                {items.map((restaurant) => (
                  !restaurant.isComingSoon ? (
                    <Link
                      key={restaurant.id}
                      href={`/restaurant/${restaurant.id}`}
                      scroll
                      className="cursor-pointer flex w-full items-center gap-3 rounded-xl border border-black/10 bg-white px-3 py-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-neutral-50">
                        <Image
                          src={restaurant.logo}
                          alt={`${restaurant.name} logo`}
                          width={28}
                          height={28}
                          className="object-contain rounded-md"
                        />
                      </span>
                      <span className="text-sm font-semibold text-neutral-900">
                        {restaurant.name}
                      </span>
                    </Link>
                  ) : (
                    <div
                      key={restaurant.id}
                      aria-disabled="true"
                      className="flex w-full items-center gap-3 rounded-xl border border-black/10 bg-white px-3 py-2 opacity-40"
                    >
                      <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-neutral-50">
                        <Image
                          src={restaurant.logo}
                          alt={`${restaurant.name} logo`}
                          width={28}
                          height={28}
                          className="object-contain rounded-md"
                        />
                      </span>
                      <span className="text-sm font-semibold text-neutral-900">
                        {restaurant.name}
                      </span>
                      <span className="ml-auto rounded-full border border-neutral-300 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                        Coming Soon
                      </span>
                    </div>
                  )
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
      </main>
    </>
  );
}
