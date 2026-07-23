"use client";

import { useEffect, useRef } from "react";
import AppIconButton from "@/components/ui/AppIconButton";
import GlobalSearchPanel from "@/components/global-search/GlobalSearchPanel";
import { useCloseOnEscape } from "@/components/global-search/useCloseOnEscape";
import { useGlobalSearch } from "@/components/GlobalSearchContext";

// Mobile-only presentation of Global Search: a full-screen/bottom-sheet
// takeover. Desktop uses DesktopSearchDropdown instead (anchored under the
// nav's search icon), so this is gated to below the app's one breakpoint,
// `lg` (1024px), same convention used everywhere else in the app.
export default function GlobalSearchOverlay() {
  const { isOpen, close } = useGlobalSearch();
  const dialogRef = useRef<HTMLDivElement>(null);

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

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      className="fixed inset-0 z-[230] flex items-end justify-center bg-black/35 lg:hidden"
      onClick={close}
    >
      <div
        className="flex h-[85vh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.25)]"
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
        <div className="flex-1 overflow-y-auto">
          <GlobalSearchPanel />
        </div>
      </div>
    </div>
  );
}
