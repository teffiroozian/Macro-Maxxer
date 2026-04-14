import type { AddonOption, AddonRef, RestaurantAddons } from "@/types/menu";

type RawAddonOption = {
  id?: string;
  name?: string;
  image?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
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
    totalFat: number;
    satFat: number;
    transFat: number;
    cholesterol: number;
    sodium: number;
    fiber: number;
    sugars: number;
    extraNutrition: Record<string, number>;
  }>;
  [key: string]: unknown;
};

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

const CORE_NUTRITION_KEYS = new Set([
  "id",
  "name",
  "image",
  "nutrition",
  "calories",
  "protein",
  "carbs",
  "totalFat",
  "satFat",
  "transFat",
  "cholesterol",
  "sodium",
  "fiber",
  "sugars",
]);

function extractExtraNutrition(addon: RawAddonOption) {
  const entries = Object.entries(addon)
    .filter(([key, value]) => !CORE_NUTRITION_KEYS.has(key) && typeof value === "number" && Number.isFinite(value))
    .map(([key, value]) => [key, value as number] as const);

  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries);
}

function normalizeAddonOption(addon: RawAddonOption): AddonOption {
  const nutrition = addon.nutrition ?? {};

  const totalFat = toNumber(addon.totalFat ?? nutrition.totalFat);
  const extraNutrition = {
    ...(nutrition.extraNutrition ?? {}),
    ...(extractExtraNutrition(addon) ?? {}),
  };

  return {
    name: addon.name ?? addon.id ?? "Unnamed Add-on",
    calories: toNumber(addon.calories ?? nutrition.calories) ?? 0,
    protein: toNumber(addon.protein ?? nutrition.protein) ?? 0,
    carbs: toNumber(addon.carbs ?? nutrition.carbs) ?? 0,
    totalFat: totalFat ?? 0,
    satFat: toNumber(addon.satFat ?? nutrition.satFat),
    transFat: toNumber(addon.transFat ?? nutrition.transFat),
    cholesterol: toNumber(addon.cholesterol ?? nutrition.cholesterol),
    sodium: toNumber(addon.sodium ?? nutrition.sodium),
    fiber: toNumber(addon.fiber ?? nutrition.fiber),
    sugars: toNumber(addon.sugars ?? nutrition.sugars),
    extraNutrition: Object.keys(extraNutrition).length > 0 ? extraNutrition : undefined,
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
