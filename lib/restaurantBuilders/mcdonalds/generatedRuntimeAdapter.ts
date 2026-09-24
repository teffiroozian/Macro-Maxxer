import generatedMenu from "@/data/restaurants/mcdonalds/generated/restaurant.json";
import quarterPounderMealItemPage from "@/data/restaurants/mcdonalds/research/ordering/raw/quarter-pounder-meal-item-page.json";
import quarterPounderCustomizationModel from "@/data/restaurants/mcdonalds/customization/generated/quarter-pounder.json";
import bigMacCustomizationModel from "@/data/restaurants/mcdonalds/customization/generated/big-mac.json";
import cheeseburgerCustomizationModel from "@/data/restaurants/mcdonalds/customization/generated/cheeseburger.json";
import hamburgerCustomizationModel from "@/data/restaurants/mcdonalds/customization/generated/hamburger.json";
import mcDoubleCustomizationModel from "@/data/restaurants/mcdonalds/customization/generated/mcdouble.json";
import doubleCheeseburgerCustomizationModel from "@/data/restaurants/mcdonalds/customization/generated/double-cheeseburger.json";
import dailyDoubleCustomizationModel from "@/data/restaurants/mcdonalds/customization/generated/daily-double.json";
import quarterPounderDeluxeCustomizationModel from "@/data/restaurants/mcdonalds/customization/generated/quarter-pounder-deluxe.json";
import doubleQuarterPounderCustomizationModel from "@/data/restaurants/mcdonalds/customization/generated/double-quarter-pounder.json";
import baconQuarterPounderCustomizationModel from "@/data/restaurants/mcdonalds/customization/generated/bacon-quarter-pounder.json";
import mcCrispyCustomizationModel from "@/data/restaurants/mcdonalds/customization/generated/mccrispy.json";
import deluxeMcCrispyCustomizationModel from "@/data/restaurants/mcdonalds/customization/generated/deluxe-mccrispy.json";
import spicyMcCrispyCustomizationModel from "@/data/restaurants/mcdonalds/customization/generated/spicy-mccrispy.json";
import spicyDeluxeMcCrispyCustomizationModel from "@/data/restaurants/mcdonalds/customization/generated/spicy-deluxe-mccrispy.json";
import mcChickenCustomizationModel from "@/data/restaurants/mcdonalds/customization/generated/mcchicken.json";
import filetOFishCustomizationModel from "@/data/restaurants/mcdonalds/customization/generated/filet-o-fish.json";
import type { ComboMealChoiceOption, MenuItem, RestaurantMenu } from "@/types/menu";
import { buildMcDonaldsItemCustomization } from "./customizationIngredients";
import { buildMcDonaldsSauceSelection } from "./sauceSelection";
import { buildMcDonaldsRemainingSafeCustomization } from "./remainingSafeCustomization";
import type { McDonaldsCustomizationModel } from "./customization";

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
    .replace(/^McCafé(?:®)?\s*/i, "")
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

// Ordering-option customization models are generated per-item (see
// scripts/importers/mcdonalds-customization.ts) from captured live ordering
// data — only items with a captured model here render remove/extra/add
// controls; every other McDonald's item keeps showing the plain,
// non-customizable item view.
const CUSTOMIZATION_MODELS_BY_ITEM_ID: Record<string, McDonaldsCustomizationModel> = {
  "mcd-item-200463": bigMacCustomizationModel as unknown as McDonaldsCustomizationModel,
  "mcd-item-200466": quarterPounderCustomizationModel as unknown as McDonaldsCustomizationModel,
  "mcd-item-200480": cheeseburgerCustomizationModel as unknown as McDonaldsCustomizationModel,
  "mcd-item-200477": hamburgerCustomizationModel as unknown as McDonaldsCustomizationModel,
  "mcd-item-200491": mcDoubleCustomizationModel as unknown as McDonaldsCustomizationModel,
  "mcd-item-200486": doubleCheeseburgerCustomizationModel as unknown as McDonaldsCustomizationModel,
  "mcd-item-200497": dailyDoubleCustomizationModel as unknown as McDonaldsCustomizationModel,
  "mcd-item-200765": quarterPounderDeluxeCustomizationModel as unknown as McDonaldsCustomizationModel,
  "mcd-item-200476": doubleQuarterPounderCustomizationModel as unknown as McDonaldsCustomizationModel,
  "mcd-item-203410": baconQuarterPounderCustomizationModel as unknown as McDonaldsCustomizationModel,
  "mcd-item-203747": mcCrispyCustomizationModel as unknown as McDonaldsCustomizationModel,
  "mcd-item-203745": deluxeMcCrispyCustomizationModel as unknown as McDonaldsCustomizationModel,
  "mcd-item-203901": spicyMcCrispyCustomizationModel as unknown as McDonaldsCustomizationModel,
  "mcd-item-203873": spicyDeluxeMcCrispyCustomizationModel as unknown as McDonaldsCustomizationModel,
  "mcd-item-200438": mcChickenCustomizationModel as unknown as McDonaldsCustomizationModel,
  "mcd-item-200445": filetOFishCustomizationModel as unknown as McDonaldsCustomizationModel,
};

const REMAINING_SAFE_CUSTOMIZATION = buildMcDonaldsRemainingSafeCustomization();

const CUSTOMIZATION_DATA_BY_ITEM_ID = Object.fromEntries(
  Object.entries(CUSTOMIZATION_MODELS_BY_ITEM_ID).map(([itemId, model]) => [
    itemId,
    buildMcDonaldsItemCustomization(model, itemId),
  ]),
);

const MCDONALDS_CUSTOMIZATION_INGREDIENTS = Object.values(CUSTOMIZATION_DATA_BY_ITEM_ID).flatMap(
  (data) => data.ingredients,
);

const MCDONALDS_CUSTOMIZATION_CATEGORY_RULES = Object.assign(
  {},
  ...Object.values(CUSTOMIZATION_DATA_BY_ITEM_ID).map((data) => data.categoryRules),
);

const MCDONALDS_SAUCE_SELECTION = buildMcDonaldsSauceSelection(
  generatedMenu.items as unknown as MenuItem[],
);

type CapturedMealOption = { id: string; name: string };
type CapturedMealGroup = {
  id: string;
  name: string;
  isOptional: boolean;
  minNumOptions: number;
  maxNumOptions: number;
  options: CapturedMealOption[];
  flattenedDefaultNodes: Array<{ id: string }>;
};

const capturedMealGroups = (quarterPounderMealItemPage as unknown as {
  data: { itemPage: { optionLists: CapturedMealGroup[] } };
}).data.itemPage.optionLists;

function capturedMealGroup(name: string) {
  const group = capturedMealGroups.find((candidate) => candidate.name === name);
  if (!group) throw new Error(`Missing captured Quarter Pounder meal group: ${name}`);
  return group;
}

const sizeSourceGroup = capturedMealGroup("Select Size");
const sideSourceGroup = capturedMealGroup("Select Side");
const drinkSourceGroup = capturedMealGroup("Select Drink");

// This table reconciles DoorDash choice identities to existing Macro Maxxer
// catalog identities only. Nutrition, images, names, and variants always
// resolve from the generated McDonald's menu records.
const QUARTER_POUNDER_DRINK_CATALOG_MATCHES: Record<string, Omit<ComboMealChoiceOption, "orderingOptionId">> = {
  "23640085807": { itemId: "mcd-item-200611", variantIdByMealSize: { medium: "mcd-item-200639", large: "mcd-item-200632" } },
  "23640085809": { itemId: "mcd-item-200612", variantIdByMealSize: { medium: "mcd-item-200642", large: "mcd-item-200641" } },
  "23640085810": { itemId: "mcd-item-200613", variantIdByMealSize: { medium: "mcd-item-200648", large: "mcd-item-200647" } },
  "23640085812": { itemId: "mcd-item-203057", variantIdByMealSize: { medium: "mcd-item-203058", large: "mcd-item-203063" } },
  "31580225291": { itemId: "mcd-item-203957", variantIdByMealSize: { medium: "mcd-item-203958", large: "mcd-item-203962" } },
  "23640085811": { itemId: "mcd-item-200614", variantIdByMealSize: { medium: "mcd-item-200645", large: "mcd-item-200644" } },
  "23640085814": { itemId: "mcd-item-200627", variantIdByMealSize: { medium: "mcd-item-200630", large: "mcd-item-200676" } },
  "23640085808": { itemId: "mcd-item-200615", variantIdByMealSize: { medium: "mcd-item-200674", large: "mcd-item-200668" } },
  "23640085815": { itemId: "mcd-item-200626", variantIdByMealSize: { medium: "mcd-item-200662", large: "mcd-item-200661" } },
  "29982621578": { itemId: "mcd-item-200609" },
  "23640085823": { itemId: "mcd-item-203082" },
  "23640085829": { itemId: "mcd-item-200607" },
  "51204408578": { itemId: "mcd-item-204630" },
  "51204408579": { itemId: "mcd-item-204626" },
  "53478195858": { itemId: "mcd-item-204716" },
  "53478195859": { itemId: "mcd-item-204717" },
  "53478195860": { itemId: "mcd-item-204709" },
  "53478195861": { itemId: "mcd-item-204498" },
  "53478195862": { itemId: "mcd-item-204688" },
  "53478195863": { itemId: "mcd-item-204484" },
  "53478195864": { itemId: "mcd-item-204702" },
  "51325441991": { itemId: "mcd-item-204586", fixedVariantId: "mcd-item-204585" },
  "51325441992": { itemId: "mcd-item-204589", fixedVariantId: "mcd-item-204588" },
  "51325441993": { itemId: "mcd-item-204623", fixedVariantId: "mcd-item-204622" },
  "51204408577": { itemId: "mcd-item-204452" },
  "53478195853": { itemId: "mcd-item-204695", fixedVariantId: "mcd-item-204687" },
  "53478195854": { itemId: "mcd-item-204697", fixedVariantId: "mcd-item-204685" },
  "53478195855": { itemId: "mcd-item-204693", fixedVariantId: "mcd-item-204698" },
  "53478195856": { itemId: "mcd-item-204691", fixedVariantId: "mcd-item-204699" },
  "31580227292": { itemId: "mcd-item-203967", variantIdByMealSize: { medium: "mcd-item-203965", large: "mcd-item-203963" } },
  "35164966948": { itemId: "mcd-item-203964", variantIdByMealSize: { medium: "mcd-item-203966", large: "mcd-item-203961" } },
  "51971957409": { itemId: "mcd-item-204205", fixedVariantId: "mcd-item-204210" },
  "51971957410": { itemId: "mcd-item-200123", fixedVariantId: "mcd-item-200602" },
  "51971957411": { itemId: "mcd-item-204219", fixedVariantId: "mcd-item-204203" },
  "51971957412": { itemId: "mcd-item-200591", fixedVariantId: "mcd-item-200590" },
  "51971957414": { itemId: "mcd-item-200223", fixedVariantId: "mcd-item-200209" },
  "51971957415": { itemId: "mcd-item-200333", fixedVariantId: "mcd-item-200227" },
  "51971957416": { itemId: "mcd-item-204189", fixedVariantId: "mcd-item-200336" },
  "51971957418": { itemId: "mcd-item-203275", fixedVariantId: "mcd-item-203098" },
  "23640085817": { itemId: "mcd-item-200020", fixedVariantId: "mcd-item-200543" },
  "23640085818": { itemId: "mcd-item-201038", fixedVariantId: "mcd-item-201459" },
  "51971957419": { itemId: "mcd-item-200358", fixedVariantId: "mcd-item-200484" },
  "51971957420": { itemId: "mcd-item-204209", fixedVariantId: "mcd-item-204216" },
  "51971957421": { itemId: "mcd-item-200706", fixedVariantId: "mcd-item-200707" },
  "51971957422": { itemId: "mcd-item-204208", fixedVariantId: "mcd-item-204191" },
  "51971957423": { itemId: "mcd-item-202961" },
  "51971957424": { itemId: "mcd-item-200162", fixedVariantId: "mcd-item-200537" },
  "51971957425": { itemId: "mcd-item-200500", fixedVariantId: "mcd-item-200501" },
  "51971957427": { itemId: "mcd-item-200186", fixedVariantId: "mcd-item-200185" },
  "51971957428": { itemId: "mcd-item-200390", fixedVariantId: "mcd-item-200389" },
  "23640085828": { itemId: "mcd-item-200610", fixedVariantId: "mcd-item-201352" },
  "29982629327": { itemId: "mcd-item-200149", fixedVariantId: "mcd-item-200564" },
  "29982617367": { itemId: "mcd-item-200148", fixedVariantId: "mcd-item-200562" },
  "29982629326": { itemId: "mcd-item-200107", fixedVariantId: "mcd-item-200052" },
  "29982637294": { itemId: "mcd-item-200108", fixedVariantId: "mcd-item-200623" },
  "29982625808": { itemId: "mcd-item-202274", fixedVariantId: "mcd-item-202282" },
  "29982641645": { itemId: "mcd-item-201971", fixedVariantId: "mcd-item-201972" },
  "29982641644": { itemId: "mcd-item-201248", fixedVariantId: "mcd-item-200663" },
  "29982624629": { itemId: "mcd-item-202116", fixedVariantId: "mcd-item-202115" },
  "51971957429": { itemId: "mcd-item-203087", fixedVariantId: "mcd-item-203087" },
  "51971957426": { itemId: "mcd-item-200181", fixedVariantId: "mcd-item-200181" },
  "29982622374": { itemId: "mcd-item-200109", fixedVariantId: "mcd-item-200622" },
  "29982639186": { itemId: "mcd-item-200152", fixedVariantId: "mcd-item-200566" },
  "29982641256": { itemId: "mcd-item-200155", fixedVariantId: "mcd-item-200547" },
};

const QUARTER_POUNDER_MEAL_CONFIG = {
  entreeItemId: "mcd-item-200466",
  sizeGroup: {
    orderingGroupId: sizeSourceGroup.id,
    defaultOrderingOptionIds: sizeSourceGroup.flattenedDefaultNodes.map((option) => option.id),
    required: !sizeSourceGroup.isOptional,
    minSelections: sizeSourceGroup.minNumOptions,
    maxSelections: sizeSourceGroup.maxNumOptions,
    options: sizeSourceGroup.options.map((option) => ({
      id: option.name.toLowerCase() as "medium" | "large",
      label: option.name,
      orderingOptionId: option.id,
    })),
  },
  sideGroup: {
    orderingGroupId: sideSourceGroup.id,
    defaultOrderingOptionIds: sideSourceGroup.flattenedDefaultNodes.map((option) => option.id),
    required: !sideSourceGroup.isOptional,
    minSelections: sideSourceGroup.minNumOptions,
    maxSelections: sideSourceGroup.maxNumOptions,
    options: [
      {
        itemId: "mcd-item-200066",
        orderingOptionId: sideSourceGroup.options[0].id,
        variantIdByMealSize: { medium: "mcd-item-201234", large: "mcd-item-200083" },
      },
    ],
  },
  drinkGroup: {
    orderingGroupId: drinkSourceGroup.id,
    defaultOrderingOptionIds: drinkSourceGroup.flattenedDefaultNodes.map((option) => option.id),
    required: !drinkSourceGroup.isOptional,
    minSelections: drinkSourceGroup.minNumOptions,
    maxSelections: drinkSourceGroup.maxNumOptions,
    options: drinkSourceGroup.options.flatMap((option) => {
      const catalogMatch = QUARTER_POUNDER_DRINK_CATALOG_MATCHES[option.id];
      return catalogMatch ? [{ ...catalogMatch, orderingOptionId: option.id }] : [];
    }),
  },
} satisfies NonNullable<MenuItem["comboConfig"]>;

// The captured lunch/dinner meal groups are shared only with ordinary
// entree + fries + drink meal records whose component graph resolves to one
// standalone entree. Keep the list explicit: nuggets are count-dependent,
// snack-wrap meals contain multiple entrees, and breakfast/Happy Meal/deal
// bundles have different structures that have not been captured yet.
//
// Each id below is backed by a source-only official meal record in the
// generated catalog. The group and option identities remain the real ids
// from the captured ordering response; catalog ids below continue to supply
// display names, images, variants, and nutrition.
export const MCDONALDS_STANDARD_COMBO_ENTREE_IDS = [
  "mcd-item-204386", // 3-piece McCrispy Strips
  "mcd-item-203410", // Bacon Quarter Pounder with Cheese
  "mcd-item-200463", // Big Mac
  "mcd-item-200480", // Cheeseburger
  "mcd-item-203745", // Deluxe McCrispy
  "mcd-item-200765", // Quarter Pounder with Cheese Deluxe
  "mcd-item-200476", // Double Quarter Pounder with Cheese
  "mcd-item-200445", // Filet-O-Fish
  "mcd-item-203747", // McCrispy
  "mcd-item-200466", // Quarter Pounder with Cheese
  "mcd-item-203873", // Spicy Deluxe McCrispy
  "mcd-item-203901", // Spicy McCrispy
] as const;

const STANDARD_COMBO_ENTREE_IDS = new Set<string>(MCDONALDS_STANDARD_COMBO_ENTREE_IDS);

export const MCDONALDS_BREAKFAST_COMBO_ENTREE_IDS = [
  "mcd-item-200424", // Bacon, Egg & Cheese Bagel
  "mcd-item-200300", // Bacon, Egg & Cheese Biscuit
  "mcd-item-200304", // Bacon, Egg & Cheese McGriddles
  "mcd-item-200298", // Egg McMuffin
  "mcd-item-200302", // Sausage Biscuit with Egg
  "mcd-item-200267", // Sausage Burrito
  "mcd-item-200307", // Sausage, Egg & Cheese McGriddles
  "mcd-item-200306", // Sausage McGriddles
  "mcd-item-200161", // Sausage McMuffin with Egg
  "mcd-item-200145", // Steak, Egg & Cheese Bagel
] as const;

const BREAKFAST_COMBO_ENTREE_IDS = new Set<string>(MCDONALDS_BREAKFAST_COMBO_ENTREE_IDS);

function standardComboConfig(entreeItemId: string): NonNullable<MenuItem["comboConfig"]> {
  return { ...QUARTER_POUNDER_MEAL_CONFIG, entreeItemId };
}

const ADULT_MCNUGGETS_MEAL_CONFIG: NonNullable<MenuItem["comboConfig"]> = {
  ...standardComboConfig("mcd-item-200692"),
  mealItemIdByEntreeVariantId: {
    "mcd-item-200567": "mcd-item-200734", // captured 10-piece adult meal
  },
};

const HAPPY_MEAL_TOY: MenuItem = {
  id: "mcd-happy-meal-toy",
  name: "Happy Meal Toy",
  image: "none",
  categories: ["Happy Meals"],
  servingType: "addon",
  nutrition: { calories: 0, protein: 0, carbs: 0, totalFat: 0 },
  defaultOrder: Number.MAX_SAFE_INTEGER,
  sourceOnly: true,
  source: { menu: { tags: [], pins: [] }, generated: {
    provider: "McDonald's",
    menu: { role: "non_nutrition_bundle_component", capturedOrderingId: null },
  } },
};

const HAPPY_MEAL_DRINK_OPTIONS = [
  { itemId: "mcd-item-200610" },
  { itemId: "mcd-item-200607" },
  { itemId: "mcd-item-200609" },
  { itemId: "mcd-item-203082" },
];

function happyMealConfig(entreeItemId: string, mealItemId: string): NonNullable<MenuItem["comboConfig"]> {
  const bundleId = `mcd-happy-bundle-${mealItemId.replace("mcd-item-", "")}`;
  return {
    entreeItemId,
    drinkGroup: {
      required: true,
      minSelections: 1,
      maxSelections: 1,
      options: HAPPY_MEAL_DRINK_OPTIONS,
    },
    bundleOptions: [{
      id: bundleId,
      label: "Kids Fries + Apple Slices + Happy Meal Toy",
      mealItemId,
      components: [
        { itemId: "mcd-item-200066", variantId: "mcd-item-200092", role: "included-side" },
        { itemId: "mcd-item-200068", role: "included-side" },
        { itemId: "mcd-happy-meal-toy", role: "non-nutrition" },
      ],
    }],
    defaultBundleId: bundleId,
  };
}

const FIXED_DEAL_CONFIGS: Record<string, NonNullable<MenuItem["comboConfig"]>> = {
  "mcd-item-200438": fixedDealConfig("mcd-item-200438", "mcd-item-204350", [
    { itemId: "mcd-item-200692", role: "included-entree" },
    { itemId: "mcd-item-200066", role: "included-side" },
    { itemId: "mcd-item-201677", role: "included-drink" },
  ]),
  "mcd-item-200491": fixedDealConfig("mcd-item-200491", "mcd-item-204349", [
    { itemId: "mcd-item-200692", role: "included-entree" },
    { itemId: "mcd-item-200066", role: "included-side" },
    { itemId: "mcd-item-201677", role: "included-drink" },
  ]),
  "mcd-item-200301": fixedDealConfig("mcd-item-200301", "mcd-item-204650", [
    { itemId: "mcd-item-200340", role: "included-side" },
    { itemId: "mcd-item-200020", role: "included-drink" },
  ]),
  "mcd-item-200449": fixedDealConfig("mcd-item-200449", "mcd-item-204651", [
    { itemId: "mcd-item-200340", role: "included-side" },
    { itemId: "mcd-item-200020", role: "included-drink" },
  ]),
};

function fixedDealConfig(
  entreeItemId: string,
  mealItemId: string,
  components: NonNullable<NonNullable<MenuItem["comboConfig"]>["bundleOptions"]>[number]["components"],
): NonNullable<MenuItem["comboConfig"]> {
  const bundleId = `mcd-fixed-deal-${mealItemId.replace("mcd-item-", "")}`;
  return {
    entreeItemId,
    bundleOptions: [{
      id: bundleId,
      label: "Fixed Deal Bundle",
      mealItemId,
      components,
    }],
    defaultBundleId: bundleId,
  };
}

const SNACK_WRAP_BUNDLE_OPTIONS = {
  ranchDouble: {
    id: "mcd-bundle-204409",
    label: "2 Ranch Snack Wraps",
    mealItemId: "mcd-item-204409",
    components: [{ itemId: "mcd-item-204408", role: "included-entree" }],
  },
  spicyDouble: {
    id: "mcd-bundle-204410",
    label: "2 Spicy Snack Wraps",
    mealItemId: "mcd-item-204410",
    components: [{ itemId: "mcd-item-204407", role: "included-entree" }],
  },
  mixedFromRanch: {
    id: "mcd-bundle-204406-ranch",
    label: "1 Ranch + 1 Spicy Snack Wrap",
    mealItemId: "mcd-item-204406",
    components: [{ itemId: "mcd-item-204402", role: "included-entree" }],
  },
  mixedFromSpicy: {
    id: "mcd-bundle-204406-spicy",
    label: "1 Ranch + 1 Spicy Snack Wrap",
    mealItemId: "mcd-item-204406",
    components: [{ itemId: "mcd-item-204401", role: "included-entree" }],
  },
} as const;

function snackWrapComboConfig(entreeItemId: "mcd-item-204401" | "mcd-item-204402"): NonNullable<MenuItem["comboConfig"]> {
  const ranch = entreeItemId === "mcd-item-204401";
  const bundleOptions = ranch
    ? [SNACK_WRAP_BUNDLE_OPTIONS.ranchDouble, SNACK_WRAP_BUNDLE_OPTIONS.mixedFromRanch]
    : [SNACK_WRAP_BUNDLE_OPTIONS.spicyDouble, SNACK_WRAP_BUNDLE_OPTIONS.mixedFromSpicy];
  return {
    ...standardComboConfig(entreeItemId),
    bundleOptions: bundleOptions.map((option) => ({ ...option, components: option.components.map((component) => ({ ...component })) })),
    defaultBundleId: bundleOptions[0].id,
  };
}

function breakfastComboConfig(entreeItemId: string): NonNullable<MenuItem["comboConfig"]> {
  return {
    entreeItemId,
    sideOptions: ["mcd-item-200340"],
    drinkOptions: ["mcd-item-200020"],
    defaultSideId: "mcd-item-200340",
    defaultDrinkId: "mcd-item-200020",
  };
}

function withFixedComponents(
  baseConfig: NonNullable<MenuItem["comboConfig"]>,
  mealItemId: string,
  label: string,
  components: NonNullable<NonNullable<MenuItem["comboConfig"]>["bundleOptions"]>[number]["components"],
): NonNullable<MenuItem["comboConfig"]> {
  const bundleId = `mcd-fixed-component-${mealItemId.replace("mcd-item-", "")}`;
  return {
    ...baseConfig,
    bundleOptions: [{ id: bundleId, label, mealItemId, components }],
    defaultBundleId: bundleId,
  };
}

function adaptItem(item: MenuItem): MenuItem {
  const category = presentationCategoryFor(item);
  const isPrebuiltMeal = item.servingType === "combo" || item.servingType === "kids";
  const preferredMediumVariantId = mediumVariantId(item);
  const customizationData = CUSTOMIZATION_DATA_BY_ITEM_ID[item.id];
  const remainingSafeCustomization = REMAINING_SAFE_CUSTOMIZATION.byItemId[item.id];
  return {
    ...item,
    // Prebuilt meal records are relationship/provenance records, not the UI
    // configuration itself. Removing their partial component-only config
    // prevents unsupported families from accidentally rendering an empty
    // generic combo builder through resolveLinkedComboConfig.
    ...(isPrebuiltMeal ? {
      comboConfig: item.id === "mcd-item-200720" ? QUARTER_POUNDER_MEAL_CONFIG : undefined,
    } : {}),
    name: normalizeMcDonaldsPresentationName(item),
    categories: [category],
    variants: item.variants?.map((variant) => ({ ...variant, categories: [category] })),
    ...(preferredMediumVariantId ? { defaultVariantId: preferredMediumVariantId } : {}),
    ...(isPrebuiltMeal || isCustomizationOnlyBacon(item) ? { sourceOnly: true } : {}),
    ...(STANDARD_COMBO_ENTREE_IDS.has(item.id) ? { comboConfig: standardComboConfig(item.id) } : {}),
    ...(BREAKFAST_COMBO_ENTREE_IDS.has(item.id) ? { comboConfig: breakfastComboConfig(item.id) } : {}),
    ...(item.id === "mcd-item-203745" ? {
      comboConfig: withFixedComponents(standardComboConfig(item.id), "mcd-item-204364", "Apple Pie", [
        { itemId: "mcd-item-200007", role: "included-dessert" },
      ]),
    } : {}),
    ...(item.id === "mcd-item-200480" ? {
      comboConfig: withFixedComponents(standardComboConfig(item.id), "mcd-item-203451", "Second Cheeseburger", [
        { itemId: "mcd-item-204268", role: "included-entree" },
      ]),
    } : {}),
    ...(item.id === "mcd-item-200267" ? {
      comboConfig: withFixedComponents(breakfastComboConfig(item.id), "mcd-item-200716", "Second Sausage Burrito", [
        { itemId: "mcd-item-204339", role: "included-entree" },
      ]),
    } : {}),
    ...(item.id === "mcd-item-200692" ? {
      comboConfigByVariantId: {
        "mcd-item-200692": happyMealConfig("mcd-item-200692", "mcd-item-203634"),
        "mcd-item-200574": happyMealConfig("mcd-item-200692", "mcd-item-203635"),
        "mcd-item-200567": ADULT_MCNUGGETS_MEAL_CONFIG,
      },
      comboConfig: undefined,
    } : {}),
    ...(item.id === "mcd-item-200477" ? { comboConfig: happyMealConfig("mcd-item-200477", "mcd-item-203633") } : {}),
    ...(FIXED_DEAL_CONFIGS[item.id] ? { comboConfig: FIXED_DEAL_CONFIGS[item.id] } : {}),
    ...(item.id === "mcd-item-204401" || item.id === "mcd-item-204402"
      ? { comboConfig: snackWrapComboConfig(item.id) }
      : {}),
    ...(customizationData
      ? { ingredients: customizationData.itemIngredientIds, customization: customizationData.itemCustomization }
      : remainingSafeCustomization
        ? { ingredients: remainingSafeCustomization.ingredients, customization: remainingSafeCustomization.customization }
      : {}),
    ...((item.id === "mcd-item-200692" || item.id === "mcd-item-204386")
      ? { customizationByVariantId: MCDONALDS_SAUCE_SELECTION.customizationByVariantId }
      : {}),
  };
}

export const MCDONALDS_GENERATED_RUNTIME_MENU: RestaurantMenu = {
  ...(generatedMenu as unknown as RestaurantMenu),
  items: [...applyFamilyAwareSweetsOrder((generatedMenu.items as unknown as MenuItem[]).map(adaptItem)), HAPPY_MEAL_TOY],
  ingredients: [
    ...((generatedMenu as unknown as RestaurantMenu).ingredients ?? []),
    ...MCDONALDS_CUSTOMIZATION_INGREDIENTS,
    ...MCDONALDS_SAUCE_SELECTION.ingredients,
    ...REMAINING_SAFE_CUSTOMIZATION.ingredients,
  ],
  customizationRules: {
    ...(generatedMenu as unknown as RestaurantMenu).customizationRules,
    ingredientCategories: {
      ...(generatedMenu as unknown as RestaurantMenu).customizationRules?.ingredientCategories,
      ...MCDONALDS_CUSTOMIZATION_CATEGORY_RULES,
      ...MCDONALDS_SAUCE_SELECTION.categoryRules,
      ...REMAINING_SAFE_CUSTOMIZATION.categoryRules,
    },
  },
};
