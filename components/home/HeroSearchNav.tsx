"use client";

import { useEffect, useRef, useState } from "react";
import { Dumbbell, Flame, Leaf, type LucideIcon } from "lucide-react";
import DesktopNav from "@/components/DesktopNav";
import GlobalMobileNav from "@/components/GlobalMobileNav";
import RestaurantSearch from "@/components/home/RestaurantSearch";
import SectionEyebrow from "@/components/ui/SectionEyebrow";
import type { RestaurantIndexEntry } from "@/types/restaurant";

type HeroStatPillProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  // Shared by the icon and the macro value — one restrained category color
  // ties the two together, while the label stays neutral and the item/
  // restaurant text stays secondary.
  accentClassName: string;
  itemName: string;
  restaurantName: string;
  className: string;
};

// Decorative floating stat card: a small icon + bold, near-black category
// label on top, then a second line where the macro value carries the
// strongest emphasis (bold, category-colored) and the item/restaurant stay
// readable but secondary. Purely illustrative (aria-hidden, pointer-events-
// none) — never a source of truth, never competing with the headline or
// search module.
function HeroStatPill({ icon: Icon, label, value, accentClassName, itemName, restaurantName, className }: HeroStatPillProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute hidden flex-col gap-1 rounded-2xl border border-black/10 bg-white/90 px-3.5 py-2.5 shadow-[0_12px_30px_rgba(15,23,42,0.1)] backdrop-blur-sm lg:flex ${className}`}
    >
      <span className="flex items-center gap-1.5">
        <Icon className={`h-3 w-3 shrink-0 ${accentClassName}`} strokeWidth={2.5} />
        <span className="text-[10px] font-bold uppercase tracking-normal text-neutral-900">{label}</span>
      </span>
      <span className="flex items-baseline gap-1.5 whitespace-nowrap">
        <span className={`text-base font-extrabold ${accentClassName}`}>{value}</span>
        <span className="text-xs font-medium text-neutral-500">
          {itemName} · {restaurantName}
        </span>
      </span>
    </div>
  );
}

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
    <section className="relative">
      <GlobalMobileNav />

      {/* Sticky search nav: fixed, hidden while the hero search is visible. */}
      <div
        className={`fixed inset-x-0 top-0 z-[95] px-4 pt-1 transition-all duration-200 sm:px-6 ${
          isHeroVisible ? "pointer-events-none -translate-y-2 opacity-0" : "opacity-100"
        }`}
      >
        <DesktopNav searchBarVariant="compact" />
      </div>

      {/* Static hero nav: logo + cart only, scrolls away naturally with the hero. */}
      <div className="mx-auto max-w-6xl px-4 pt-1 sm:px-6">
        <DesktopNav searchBarVariant="hidden" />
      </div>

      <div
        ref={heroRef}
        className="relative mx-auto flex max-w-6xl flex-col gap-9 px-4 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-20 lg:pb-28 lg:pt-24"
      >
        {/* Decorative macro accents — real values from the restaurants
            featured further down the page, purely illustrative here.
            Hidden below `lg` so the hero stays uncluttered on small
            screens, where there's no room for anything but the search
            module itself. Rotation varies slightly per card so the three
            read as a naturally composed group rather than duplicates.
            All three are positioned relative to heroRef (not fixed
            viewport pixels), and every offset below was verified against
            the actual rendered layout at 1024/1280/1440px — the widened
            H1 (see header below) and paragraph/search block never reflow
            differently across that range, so a single top offset per pill
            holds at every common desktop/laptop width without needing
            fluid/percentage positioning. */}
        <HeroStatPill
          icon={Dumbbell}
          label="High Protein"
          value="44g"
          // Warm red-orange — same protein accent used elsewhere in the app.
          accentClassName="text-[#c2410c]"
          itemName="Chicken Bowl"
          restaurantName="Chipotle"
          className="left-[-8px] top-8 -rotate-8 xl:left-8"
        />
        <HeroStatPill
          icon={Flame}
          label="Low Calorie"
          value="130 cals"
          // Restrained blue (the shared `info` token) — distinct from the
          // protein/fiber accents and from the app's near-black calorie
          // color used elsewhere, so this pill reads as its own category.
          accentClassName="text-info"
          itemName="Grilled Nuggets"
          restaurantName="Chick-fil-A"
          // top-8 (not top-24): the wider H1 below now reaches further
          // right, so this needs to clear the headline's own top edge
          // rather than sit beside its first line.
          className="right-[-8px] top-12 rotate-3 xl:right-6"
        />
        <HeroStatPill
          icon={Leaf}
          label="High Fiber"
          value="14g"
          // The app's soft green product accent.
          accentClassName="text-accent-strong"
          itemName="Cool Wrap"
          restaurantName="Chick-fil-A"
          // top-64: lands level with the supporting paragraph / just above
          // the search module's top-left corner — verified clear of the
          // paragraph (which is centered and much narrower) and of the
          // search shell (which starts well to the right of this offset).
          className="left-[-4px] top-74 rotate-5 xl:left-0"
        />

        <header className="mx-auto max-w-4xl text-center">
          <SectionEyebrow className="text-xs sm:text-sm">Real menu data, real macros</SectionEyebrow>
          <h1 className="font-heading mt-4 text-4xl font-bold leading-[1.05] tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl">
            Find High-Protein Fast Food Items in Seconds
          </h1>
          <p className="mx-auto mt-5 max-w-md text-base text-neutral-600 sm:text-lg">
            Compare menu items, build your order, and see the total macros before you check out.
          </p>
        </header>

        <RestaurantSearch restaurants={restaurants} />
      </div>
    </section>
  );
}
