export type PortionType =
  | "single"
  | "combo"
  | "shareable"
  | "addon"
  | "drink"
  | "side"
  | "dessert";

export type Nutrition = {
  calories?: number;
  protein?: number;
  totalFat?: number;
  carbs?: number;

  satFat?: number;
  transFat?: number;
  cholesterol?: number;
  sodium?: number;
  fiber?: number;
  sugars?: number;
};

export type ItemVariant = {
  id: string;          // e.g. "8pc", "12pc", "30pc"
  label: string;       // e.g. "8 piece"
  nutrition: Nutrition;
  image?: string;
  portionType?: PortionType;   // Optional override: variant can differ from base item
  categories?: string[];
  isDefault?: boolean;
};

export type AddonRef = "sauces" | "dressings" | "condiments";

export type AddonOption = {
  name: string;
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
  image?: string;
};

export type RestaurantAddons = Partial<Record<AddonRef, AddonOption[]>>;

export type MacroDelta = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  totalFat?: number;
};

export type CommonChange = {
  id: string;
  label: string;
  appliesTo?: {
    categories?: string[];
  };
  delta: MacroDelta;
};

export type IngredientModifier = {
  id: string;
  label: string;
  multiplier: number;
};

export type IngredientTabsOverride = {
  ingredientTabs?: string[];
  singleSelectIngredientTabs?: string[];
  ingredientTabMaxQuantities?: Partial<Record<string, number>>;
  ingredientOptionsByTab?: Partial<Record<string, string[]>>;
  tabsWithNoneOption?: string[];
};

export type RestaurantCustomizationRules = {
  ingredientTabsByItemCategory?: Partial<Record<string, string[]>>;
  singleSelectIngredientTabsByItemCategory?: Partial<Record<string, string[]>>;
  ingredientTabMaxQuantities?: Partial<Record<string, number>>;
  ingredientTabMaxQuantitiesByItemCategory?: Partial<Record<string, Partial<Record<string, number>>>>;
  ingredientOptionsByItemCategory?: Partial<Record<string, Partial<Record<string, string[]>>>>;
};

export type MenuItem = {
  id?: string;          // optional but recommended later
  name: string;
  defaultOrder?: number;
  nutrition: Nutrition; // make this required so label is consistent
  image?: string;
  categories: string[];
  entreeGroup?: string;
  portionType: PortionType;
  restaurant?: string;
  variants?: ItemVariant[];
  defaultVariantId?: string;
  addonRefs?: AddonRef[];
  ingredients?: string[];
  customization?: IngredientTabsOverride;
  hideVariantSelector?: boolean;
};

export type IngredientItem = {
  id?: string;
  name: string;
  defaultOrder?: number;
  nutrition: Nutrition;
  image?: string;
  category?: string;
  categories?: string[];
  variants?: ItemVariant[];
  defaultVariantId?: string;
  hideVariantSelector?: boolean;
  maxQuantity?: number;
  hideFromIngredientView?: boolean;
};

export type RestaurantMenu = {
  id: string;
  name?: string;
  isBuildYourOwn?: boolean;
  items: MenuItem[];
  ingredients?: IngredientItem[];
  addons?: RestaurantAddons;
  commonChanges?: CommonChange[];
  ingredientModifiers?: IngredientModifier[];
  customizationRules?: RestaurantCustomizationRules;
};
