"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronRight, Search, Store } from "lucide-react";
import CartIconDropdown from "@/components/CartIconDropdown";
import { getAllRestaurants } from "@/lib/restaurants";

export default function DesktopNav({
  logoSrc = "/logo.png",
  showSearchButton = true,
  showCartButton = true,
}: {
  logoSrc?: string;
  showSearchButton?: boolean;
  showCartButton?: boolean;
}) {
  const [isRestaurantMenuOpen, setIsRestaurantMenuOpen] = useState(false);
  const restaurantMenuRef = useRef<HTMLDivElement>(null);
  const restaurants = getAllRestaurants();

  const { availableRestaurants, comingSoonRestaurants } = useMemo(
    () => ({
      availableRestaurants: restaurants.filter((restaurant) => !restaurant.isComingSoon),
      comingSoonRestaurants: restaurants.filter((restaurant) => restaurant.isComingSoon),
    }),
    [restaurants]
  );

  useEffect(() => {
    if (!isRestaurantMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (restaurantMenuRef.current?.contains(event.target as Node)) return;
      setIsRestaurantMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsRestaurantMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isRestaurantMenuOpen]);

  return (
    <div className="mx-auto hidden w-full max-w-6xl items-center rounded-2xl border border-slate-200/70 bg-white px-6 py-3 shadow-[0_-3px_12px_rgba(15,23,42,0.08)] lg:flex">
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/" className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white" aria-label="Go to homepage">
          <span className="relative h-7 w-7">
            <Image src={logoSrc} alt="Macro Maxxer logo" fill className="object-contain rounded-md" />
          </span>
        </Link>

        <div ref={restaurantMenuRef} className="relative" onMouseEnter={() => setIsRestaurantMenuOpen(true)}>
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={isRestaurantMenuOpen}
            aria-controls="desktop-restaurant-menu"
            onClick={() => setIsRestaurantMenuOpen((prev) => !prev)}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-300/80 bg-white px-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300/70"
          >
            <Store className="h-4 w-4 text-slate-500" strokeWidth={2.4} />
            Restaurants
            <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${isRestaurantMenuOpen ? "rotate-180" : ""}`} strokeWidth={2.4} />
          </button>

          {isRestaurantMenuOpen ? (
            <div
              id="desktop-restaurant-menu"
              role="menu"
              aria-label="Restaurants"
              className="absolute left-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-black/10 bg-white py-2 shadow-[0_18px_40px_rgba(15,23,42,0.16)]"
            >
              <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Available Now</div>
              <div className="grid gap-1 px-2">
                {availableRestaurants.map((restaurant) => (
                  <Link
                    key={restaurant.id}
                    href={`/restaurant/${restaurant.id}`}
                    role="menuitem"
                    onClick={() => setIsRestaurantMenuOpen(false)}
                    className="group inline-flex items-center justify-between rounded-xl px-2 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100 focus:bg-neutral-100 focus:outline-none"
                  >
                    <span className="inline-flex min-w-0 items-center gap-2.5">
                      <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-neutral-50">
                        <Image src={restaurant.logo} alt={`${restaurant.name} logo`} fill className="object-contain rounded-md" />
                      </span>
                      <span className="truncate">{restaurant.name}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-neutral-400 transition group-hover:text-neutral-600" strokeWidth={2.4} />
                  </Link>
                ))}
              </div>

              {comingSoonRestaurants.length > 0 ? (
                <>
                  <div className="my-2 border-t border-black/10" />
                  <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Coming Soon</div>
                  <div className="grid gap-1 px-2">
                    {comingSoonRestaurants.map((restaurant) => (
                      <div
                        key={restaurant.id}
                        role="menuitem"
                        aria-disabled="true"
                        className="inline-flex cursor-default items-center justify-between rounded-xl px-2 py-2.5 text-sm font-semibold text-neutral-400"
                      >
                        <span className="inline-flex min-w-0 items-center gap-2.5">
                          <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-neutral-50 opacity-60">
                            <Image src={restaurant.logo} alt={`${restaurant.name} logo`} fill className="object-contain rounded-md grayscale" />
                          </span>
                          <span className="truncate">{restaurant.name}</span>
                        </span>
                        <span className="ml-3 shrink-0 rounded-full border border-neutral-300 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                          Coming Soon
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {showSearchButton ? (
          <Link href="/#restaurant-search" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300/80 bg-white text-slate-800" aria-label="Search restaurants">
            <Search className="h-4 w-4" strokeWidth={2.5} />
          </Link>
        ) : null}
        {showCartButton ? (
          <CartIconDropdown buttonClassName="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300/80 bg-white p-0 text-slate-800 transition hover:bg-slate-50" />
        ) : null}
      </div>
    </div>
  );
}
