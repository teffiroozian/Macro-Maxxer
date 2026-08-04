"use client";

import { useEffect, useState } from "react";

// Measures the actual bottom edge (in viewport px) of whichever fixed nav
// stack is currently visible — desktop's `[data-sticky-nav]` bar (global nav
// + secondary controls, which can grow a row when filters are active),
// mobile's own `[data-sticky-nav]` bar, and the mobile category strip that
// floats beneath it — so callers can clear it dynamically instead of
// guessing a fixed pixel offset that goes stale the moment any row in the
// stack grows or shrinks. Returns `null` until the first client-side
// measurement lands (callers should fall back to a sensible static default
// for that first paint, same as the stack's usual resting height).
export function useStickyNavClearance() {
  const [clearance, setClearance] = useState<number | null>(null);

  useEffect(() => {
    let observedCategoryNav: HTMLElement | null = null;
    let categoryResizeObserver: ResizeObserver | undefined;

    const measure = () => {
      const stickyBars = document.querySelectorAll('[data-sticky-nav="true"]');
      const stickyBottom = Array.from(stickyBars).reduce(
        (max, bar) => (bar instanceof HTMLElement ? Math.max(max, bar.getBoundingClientRect().bottom) : max),
        0,
      );

      const mobileCategoryNav = document.querySelector('[data-mobile-category-nav="true"]');
      const mobileCategoryBottom =
        mobileCategoryNav instanceof HTMLElement
          ? Math.max(0, mobileCategoryNav.getBoundingClientRect().bottom)
          : 0;

      const next = Math.max(0, Math.ceil(Math.max(stickyBottom, mobileCategoryBottom)));
      setClearance((previous) => (previous === next ? previous : next));

      if (mobileCategoryNav !== observedCategoryNav) {
        categoryResizeObserver?.disconnect();
        observedCategoryNav = mobileCategoryNav instanceof HTMLElement ? mobileCategoryNav : null;
        if (observedCategoryNav && typeof ResizeObserver !== "undefined") {
          categoryResizeObserver = new ResizeObserver(measure);
          categoryResizeObserver.observe(observedCategoryNav);
        }
      }
    };

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });

    // Catches the nav stack gaining/losing a row (e.g. active-filter chips
    // toggling on/off) even though that's a childList change somewhere
    // inside the fixed bars, not a resize of the observed node itself.
    const mutationObserver = new MutationObserver(measure);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
      mutationObserver.disconnect();
      categoryResizeObserver?.disconnect();
    };
  }, []);

  return clearance;
}
