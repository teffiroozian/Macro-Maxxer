import type { CartCustomization, CartSelection } from "@/types/cart";

type IngredientLookupValue = { name?: string; label?: string; id?: string } | string | undefined;
export type IngredientsById = Map<string, IngredientLookupValue> | Record<string, IngredientLookupValue> | undefined;

function getIngredientName(id: string | undefined, ingredientsById: IngredientsById, fallback?: string) {
  if (!id) return fallback ?? "Ingredient";
  const value = ingredientsById instanceof Map ? ingredientsById.get(id) : ingredientsById?.[id];
  if (typeof value === "string") return value;
  return value?.label ?? value?.name ?? fallback ?? id.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

// Cart customization objects are the source of truth. Display strings are generated here.
// Do not parse these labels for business logic; use the structured cart customization data instead.
export function getCustomizationLabel(customization: CartCustomization, ingredientsById?: IngredientsById) {
  if (customization.action === "swap") {
    const fromLabel = getIngredientName(customization.fromIngredientId, ingredientsById, customization.fromIngredientLabel);
    const toLabel = getIngredientName(customization.toIngredientId, ingredientsById, customization.toIngredientLabel);
    return `${fromLabel} → ${toLabel}`;
  }

  if (customization.kind === "combo") {
    if (customization.comboRole === "meal") return "Combo Meal";
    const prefix = customization.comboRole === "side" ? "Side" : "Drink";
    return `${prefix}: ${customization.itemLabel ?? customization.ingredientLabel ?? "Item"}${customization.variantLabel ? ` (${customization.variantLabel})` : ""}`;
  }

  const label = getIngredientName(customization.ingredientId, ingredientsById, customization.ingredientLabel);
  if (customization.action === "remove") return `${label}: Removed`;
  if (customization.action === "extra") return `${label}: Extra`;
  if (customization.action === "light") return `${label}: Light`;
  if (customization.quantity !== undefined) return `${label}: ${customization.quantity}x`;
  return `+ ${label}`;
}

export function getCustomizationLabels(customizations: CartCustomization[] | undefined, ingredientsById?: IngredientsById) {
  return (customizations ?? []).map((customization) => getCustomizationLabel(customization, ingredientsById));
}

export function getSelectionDetailsLabel(selection: CartSelection, ingredientsById?: IngredientsById) {
  if (selection.type === "build-your-own") {
    const labels = selection.buildConfiguration.ingredients
      .filter((ingredient) => ingredient.quantity > 0)
      .map((ingredient) => {
        const label = getIngredientName(ingredient.id, ingredientsById, ingredient.label);
        return ingredient.quantity === 1 ? label : `${label}: ${ingredient.quantity}x`;
      });
    return labels.length ? labels.join(" + ") : undefined;
  }

  const labels = (selection.optionSelections ?? [])
    .map((option) => (option.quantity && option.quantity > 1 ? `${option.label} x${option.quantity}` : option.label))
    .filter(Boolean);
  return labels.length ? labels.join(" + ") : undefined;
}

export function customizationFromLabel(label: string): CartCustomization {
  const trimmed = label.trim();
  if (/^Combo Meal$/i.test(trimmed)) return { action: "add", kind: "combo", comboRole: "meal" };
  const comboMatch = trimmed.match(/^(Side|Drink):\s*(.+?)(?:\s+\((.+)\))?$/i);
  if (comboMatch) return { action: "add", kind: "combo", comboRole: comboMatch[1].toLowerCase() as "side" | "drink", itemLabel: comboMatch[2]?.trim(), variantLabel: comboMatch[3]?.trim() };
  const ingredientMatch = trimmed.match(/^(.*?):\s*(Removed|Light|Extra|(\d+(?:\.\d+)?)x)$/i);
  if (ingredientMatch) {
    const value = ingredientMatch[2].toLowerCase();
    return {
      action: value === "removed" ? "remove" : value === "light" ? "light" : value === "extra" ? "extra" : "add",
      kind: "ingredient",
      ingredientId: ingredientMatch[1].trim(),
      ingredientLabel: ingredientMatch[1].trim(),
      quantity: ingredientMatch[4] ? Number.parseFloat(ingredientMatch[4]) : undefined,
    };
  }
  return { action: "add", ingredientId: trimmed.replace(/^\+\s*/, ""), ingredientLabel: trimmed.replace(/^\+\s*/, "") };
}

export function customizationsFromLabels(labels: string[] | undefined) {
  const customizations = (labels ?? []).map(customizationFromLabel);
  return customizations.length ? customizations : undefined;
}
