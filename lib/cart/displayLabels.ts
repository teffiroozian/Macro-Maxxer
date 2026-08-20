import type { CartCustomization, CartItem, CartSelectionOption } from "@/types/cart";
import { getCustomizationLabel, getCustomizationLabels, getSelectionDetailsLabel } from "@/lib/cart/customizationLabels";
import { findCartMenuItem, getCartRestaurantMenu } from "@/lib/cart/cartItemLookup";
import { getSplitPortionModeLabel } from "@/lib/restaurantBuilders/chipotle";

export function isIngredientCustomizationLabel(label: string) {
  return /:\s*(Removed|(\d+)x|Remove|Extra|Light)\s*$/i.test(label);
}

export function hasComboCustomization(item: CartItem) {
  return (item.customizations ?? []).some((customization) => customization.kind === "combo");
}

export function formatCartItemName(item: CartItem) {
  if (!hasComboCustomization(item)) return item.name;
  return /\bcombo\b/i.test(item.name) ? item.name : `${item.name} Combo`;
}

export function summarizeItem(item: CartItem) {
  const selectionDetailsLabel = getSelectionDetailsLabel(item.selection);
  const customizationLabels = getCustomizationLabels(item.customizations);

  const ingredientCustomizations: string[] = [];
  const sideCustomizations: string[] = [];
  const drinkCustomizations: string[] = [];
  const otherCustomizations: string[] = [];

  customizationLabels.forEach((rawLabel) => {
    const label = rawLabel.trim();
    if (!label || /^Combo Meal$/i.test(label)) return;
    if (/^Side:\s*/i.test(label)) { sideCustomizations.push(label); return; }
    if (/^Drink:\s*/i.test(label)) { drinkCustomizations.push(label); return; }
    if (isIngredientCustomizationLabel(label)) { ingredientCustomizations.push(label); return; }
    otherCustomizations.push(label);
  });

  return [...ingredientCustomizations, ...sideCustomizations, ...drinkCustomizations, ...otherCustomizations, selectionDetailsLabel].filter(Boolean).join(" • ");
}

export type CartSummaryGroupKind = "mainItem" | "side" | "drink" | "sauce" | "dressing" | "customization";

export type CartSummaryGroup = {
  kind: CartSummaryGroupKind;
  label: string;
};

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
    // One group total, not one per ingredient — CartCustomizationSummary
    // renders a leading icon per group, and a Build Your Own item can have
    // a dozen+ ingredients, so pushing one group each would repeat the icon
    // down the whole line instead of reading as a single ingredient list.
    // ingredient.label is never populated by the restaurant builder adapters
    // (e.g. chipotle/cartAdapter.ts), so the real name has to be looked up
    // from the restaurant's catalog by id.
    const restaurant = getCartRestaurantMenu(item.restaurantId);
    const ingredientLabels = item.selection.buildConfiguration.ingredients
      .filter((ingredient) => ingredient.quantity > 0)
      .map((ingredient) => {
        const catalogItem = restaurant ? findCartMenuItem(restaurant, ingredient.id) : null;
        const name = ingredient.label ?? catalogItem?.name ?? "Ingredient";
        const qualifier =
          ingredient.portion && ingredient.portion !== "normal" ? ` (${getSplitPortionModeLabel(ingredient.portion)})` : "";
        return ingredient.quantity === 1 ? `${name}${qualifier}` : `${name}${qualifier}: ${ingredient.quantity}x`;
      });
    if (ingredientLabels.length > 0) {
      customizationGroups.push({ kind: "customization", label: ingredientLabels.join(" · ") });
    }
  }

  return [...sideGroups, ...drinkGroups, ...dressingGroups, ...sauceGroups, ...customizationGroups];
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
