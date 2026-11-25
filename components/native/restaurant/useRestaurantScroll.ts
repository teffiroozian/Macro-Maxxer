"use client";
import { useEffect, useState, type RefObject } from "react";
import { COVER_HEIGHT } from "./useCoverScrolled";

const BAR_HEIGHT = 52;

// compact: the cover has slid under the top bar.
// pinned: the menu toolbar has reached it.
export function useRestaurantScroll(bar: RefObject<HTMLElement | null>, menuTop: RefObject<HTMLElement | null>) {
  const [state, setState] = useState({ compact: false, pinned: false });
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const bottom = (bar.current?.getBoundingClientRect().top ?? 0) + BAR_HEIGHT;
      const compact = window.scrollY >= COVER_HEIGHT - bottom - 4;
      const pinned = menuTop.current ? menuTop.current.getBoundingClientRect().top <= bottom + 1 : false;
      setState((current) => (current.compact === compact && current.pinned === pinned ? current : { compact, pinned }));
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
  }, [bar, menuTop]);
  return state;
}
