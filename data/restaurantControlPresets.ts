// Restaurant-owned recommendations for the filter panel's "Main menu"
// action. Values are normalized category ids from each catalog, not UI logic.
export const RESTAURANT_MAIN_MENU_CATEGORIES: Record<string, readonly string[]> = {
  chickfila: ["chicken", "sandwiches", "wraps", "salads", "breakfast"],
  mcdonalds: ["burgers", "chicken & fish sandwiches", "mcnuggets® & mccrispy® strips", "breakfast"],
  starbucks: ["breakfast", "lunch", "protein drinks", "snacks"],
  chipotle: ["entrees", "lifestyle bowls", "kids meals"],
  panera: ["sandwiches", "salads", "soups", "breakfast"],
};
