"use client";

import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type GlobalSearchContextValue = {
  isOpen: boolean;
  query: string;
  open: (previouslyFocused?: HTMLElement | null) => void;
  close: () => void;
  setQuery: (value: string) => void;
};

const GlobalSearchContext = createContext<GlobalSearchContextValue | null>(null);

export function GlobalSearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Captured synchronously in open()/close() rather than in a useEffect,
  // since by the time an effect runs the panel's autoFocus input has
  // already stolen focus away from whatever triggered the open.
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  // Accepts an explicit previously-focused element (pass this when open() is
  // called from the search input's own onFocus handler, via the native
  // FocusEvent's relatedTarget). Callers that open search from a plain click
  // (e.g. the mobile search icon button) can omit it — document.activeElement
  // at click time is still correct there, since the target of that click
  // isn't the search input itself.
  //
  // Without this distinction, calling open() from the input's onFocus would
  // capture document.activeElement *after* the browser has already moved
  // focus to that same input (per the FocusEvent spec, activeElement updates
  // before the focus event fires) — close() would then call .focus() on the
  // input itself, re-triggering onFocus -> open() and silently reopening the
  // panel, which is what made outside clicks require two attempts to close.
  const open = (previouslyFocused?: HTMLElement | null) => {
    previouslyFocusedElementRef.current =
      previouslyFocused !== undefined
        ? previouslyFocused
        : typeof document !== "undefined" && document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setQuery("");

    const target = previouslyFocusedElementRef.current;
    target?.focus();

    // Escape, and selecting a result (rows use onMouseDown preventDefault so
    // clicking them never natively blurs the input), close() without the
    // browser ever having blurred the search input itself. If the restore
    // target above was null/non-focusable (e.g. <body>, which silently
    // no-ops .focus()), the input would otherwise stay focused after close —
    // harmless visually, but it means a later click on it won't refire the
    // focus event that reopens the panel. Explicitly blur whatever's still
    // focused whenever the restore didn't land, so the next click reopens.
    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement &&
      document.activeElement !== target
    ) {
      document.activeElement.blur();
    }

    previouslyFocusedElementRef.current = null;
  };

  const value = useMemo(
    () => ({ isOpen, query, open, close, setQuery }),
    [isOpen, query]
  );

  return (
    <GlobalSearchContext.Provider value={value}>
      {children}
    </GlobalSearchContext.Provider>
  );
}

export function useGlobalSearch() {
  const context = useContext(GlobalSearchContext);

  if (!context) {
    throw new Error("useGlobalSearch must be used within GlobalSearchProvider");
  }

  return context;
}
