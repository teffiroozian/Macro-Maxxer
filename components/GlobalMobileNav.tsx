"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, ShoppingCart } from "lucide-react";
import { useGlobalSearch } from "@/components/GlobalSearchContext";

export default function GlobalMobileNav({
  logoSrc = "/logo.png",
  showSearchButton = true,
  showCartButton = true,
  leadingButton,
  middleSlot,
  cartSlot,
  markStickyNav = false,
}: {
  logoSrc?: string;
  showSearchButton?: boolean;
  showCartButton?: boolean;
  // Rendered before the logo — e.g. the restaurant page's hamburger/browse
  // button. Generic slot so this component stays restaurant-agnostic.
  leadingButton?: ReactNode;
  // Rendered in the trailing button cluster, before the Search button —
  // e.g. the restaurant page's "Filter this menu" mini input.
  middleSlot?: ReactNode;
  // Overrides the default cart <Link> when provided — e.g. the restaurant
  // page's CartIconDropdown (with a preview) instead of a plain link.
  cartSlot?: ReactNode;
  // Restaurant page category-scroll offset math reads this attribute (see
  // RestaurantView.tsx / ChipotleRestaurantBuilderView.tsx / RestaurantCategorySidebar.tsx);
  // opt-in so it doesn't leak onto pages that don't need it.
  markStickyNav?: boolean;
}) {
  const { open: openSearch } = useGlobalSearch();
  const showTrailingCluster = showSearchButton || showCartButton || Boolean(middleSlot) || Boolean(cartSlot);

  return (
    <div
      className="fixed left-0 right-0 top-0 z-[95] lg:hidden"
      data-global-nav="true"
      data-sticky-nav={markStickyNav ? "true" : undefined}
    >
      <div className="relative z-[110] mx-auto mt-1 flex w-[calc(100%-0.5rem)] max-w-6xl items-center rounded-2xl border border-slate-200/70 bg-white shadow-[0_-3px_12px_rgba(15,23,42,0.12)] sm:w-[calc(100%-1rem)]">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-2 px-3 py-1.5 sm:gap-3 sm:px-6">
          {leadingButton}
          <Link href="/" className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white" aria-label="Go to homepage">
            <span className="relative h-7 w-7">
              <Image src={logoSrc} alt="Macro Maxxer logo" fill className="object-contain rounded-md" />
            </span>
          </Link>
          {showTrailingCluster ? (
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              {middleSlot}
              {showSearchButton ? (
                <button
                  type="button"
                  onClick={() => openSearch()}
                  className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-slate-300/80 bg-white text-slate-800"
                  aria-label="Search"
                >
                  <Search className="h-4 w-4" strokeWidth={2.5} />
                </button>
              ) : null}
              {cartSlot ??
                (showCartButton ? (
                  <Link href="/cart" className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-slate-300/80 bg-white px-2.5 text-slate-800" aria-label="Open cart">
                    <ShoppingCart className="h-4 w-4" strokeWidth={2.5} />
                  </Link>
                ) : null)}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
