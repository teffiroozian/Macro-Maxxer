"use client";

import { CalendarCheck2, ExternalLink, Flag, UtensilsCrossed } from "lucide-react";
import RestaurantLogoBadge from "@/components/ui/RestaurantLogoBadge";
import { useStickyNavClearance } from "@/components/restaurant-view/useStickyNavClearance";

// Same real, functional destination SiteFooter links to for the repo — the
// project has no issue-tracking backend of its own, so "report an error"
// opens a pre-filled GitHub issue rather than a fake/dead affordance.
const REPORT_ISSUE_URL = "https://github.com/teffiroozian/Macro-Maxxer/issues/new";

function formatLastUpdated(value?: string) {
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
  restaurantId: string;
  name: string;
  logo: string;
  description?: string;
  itemCount: number;
  nutritionSourceUrl?: string;
  lastUpdated?: string;
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
  lastUpdated,
}: RestaurantIdentityHeaderProps) {
  const updatedAtLabel = formatLastUpdated(lastUpdated);
  // The fixed nav stack above this header (global nav, secondary controls,
  // and — on mobile — the floating category strip) reserves its own space
  // via `position: fixed`, so this header needs its own clearance to sit
  // below it rather than underneath it. That stack's height isn't constant
  // — it grows a row when active-filter chips appear — so this is measured
  // live rather than assumed, on every breakpoint.
  // Falls back to the stack's usual resting height (same default
  // DesktopCategorySidebar uses) until the real measurement lands just after
  // mount — a `0` fallback would render this header underneath the fixed nav
  // stack for that first frame, then jump down once measured.
  const stickyClearance = useStickyNavClearance();

  return (
    <header
      className="relative border-b border-hairline bg-white"
      style={{ marginTop: stickyClearance ?? 64 }}
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 sm:py-9 lg:py-10">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <div className="flex items-center justify-center gap-3.5">
            <RestaurantLogoBadge
              src={logo}
              alt={`${name} logo`}
              size="md"
              className="shrink-0"
            />

            <div className="min-w-0 text-left">
              <h1 className="font-heading text-2xl font-bold leading-tight text-slate-950 sm:text-3xl lg:text-4xl">
                {name} Nutrition
              </h1>
            </div>
          </div>

          {description ? (
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">{description}</p>
          ) : null}

          <div className="mt-6 flex w-full flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-divider pt-4">
            {updatedAtLabel ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <CalendarCheck2 className="h-3.5 w-3.5 text-accent/60" aria-hidden="true" />
                Last updated: {updatedAtLabel}
              </span>
            ) : null}

            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <UtensilsCrossed className="h-3.5 w-3.5 text-accent/60" aria-hidden="true" />
              {itemCount} menu items
            </span>

            {nutritionSourceUrl ? (
              <a
                href={nutritionSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-900 focus-ring"
              >
                <ExternalLink className="h-3.5 w-3.5 text-accent/60" aria-hidden="true" />
                Nutrition Source
              </a>
            ) : null}

            <a
              href={`${REPORT_ISSUE_URL}?title=${encodeURIComponent(`Data issue: ${name}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-900 focus-ring"
            >
              <Flag className="h-3.5 w-3.5 text-icon-decorative" aria-hidden="true" />
              Report an error
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
