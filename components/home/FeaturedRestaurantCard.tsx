import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import SurfaceCard from "@/components/ui/SurfaceCard";
import SectionEyebrow from "@/components/ui/SectionEyebrow";
import RestaurantLogoBadge from "@/components/ui/RestaurantLogoBadge";
import { DEFAULT_BRAND_ACCENT, RESTAURANT_BRAND_COLORS } from "@/lib/theme/colors";
import type { RestaurantIndexEntry } from "@/types/restaurant";

type FeaturedRestaurantCardProps = {
  restaurant: RestaurantIndexEntry;
  className?: string;
};

// One reusable card, driven entirely by restaurant data, used for every
// slide in the Featured Restaurants carousel (Slice 2).
export default function FeaturedRestaurantCard({ restaurant, className = "" }: FeaturedRestaurantCardProps) {
  const accent = RESTAURANT_BRAND_COLORS[restaurant.id] ?? DEFAULT_BRAND_ACCENT;

  return (
    <Link
      href={`/restaurant/${restaurant.id}`}
      scroll
      className={`group block h-full rounded-3xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-900 ${className}`}
    >
      <SurfaceCard
        as="article"
        padding="none"
        radius="large"
        shadow="md"
        className="relative h-full bg-white transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_24px_55px_rgba(15,23,42,0.16)]"
      >
        <div className="flex h-full flex-col sm:flex-row">
          <div className="relative h-60 w-full shrink-0 overflow-hidden rounded-t-3xl sm:h-auto sm:w-[44%] sm:rounded-l-3xl sm:rounded-tr-none">
            <Image
              src={restaurant.cover}
              alt={`${restaurant.name} cover`}
              fill
              sizes="(min-width: 640px) 44vw, 100vw"
              className="object-cover transition duration-500 group-hover:scale-105"
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: `linear-gradient(180deg, transparent 40%, ${accent}26 100%)` }}
            />
          </div>

          <div className="flex flex-1 flex-col justify-center gap-6 p-8 sm:items-start sm:py-12 sm:pl-12 sm:pr-10 lg:py-14">
            <SectionEyebrow className="text-xs">Featured Restaurant</SectionEyebrow>

            {/* Name row: logo sits inline on mobile (no side divider to
                overlap). At sm+, the row cancels the panel's own left
                padding with a matching negative margin (then reinstates it
                for its own children via padding) so the row's *box* starts
                exactly at the image/content divider — that's what the
                absolutely-positioned logo tile below anchors to (`left-0`),
                landing it on the divider instead of on top of the name.
                Positioning the logo relative to this row (rather than a
                fixed card-level offset) keeps it vertically aligned with
                the restaurant name regardless of description length. */}
            <div className="relative flex items-center gap-3 sm:-ml-12 sm:pl-12">
              <RestaurantLogoBadge src={restaurant.logo} alt={`${restaurant.name} logo`} size="sm" className="sm:hidden" />
              <h3 className="font-heading text-2xl font-bold text-neutral-900 sm:text-3xl lg:text-4xl">{restaurant.name}</h3>
              <div className="absolute left-0 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 sm:block">
                <RestaurantLogoBadge src={restaurant.logo} alt={`${restaurant.name} logo`} size="md" />
              </div>
            </div>

            <p className="text-sm text-neutral-600 sm:text-base lg:text-md">
              Browse the full menu with real macros on every item, then build an order that fits your goals.
            </p>

            <span
              className="inline-flex w-fit items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white sm:text-base"
              style={{ backgroundColor: accent }}
            >
              View Menu
              {/* Width-stable nudge: only the icon translates (never the
                  gap), so the pill can't grow or reflow on hover/focus. */}
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-focus-visible:translate-x-0"
                aria-hidden="true"
              />
            </span>
          </div>
        </div>
      </SurfaceCard>
    </Link>
  );
}
