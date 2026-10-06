"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, ShoppingCart } from "lucide-react";
import { useGlobalSearch } from "@/components/GlobalSearchContext";
import AppIconButton, { appIconButtonClassName } from "@/components/ui/AppIconButton";

export default function GlobalMobileNav({
  logoSrc = "/logo.svg",
  showSearchButton = true,
  showCartButton = true,
  leadingButton,
  middleSlot,
  cartSlot,
  markStickyNav = false,
  visible = true,
  onHeightChange,
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
  // Shared nav measurement consumers use this marker to clear the fixed bar.
  markStickyNav?: boolean;
  visible?: boolean;
  onHeightChange?: (height: number) => void;
}) {
  const { open: openSearch } = useGlobalSearch();
  const navRef = useRef<HTMLDivElement | null>(null);
  const showTrailingCluster = showSearchButton || showCartButton || Boolean(middleSlot) || Boolean(cartSlot);

  useEffect(() => {
    const element = navRef.current;
    if (!element || !onHeightChange) return;
    const measure = () => onHeightChange(Math.ceil(element.getBoundingClientRect().height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [onHeightChange]);

  return (
    <div
      ref={navRef}
      className={`fixed left-0 right-0 top-0 z-[95] bg-white pt-[env(safe-area-inset-top)] transition-transform duration-300 ease-out lg:hidden ${visible ? "translate-y-0" : "-translate-y-full"}`}
      data-global-nav="true"
      data-sticky-nav={markStickyNav ? "true" : undefined}
      data-mobile-nav-hidden={visible ? "false" : "true"}
    >
      <div className="relative z-[110] mx-auto flex w-full max-w-6xl items-center border-b border-hairline bg-white">
        {/* px-2/sm:px-4 matches RestaurantCategorySidebar's mobile category
            strip (and, through it, the active-filter row merged into it) so
            every stacked row in the sticky mobile nav shares the same outer
            left/right edge instead of the category strip appearing inset
            relative to this bar. */}
        <div className="mx-auto flex w-full max-w-5xl items-center gap-2 pl-[max(0.5rem,var(--safe-area-left))] pr-[max(0.5rem,var(--safe-area-right))] py-1.5 sm:gap-3 sm:px-4">
          {leadingButton}
          <Link
            href="/"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white"
            aria-label="Go to homepage"
          >
            <span className="relative h-7 w-7">
              <Image src={logoSrc} alt="Macro Maxxer logo" fill className="object-contain" />
            </span>
          </Link>
          {showTrailingCluster ? (
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              {middleSlot}
              {showSearchButton ? (
                <AppIconButton onClick={() => openSearch()} variant="nav" size="nav" aria-label="Search">
                  <Search className="h-4 w-4" strokeWidth={2.5} />
                </AppIconButton>
              ) : null}
              {cartSlot ??
                (showCartButton ? (
                  <Link
                    href="/cart"
                    className={appIconButtonClassName({ variant: "nav", size: "nav", className: "min-w-9" })}
                    aria-label="Open cart"
                  >
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
