"use client";

import Image from "next/image";
import Link from "next/link";
import CartIconDropdown from "@/components/cart/CartIconDropdown";
import DesktopSearchDropdown from "@/components/global-search/DesktopSearchDropdown";

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
    <div className="mx-auto hidden w-full max-w-6xl items-center gap-3 rounded-2xl border border-slate-200/70 bg-white px-6 py-3 shadow-[0_-3px_12px_rgba(15,23,42,0.08)] lg:flex">
      <Link href="/" className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white" aria-label="Go to homepage">
        <span className="relative h-7 w-7">
          <Image src={logoSrc} alt="Macro Maxxer logo" fill className="object-contain rounded-md" />
        </span>
      </Link>

      <div className={`flex min-w-0 flex-1 items-center ${searchBarVariant === "compact" ? "justify-center" : ""}`}>
        {showSearchBar ? (
          // 34rem matches DesktopSearchDropdown's panel min-width, so the
          // compact bar and the panel that opens beneath it are always
          // exactly the same width. Sized to comfortably fit larger
          // thumbnails, full nutrition, and future Quick Add/variant rows.
          <DesktopSearchDropdown
            className={searchBarVariant === "compact" ? "w-full max-w-[34rem]" : "w-full"}
          />
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {showCartButton ? (
          <CartIconDropdown buttonClassName="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300/80 bg-white p-0 text-slate-800 transition hover:bg-slate-50" />
        ) : null}
      </div>
    </div>
  );
}
