"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { Dumbbell, Flame, type LucideIcon } from "lucide-react";
import DesktopNav from "@/components/DesktopNav";
import GlobalMobileNav from "@/components/GlobalMobileNav";
import GlobalMobileMenuButton from "@/components/GlobalMobileMenuButton";
import CartIconDropdown from "@/components/cart/CartIconDropdown";
import { appIconButtonClassName } from "@/components/ui/AppIconButton";
import RestaurantSearch from "@/components/home/RestaurantSearch";
import HeroRestaurantChips from "@/components/home/HeroRestaurantChips";
import SectionEyebrow from "@/components/ui/SectionEyebrow";
import type { RestaurantIndexEntry } from "@/types/restaurant";

// Per-card ambient-float timing (see `.hero-float` in globals.css). Distinct
// duration/delay per card so the four never bounce in sync; distances stay
// in the requested ~4-8px range. Expressed as CSS custom properties (cast —
// TS's CSSProperties doesn't know custom props) rather than four near-
// duplicate keyframes.
function floatVars(duration: string, delay: string, distance: string): CSSProperties {
  return {
    "--hero-float-duration": duration,
    "--hero-float-delay": delay,
    "--hero-float-distance": distance,
  } as CSSProperties;
}

type HeroRankingCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  // Shared by the icon and the standout value — one restrained category
  // color ties the two together, while the label and item/restaurant text
  // stay secondary.
  accentClassName: string;
  itemName: string;
  restaurantName: string;
  wrapperClassName: string;
  floatStyle: CSSProperties;
};

// Decorative floating ranking card (hero top corners) — framed as a Macro
// Maxxer recommendation ("High Protein Pick"), not just a raw stat: a small
// icon + label on top, then the standout value (strongest emphasis, bold,
// category-colored) and the item/restaurant it came from underneath.
// Purely illustrative (aria-hidden, pointer-events-none) — never a source of
// truth, never competing with the headline or search module. Styled a touch
// quieter than a primary UI card (softer border/shadow, a lighter label
// weight) so it reads as supporting the hero rather than competing with it —
// the standout value stays the one strong, fully-readable element.
//
// Rotation lives on this outer wrapper (a static `transform`); the ambient
// float animation lives on the inner `.hero-float` div, which also animates
// `transform` — splitting them across parent/child means neither clobbers
// the other (see the animation comment in globals.css).
function HeroRankingCard({ icon: Icon, label, value, accentClassName, itemName, restaurantName, wrapperClassName, floatStyle }: HeroRankingCardProps) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute ${wrapperClassName}`}>
      <div className="hero-float" style={floatStyle}>
        <div className="flex flex-col gap-1 rounded-2xl border border-black/[0.07] bg-white/90 px-3.5 py-2.5 shadow-[0_10px_26px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <span className="flex items-center gap-1.5">
            <Icon className={`h-3 w-3 shrink-0 ${accentClassName}`} strokeWidth={2.5} />
            <span className="text-[10px] font-semibold uppercase tracking-normal text-neutral-600">{label}</span>
          </span>
          <span className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className={`text-base font-extrabold ${accentClassName}`}>{value}</span>
            <span className="text-xs font-medium text-neutral-500">
              {itemName} · {restaurantName}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

type HeroItemPreviewCardProps = {
  image: string;
  itemName: string;
  restaurantName: string;
  calories: number;
  // A single additional standout macro, already formatted (e.g.
  // "32g Protein") — paired with calories, these cards illustrate the
  // product without restating a full nutrition breakdown.
  standout: string;
  accentClassName: string;
  wrapperClassName: string;
  floatStyle: CSSProperties;
};

// Decorative floating item-preview card (hero bottom corners): a small real
// menu-item photo plus name/restaurant/calories/one standout macro — a
// miniature of the real menu cards used elsewhere in the app, not an
// invented UI. Slightly wider than HeroRankingCard (the extra calories
// figure earns the room) and the same restrained border/shadow/label
// treatment as its top-corner counterpart.
function HeroItemPreviewCard({ image, itemName, restaurantName, calories, standout, accentClassName, wrapperClassName, floatStyle }: HeroItemPreviewCardProps) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute ${wrapperClassName}`}>
      <div className="hero-float" style={floatStyle}>
        <div className="flex items-center gap-2.5 rounded-2xl border border-black/[0.07] bg-white/90 py-2 pl-2 pr-3.5 shadow-[0_10px_26px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-neutral-50">
            <Image src={image} alt="" fill sizes="40px" className="object-cover" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-neutral-700">{itemName}</p>
            <p className="truncate text-[10px] font-medium text-neutral-500">{restaurantName}</p>
            <p className="whitespace-nowrap text-[11px] font-semibold text-neutral-500">
              {calories} cal · <span className={`font-extrabold ${accentClassName}`}>{standout}</span>
            </p>
          </div>
        </div>
      </div>
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
      <GlobalMobileNav
        leadingButton={<GlobalMobileMenuButton />}
        cartSlot={
          <CartIconDropdown
            variant="sheet"
            buttonClassName={appIconButtonClassName({ variant: "nav", className: "relative size-9 shrink-0 text-base" })}
          />
        }
      />

      {/* Sticky search nav: fixed, hidden while the hero search is visible.
          `inert` while hidden keeps its (otherwise invisible, duplicate)
          logo/search/cart controls out of both the tab order and the
          accessibility tree — without it, keyboard and screen-reader users
          would hit three unclickable phantom stops before ever reaching the
          real, visible hero nav below. */}
      <div
        inert={isHeroVisible}
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
        className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-20 pt-16 sm:px-6 sm:pb-24 sm:pt-20 lg:pb-28 lg:pt-24"
      >
        <div className="relative z-10 flex flex-col gap-8">
          {/* Headline frame — `max-w-4xl` here (not just on the <header>) is
              load-bearing: every floating card below anchors its `left`/
              `right`/`top`/`bottom` against *this* box, so they hug the
              actual rendered width of the eyebrow/H1 column instead of the
              full 1152px hero. That's what keeps the four cards framing the
              headline specifically rather than spreading down toward the
              search module. Bottom cards use small negative `-bottom-*`
              offsets to sit just past the H1's last line — snug against the
              headline, not down by the search — so the hero reads as
              compact rather than vertically stretched.

              Visible from `lg` only: the H1 (`sm:text-5xl`/`lg:text-6xl`)
              fills nearly the full width of this column at any narrower
              breakpoint (verified directly across 390-1024px), so there's
              no safe corner for either card pair below `lg` without
              visibly crossing the headline. Top offsets were re-verified
              against the actual rendered layout at 1024/1280/1440px. */}
          <div className="relative mx-auto max-w-4xl">
            <HeroRankingCard
              icon={Dumbbell}
              label="High Protein Pick"
              value="44g"
              // Warm red-orange — same protein accent used elsewhere in the app.
              accentClassName="text-[#c2410c]"
              itemName="High Protein Bowl"
              restaurantName="Chipotle"
              wrapperClassName="hidden left-[-24px] -top-12 -rotate-6 lg:flex xl:left-[-100px]"
              floatStyle={floatVars("6.4s", "0s", "-6px")}
            />
            <HeroRankingCard
              icon={Flame}
              label="Low Calorie Pick"
              value="130 cals"
              // Restrained blue (the shared `info` token) — distinct from the
              // protein/fiber accents and from the app's near-black calorie
              // color used elsewhere, so this pill reads as its own category.
              accentClassName="text-info"
              itemName="Grilled Nuggets"
              restaurantName="Chick-fil-A"
              wrapperClassName="hidden right-[-24px] -top-16 rotate-4 lg:flex xl:right-[-80px]"
              floatStyle={floatVars("7.2s", "0.6s", "-5px")}
            />

            <HeroItemPreviewCard
              image="/restaurants/chickfila/menu/wraps/cool-wrap.webp"
              itemName="Cool Wrap"
              restaurantName="Chick-fil-A"
              calories={660}
              standout="14g Fiber"
              // The app's soft green product accent — same role as the fiber
              // pill this replaces, kept for the same "fiber = green" reading.
              accentClassName="text-accent-strong"
              wrapperClassName="hidden left-[-32px] -bottom-65 rotate-5 lg:flex xl:left-[-100px]"
              floatStyle={floatVars("6.8s", "1.1s", "-7px")}
            />
            <HeroItemPreviewCard
              image="/restaurants/chipotle/menu/high-protein/chicken-cup.png"
              itemName="Side of Chicken"
              restaurantName="Chipotle"
              calories={180}
              standout="32g Protein"
              accentClassName="text-[#c2410c]"
              wrapperClassName="hidden right-[-32px] -bottom-70 -rotate-7 lg:flex xl:right-[-72px]"
              floatStyle={floatVars("7.6s", "0.3s", "-4px")}
            />

            <header className="text-center">
              <div className="inline-flex items-center gap-2.5">
                <span aria-hidden="true" className="h-1 w-1 rounded-full bg-accent-strong" />
                <SectionEyebrow className="text-xs tracking-[0.18em] text-neutral-700 sm:text-sm">
                  Real menu data, real macros
                </SectionEyebrow>
                <span aria-hidden="true" className="h-1 w-1 rounded-full bg-accent-strong" />
              </div>
              <h1 className="font-heading mt-4 text-4xl font-bold leading-[1.05] tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl">
                Find High-Protein Fast Food Items in Seconds
              </h1>
            </header>
          </div>

          <RestaurantSearch restaurants={restaurants} />

          <div className="mx-auto flex flex-col items-center gap-4 text-center">
            <p className="max-w-md text-base text-neutral-600 sm:text-lg">
              Compare menu items, build your order, and see the total macros before you check out.
            </p>
            <HeroRestaurantChips restaurants={restaurants} />
          </div>
        </div>
      </div>
    </section>
  );
}
