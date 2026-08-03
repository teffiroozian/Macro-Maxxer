"use client";

import Image from "next/image";
import Link from "next/link";
import CartIconDropdown from "@/components/cart/CartIconDropdown";
import DesktopRestaurantMenu from "@/components/DesktopRestaurantMenu";
import DesktopSearchDropdown from "@/components/global-search/DesktopSearchDropdown";
import { appIconButtonClassName } from "@/components/ui/AppIconButton";

export default function DesktopNav({
  logoSrc = "/logo.png",
  showSearchButton = true,
  showCartButton = true,
  searchBarVariant = "full",
}: {
  logoSrc?: string;
  showSearchButton?: boolean;
  showCartButton?: boolean;
  searchBarVariant?: "full" | "compact" | "hidden";
}) {
  const showSearchBar = showSearchButton && searchBarVariant !== "hidden";

  return (
    // `lg:grid-cols-[1fr_auto_1fr]` (not a flex row with a centered flex-1
    // middle) is what keeps the search bar centered against the *row's*
    // full width — the Restaurants button (left) is much wider than the
    // cart button (right), so centering search within the flex-1 space left
    // over after them would always land it right-of-center. A 1fr/auto/1fr
    // grid instead splits the leftover space equally between the two
    // flanking columns regardless of how much of it their own content
    // fills, so the auto-sized middle column stays centered on the row no
    // matter how the left/right content widths compare.
    <div className="mx-auto hidden w-full max-w-6xl items-center gap-3 rounded-2xl border border-black/10 bg-white px-6 py-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_-6px_rgba(5,150,105,0.12)] lg:grid lg:grid-cols-[1fr_auto_1fr]">
      {/* Logo + Restaurants read as one group (tighter gap than the row's
          own column gap above) rather than two separately-spaced controls. */}
      <div className="flex min-w-0 items-center gap-2">
        <Link href="/" className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white" aria-label="Go to homepage">
          <span className="relative h-7 w-7">
            <Image src={logoSrc} alt="Macro Maxxer logo" fill className="object-contain rounded-md" />
          </span>
        </Link>

        {/* Restaurant switcher — part of the global nav itself (Logo |
            Restaurants | Search | Cart) so it's identical across every page,
            not a restaurant-page-only secondary control. */}
        <DesktopRestaurantMenu />
      </div>

      <div className="flex min-w-0 items-center justify-center">
        {showSearchBar ? (
          // An explicit width (not `w-full`) so the grid's auto column has
          // a definite size to measure — a percentage width here would be
          // circular (the column sizes to its content, and the content
          // would be sized as a percentage of that same column). 34rem
          // matches DesktopSearchDropdown's panel min-width, so the compact
          // bar and the panel that opens beneath it are always exactly the
          // same width. Sized to comfortably fit larger thumbnails, full
          // nutrition, and future Quick Add/variant rows. `max-w-full`
          // keeps it from ever overflowing at the narrow end of `lg`.
          <DesktopSearchDropdown
            className={searchBarVariant === "compact" ? "w-[34rem] max-w-full" : "w-full"}
          />
        ) : null}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2">
        {showCartButton ? (
          <CartIconDropdown buttonClassName={appIconButtonClassName({ variant: "nav", className: "relative size-9" })} />
        ) : null}
      </div>
    </div>
  );
}
