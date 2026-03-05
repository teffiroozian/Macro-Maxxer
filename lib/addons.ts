import type { AddonOption, AddonRef, RestaurantAddons } from "@/types/menu";

type RawAddonOption = {
  id?: string;
  name?: string;
  image?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  totalFat?: number;
  satFat?: number;
  transFat?: number;
  cholesterol?: number;
  sodium?: number;
  fiber?: number;
  sugars?: number;
  nutrition?: Partial<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    totalFat: number;
    satFat: number;
    transFat: number;
    cholesterol: number;
    sodium: number;
    fiber: number;
    sugars: number;
  }>;
};

function toNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeAddonOption(addon: RawAddonOption): AddonOption {
  const nutrition = addon.nutrition ?? {};

  return {
    name: addon.name ?? addon.id ?? "Unnamed Add-on",
    calories: toNumber(addon.calories ?? nutrition.calories),
    protein: toNumber(addon.protein ?? nutrition.protein),
    carbs: toNumber(addon.carbs ?? nutrition.carbs),
    fat: toNumber(addon.fat ?? addon.totalFat ?? nutrition.fat ?? nutrition.totalFat),
    satFat: toNumber(addon.satFat ?? nutrition.satFat),
    transFat: toNumber(addon.transFat ?? nutrition.transFat),
    cholesterol: toNumber(addon.cholesterol ?? nutrition.cholesterol),
    sodium: toNumber(addon.sodium ?? nutrition.sodium),
    fiber: toNumber(addon.fiber ?? nutrition.fiber),
    sugars: toNumber(addon.sugars ?? nutrition.sugars),
    image: addon.image,
  };
}

export function normalizeAddons(addons: unknown): RestaurantAddons {
  if (!addons || typeof addons !== "object") return {};

  const entries = Object.entries(addons as Record<string, unknown>)
    .filter(([, options]) => Array.isArray(options))
    .map(([ref, options]) => [
      ref as AddonRef,
      (options as RawAddonOption[]).map((option) => normalizeAddonOption(option)),
    ] as const);

  return Object.fromEntries(entries) as RestaurantAddons;
}
