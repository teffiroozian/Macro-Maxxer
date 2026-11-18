import type { Nutrition } from "./nutrition";

export type OrderingOption = {
  id: string;
  label: string;
  min?: number;
  max?: number;
  defaultQuantity?: number;
  effect: { kind: "none" } | { kind: "add" | "included"; nutrition: Nutrition; sourceId?: string };
  itemId?: string;
  variantId?: string;
  role?: "side" | "drink" | "included-dessert" | "non-nutrition" | "ingredient";
  groups?: OrderingGroup[];
  // Give each selected copy its own child selections. Requires a finite max.
  independentCopies?: boolean;
};

export type OrderingGroup = {
  id: string;
  label: string;
  // A catalog component picker chooses a single published panel. Source
  // quantity bounds remain separate and may be absent.
  selectionMode?: "single-component";
  min: number;
  max: number | null;
  options: OrderingOption[];
};

export type OrderingPlan = {
  id: string;
  label?: string;
  baseNutrition: Nutrition;
  groups: OrderingGroup[];
};

export type SavedOrdering = { planId: string; quantities: Record<string, number> };
