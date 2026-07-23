"use client";

import { useEffect, useRef } from "react";
import { Search } from "lucide-react";
import GlobalSearchPanel from "@/components/global-search/GlobalSearchPanel";
import { useCloseOnEscape } from "@/components/global-search/useCloseOnEscape";
import { useGlobalSearch } from "@/components/GlobalSearchContext";
import { useGlobalSearchState } from "@/lib/search/useGlobalSearchState";

// Desktop presentation of Global Search: the nav bar itself is the real,
// always-mounted search input (not a fake button that reveals a second,
// separate input once opened) — focusing it opens a panel anchored directly
// beneath, matching its own width exactly (DesktopNav sizes the compact
// variant to 34rem so there's room for larger thumbnails, full nutrition,
// and future Quick Add/variant rows) — not the centered/full-screen modal
// used on mobile (GlobalSearchOverlay).
export default function DesktopSearchDropdown({ className = "w-full" }: { className?: string }) {
  const { isOpen, open, close } = useGlobalSearch();
  const state = useGlobalSearchState();
  const containerRef = useRef<HTMLDivElement>(null);

  useCloseOnEscape(isOpen, close);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current?.contains(event.target as Node)) {
        return;
      }

      // isOpen is shared with GlobalSearchOverlay (mobile). This component
      // stays mounted but CSS-hidden below `lg` (its ancestor DesktopNav is
      // display:none there) — offsetParent is null exactly when that's the
      // case. Without this guard, any click inside the mobile sheet (which
      // is a structurally separate DOM subtree) looks "outside" this
      // dropdown and would incorrectly close the whole shared search state.
      if (containerRef.current && containerRef.current.offsetParent === null) {
        return;
      }

      close();
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen, close]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* z-index keeps the bar above the dimming backdrop below (z-228) —
          without it, the bar has no explicit stacking level and paints
          underneath the backdrop even though it comes first in the DOM,
          so it (and the caret/text while typing) would visually dim along
          with the rest of the page. */}
      <div className="relative z-[229]">
        <input
          type="text"
          value={state.query}
          onChange={(event) => state.handleInputChange(event.target.value)}
          onFocus={(event) => open(event.relatedTarget instanceof HTMLElement ? event.relatedTarget : null)}
          onKeyDown={state.handleInputKeyDown}
          placeholder="Search restaurants, menu items..."
          aria-label="Search"
          className="h-10 w-full cursor-text rounded-full border border-slate-300/80 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-slate-400"
        />
        <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-500">
          <Search className="h-4 w-4" strokeWidth={2.5} />
        </span>
      </div>

      {isOpen ? (
        <>
          <div
            className="fixed inset-0 z-[228] bg-black/15"
            onClick={close}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search"
            className="absolute inset-x-0 top-[calc(100%+0.55rem)] z-[229] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
          >
            <GlobalSearchPanel {...state} />
          </div>
        </>
      ) : null}
    </div>
  );
}
