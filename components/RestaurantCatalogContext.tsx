"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { RestaurantIndexEntry } from "@/types/restaurant";

const RestaurantCatalogContext = createContext<RestaurantIndexEntry[]>([]);

export function RestaurantCatalogProvider({ restaurants, children }: { restaurants: RestaurantIndexEntry[]; children: ReactNode }) {
  return <RestaurantCatalogContext.Provider value={restaurants}>{children}</RestaurantCatalogContext.Provider>;
}

// Identity and canonical counts arrive together from the root server layout.
export function useRestaurantCatalog() {
  return useContext(RestaurantCatalogContext);
}
