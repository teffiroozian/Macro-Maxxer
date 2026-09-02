// Chick-fil-A now resolves cart lookups against the generated dataset (see
// lib/restaurants.ts for the matching getRestaurantData switch) rather than
// the old hand-authored data/restaurants/chickfila.json, which stays in
// place temporarily as a fallback/reference until runtime QA is complete.
import chickfilaMenu from "@/data/generated/chick-fil-a/restaurant.json";
import { CHIPOTLE_GENERATED_RUNTIME_MENU } from "@/lib/restaurantBuilders/chipotle/generatedRuntimeAdapter";
import { resolveChipotleIngredientDisplayName } from "@/lib/restaurantBuilders/chipotle/ingredientMenuItems";
import type { ChipotleBuilderConfig, ChipotleEntreeSelection } from "@/lib/restaurantBuilders/chipotle/types";
import {
  resolveChipotleLegacyCartIngredientId,
  resolveChipotleLegacyCartMainItem,
} from "@/lib/restaurantBuilders/chipotle/legacyCompatibility";
import habitMenu from "@/data/restaurants/habit.json";
import mcdonaldsMenu from "@/data/restaurants/mcdonalds.json";
import modMenu from "@/data/restaurants/mod.json";
import pandaMenu from "@/data/restaurants/panda.json";
import paneraMenu from "@/data/restaurants/panera.json";
import starbucksMenu from "@/data/restaurants/starbucks.json";
import subwayMenu from "@/data/restaurants/subway.json";
import type { CartCustomization, CartItem, CartSelectionOption } from "@/types/cart";
import type { IngredientItem, ItemVariant, MenuItem, RestaurantMenu } from "@/types/menu";
import type { Nutrition } from "@/types/nutrition";
import { resolveMenuItemVariantNutrition } from "@/lib/nutrition";

export type CartDetailMenuItem = MenuItem | IngredientItem;

export type ResolvedCartItemDetail = {
  restaurant: RestaurantMenu | null;
  item: CartDetailMenuItem | null;
  variant: ItemVariant | null;
};

const restaurantMenusById: Record<string, RestaurantMenu> = {
  chickfila: chickfilaMenu as RestaurantMenu,
  chipotle: CHIPOTLE_GENERATED_RUNTIME_MENU,
  habit: habitMenu as RestaurantMenu,
  mcdonalds: mcdonaldsMenu as RestaurantMenu,
  mod: modMenu as RestaurantMenu,
  panda: pandaMenu as RestaurantMenu,
  panera: paneraMenu as RestaurantMenu,
  starbucks: starbucksMenu as RestaurantMenu,
  subway: subwayMenu as RestaurantMenu,
};

export function getCartRestaurantMenu(restaurantId: string): RestaurantMenu | null {
  return restaurantMenusById[restaurantId] ?? null;
}

export function getCartCustomizationItemId(customization: CartCustomization) {
  return customization.itemId ?? customization.ingredientId ?? customization.toIngredientId ?? customization.fromIngredientId;
}

export function findCartMenuItem(restaurant: RestaurantMenu, itemId: string): CartDetailMenuItem | null {
  return (
    restaurant.items.find((item) => item.id === itemId) ??
    restaurant.ingredients?.find((ingredient) => ingredient.id === itemId) ??
    null
  );
}

function resolveChipotleCartCatalogId(
  cartItem: CartItem,
  itemId: string,
  role: "main" | "ingredient" = "ingredient",
) {
  if (cartItem.restaurantId !== "chipotle") return itemId;
  const mainResolution = resolveChipotleLegacyCartMainItem(cartItem);
  const resolution =
    role === "main"
      ? mainResolution
      : resolveChipotleLegacyCartIngredientId(itemId, mainResolution);
  return resolution.status === "resolved" ? resolution.recordId : undefined;
}

function normalizeMenuLabel(value: string) {
  return value.trim().toLowerCase();
}

// Fallback for combo and ingredient-level cart customizations: these are
// parsed back from the saved display label (see customizationFromLabel in
// lib/cart/customizationLabels.ts) rather than carrying a real catalog id —
// combo customizations have no id at all, and ingredient customizations
// stash the label text itself in place of one. Matching by name against the
// restaurant's catalog is what actually resolves a usable image/nutrition
// for these in practice.
export function findCartMenuItemByLabel(restaurant: RestaurantMenu, label?: string): CartDetailMenuItem | null {
  if (!label) return null;
  const normalized = normalizeMenuLabel(label);

  return (
    restaurant.items.find((item) => normalizeMenuLabel(item.name) === normalized) ??
    restaurant.ingredients?.find((ingredient) => normalizeMenuLabel(ingredient.name) === normalized) ??
    null
  );
}

export function resolveCartItemDetails(cartItem: CartItem, customization: CartCustomization): ResolvedCartItemDetail {
  const restaurant = getCartRestaurantMenu(cartItem.restaurantId);
  const itemId = getCartCustomizationItemId(customization);
  const resolvedItemId = itemId
    ? resolveChipotleCartCatalogId(cartItem, itemId)
    : undefined;
  const fallbackLabel = customization.itemLabel ?? customization.ingredientLabel ?? customization.toIngredientLabel;
  // A combo side/drink's saved label splits "Name" from "(Variant)" at the
  // first parenthesis (see customizationFromLabel), which incorrectly
  // truncates catalog items whose own name contains parentheses (e.g.
  // Chick-fil-A's "Sunjoy® (1/2 Sweet Tea, 1/2 Lemonade)"). If the truncated
  // name doesn't match anything, retry with the "variant" folded back in to
  // recover the original full catalog name.
  const fallbackLabelWithVariant =
    fallbackLabel && customization.variantLabel ? `${fallbackLabel} (${customization.variantLabel})` : undefined;
  const item =
    (restaurant && resolvedItemId
      ? findCartMenuItem(restaurant, resolvedItemId)
      : null) ??
    (restaurant ? findCartMenuItemByLabel(restaurant, fallbackLabel) : null) ??
    (restaurant ? findCartMenuItemByLabel(restaurant, fallbackLabelWithVariant) : null);
  const variant =
    item && customization.variantId
      ? (item.variants?.find((candidate) => candidate.id === customization.variantId) ?? null)
      : item && customization.variantLabel
        ? (item.variants?.find((candidate) => candidate.label === customization.variantLabel) ?? null)
        : null;

  return {
    restaurant,
    item,
    variant,
  };
}

// Same id-then-label resolution as resolveCartItemDetails, for a standard
// item's optionSelections (sauces, other addons) — these reliably carry a
// real itemId already (see buildStructuredOptionSelections), so this mostly
// just wraps findCartMenuItem, with the label fallback as a safety net.
function resolveCartOptionSelectionItem(restaurant: RestaurantMenu | null, option: CartSelectionOption): CartDetailMenuItem | null {
  if (!restaurant) return null;
  return (option.itemId ? findCartMenuItem(restaurant, option.itemId) : null) ?? findCartMenuItemByLabel(restaurant, option.label);
}

export type ResolvedCartComboSelection = {
  role: "side" | "drink";
  name: string;
  variantLabel?: string;
  image?: string;
  nutrition?: Nutrition;
};

// Resolves a combo cart item's saved side/drink customizations back to their
// full menu data (image, name, nutrition) for the cart page's Preview modal
// — the cart customization itself only carries the label the user saw at the
// time, not enough to render a proper menu-item-style card.
export function resolveCartItemComboSelections(cartItem: CartItem): ResolvedCartComboSelection[] {
  const comboCustomizations = (cartItem.customizations ?? []).filter(
    (customization): customization is CartCustomization & { comboRole: "side" | "drink" } =>
      customization.kind === "combo" && (customization.comboRole === "side" || customization.comboRole === "drink"),
  );

  return comboCustomizations.map((customization) => {
    const { item, variant } = resolveCartItemDetails(cartItem, customization);

    return {
      role: customization.comboRole,
      name: item?.name ?? customization.itemLabel ?? customization.ingredientLabel ?? "Item",
      variantLabel: variant?.label ?? customization.variantLabel,
      // Falls back to the base item's image when the selected variant has
      // none of its own (e.g. Sunjoy's size variants carry no image field —
      // only the base drink does), so the preview never renders an empty
      // placeholder when the menu already has a valid image available.
      image: variant?.image ?? item?.image,
      // Same variant/multiplier-aware resolution the menu itself uses
      // (resolveMenuItemVariantNutrition), so a combo drink/side's full
      // nutrition set (not just calories/protein/carbs/fat) always matches
      // what the menu card showed when it was selected.
      nutrition: item ? resolveMenuItemVariantNutrition(item as MenuItem, variant ?? undefined) : undefined,
    };
  });
}

export type ResolvedCartItemCard = {
  id: string;
  name: string;
  // Secondary badge for a nuance beyond plain add/remove (Extra/Light/×N) —
  // deliberately omitted for the plain add/remove case, since the Preview
  // modal's Added/Removed group heading already communicates that, and
  // repeating it on every row would be redundant.
  qualifierLabel?: string;
  sign: "add" | "remove";
  image?: string;
  nutrition?: Nutrition;
};

// Every ingredient-level change (add/remove/extra/light/swap on the base
// item), plus non-sauce addons and a fully-custom Build Your Own item's
// selected ingredients, resolved to real catalog image/nutrition data where
// possible — the cart Preview modal's "Customizations" cards. Combo
// side/drink and sauces get their own resolvers (above / below), since they
// render as their own sections rather than folding in here. A swap becomes
// two cards (the removed ingredient, the added one) rather than one
// arrow-labeled row, so it sorts naturally into the Added/Removed grouping
// the Preview modal renders instead of needing a third "Swapped" group.
export function resolveCartItemCustomizationCards(cartItem: CartItem): ResolvedCartItemCard[] {
  const restaurant = getCartRestaurantMenu(cartItem.restaurantId);
  const cards: ResolvedCartItemCard[] = [];

  if (cartItem.selection.type === "standard") {
    // The legacy customizations label array only ever carries real data for
    // standard items — a Build Your Own item's ingredients live solely in
    // selection.buildConfiguration (see the else branch below), so reading
    // both here would render every BYO ingredient twice.
    (cartItem.customizations ?? [])
      .filter((customization) => customization.kind !== "combo")
      .forEach((customization, index) => {
        if (customization.action === "swap") {
          cards.push({ id: `swap-from-${index}`, name: customization.fromIngredientLabel ?? "Ingredient", sign: "remove" });
          cards.push({ id: `swap-to-${index}`, name: customization.toIngredientLabel ?? "Ingredient", sign: "add" });
          return;
        }

        const { item } = resolveCartItemDetails(cartItem, customization);
        const name = item?.name ?? customization.ingredientLabel ?? "Ingredient";
        const qualifierLabel =
          customization.action === "extra"
            ? "Extra"
            : customization.action === "light"
              ? "Light"
              : customization.quantity && customization.quantity > 1
                ? `×${customization.quantity}`
                : undefined;

        cards.push({
          id: `ingredient-${customization.ingredientId ?? index}`,
          name,
          qualifierLabel,
          sign: customization.action === "remove" || customization.action === "light" ? "remove" : "add",
          image: item?.image,
          nutrition: item?.nutrition,
        });
      });

    (cartItem.selection.optionSelections ?? [])
      .filter((option) => option.optionId !== "sauces" && option.optionId !== "dressings")
      .forEach((option, index) => {
        const item = resolveCartOptionSelectionItem(restaurant, option);
        cards.push({
          id: `option-${option.itemId ?? index}`,
          name: option.label,
          qualifierLabel: option.quantity && option.quantity > 1 ? `×${option.quantity}` : undefined,
          sign: "add",
          image: item?.image,
          nutrition: item?.nutrition,
        });
      });
  } else {
    // The build's own selection never stores a snapshot label (see
    // toUniversalChipotleBuildConfiguration), so this always re-derives the
    // name from the live catalog — for Chipotle that must go through the
    // same context-specific labeling the builder view uses (e.g.
    // chipotle-cmg-4026 reads "Double Wrap with Tortilla" only for a
    // Burrito, "Tortilla" everywhere else including here for any other
    // build), or the raw generated name would leak into every context.
    const chipotleEntree =
      cartItem.restaurantId === "chipotle"
        ? ((cartItem.selection.buildConfiguration.baseItemId ?? null) as ChipotleEntreeSelection)
        : undefined;
    cartItem.selection.buildConfiguration.ingredients
      .filter((ingredient) => ingredient.quantity > 0)
      .forEach((ingredient) => {
        const resolvedIngredientId = resolveChipotleCartCatalogId(
          cartItem,
          ingredient.id,
        );
        const item =
          restaurant && resolvedIngredientId
            ? findCartMenuItem(restaurant, resolvedIngredientId)
            : null;
        const itemName =
          item &&
          cartItem.restaurantId === "chipotle"
            ? resolveChipotleIngredientDisplayName(
                item,
                restaurant?.builderConfig as ChipotleBuilderConfig | undefined,
                chipotleEntree,
              )
            : item?.name;
        cards.push({
          id: `build-${ingredient.id}`,
          name: ingredient.label ?? itemName ?? "Ingredient",
          qualifierLabel: ingredient.quantity > 1 ? `×${ingredient.quantity}` : undefined,
          sign: "add",
          image: item?.image,
          nutrition: item?.nutrition,
        });
      });
  }

  return cards;
}

// The sauce-tagged subset of a standard item's optionSelections, resolved to
// real catalog image/nutrition the same way as resolveCartItemCustomizationCards
// — kept separate since sauces render as their own "Dipping Sauces" section.
export function resolveCartItemSauceCards(cartItem: CartItem): ResolvedCartItemCard[] {
  if (cartItem.selection.type !== "standard") return [];
  const restaurant = getCartRestaurantMenu(cartItem.restaurantId);

  return (cartItem.selection.optionSelections ?? [])
    .filter((option) => option.optionId === "sauces")
    .map((option, index) => {
      const item = resolveCartOptionSelectionItem(restaurant, option);
      return {
        id: `sauce-${option.itemId ?? index}`,
        name: option.label,
        qualifierLabel: option.quantity && option.quantity > 1 ? `×${option.quantity}` : undefined,
        sign: "add" as const,
        image: item?.image,
        nutrition: item?.nutrition,
      };
    });
}

export type ResolvedCartItemMainItem = {
  name: string;
  image?: string;
  variantLabel?: string;
  nutrition: Nutrition;
};

// The base/main menu item itself (e.g. "Spicy Southwest Salad") at its
// selected size/variant, before any ingredient customizations or addons —
// resolved to real catalog name/image/nutrition for the Preview modal's
// "Main Item" card and its row in Selected Items. Build Your Own has no
// single base item to point to (it's built from scratch), so this only
// resolves for standard selections (which combo meals are too — a combo's
// entree is still a standard selection with side/drink customizations
// layered on top).
export function resolveCartItemMainItem(cartItem: CartItem): ResolvedCartItemMainItem | null {
  if (cartItem.selection.type !== "standard") return null;
  const restaurant = getCartRestaurantMenu(cartItem.restaurantId);
  if (!restaurant) return null;
  const mainResolution =
    cartItem.restaurantId === "chipotle"
      ? resolveChipotleLegacyCartMainItem(cartItem)
      : null;
  if (mainResolution && mainResolution.status !== "resolved") return null;
  const resolvedItemId =
    mainResolution?.status === "resolved"
      ? mainResolution.recordId
      : cartItem.itemId;
  const item = findCartMenuItem(restaurant, resolvedItemId);
  if (!item) return null;

  const { variantLabel } = cartItem.selection;
  const variantId =
    mainResolution?.status === "resolved" && mainResolution.variantId
      ? mainResolution.variantId
      : cartItem.selection.variantId;
  const variant =
    (variantId ? item.variants?.find((candidate) => candidate.id === variantId) : undefined) ??
    (mainResolution?.status === "resolved"
      ? item.variants?.find(
          (candidate) =>
            candidate.canonicalItemId === mainResolution.recordId,
        )
      : undefined) ??
    (variantLabel ? item.variants?.find((candidate) => candidate.label === variantLabel) : undefined);

  return {
    name: item.name,
    image: variant?.image ?? item.image,
    variantLabel: variant?.label ?? variantLabel,
    nutrition: resolveMenuItemVariantNutrition(item as MenuItem, variant),
  };
}

// Used by the Preview modal's Customization Impact summary to diff the
// saved item against this baseline — a thin accessor over
// resolveCartItemMainItem so both stay in lockstep.
export function resolveCartItemBaseNutrition(cartItem: CartItem): Nutrition | null {
  return resolveCartItemMainItem(cartItem)?.nutrition ?? null;
}

// The dressing-tagged subset of a standard item's optionSelections — same
// resolution as resolveCartItemSauceCards, kept separate since dressings
// render as their own "Dressings" section rather than folding into either
// Dipping Sauces or the generic Customizations bucket.
export function resolveCartItemDressingCards(cartItem: CartItem): ResolvedCartItemCard[] {
  if (cartItem.selection.type !== "standard") return [];
  const restaurant = getCartRestaurantMenu(cartItem.restaurantId);

  return (cartItem.selection.optionSelections ?? [])
    .filter((option) => option.optionId === "dressings")
    .map((option, index) => {
      const item = resolveCartOptionSelectionItem(restaurant, option);
      return {
        id: `dressing-${option.itemId ?? index}`,
        name: option.label,
        qualifierLabel: option.quantity && option.quantity > 1 ? `×${option.quantity}` : undefined,
        sign: "add" as const,
        image: item?.image,
        nutrition: item?.nutrition,
      };
    });
}
