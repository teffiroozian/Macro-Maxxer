"use client";

import { useEffect, useRef, useState } from "react";

const HOVER_SCROLL_DELAY_MS = 600;
const HOVER_SCROLL_DURATION_MS = 1600;

// Desktop-only: keeps the item name on one line and fades it out at the
// trailing edge instead of a hard ellipsis, then — only if the name is
// actually cut off — slowly scrolls it into view on hover after a short
// pause so the full name stays reachable without permanently wrapping the
// card to two lines. Below `lg`, falls back to the previous two-line clamp
// since there's no hover to trigger the reveal on touch devices anyway.
export default function MenuItemTitle({ name, className = "" }: { name: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const scrollTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    const measure = () => setIsOverflowing(text.scrollWidth > container.clientWidth);
    measure();

    // A ResizeObserver (rather than a window resize listener) also catches
    // the container going from display:none (mobile, below lg) to visible
    // (crossing into desktop width), which a resize-only listener would miss
    // on the very first measurement.
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [name]);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current !== null) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (!isOverflowing) return;
    if (scrollTimeoutRef.current !== null) {
      window.clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = window.setTimeout(() => {
      const container = containerRef.current;
      const text = textRef.current;
      if (!container || !text) return;
      setScrollOffset(text.scrollWidth - container.clientWidth);
      setIsScrolled(true);
    }, HOVER_SCROLL_DELAY_MS);
  };

  const handleMouseLeave = () => {
    if (scrollTimeoutRef.current !== null) {
      window.clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
    setScrollOffset(0);
    setIsScrolled(false);
  };

  return (
    <>
      <div className={`line-clamp-2 lg:hidden ${className}`}>{name}</div>
      <div
        ref={containerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`relative hidden w-full overflow-hidden whitespace-nowrap lg:block ${className}`}
      >
        <span
          ref={textRef}
          className="inline-block"
          style={{
            transform: `translateX(-${scrollOffset}px)`,
            transition: `transform ${HOVER_SCROLL_DURATION_MS}ms linear`,
          }}
        >
          {name}
        </span>
        {isOverflowing ? (
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-r from-transparent to-white transition-opacity duration-300 ${
              isScrolled ? "opacity-0" : "opacity-100"
            }`}
          />
        ) : null}
      </div>
    </>
  );
}
