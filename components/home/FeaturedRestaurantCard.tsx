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
  eyebrow?: string;
};

// A single, generously-sized restaurant spotlight — the Slice 1 stand-in for
// the full Featured Restaurants grid (Slice 2). Relies on branding and
// composition rather than secondary facts, per the refresh plan's card
// requirements.
export default function FeaturedRestaurantCard({ restaurant, eyebrow = "Featured Restaurant" }: FeaturedRestaurantCardProps) {
  const accent = RESTAURANT_BRAND_COLORS[restaurant.id] ?? DEFAULT_BRAND_ACCENT;

  return (
    <Link
      href={`/restaurant/${restaurant.id}`}
      scroll
      className="group block rounded-3xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-900"
    >
      <SurfaceCard
        as="article"
        padding="none"
        radius="large"
        shadow="md"
        className="bg-white transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_24px_55px_rgba(15,23,42,0.16)]"
      >
        <div className="flex flex-col sm:flex-row">
          <div className="relative h-52 w-full shrink-0 overflow-hidden rounded-t-3xl sm:h-auto sm:w-[42%] sm:rounded-l-3xl sm:rounded-tr-none">
            <Image
              src={restaurant.cover}
              alt={`${restaurant.name} cover`}
              fill
              className="object-cover transition duration-500 group-hover:scale-105"
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: `linear-gradient(180deg, transparent 40%, ${accent}26 100%)` }}
            />
          </div>

          <div className="flex flex-1 flex-col justify-center gap-4 p-6 sm:p-8">
            <SectionEyebrow className="text-xs">{eyebrow}</SectionEyebrow>

            {/* Logo + name as one identity row rather than a floating badge
                — reads as a designed unit, not a disconnected overlay. */}
            <div className="flex items-center gap-3.5">
              <RestaurantLogoBadge src={restaurant.logo} alt={`${restaurant.name} logo`} size="lg" />
              <h3 className="font-heading text-2xl font-bold text-neutral-900 sm:text-3xl">{restaurant.name}</h3>
            </div>

            <p className="text-sm text-neutral-600 sm:text-base">
              Browse the full menu with real macros on every item, then build an order that fits your goals.
            </p>

            <span
              className="inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              View Menu
              {/* Width-stable nudge: only the icon translates (never the
                  gap), so the pill can't grow or reflow on hover/focus.
                  Reuse this arrow-CTA pattern for future buttons. */}
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
