import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import DesktopNav from "@/components/DesktopNav";
import GlobalMobileMenuButton from "@/components/GlobalMobileMenuButton";
import GlobalMobileNav from "@/components/GlobalMobileNav";
import HomeSectionContainer from "@/components/home/HomeSectionContainer";
import LiveRestaurantsBadge from "@/components/home/LiveRestaurantsBadge";
import { appButtonClassName } from "@/components/ui/AppButton";
import RestaurantLogoBadge from "@/components/ui/RestaurantLogoBadge";
import SurfaceCard from "@/components/ui/SurfaceCard";
import { getAllRestaurants, getRestaurantData } from "@/lib/restaurants";

export const metadata: Metadata = {
  title: "Restaurants",
  description: "Browse restaurants available in Macro Maxxer.",
  alternates: {
    canonical: "/restaurants",
  },
};

export default async function RestaurantsPage() {
  const availableRestaurantEntries = getAllRestaurants().filter((restaurant) => !restaurant.isComingSoon);
  const availableRestaurants = (
    await Promise.all(availableRestaurantEntries.map((restaurant) => getRestaurantData(restaurant.id)))
  ).filter((restaurant) => restaurant !== null);

  return (
    <>
      <GlobalMobileNav leadingButton={<GlobalMobileMenuButton />} />
      <div className="px-4 pt-1 sm:px-6">
        <DesktopNav searchBarVariant="compact" />
      </div>

      <main className="native-top-level-page min-h-[var(--app-viewport-height)] pb-[max(4rem,var(--safe-area-bottom))] pt-[calc(7rem+var(--safe-area-top))] lg:pb-20 lg:pt-14">
        <HomeSectionContainer as="header">
          <div className="mx-auto max-w-3xl text-center">
            <LiveRestaurantsBadge count={availableRestaurants.length} />
            <h1 className="font-heading mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
              Restaurants
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
              Browse supported restaurants and explore real menu and nutrition data before building your order.
            </p>
          </div>

          <div className="mx-auto mt-8 w-full max-w-[30rem] overflow-hidden rounded-full border border-black/10 bg-white/70 py-3 shadow-elev-1 sm:mt-10">
            <div className="restaurant-logo-marquee-track flex w-max">
              {[0, 1].map((groupIndex) => (
                <div
                  key={groupIndex}
                  aria-hidden={groupIndex === 1 ? "true" : undefined}
                  className="restaurant-logo-marquee-group"
                >
                  {availableRestaurants.map((restaurant) => (
                    <RestaurantLogoBadge
                      key={`${groupIndex}-${restaurant.id}`}
                      src={restaurant.logo}
                      alt={groupIndex === 0 ? `${restaurant.name} logo` : ""}
                      size="md"
                      fit="cover"
                      className="shadow-elev-1"
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </HomeSectionContainer>

        <HomeSectionContainer className="mt-14 sm:mt-16 lg:mt-20">
          <div className="grid gap-5 md:grid-cols-2 lg:gap-6">
            {availableRestaurants.map((restaurant) => (
              <Link
                key={restaurant.id}
                href={`/restaurant/${restaurant.id}`}
                className="group block rounded-3xl focus-ring"
              >
                <SurfaceCard
                  as="article"
                  radius="large"
                  shadow="md"
                  padding="none"
                  className="flex h-full min-h-64 flex-col p-6 transition duration-200 group-hover:-translate-y-0.5 group-hover:border-black/15 group-hover:shadow-elev-3 sm:min-h-72 sm:p-7"
                >
                  <div className="flex items-start justify-between gap-4">
                    <RestaurantLogoBadge
                      src={restaurant.logo}
                      alt={`${restaurant.name} logo`}
                      size="lg"
                      fit="cover"
                    />
                    <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-strong">
                      {restaurant.items.length} menu items
                    </span>
                  </div>

                  <div className="mt-6">
                    <h2 className="font-heading text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">
                      {restaurant.name}
                    </h2>
                    {restaurant.description ? (
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                        {restaurant.description}
                      </p>
                    ) : null}
                  </div>

                  <span
                    className={appButtonClassName({
                      variant: "secondary",
                      size: "md",
                      className: "mt-auto w-fit group-hover:border-black/30",
                    })}
                  >
                    View Menu
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </SurfaceCard>
              </Link>
            ))}
          </div>
        </HomeSectionContainer>
      </main>
    </>
  );
}
