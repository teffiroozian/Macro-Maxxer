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
      {/* Static in every regard — shape, border, background, shadow, size,
          and position never change with `isOpen`. Focusing it only opens
          the panel below; the field itself doesn't visually react. */}
      <div className="relative z-[229]">
        <input
          type="text"
          value={state.query}
          onChange={(event) => state.handleInputChange(event.target.value)}
          onFocus={(event) => open(event.relatedTarget instanceof HTMLElement ? event.relatedTarget : null)}
          onKeyDown={state.handleInputKeyDown}
          placeholder="Search restaurants, menu items..."
          aria-label="Search"
          className="h-10 w-full cursor-text rounded-full border border-black/10 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-accent focus:ring-4 focus:ring-accent/15"
        />
        <span className="pointer-events-none absolute inset-y-0 left-2 my-auto flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
          <Search className="h-3.5 w-3.5" strokeWidth={2.5} />
        </span>
      </div>

      {/* Backdrop and panel stay mounted at all times — only opacity/
          translate toggle with `isOpen` — so open and close can both
          animate as one coordinated transition. Conditionally rendering
          them (the previous `{isOpen ? ... : null}`) meant they popped in
          instantly with no "closed" frame to animate from. `inert` keeps
          the panel out of the tab order and accessibility tree while
          closed. The panel is a fully independent white surface — its own
          border/radius/shadow, absolutely positioned beneath the (visually
          untouched) input — so it never needs to coordinate shape with the
          field above; only its own opacity and a small upward slide
          animate. */}
      <div
        className={`fixed inset-0 z-[228] bg-black/30 transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={close}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        aria-hidden={!isOpen}
        inert={!isOpen}
        className={`absolute inset-x-0 top-full z-[229] mt-2 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.18)] transition-[opacity,transform] duration-200 ${
          isOpen ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"
        }`}
      >
        <GlobalSearchPanel {...state} />
      </div>
    </div>
  );
}
