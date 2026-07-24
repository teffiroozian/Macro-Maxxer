"use client";

import { useEffect, useRef, useState } from "react";
import DesktopNav from "@/components/DesktopNav";
import GlobalMobileNav from "@/components/GlobalMobileNav";
import RestaurantSearch from "@/components/home/RestaurantSearch";
import type { RestaurantIndexEntry } from "@/types/restaurant";

// Owns the homepage's hero-vs-nav search handoff. Two separate desktop nav
// elements, never morphed into one another:
// - Static hero nav: logo + cart only, no search, sits inline at the top
//   of the hero and scrolls away with it like any other page content.
// - Sticky search nav: logo + centered search bar + cart, fixed at the
//   top, hidden while the hero search is in view, fades in once it scrolls
//   out.
// Desktop-only — mobile's nav is already fixed and unaffected by hero
// scroll position.
export default function HeroSearchNav({ restaurants }: { restaurants: RestaurantIndexEntry[] }) {
  const heroRef = useRef<HTMLDivElement>(null);
  const [isHeroVisible, setIsHeroVisible] = useState(true);

  useEffect(() => {
    const node = heroRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsHeroVisible(entry.isIntersecting),
      { threshold: 0, rootMargin: "-72px 0px 0px 0px" }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <section>
      <GlobalMobileNav />

      {/* Sticky search nav: fixed, hidden while the hero search is visible. */}
      <div
        className={`fixed inset-x-0 top-0 z-[95] px-4 pt-4 transition-all duration-200 sm:px-6 ${
          isHeroVisible ? "pointer-events-none -translate-y-2 opacity-0" : "opacity-100"
        }`}
      >
        <DesktopNav searchBarVariant="compact" />
      </div>

      {/* Static hero nav: logo + cart only, scrolls away naturally with the hero. */}
      <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-6">
        <DesktopNav searchBarVariant="hidden" />
      </div>

      <div ref={heroRef} className="mx-auto flex max-w-5xl flex-col gap-8 px-4 p-24 sm:px-6">
        <header className="mx-auto max-w-3xl text-center">
          <h1 className="text-center text-4xl font-semibold leading-tight tracking-tight text-neutral-900">
            Find High-Protein Fast Food Items in Seconds
          </h1>
        </header>

        <RestaurantSearch restaurants={restaurants} />
      </div>
    </section>
  );
}
