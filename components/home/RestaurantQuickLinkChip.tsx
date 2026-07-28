import Link from "next/link";
import { ArrowRight } from "lucide-react";
import RestaurantLogoBadge from "@/components/ui/RestaurantLogoBadge";
import type { RestaurantIndexEntry } from "@/types/restaurant";

type RestaurantQuickLinkChipProps = {
  restaurant: RestaurantIndexEntry;
  label?: string;
  className?: string;
};

// A compact, secondary nod to another live restaurant sitting alongside the
// main FeaturedRestaurantCard spotlight — enough presence that two
// restaurants reads as an intentional pair rather than "one card and an
// empty gap," without building the full Featured Restaurants grid (Slice 2).
export default function RestaurantQuickLinkChip({ restaurant, label = "Also live", className = "" }: RestaurantQuickLinkChipProps) {
  return (
    <Link
      href={`/restaurant/${restaurant.id}`}
      scroll
      className={`group flex items-center gap-3 rounded-2xl border border-black/10 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-black/15 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${className}`}
    >
      <RestaurantLogoBadge src={restaurant.logo} alt={`${restaurant.name} logo`} size="sm" />
      <span className="min-w-0 flex-1">
        {/* Compact/dense UI — Outfit stays legible at this size; Unbounded
            is reserved for prominent, larger-scale restaurant names. */}
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{label}</span>
        <span className="block truncate text-sm font-semibold text-neutral-900">{restaurant.name}</span>
      </span>
      <ArrowRight
        className="h-4 w-4 shrink-0 text-neutral-400 transition duration-200 ease-out group-hover:translate-x-0.5 group-hover:text-neutral-700 group-focus-visible:translate-x-0.5 group-focus-visible:text-neutral-700 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-focus-visible:translate-x-0"
        aria-hidden="true"
      />
    </Link>
  );
}
