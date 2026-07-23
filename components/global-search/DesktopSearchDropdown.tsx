"use client";

import { useEffect, useRef } from "react";
import { Search } from "lucide-react";
import GlobalSearchPanel from "@/components/global-search/GlobalSearchPanel";
import { useCloseOnEscape } from "@/components/global-search/useCloseOnEscape";
import { useGlobalSearch } from "@/components/GlobalSearchContext";

// Desktop presentation of Global Search: a real search-bar-shaped trigger
// that opens a panel anchored directly beneath it, matching its own width
// exactly (DesktopNav sizes the compact variant to 30rem so there's room
// for future menu-item rows — restaurant name/nutrition/actions) — not the
// centered/full-screen modal used on mobile (GlobalSearchOverlay).
export default function DesktopSearchDropdown({ className = "w-full" }: { className?: string }) {
  const { isOpen, open, close } = useGlobalSearch();
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
      close();
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen, close]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={open}
        className="inline-flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-full border border-slate-300/80 bg-white px-4 text-sm text-slate-500"
        aria-label="Search"
      >
        <Search className="h-4 w-4 shrink-0" strokeWidth={2.5} />
        <span className="truncate">Search restaurants, menu items…</span>
      </button>

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
            <GlobalSearchPanel />
          </div>
        </>
      ) : null}
    </div>
  );
}
