"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import FeaturedRestaurantCard from "@/components/home/FeaturedRestaurantCard";
import type { RestaurantIndexEntry } from "@/types/restaurant";

type RestaurantCarouselProps = {
  restaurants: RestaurantIndexEntry[];
};

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// User-controlled snap carousel for the Featured Restaurants section
// (Slice 2). One active card centers in the track with neighboring cards
// peeking on either side; arrows, the selector row, and native touch/scroll
// dragging all drive the same `activeIndex` state. No autoplay, no timers —
// the active card only ever changes in response to a user action.
export default function RestaurantCarousel({ restaurants }: RestaurantCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isProgrammaticScroll = useRef(false);
  const scrollLockTimeout = useRef<number | undefined>(undefined);

  const scrollToIndex = useCallback((index: number) => {
    const card = cardRefs.current[index];
    if (!card) {
      return;
    }

    isProgrammaticScroll.current = true;
    card.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", inline: "center", block: "nearest" });
    setActiveIndex(index);

    window.clearTimeout(scrollLockTimeout.current);
    scrollLockTimeout.current = window.setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 600);
  }, []);

  // Keeps `activeIndex` (and therefore the selector row + arrow disabled
  // state) in sync when the user drags/scrolls the track directly, rather
  // than only reacting to arrow/selector clicks.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) {
      return;
    }

    let frame = 0;

    const handleScroll = () => {
      if (isProgrammaticScroll.current) {
        return;
      }

      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const trackRect = track.getBoundingClientRect();
        const trackCenter = trackRect.left + trackRect.width / 2;

        let closestIndex = 0;
        let closestDistance = Infinity;

        cardRefs.current.forEach((card, index) => {
          if (!card) {
            return;
          }
          const cardRect = card.getBoundingClientRect();
          const cardCenter = cardRect.left + cardRect.width / 2;
          const distance = Math.abs(cardCenter - trackCenter);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
          }
        });

        setActiveIndex((previous) => (previous === closestIndex ? previous : closestIndex));
      });
    };

    track.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", handleScroll);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  if (restaurants.length === 0) {
    return null;
  }

  const activeRestaurant = restaurants[activeIndex];
  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex < restaurants.length - 1;

  return (
    <div>
      <p aria-live="polite" className="sr-only">
        Showing {activeRestaurant.name}
      </p>

      {/* Viewport: the positioning context for the fades/arrows only — the
          selector row below is a sibling, deliberately outside this element,
          so the arrows' `top-1/2` centers on the card itself, not on
          (card + selector row) combined. This element does NOT set
          `overflow`, so it never clips anything (default overflow:visible) —
          any part of the card's hover shadow that paints outside the track
          below is free to show here. */}
      <div className="relative">
        <div
          ref={trackRef}
          role="group"
          aria-roledescription="carousel"
          aria-label="Featured restaurants"
          // Setting overflow-x without overflow-y still makes the browser
          // clip the y-axis too (per the CSS overflow spec, the "visible"
          // axis computes to "auto" once its sibling axis is non-visible),
          // so this element unavoidably clips vertically as well as
          // horizontally. `py` gives the hover shadow room to render before
          // hitting that clip edge. It's kept *symmetric* (equal top and
          // bottom) so the arrows — positioned at `top-1/2` of the
          // surrounding viewport — stay centered on the card itself: any
          // top/bottom imbalance here would shift the padded box's midpoint
          // away from the card's true midpoint. The matching negative `-my`
          // then collapses that reserved space back out of the page's own
          // flow (margins collapse through a non-BFC parent and into the
          // next sibling), so it never shows up as dead space above the
          // section or below the selector row.
          className="hide-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-[7%] py-16 -my-16 sm:gap-6 sm:px-0 sm:py-20 sm:-my-20"
        >
          {/* Spacers (not padding) reserve the exact centering margin for
              the first/last card at sm+, where cards are a fixed px width.
              A flex-item's percentage width resolves against the track's
              own content box, so `calc(50% - half the card width)` stays
              exact at every viewport in this range — no per-breakpoint
              offset tuning, and no clamped/off-center scroll like
              padding-based insets would give at the last card. Mobile keeps
              the simpler percentage-width card + percentage padding since
              arrows are hidden there. */}
          <div aria-hidden="true" className="hidden shrink-0 sm:block sm:w-[calc(50%-280px)] lg:w-[calc(50%-380px)]" />

          {restaurants.map((restaurant, index) => (
            <div
              key={restaurant.id}
              ref={(node) => {
                cardRefs.current[index] = node;
              }}
              className={`w-[86%] shrink-0 snap-center transition-opacity duration-300 motion-reduce:transition-none sm:w-[560px] lg:w-[760px] ${
                index === activeIndex ? "opacity-100" : "opacity-55"
              }`}
            >
              <FeaturedRestaurantCard restaurant={restaurant} />
            </div>
          ))}

          <div aria-hidden="true" className="hidden shrink-0 sm:block sm:w-[calc(50%-280px)] lg:w-[calc(50%-380px)]" />
        </div>

        {restaurants.length > 1 ? (
          <>
            {/* Fades the peeking neighbor card toward the page background
                before it reaches the arrow buttons, so the controls never
                sit directly on top of legible card text. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 z-[5] w-10 bg-gradient-to-r from-app-background to-transparent sm:w-14"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 z-[5] w-10 bg-gradient-to-l from-app-background to-transparent sm:w-14"
            />

            <button
              type="button"
              onClick={() => canGoPrev && scrollToIndex(activeIndex - 1)}
              disabled={!canGoPrev}
              aria-label="Show previous restaurant"
              className="absolute left-2 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-black/10 bg-white/90 text-neutral-700 shadow-md backdrop-blur-sm transition hover:scale-105 hover:bg-white hover:text-neutral-900 hover:shadow-lg active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:pointer-events-none disabled:opacity-0 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100 sm:flex"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => canGoNext && scrollToIndex(activeIndex + 1)}
              disabled={!canGoNext}
              aria-label="Show next restaurant"
              className="absolute right-2 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-black/10 bg-white/90 text-neutral-700 shadow-md backdrop-blur-sm transition hover:scale-105 hover:bg-white hover:text-neutral-900 hover:shadow-lg active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:pointer-events-none disabled:opacity-0 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100 sm:flex"
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>

      {restaurants.length > 1 ? (
        // Minimal dash indicator, centered beneath the carousel — purely a
        // "which slide am I on" cue, deliberately without restaurant
        // identity (names/logos), so it stays secondary to the active card.
        //
        // `relative z-10` is load-bearing, not decorative: the viewport
        // above is `position:relative` (needed for the arrows), which means
        // it paints *after* plain static siblings regardless of DOM order —
        // and its track still physically occupies its full padded height
        // (the shadow-safe py/-my pair only cancels the *reserved layout
        // space*, not the element's own rendered box), so without this it
        // sits on top of this row and swallows clicks/hovers meant for the
        // indicators. Promoting this row to its own stacking position
        // restores normal DOM-order painting between the two.
        <div className="relative z-10 mt-5 flex flex-wrap items-center justify-center gap-1.5">
          {restaurants.map((restaurant, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={restaurant.id}
                type="button"
                onClick={() => scrollToIndex(index)}
                aria-pressed={isActive}
                aria-label={`Show ${restaurant.name}`}
                className="group cursor-pointer p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              >
                <span
                  aria-hidden="true"
                  className={`block h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none ${
                    isActive ? "w-8 bg-neutral-800" : "w-4 bg-neutral-300 group-hover:bg-neutral-400"
                  }`}
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
