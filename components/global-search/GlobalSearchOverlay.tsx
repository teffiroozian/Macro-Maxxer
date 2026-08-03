"use client";

import { useEffect, useRef } from "react";
import { Search } from "lucide-react";
import AppIconButton from "@/components/ui/AppIconButton";
import GlobalSearchPanel from "@/components/global-search/GlobalSearchPanel";
import { useCloseOnEscape } from "@/components/global-search/useCloseOnEscape";
import { useGlobalSearch } from "@/components/GlobalSearchContext";
import { useGlobalSearchState } from "@/lib/search/useGlobalSearchState";

// Mobile-only presentation of Global Search: a full-screen/bottom-sheet
// takeover. Desktop uses DesktopSearchDropdown instead (anchored under the
// nav's search icon), so this is gated to below the app's one breakpoint,
// `lg` (1024px), same convention used everywhere else in the app.
export default function GlobalSearchOverlay() {
  const { isOpen, close } = useGlobalSearch();
  const state = useGlobalSearchState();
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useCloseOnEscape(isOpen, close);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    // isOpen is shared with DesktopSearchDropdown, but this sheet is
    // CSS-hidden (lg:hidden) at desktop width — only lock scroll when
    // it's actually the thing being shown, not just "open" globally.
    if (dialogRef.current && getComputedStyle(dialogRef.current).display === "none") {
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Stays mounted at all times (only `isOpen` toggles the translate/opacity
  // classes below) so the slide-up/slide-down transition can actually
  // animate in both directions — unmounting on close (the previous
  // `if (!isOpen) return null`) meant there was never a "closed" frame to
  // animate from on open, so the sheet just appeared instantly. `autoFocus`
  // only fires on mount, so with the component now staying mounted this
  // effect takes over focusing the input each time it opens instead.
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      aria-hidden={!isOpen}
      inert={!isOpen}
      className={`fixed inset-0 z-[230] flex items-end justify-center bg-black/35 transition-opacity duration-300 lg:hidden ${
        isOpen ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      onClick={close}
    >
      <div
        className={`flex h-[85vh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.25)] transition-transform duration-300 ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Search
          </h2>
          <AppIconButton onClick={close} aria-label="Close search">
            ✕
          </AppIconButton>
        </div>

        <div className="shrink-0 px-5 pt-4">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              aria-label="Search"
              value={state.query}
              onChange={(event) => state.handleInputChange(event.target.value)}
              onKeyDown={state.handleInputKeyDown}
              placeholder="Search restaurants, menu items..."
              className="w-full rounded-2xl border border-black/10 bg-white py-3 pl-12 pr-4 text-base text-neutral-900 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
            />
            <span className="pointer-events-none absolute inset-y-0 left-3 my-auto flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
              <Search className="h-3.5 w-3.5" strokeWidth={2.5} />
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <GlobalSearchPanel {...state} />
        </div>
      </div>
    </div>
  );
}
