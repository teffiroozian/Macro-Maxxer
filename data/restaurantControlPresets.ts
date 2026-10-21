// Restaurant-owned recommendations for the filter panel's "Main menu"
// action. Values are normalized category ids from each catalog, not UI logic.
export const RESTAURANT_MAIN_MENU_CATEGORIES: Record<string, readonly string[]> = {
  chickfila: ["chicken", "sandwiches", "wraps", "salads", "breakfast"],
  mcdonalds: ["burgers", "breakfast", "mcnuggets & strips", "chicken & fish", "snack wraps"],
  starbucks: ["breakfast", "lunch", "snacks", "bakery & treats", "protein drinks"],
  chipotle: ["entrees", "lifestyle bowls", "kids meals"],
  panera: ["sandwiches", "salads", "soups", "breakfast"],
};


export type CategoryPresetId = "main" | "food" | "sides" | "drinks" | "coffee" | "matcha" | "refreshers" | "sweets" | "shareables" | "sauces" | "all";
export type RestaurantCategoryPresetDefinition = {
  id: CategoryPresetId;
  label: string;
  categories?: readonly string[];
  tags?: readonly string[];
  source?: "main" | "sides" | "drinks" | "all";
};

export const DEFAULT_CATEGORY_PRESETS: readonly RestaurantCategoryPresetDefinition[] = [
  { id: "main", label: "Main menu", source: "main" },
  { id: "sides", label: "Sides", source: "sides" },
  { id: "drinks", label: "Drinks", source: "drinks" },
  { id: "shareables", label: "Shareables", categories: ["shareables"] },
  { id: "sauces", label: "Sauces", categories: ["sauces"] },
  { id: "all", label: "All items", source: "all" },
];

// Chip order, labels and normalized mappings are restaurant-owned data.
// The filter component renders these definitions without restaurant checks.
export const RESTAURANT_CATEGORY_PRESETS: Record<string, readonly RestaurantCategoryPresetDefinition[]> = {
  chickfila: DEFAULT_CATEGORY_PRESETS.map((preset) => ({
    ...preset,
    ...(preset.id === "drinks" ? { categories: ["beverages", "coffee", "treats"] } : {}),
  })),
  mcdonalds: DEFAULT_CATEGORY_PRESETS.map((preset) => ({
    ...preset,
    ...(preset.id === "drinks" ? { categories: ["drinks", "mccafé", "sweets & treats"] } : {}),
    ...(preset.id === "sauces" ? { categories: ["sauces & condiments"] } : {}),
  })),
  starbucks: [
    { id: "main", label: "Main menu", categories: RESTAURANT_MAIN_MENU_CATEGORIES.starbucks },
    { id: "food", label: "Food", categories: ["breakfast", "lunch", "snacks", "bakery & treats"] },
    { id: "drinks", label: "Drinks", categories: ["protein drinks", "frappuccino", "hot coffee", "iced coffee", "espresso drinks", "tea & chai", "matcha", "refreshers", "other drinks"] },
    { id: "coffee", label: "Coffee", categories: ["hot coffee", "iced coffee", "espresso drinks"] },
    { id: "matcha", label: "Matcha", categories: ["matcha"], tags: ["matcha"] },
    { id: "refreshers", label: "Refreshers", categories: ["refreshers"] },
    { id: "sweets", label: "Sweets", categories: ["bakery & treats"] },
    { id: "all", label: "All items", source: "all" },
  ],
};
