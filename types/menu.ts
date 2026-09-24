import type { RestaurantBuilderConfig } from "@/types/builder";
import type { Nutrition } from "@/types/nutrition";

export type ServingType = "addon" | "breakfast" | "combo" | "dessert" | "drink" | "entree" | "kids" | "shareable" | "side" | "single";

// Editorial/merchandising status shown as a badge on the menu card. Distinct
// from ComparativeLabelKind (lib/menuSections/comparativeLabels.ts), which is
// computed from nutrition data rather than stored on the item.
export type MenuItemStatus = "new" | "limited-time" | "seasonal" | "returning";

// Some restaurant ordering systems reuse one visible ingredient identity while
// selecting a different official nutrition unit from the parent relationship.
// The source tag remains implementation metadata; it is not a user-facing
// portion/variant label.
export type IngredientRelationshipNutrition = {
  nutrition: Nutrition;
  source: {
    sourceType: "ordering_system";
    sourceId: string;
    sourceUrl: string;
    retailModifiedItemId: string;
    tag: string;
    servingWeight: {
      amount: number;
      unit: string;
    } | null;
  };
};

export type IngredientNutritionContexts = Record<
  string,
  IngredientRelationshipNutrition
>;

export type SourceProvenanceValue =
  | string
  | number
  | boolean
  | null
  | SourceProvenanceValue[]
  | { [key: string]: SourceProvenanceValue | undefined };

export type GeneratedMenuSourceIdentity = {
  provider: string;
  restaurantId?: string | number;
  menu: {
    itemIds?: string[];
    itemType?: string;
    itemCategory?: string;
    role?: string;
    [key: string]: SourceProvenanceValue | undefined;
  };
  nutrition?: {
    method?: string;
    [key: string]: SourceProvenanceValue | undefined;
  };
  [key: string]: SourceProvenanceValue | undefined;
};

export type MenuSourceIdentity = {
  menu: {
    tags: string[];
    pins: string[];
  };
  // Generated restaurants retain their complete source trace here. Keeping
  // this separate from the stable runtime menu identity means consumers
  // that only need tags/pins remain restaurant-agnostic.
  generated?: GeneratedMenuSourceIdentity;
};

// item variants allow for different versions of the same base item, 
// e.g. 8pc vs 10pc nuggets, small vs medium fries
export type ItemVariant = {
  id: string;
  label: string;
  image?: string;
  nutrition: Nutrition;
  nutritionMultiplier?: number;
  categories: string[];
  servingType?: ServingType;
  source?: MenuSourceIdentity;
  // Presentation-only variant families can span several generated source
  // records. The selected variant remains the generated variant/record id,
  // while this points at the canonical generated parent record persisted in
  // carts and used for strict catalog lookup.
  canonicalItemId?: string;
  // Parent-variant -> ingredient nutrition selected by an official source tag.
  ingredientNutritionContexts?: IngredientNutritionContexts;
};

// group of extra items that can be added to a menu item
// e.g. dipping sauces, dressings
export type AddonGroup = {
  label: string;
  itemIds: string[];
  maxPerItem?: number;
};

export type RestaurantAddonGroups = Record<string, AddonGroup>;

export type ComboMealChoiceOption = {
  itemId: string;
  orderingOptionId?: string;
  fixedVariantId?: string;
  variantIdByMealSize?: Partial<Record<"medium" | "large", string>>;
  // Restricts a parent item to the concrete source variants that may be
  // selected for this meal. The cart still stores both identities.
  allowedVariantIds?: string[];
};

export type ComboMealChoiceGroup = {
  orderingGroupId?: string;
  defaultOrderingOptionIds?: string[];
  required: boolean;
  minSelections: number;
  maxSelections: number;
  options: ComboMealChoiceOption[];
};

export type ComboMealSizeGroup = {
  orderingGroupId: string;
  defaultOrderingOptionIds?: string[];
  required: boolean;
  minSelections: number;
  maxSelections: number;
  options: Array<{
    id: "medium" | "large";
    label: string;
    orderingOptionId: string;
  }>;
};

export type ComboMealBundleComponentRole =
  | "included-entree"
  | "included-side"
  | "included-drink"
  | "included-dessert"
  | "non-nutrition";

export type ComboMealBundleComponent = {
  itemId: string;
  variantId?: string;
  role: ComboMealBundleComponentRole;
};

// formal combo meal configuration for menu items that can be ordered as a meal.
// IDs refer to MenuItem.id values from the same RestaurantMenu unless otherwise noted.
export type ComboMealConfig = {
  // entree that anchors the combo; defaults to the containing MenuItem.id when omitted.
  entreeItemId?: string;
  // Some canonical items expose several source variants but only specific
  // variants have a captured meal record. The map keeps meal routing tied to
  // the selected source variant rather than treating the parent as eligible.
  mealItemIdByEntreeVariantId?: Record<string, string>;
  // Distinct captured multi-entree bundles available from the same anchor.
  // Included items are required meal components, never side/add-on choices.
  bundleOptions?: Array<{
    id: string;
    label: string;
    mealItemId: string;
    components: ComboMealBundleComponent[];
  }>;
  defaultBundleId?: string;
  // fixed items included with the combo in addition to configurable side/drink selections.
  includedItemIds?: string[];
  sizeGroup?: ComboMealSizeGroup;
  // Variant-aware component groups used by current combo integrations.
  sideGroup?: ComboMealChoiceGroup;
  drinkGroup?: ComboMealChoiceGroup;
  // Legacy flat fields remain for existing restaurant integrations.
  // selectable side MenuItem IDs. When omitted, legacy restaurant/category rules may supply options.
  sideOptions?: string[];
  // selectable drink MenuItem IDs. When omitted, legacy restaurant/category rules may supply options.
  drinkOptions?: string[];
  // default selected side MenuItem ID.
  defaultSideId?: string;
  // default selected drink MenuItem ID.
  defaultDrinkId?: string;
  // optional upgrade MenuItem IDs such as premium sides, larger drinks, or add-ons.
  upgradeOptions?: string[];
};
export type ResolvedAddonGroup = AddonGroup & {
  items: MenuItem[];
};

export type ResolvedAddonGroups = Record<string, ResolvedAddonGroup>;

// ingredient item categories
// e.g. Cheese (includes american cheese, pepper jack, swiss)
export type IngredientItemCategory = {
  name: string;
  // Stable internal identity for this category, distinct from the
  // user-facing `name`. Generated data uses this when the same display
  // name (e.g. "Bread Carriers") legitimately recurs across many items but
  // each occurrence needs its own restaurant-level max-quantity/allowNone
  // rule (see RestaurantCustomizationRules.ingredientCategories) — the id,
  // not the display name, is the map key in that case. Optional: hand
  // -authored restaurant data has no need for it since names are already
  // unique there.
  id?: string;
  ingredients: string[];
  // lets choose allow none or remove from item altogether
  allowNone: boolean;
};

// can override the ingredients customizatin of an item
export type ItemCustomizationOverride = {
  // custom ingredient groups
  ingredientCategories?: IngredientItemCategory[];
  // disable customziation
  disabled?: boolean;
};

// rules for what ingredient groups and item should show per item
export type FoodCategoryRule = {
  // categories groups for an item (e.g. Sandwich: cheese, buns, protein, toppings)
  ingredientCategories: string[];
  // ingredient items of a category for an item (e.g. Salad: protein [nuggets, grilled fillet], )
  ingredientOptionsByCategory?: Partial<Record<string, string[]>>;
};

// custom rules for ingredients for food items
export type IngredientCategoryRule = {
  // Minimum number of selections required from this category (e.g. a
  // build-your-own format that requires at least one dip/side choice).
  // Omit for categories with no minimum.
  minQuantity?: number;
  maxQuantity?: number;
  allowNone?: boolean;
};

// restaurant customization rules
export type RestaurantCustomizationRules = {
  foodCategories?: Record<string, FoodCategoryRule>;
  ingredientCategories?: Record<string, IngredientCategoryRule>;
};

// represents one menu item
export type MenuItem = {
  id: string;
  name: string;
  image: string;

  // a single item can have multiple categories
  categories: string[];
  servingType: ServingType;
  // explicit combo data for items that can be configured as combo meals.
  comboConfig?: ComboMealConfig;
  comboConfigByVariantId?: Record<string, ComboMealConfig>;
  // Source ordering identity carried by resolved combo-only clones. It is
  // not used to identify the nutrition catalog item.
  comboOrdering?: {
    groupId: string;
    optionId: string;
    mealSizeOptionIdByVariantId?: Record<string, string>;
    mealSizeGroupId?: string;
  };
  // for build your own item
  entreeGroup?: string;

  nutrition: Nutrition;
  source?: MenuSourceIdentity;

  ingredientRef?: string;
  ingredients?: string[];
  // Default components that are part of the product's composition but are
  // informational only in customization (for example, the fixed chicken
  // filet in a sandwich). They appear in Included and contribute no delta
  // unless the source later exposes a real editable relationship.
  informationalIngredients?: Array<{
    id: string;
    label: string;
  }>;
  proteinExtraByVariantId?: Record<string, string>;

  variants?: ItemVariant[];
  // Source of truth for default variant selection; falls back to the first variant when missing or invalid.
  defaultVariantId?: string;
  // When the variant dimension is a single-component choice (e.g. a cheese
  // swap) rather than a size/count/portion difference, this labels the
  // variant selector accordingly ("Cheese") instead of the generic default.
  // Omit for ordinary size/count/portion variant groups.
  variantGroupKind?: "component";
  variantGroupLabel?: string;

  addonRefs?: string[];
  addonEligible?: boolean;
  // A canonical menu/addon record that is also intentionally referenced by
  // ingredient customization state. This avoids duplicating one official
  // source record across the menu-item and ingredient collections.
  ingredientEligible?: boolean;

  customization?: ItemCustomizationOverride;
  // Variant-specific ordering groups for families whose modifier cardinality
  // changes with size/count (for example McNuggets sauce slots).
  customizationByVariantId?: Record<string, ItemCustomizationOverride>;

  // Parent-item -> ingredient nutrition selected by an official source tag.
  ingredientNutritionContexts?: IngredientNutritionContexts;

  defaultOrder: number;

  hideVariantSelector?: boolean;
  disableVariantSelector?: boolean;

  status?: MenuItemStatus;

  // Structural/internal record from the source graph (an organizational
  // node, a variant-container parent, a modifier-only picker, etc.) rather
  // than a standalone item a user should browse. Still fully valid to
  // resolve by id for internal relationships (combo side/drink options,
  // ingredient lookups) — see lib/menuItemCalculations#isStandaloneMenuItem
  // for the filter that keeps it out of browse/search/ranking surfaces.
  sourceOnly?: boolean;
};

export type IngredientItemBase = {
  id: string;
  name: string;
  image?: string;

  categories: string[];

  // Every currently referenced official unit for a context-dependent visible
  // ingredient. A parent relationship selects one of these by source tag.
  contextualNutritionUnits?: IngredientRelationshipNutrition[];

  maxQuantity: number;
  defaultOrder: number;

  source?: MenuSourceIdentity;

  hideVariantSelector?: boolean;
  hideFromIngredientView?: boolean;

  // Ordering systems can expose a single visible ingredient with asymmetric
  // state transitions (for example McDonald's cheese: removing the default
  // two slices is not the inverse of adding one extra slice).  These maps
  // keep the shared quantity UI while preserving the exact ordering option
  // and nutrition delta for each selectable count.
  orderingOptionIdByCount?: Record<number, string>;
  orderingGroupIdByCount?: Record<number, string>;
  nutritionDeltaByCount?: Record<number, Nutrition>;

  // Id of the logical ingredient this record represents, when it isn't its
  // own id — e.g. a per-entree-context duplicate (Chipotle generates a
  // separate "Chicken" record per Bowl/Taco/Kids context so the builder can
  // pick the nutrition-correct one) still resolving to one shared identity.
  // Defaults to this record's own id when absent. Entree-agnostic surfaces
  // that list ingredients without builder context (search results) should
  // dedupe by this id so one logical ingredient never appears more than
  // once; per-entree builder surfaces should keep using the raw list, since
  // they rely on the context-specific records existing.
  canonicalIngredientId?: string;
};

export type DirectNutritionIngredientItem = IngredientItemBase & {
  nutrition: Nutrition;
  variants?: ItemVariant[];
  // Source of truth for default variant selection; falls back to the first variant when missing or invalid.
  defaultVariantId?: string;
};

export type VariantContainerIngredientItem = IngredientItemBase & {
  // Generated variant containers deliberately do not duplicate a selected
  // variant's nutrition onto their parent record.
  nutrition?: undefined;
  variants: [ItemVariant, ...ItemVariant[]];
  defaultVariantId: string;
};

export type IngredientItem =
  | DirectNutritionIngredientItem
  | VariantContainerIngredientItem;


// Menu JSON files contain restaurant menu content only; identity/metadata lives in data/restaurants/index.json.
export type RestaurantMenu = {
  hasBuildYourOwn?: boolean;
  items: MenuItem[];
  ingredients?: IngredientItem[];
  addonGroups?: RestaurantAddonGroups;
  customizationRules?: RestaurantCustomizationRules;
  builderConfig?: RestaurantBuilderConfig;
};
