import type { CartItem } from "@/types/cart";
import { getCustomizationLabels, getSelectionDetailsLabel } from "@/lib/cart/customizationLabels";

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
