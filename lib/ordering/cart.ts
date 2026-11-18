import type { CartCustomization, CartItem } from "@/types/cart";
import type { MenuItem } from "@/types/menu";
import type { OrderingPlan, SavedOrdering } from "@/types/ordering";
import { buildStandardCartItemPayload } from "@/lib/cart/standardItemConfiguration";
import { evaluateOrdering, type ActiveOrderingGroup } from "./evaluate";

export function buildOrderingCartPayload(
  item: MenuItem,
  plan: OrderingPlan,
  quantities: SavedOrdering["quantities"],
  quantity: number,
): Omit<CartItem, "id" | "restaurantId"> | undefined {
  const result = evaluateOrdering(plan, quantities);
  if (!result.nutrition || !Number.isSafeInteger(quantity) || quantity < 1) return undefined;
  const customizations: CartCustomization[] = [];
  let variantId: string | undefined;

  function visit(groups: ActiveOrderingGroup[]) {
    for (const group of groups) {
      for (const { option, quantity, parentQuantity, children, instances } of group.options) {
        if (quantity && option.variantId && option.itemId === item.id) variantId = option.variantId;
        if (option.role === "side" || option.role === "drink" || option.role === "included-dessert" || option.role === "non-nutrition") {
          for (const instance of instances) {
            const nutritionSnapshot = option.effect.kind === "add" ? evaluateOrdering({
              ...plan, baseNutrition: option.effect.nutrition, groups: option.groups ?? [],
            }, result.quantities, instance.path).nutrition : undefined;
            customizations.push({
              action: "add", kind: "combo", comboRole: option.role, itemId: option.itemId,
              itemLabel: option.label, variantId: option.variantId, quantity: instance.quantity * parentQuantity, nutritionSnapshot,
            });
          }
        }
        if (option.role === "ingredient" && option.itemId) {
          const difference = option.effect.kind === "included" ? quantity - (option.defaultQuantity ?? 0) : quantity;
          if (difference) customizations.push({
            action: difference < 0 ? "remove" : "add", kind: "ingredient",
            ingredientId: option.itemId, ingredientLabel: option.label, quantity: Math.abs(difference) * parentQuantity,
            nutritionSnapshot: option.effect.kind === "none" ? undefined : option.effect.nutrition,
          });
        }
        visit(children);
      }
    }
  }
  visit(result.groups);
  const payload = buildStandardCartItemPayload({
    item,
    selectedVariant: item.variants?.find((variant) => variant.id === variantId),
    quantity,
    nutritionPerItem: result.nutrition,
    customizations,
  });
  return {
    ...payload,
    itemId: item.id,
    selection: {
      ...payload.selection,
      ordering: { planId: plan.id, quantities: result.quantities },
    },
  };
}
