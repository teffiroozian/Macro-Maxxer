import type { CartCustomization, CartItem, CartSelectionOption } from "@/types/cart";
import { getCustomizationLabel } from "@/lib/cart/customizationLabels";
import { findCartMenuItem, getCartRestaurantMenu, resolveCartItemComboSelections } from "@/lib/cart/cartItemLookup";
import { getProteinMultiplier, getSplitPortionModeLabel, normalizeIngredientCategory } from "@/lib/restaurantBuilders/chipotle";
import { resolveChipotleIngredientDisplayName } from "@/lib/restaurantBuilders/chipotle/ingredientMenuItems";
import type { ChipotleBuilderConfig, ChipotleEntreeSelection } from "@/lib/restaurantBuilders/chipotle/types";
import { resolvePrimaryCategory } from "@/lib/ingredientTabs";

export function hasComboCustomization(item: CartItem) {
  return (item.customizations ?? []).some((customization) => customization.kind === "combo");
}

export function formatCartItemName(item: CartItem) {
  if (!hasComboCustomization(item)) return item.name;
  const restaurant = getCartRestaurantMenu(item.restaurantId);
  const catalogItem = restaurant ? findCartMenuItem(restaurant, item.itemId) : null;
  if (catalogItem && "comboConfig" in catalogItem && catalogItem.comboConfig) return catalogItem.name;
  return /\bcombo\b/i.test(item.name) ? item.name : `${item.name} Combo`;
}

export type CartSummaryGroupKind = "mainItem" | "side" | "drink" | "sauce" | "dressing" | "customization";

export type CartSummaryGroup = {
  kind: CartSummaryGroupKind;
  label: string;
  inlineItems?: Array<{ label: string; category: string }>;
};

export type CartExportSummaryItem = {
  label: string;
  quantity?: number;
  detail?: string;
  modifier?: string;
  muted?: boolean;
  components?: Array<{
    role: "Entrée" | "Side" | "Drink" | "Extra" | "Sauce" | "Dressing";
    label: string;
    muted?: boolean;
  }>;
};

type ResolvedBuildIngredient = {
  name: string;
  category: string;
  quantity: number;
  portion?: "light" | "normal" | "extra";
};

function resolveBuildIngredients(item: CartItem): ResolvedBuildIngredient[] {
  if (item.selection.type !== "build-your-own") return [];

  const restaurant = getCartRestaurantMenu(item.restaurantId);
  const chipotleEntree =
    item.restaurantId === "chipotle"
      ? ((item.selection.buildConfiguration.baseItemId ?? null) as ChipotleEntreeSelection)
      : undefined;

  return item.selection.buildConfiguration.ingredients
    .filter((ingredient) => ingredient.quantity > 0)
    .map((ingredient) => {
      const catalogItem = restaurant ? findCartMenuItem(restaurant, ingredient.id) : null;
      const catalogName =
        catalogItem && item.restaurantId === "chipotle"
          ? resolveChipotleIngredientDisplayName(
              catalogItem,
              restaurant?.builderConfig as ChipotleBuilderConfig | undefined,
              chipotleEntree,
            )
          : catalogItem?.name;

      return {
        name: ingredient.label ?? catalogName ?? "Ingredient",
        category: normalizeIngredientCategory(resolvePrimaryCategory(catalogItem?.categories)),
        quantity: ingredient.quantity,
        portion: ingredient.portion,
      };
    });
}

// Export-specific prose derived from the same structured build fields used
// by the Chipotle builder/cart. A normal quantity of one is intentionally
// silent; meaningful portion modes lead the ingredient name instead.
export function buildCartItemExportSummary(item: CartItem): CartExportSummaryItem[] {
  const restaurant = getCartRestaurantMenu(item.restaurantId);
  const cartMenuItem = restaurant ? findCartMenuItem(restaurant, item.itemId) : null;
  const isStructuredCombo =
    item.selection.type === "standard" &&
    Boolean(cartMenuItem && "comboConfig" in cartMenuItem && cartMenuItem.comboConfig) &&
    hasComboCustomization(item);

  if (isStructuredCombo && cartMenuItem && "comboConfig" in cartMenuItem && cartMenuItem.comboConfig) {
    const entree = restaurant
      ? findCartMenuItem(restaurant, cartMenuItem.comboConfig.entreeItemId ?? item.itemId)
      : null;
    const comboSelections = resolveCartItemComboSelections(item);
    const components: NonNullable<CartExportSummaryItem["components"]> = [
      {
        role: "Entrée",
        label: entree?.name ?? item.name,
      },
      ...comboSelections.map((selection) => ({
        role: selection.role === "side" ? "Side" as const : "Drink" as const,
        label: formatComponentLabel(selection.name, selection.variantLabel),
      })),
    ];

    buildCartItemSummaryGroups(item)
      .filter((group) => group.kind !== "side" && group.kind !== "drink")
      .forEach((group) => {
        components.push({
          role: group.kind === "sauce" ? "Sauce" : group.kind === "dressing" ? "Dressing" : "Extra",
          label: group.label,
        });
      });

    return [{
      quantity: item.quantity,
      label: cartMenuItem.name,
      components,
    }];
  }

  if (item.restaurantId !== "chipotle" || item.selection.type !== "build-your-own") {
    return [{ quantity: item.quantity, label: formatCartItemName(item), detail: summarizeItem(item) || undefined }];
  }

  const proteinPortionMode = item.selection.buildConfiguration.options?.proteinPortionMode;
  const ingredients = resolveBuildIngredients(item);
  const selectedProteinCount = ingredients.filter((ingredient) => ingredient.category === "proteins").length;
  const selectedItems = ingredients.map((ingredient) => {
    let quantity = ingredient.quantity;
    let detail: string | undefined;

    if (ingredient.category === "proteins") {
      quantity = getProteinMultiplier(
        proteinPortionMode === "double" ? "double" : "normal",
        selectedProteinCount,
      );
      detail = quantity === 2 ? "Double" : quantity === 0.5 ? "Half" : undefined;
    } else if (ingredient.portion === "light" || ingredient.portion === "extra") {
      quantity = ingredient.portion === "light" ? 0.5 : 2;
      detail = getSplitPortionModeLabel(ingredient.portion);
    } else if (ingredient.quantity === 0.5) {
      detail = "Half";
    } else if (ingredient.quantity === 2) {
      detail = "Double";
    }

    return {
      label: `${formatExportQuantity(quantity)} ${ingredient.name}`,
      detail,
    };
  });

  // Older/persisted build payloads may carry explicit removals alongside
  // the build configuration. Preserve those structured choices as natural
  // "No …" rows without trying to infer omissions from the selected list.
  const removedItems = (item.customizations ?? [])
    .filter((customization) => customization.kind !== "combo" && customization.action === "remove")
    .map((customization) => ({
      label: `No ${ingredientCustomizationDelta(customization).label}`,
      muted: true,
    }));

  return [...selectedItems, ...removedItems];
}

function formatExportQuantity(quantity: number) {
  if (quantity === 0.5) return "1/2x";
  return `${quantity}x`;
}

function formatComponentLabel(name: string, variantLabel?: string) {
  if (!variantLabel) return name;
  const normalizedName = name.toLocaleLowerCase();
  const normalizedVariant = variantLabel.toLocaleLowerCase();
  return normalizedName.includes(normalizedVariant) ? name : `${variantLabel} ${name}`;
}

// "sauce" and "dressing" are the two option refs that survive as distinct
// concepts once a standard item's selections reach the cart — see
// buildStructuredOptionSelections in lib/menuItemCard/cartLabelUtils.ts,
// which tags each sauce/dressing selection with its own optionId. Everything
// else on optionSelections (cheese, etc.) has no comparable tag, so it falls
// into the generic "customization" bucket below.
export const sauceOptionRef = "sauces";
export const dressingOptionRef = "dressings";

function formatOptionSelectionLabel(option: CartSelectionOption) {
  return option.quantity && option.quantity > 1 ? `${option.label} x${option.quantity}` : option.label;
}

// Builds the icon-taggable groups the cart page's item cards use for their
// collapsed summary row and expanded details — side/drink/sauce each get
// their own kind (for a matching category icon), everything else (ingredient
// add/remove/extra/light/swap, other addons, build-your-own ingredients)
// falls under "customization". Ordered side, drink, sauce, then the rest, to
// read the same way a combo meal itself is built.
export function buildCartItemSummaryGroups(item: CartItem): CartSummaryGroup[] {
  const sideGroups: CartSummaryGroup[] = [];
  const drinkGroups: CartSummaryGroup[] = [];
  const dressingGroups: CartSummaryGroup[] = [];
  const sauceGroups: CartSummaryGroup[] = [];
  const customizationGroups: CartSummaryGroup[] = [];

  if (item.selection.type === "standard") {
    // The legacy customizations label array only ever carries real data for
    // standard items — a Build Your Own item's ingredients live solely in
    // selection.buildConfiguration (see the else branch below), so reading
    // both here would render every BYO ingredient twice.
    (item.customizations ?? []).forEach((customization) => {
      if (customization.kind === "combo") {
        if (customization.comboRole === "meal") return;
        const label = `${customization.itemLabel ?? customization.ingredientLabel ?? "Item"}${customization.variantLabel ? ` (${customization.variantLabel})` : ""}`;
        if (customization.comboRole === "side") sideGroups.push({ kind: "side", label });
        else if (customization.comboRole === "drink") drinkGroups.push({ kind: "drink", label });
        else {
          const prefix = customization.comboRole === "included-entree" ? "Included entrée"
            : customization.comboRole === "included-side" ? "Included side"
            : customization.comboRole === "included-drink" ? "Included drink"
            : customization.comboRole === "included-dessert" ? "Included dessert"
            : customization.comboRole === "non-nutrition" ? "Included item"
            : "Size";
          customizationGroups.push({ kind: "customization", label: `${prefix}: ${label}` });
        }
        return;
      }

      const label = getCustomizationLabel(customization);
      if (label) customizationGroups.push({ kind: "customization", label });
    });

    (item.selection.optionSelections ?? []).forEach((option) => {
      const label = formatOptionSelectionLabel(option);
      if (!label) return;
      if (option.optionId === sauceOptionRef) sauceGroups.push({ kind: "sauce", label });
      else if (option.optionId === dressingOptionRef) dressingGroups.push({ kind: "dressing", label });
      else customizationGroups.push({ kind: "customization", label });
    });
  } else {
    // Keep Build Your Own ingredients in one inline group. Chipotle also
    // carries category metadata so the shared renderer can mark category
    // transitions without turning the summary into separate rows/groups.
    // ingredient.label is never populated by the restaurant builder adapters
    // (e.g. chipotle/cartAdapter.ts), so the real name has to be looked up
    // from the restaurant's catalog by id.
    const ingredientItems = resolveBuildIngredients(item)
      .map((ingredient) => {
        const qualifier = ingredient.portion && ingredient.portion !== "normal"
          ? ` (${getSplitPortionModeLabel(ingredient.portion)})`
          : "";
        return {
          label: ingredient.quantity === 1
            ? `${ingredient.name}${qualifier}`
            : `${ingredient.name}${qualifier}: ${ingredient.quantity}x`,
          category: ingredient.category,
        };
      });
    if (ingredientItems.length > 0) {
      customizationGroups.push({
        kind: "customization",
        label: ingredientItems.map((ingredient) => ingredient.label).join(" · "),
        ...(item.restaurantId === "chipotle" ? { inlineItems: ingredientItems } : {}),
      });
    }
  }

  return [...sideGroups, ...drinkGroups, ...dressingGroups, ...sauceGroups, ...customizationGroups];
}

// Condensed single-line version of buildCartItemSummaryGroups' groups, for
// surfaces (Meal Breakdown) that render a plain text subtitle instead of the
// icon-tagged CartCustomizationSummary row — same canonical group data, just
// joined instead of rendered with icons, so it never drifts from what the
// cart drawer/card show for the same item.
export function summarizeItem(item: CartItem) {
  return buildCartItemSummaryGroups(item)
    .map((group) => group.label)
    .join(" • ");
}

export type CartCustomizationDelta = {
  sign: "add" | "remove";
  label: string;
};

function ingredientCustomizationDelta(customization: CartCustomization): CartCustomizationDelta {
  const label = customization.ingredientLabel ?? "Ingredient";

  if (customization.action === "remove") return { sign: "remove", label };
  if (customization.action === "light") return { sign: "remove", label: `Light ${label}` };
  if (customization.action === "extra") return { sign: "add", label: `Extra ${label}` };
  if (customization.action === "swap") {
    const fromLabel = customization.fromIngredientLabel ?? "Ingredient";
    const toLabel = customization.toIngredientLabel ?? "Ingredient";
    return { sign: "add", label: `${fromLabel} → ${toLabel}` };
  }

  return {
    sign: "add",
    label: customization.quantity && customization.quantity > 1 ? `${label} x${customization.quantity}` : label,
  };
}

// Every ingredient-level change (add/remove/extra/light/swap on the base
// item, plus sauces/other addons and build-your-own ingredients) flattened
// into a single +/- list for the expanded details panel's "Customizations"
// section — combo side/drink selections are deliberately excluded here,
// since those get their own rich section via resolveCartItemComboSelections
// instead of a plain text line.
export function buildCartItemCustomizationDeltas(item: CartItem): CartCustomizationDelta[] {
  const deltas: CartCustomizationDelta[] = [];

  if (item.selection.type === "standard") {
    // The legacy customizations label array only ever carries real data for
    // standard items — a Build Your Own item's ingredients live solely in
    // selection.buildConfiguration (see the else branch below), so reading
    // both here would render every BYO ingredient twice.
    (item.customizations ?? [])
      .filter((customization) => customization.kind !== "combo")
      .forEach((customization) => deltas.push(ingredientCustomizationDelta(customization)));

    (item.selection.optionSelections ?? []).forEach((option) => {
      const label = formatOptionSelectionLabel(option);
      if (label) deltas.push({ sign: "add", label });
    });
  } else {
    item.selection.buildConfiguration.ingredients
      .filter((ingredient) => ingredient.quantity > 0)
      .forEach((ingredient) => {
        const name = ingredient.label ?? "Ingredient";
        deltas.push({ sign: "add", label: ingredient.quantity === 1 ? name : `${name} x${ingredient.quantity}` });
      });
  }

  return deltas;
}
