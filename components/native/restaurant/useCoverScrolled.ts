"use client";
import { useEffect, useState, type RefObject } from "react";

export const COVER_HEIGHT = 300;
const BAR_HEIGHT = 52;

// One boolean, flipped once scrollY passes the point where the cover has
// slid under the top bar (bar top is the safe-area inset).
export function useCoverScrolled(barRef: RefObject<HTMLElement | null>) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const safeTop = barRef.current?.getBoundingClientRect().top ?? 0;
      setScrolled(window.scrollY >= COVER_HEIGHT - (safeTop + BAR_HEIGHT) - 4);
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [barRef]);
  return scrolled;
}
