"use client";

import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type GlobalSearchContextValue = {
  isOpen: boolean;
  query: string;
  open: () => void;
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

  const open = () => {
    previouslyFocusedElementRef.current =
      typeof document !== "undefined" && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setQuery("");
    previouslyFocusedElementRef.current?.focus();
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
