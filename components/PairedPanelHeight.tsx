"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

type PairedPanelHeightContextValue = {
  sourceRef: RefObject<HTMLDivElement | null>;
  height: number | null;
};

const noopRef: RefObject<HTMLDivElement | null> = { current: null };

const PairedPanelHeightContext = createContext<PairedPanelHeightContextValue>({
  sourceRef: noopRef,
  height: null,
});

// Desktop-only "measure the left panel, cap the right panel to it" utility.
//
// A CSS grid row's default `align-items: stretch` looks like it should keep
// a details card from ever growing past its Nutrition Facts sibling, but it
// doesn't: when a grid track's height is `auto` (no explicit
// grid-template-rows), the track-sizing algorithm still asks every item for
// its own max-content contribution, and a flex column with
// `min-height: 0; overflow-y: auto` only suppresses that item's *automatic
// minimum* — the row itself still ends up sized to whichever sibling's
// content (a long ingredient/item list) is tallest. There's no reliable
// pure-CSS way to make one grid sibling's intrinsic size ignore the other's,
// so this measures the source panel's real rendered height with
// ResizeObserver and republishes it via context for the paired panel to
// apply as an explicit `height` — unlike a percentage/stretch height, the
// paired panel's own content can never expand past an explicit pixel value.
export function PairedPanelHeightProvider({
  children,
  mediaQuery = "(min-width: 768px)",
}: {
  children: ReactNode;
  mediaQuery?: string;
}) {
  const sourceRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const node = sourceRef.current;
    if (!node) return;

    const mql = window.matchMedia(mediaQuery);

    const measure = () => {
      setHeight(mql.matches ? node.getBoundingClientRect().height : null);
    };

    measure();

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(node);
    mql.addEventListener("change", measure);

    return () => {
      resizeObserver.disconnect();
      mql.removeEventListener("change", measure);
    };
  }, [mediaQuery]);

  return (
    <PairedPanelHeightContext.Provider value={{ sourceRef, height }}>
      {children}
    </PairedPanelHeightContext.Provider>
  );
}

// Wraps the panel that should drive the pair's height (Nutrition Facts /
// Nutrition Summary) — that panel always renders at its own natural height,
// unconstrained; this just gives the provider a node to measure.
//
// The ref is on an INNER div, one level below `className` (the actual grid
// item) — not on the grid item itself. That's the fix for the bug where the
// measured height came out taller than Nutrition Facts' real content: the
// outer div is a grid item, and a CSS grid's default `align-items: stretch`
// grows grid items to match the row height. Early on (or whenever the
// paired panel's content is naturally taller before its own height gets
// pinned), the row height is driven by that taller sibling, which stretches
// *this* wrapper too — so a ref on the outer div reports the stretched
// height, not Nutrition Facts' true size. Feed that stretched number back in
// as the paired panel's height and the row locks onto the wrong, inflated
// value permanently (a self-reinforcing loop). The inner div is not itself a
// grid item, so it always sizes to its child's real intrinsic content height
// regardless of how tall the outer grid item is stretched.
export function PairedPanelSource({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { sourceRef } = useContext(PairedPanelHeightContext);
  return (
    <div className={className}>
      <div ref={sourceRef}>{children}</div>
    </div>
  );
}

// Read by the panel that must never make the pair taller (Selected
// Ingredients / Meal Breakdown). `null` below the provider's breakpoint, or
// before the first measurement, or outside any provider — callers should
// only apply it as an explicit `height` and leave their own height unset
// otherwise, so mobile (and any unwrapped usage) keeps its normal stacked,
// naturally-growing layout.
export function usePairedPanelHeight() {
  return useContext(PairedPanelHeightContext).height;
}
