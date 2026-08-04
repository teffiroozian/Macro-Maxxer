"use client";

import { CalendarCheck2, ExternalLink, Flag, UtensilsCrossed } from "lucide-react";
import RestaurantLogoBadge from "@/components/ui/RestaurantLogoBadge";
import SurfaceCard from "@/components/ui/SurfaceCard";
import { useStickyNavClearance } from "@/components/restaurant-view/useStickyNavClearance";

// Same real, functional destination HomeFooter links to for the repo — the
// project has no issue-tracking backend of its own, so "report an error"
// opens a pre-filled GitHub issue rather than a fake/dead affordance.
const REPORT_ISSUE_URL = "https://github.com/teffiroozian/Macro-Maxxer/issues/new";

function formatUpdatedAt(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  // A bare "YYYY-MM-DD" string has no time component — only show one if the
  // stored value genuinely has one (a full ISO timestamp, once a future
  // nutrition import system can supply it), rather than fabricating one.
  const hasTimeComponent = value.includes("T");

  // A bare date string parses as UTC midnight — format in UTC too,
  // otherwise a timezone behind UTC rolls the displayed date back a day.
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    ...(hasTimeComponent ? { hour: "numeric", minute: "2-digit" } : {}),
    timeZone: "UTC",
  });
}

type RestaurantIdentityHeaderProps = {
  name: string;
  logo: string;
  description?: string;
  itemCount: number;
  nutritionSourceUrl?: string;
  nutritionUpdatedAt?: string;
};

// Shared identity/trust header for every restaurant page — rendered once in
// RestaurantPageContent, above RestaurantView, so it applies to both the
// standard menu flow and builder flows (e.g. Chipotle, including its
// pre-entrée-selection state) without either needing to render it itself.
export default function RestaurantIdentityHeader({
  name,
  logo,
  description,
  itemCount,
  nutritionSourceUrl,
  nutritionUpdatedAt,
}: RestaurantIdentityHeaderProps) {
  const updatedAtLabel = formatUpdatedAt(nutritionUpdatedAt);

  // The fixed nav stack above this header (global nav, secondary controls,
  // and — on mobile — the floating category strip) reserves its own space
  // via `position: fixed`, so this header needs its own clearance to sit
  // below it rather than underneath it. That stack's height isn't constant
  // — it grows a row when active-filter chips appear — so this is measured
  // live rather than assumed, on every breakpoint.
  const stickyClearance = useStickyNavClearance();

  return (
    <div className="relative mb-8 lg:mb-10" style={{ marginTop: stickyClearance ?? 0 }}>
      {/* The broader ambient wash/glow lives one level up, in
          RestaurantPageContent — it covers the nav-to-header transition, so
          this card doesn't need its own separate glow layered on top. */}
      <SurfaceCard
        as="header"
        radius="large"
        shadow="sm"
        padding="none"
        className="relative overflow-hidden bg-white/90 backdrop-blur-sm"
      >
        <div className="p-5 sm:p-7 lg:p-8">
          {/* Identity row: logo top-aligned with the restaurant name (not
              centered against the whole name+description block) so the two
              read as one balanced identity line, description directly
              underneath. Full card width so the description has room to
              breathe instead of wrapping into short lines beside a
              competing right-hand column. */}
          <div className="flex items-start gap-3.5">
            <RestaurantLogoBadge src={logo} alt={`${name} logo`} size="md" className="shrink-0" />

            <div className="min-w-0">
              <h1 className="font-heading text-3xl font-bold leading-tight text-neutral-900 sm:text-4xl">
                {name}
              </h1>
              {description ? (
                <p className="mt-1.5 max-w-2xl text-sm text-neutral-600 sm:text-base">{description}</p>
              ) : null}
            </div>
          </div>

          {/* Dedicated trust/freshness row: smaller and visually secondary
              relative to the identity row above, grouped tightly and
              aligned to the right rather than spread across the card. */}
          <div className="mt-6 flex flex-wrap items-center justify-end gap-x-5 gap-y-2 border-t border-black/[0.06] pt-4">
            {updatedAtLabel ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500">
                <CalendarCheck2 className="h-3.5 w-3.5 text-accent/60" aria-hidden="true" />
                Last updated: {updatedAtLabel}
              </span>
            ) : null}

            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500">
              <UtensilsCrossed className="h-3.5 w-3.5 text-accent/60" aria-hidden="true" />
              {itemCount} menu items
            </span>

            {nutritionSourceUrl ? (
              <a
                href={nutritionSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 transition hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              >
                <ExternalLink className="h-3.5 w-3.5 text-accent/60" aria-hidden="true" />
                Nutrition Source
              </a>
            ) : null}

            <a
              href={`${REPORT_ISSUE_URL}?title=${encodeURIComponent(`Data issue: ${name}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 transition hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              <Flag className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
              Report an error
            </a>
          </div>
        </div>
      </SurfaceCard>
    </div>
  );
}
