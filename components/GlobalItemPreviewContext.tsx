"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useItemPreviewModal, type ItemPreviewState } from "@/hooks/useItemPreviewModal";
import type { MenuItem } from "@/types/menu";

type GlobalItemPreviewContextValue = {
  previewState: ItemPreviewState | null;
  openPreview: (restaurantId: string, item: MenuItem) => Promise<void>;
  closePreview: () => void;
};

const GlobalItemPreviewContext = createContext<GlobalItemPreviewContextValue | null>(null);

// App-wide home for "view this menu item locally, without navigating away
// from the current page." Global Search uses this to open a result's item
// modal from pages that aren't the item's own restaurant page (home, navbar,
// another restaurant's page, cart, a builder/entree-selection page) — see
// useGlobalSearchState's handleSelectMenuItem.
export function GlobalItemPreviewProvider({ children }: { children: ReactNode }) {
  const { previewState, openPreview, closePreview } = useItemPreviewModal();

  return (
    <GlobalItemPreviewContext.Provider value={{ previewState, openPreview, closePreview }}>
      {children}
    </GlobalItemPreviewContext.Provider>
  );
}

export function useGlobalItemPreview() {
  const context = useContext(GlobalItemPreviewContext);

  if (!context) {
    throw new Error("useGlobalItemPreview must be used within GlobalItemPreviewProvider");
  }

  return context;
}
