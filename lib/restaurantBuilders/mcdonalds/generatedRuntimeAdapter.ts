import generatedMenu from "@/data/restaurants/mcdonalds/generated/restaurant.json";
import type { MenuItem, RestaurantMenu } from "@/types/menu";

export const MCDONALDS_MENU_SECTION_ORDER = [
  "burgers",
  "chicken & fish",
  "mcnuggets & strips",
  "snack wraps",
  "breakfast",
  "fries & sides",
  "happy meals",
  "sweets & treats",
  "mccafé",
  "drinks",
  "sauces & condiments",
] as const;

type McDonaldsPresentationCategory =
  | "Burgers"
  | "Chicken & Fish"
  | "McNuggets & Strips"
  | "Snack Wraps"
  | "Breakfast"
  | "Fries & Sides"
  | "Happy Meals"
  | "Sweets & Treats"
  | "McCafé"
  | "Drinks"
  | "Sauces & Condiments";

function hasCategory(item: MenuItem, value: string): boolean {
  const normalized = value.toLocaleLowerCase("en-US");
  return item.categories.some((category) => category.toLocaleLowerCase("en-US") === normalized);
}

const MARKETING_PREFIX_PATTERN = /^(?:(?:limited time only|now crispier|new)\s+)+/i;
const LEADING_VARIANT_VALUE_PATTERN = /^(?:\d+\s*(?:piece|pc)|extra small|small|medium|large|kids)\s+/i;

export function normalizeMcDonaldsPresentationName(item: MenuItem): string {
  let name = item.name
    .replace(MARKETING_PREFIX_PATTERN, "")
    .replace(/\s*:\s*(?:the\s+)?(?:classic\s+)?mcdonald(?:'|’)?s\b.*$/i, "")
    .replace(/([®™])[*^]+/g, "$1")
    .replace(/([A-Za-z])[*^](?=\s|$)/g, "$1")
    .replace(/[*^]+$/g, "")
    .trim();

  const exposesLeadingValueAsVariant = item.variants?.some((variant) => {
    const label = variant.label.trim();
    const leadingValue = name.match(LEADING_VARIANT_VALUE_PATTERN)?.[0]?.trim();
    return Boolean(leadingValue && label.localeCompare(leadingValue, undefined, { sensitivity: "base" }) === 0);
  });
  if (exposesLeadingValueAsVariant) {
    name = name.replace(LEADING_VARIANT_VALUE_PATTERN, "").trim();
  }

  const snackWrapFlavor = name.match(/^McCrispy®?\s+Strips?\s+(.+?)\s+Snack Wrap®?$/i)?.[1];
  if (snackWrapFlavor) {
    name = `${snackWrapFlavor} Snack Wrap`;
  }

  return name.replace(/\s{2,}/g, " ");
}

function mediumVariantId(item: MenuItem): string | undefined {
  return item.variants?.find((variant) => variant.label.trim().toLocaleLowerCase("en-US") === "medium")?.id;
}

function isCustomizationOnlyBacon(item: MenuItem): boolean {
  return item.servingType === "addon" && /^bacon(?:\s+(?:strip|slice|piece))?s?$/i.test(item.name.trim());
}

function sweetsFamily(item: MenuItem): string {
  const name = item.name.toLocaleLowerCase("en-US");
  if (name.includes("shake")) return "shake";
  if (name.includes("mcflurry")) return "mcflurry";
  if (name.includes("sundae")) return "sundae";
  if (name.includes("pie")) return "pie";
  if (name.includes("cookie")) return "cookie";
  if (name.includes("cone")) return "cone";
  return name;
}

function applyFamilyAwareSweetsOrder(items: MenuItem[]): MenuItem[] {
  const sweets = items.filter((item) => item.categories.includes("Sweets & Treats"));
  const firstOrderByFamily = new Map<string, number>();
  for (const item of sweets) {
    const family = sweetsFamily(item);
    firstOrderByFamily.set(family, Math.min(firstOrderByFamily.get(family) ?? Number.POSITIVE_INFINITY, item.defaultOrder));
  }
  const orderedFamilies = [...firstOrderByFamily].sort((left, right) => left[1] - right[1]).map(([family]) => family);
  const familyPriority = new Map(orderedFamilies.map((family, index) => [family, index]));
  const orderedSweets = [...sweets].sort((left, right) =>
    (familyPriority.get(sweetsFamily(left)) ?? Number.POSITIVE_INFINITY) -
      (familyPriority.get(sweetsFamily(right)) ?? Number.POSITIVE_INFINITY) ||
    left.defaultOrder - right.defaultOrder ||
    left.name.localeCompare(right.name),
  );
  const presentationOrder = new Map(orderedSweets.map((item, index) => [item.id, index]));
  return items.map((item) => presentationOrder.has(item.id) ? { ...item, defaultOrder: presentationOrder.get(item.id)! } : item);
}

function presentationCategoryFor(item: MenuItem): McDonaldsPresentationCategory {
  const name = item.name.toLocaleLowerCase("en-US");

  if (hasCategory(item, "Burgers")) return "Burgers";
  if (hasCategory(item, "Chicken & Fish Sandwiches")) return "Chicken & Fish";
  if (item.categories.some((category) => category.toLocaleLowerCase("en-US").includes("mcnuggets"))) return "McNuggets & Strips";
  if (hasCategory(item, "Snack Wrap®")) return "Snack Wraps";
  if (hasCategory(item, "Breakfast")) return "Breakfast";
  if (hasCategory(item, "Fries & Sides")) return "Fries & Sides";
  if (hasCategory(item, "Happy Meal®")) return "Happy Meals";
  if (hasCategory(item, "Sweets & Treats")) return "Sweets & Treats";
  if (hasCategory(item, "McCafé®")) return "McCafé";
  if (hasCategory(item, "Drinks")) return "Drinks";
  if (hasCategory(item, "Sauces & Condiments")) return "Sauces & Condiments";

  // Official meal-deal and promotional sections are merchandising buckets,
  // not useful browse categories. Route those records to their actual product
  // family while retaining the original category list in source.generated.
  if (/happy meal/.test(name)) return "Happy Meals";
  if (/breakfast|sausage|mcmuffin|mcgriddle|biscuit|bagel|hotcake|burrito/.test(name)) return "Breakfast";
  if (/snack wrap/.test(name)) return "Snack Wraps";
  if (/mcnugget|mccrispy strips/.test(name)) return "McNuggets & Strips";
  if (/mccrispy|mcchicken|filet-o-fish/.test(name)) return "Chicken & Fish";
  if (/big mac|burger|mcdouble|quarter pounder/.test(name)) return "Burgers";
  if (/fries|apple slices|hash brown/.test(name)) return "Fries & Sides";
  if (/coffee|latte|cappuccino|mocha|macchiato|frappé|hot chocolate|americano/.test(name)) return "McCafé";
  if (/coca-cola|coke|sprite|fanta|drink|juice|tea|lemonade|smoothie|shake|refresher|energizer/.test(name)) return "Drinks";
  if (/sauce|packet|condiment|honey/.test(name)) return "Sauces & Condiments";
  if (/mcflurry|sundae|cone|pie/.test(name)) return "Sweets & Treats";

  throw new Error(`Generated McDonald's item ${item.id} has no presentation category.`);
}

function adaptItem(item: MenuItem): MenuItem {
  const category = presentationCategoryFor(item);
  const isPrebuiltMeal = item.servingType === "combo" || item.servingType === "kids";
  const preferredMediumVariantId = mediumVariantId(item);
  return {
    ...item,
    name: normalizeMcDonaldsPresentationName(item),
    categories: [category],
    variants: item.variants?.map((variant) => ({ ...variant, categories: [category] })),
    ...(preferredMediumVariantId ? { defaultVariantId: preferredMediumVariantId } : {}),
    ...(isPrebuiltMeal || isCustomizationOnlyBacon(item) ? { sourceOnly: true } : {}),
  };
}

export const MCDONALDS_GENERATED_RUNTIME_MENU: RestaurantMenu = {
  ...(generatedMenu as unknown as RestaurantMenu),
  items: applyFamilyAwareSweetsOrder((generatedMenu.items as unknown as MenuItem[]).map(adaptItem)),
};
