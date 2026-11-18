import type { OrderingGroup, OrderingOption, OrderingPlan } from "../../../types/ordering";
import type { buildChickFilAFromCaptures } from "../../importers/chick-fil-a";

type Menu = Awaited<ReturnType<typeof buildChickFilAFromCaptures>>["restaurantOutput"];

export function buildChickFilAOrderingPlans(menu: Menu): Record<string, OrderingPlan> {
  const groups = new Map(menu.sourceRelationships.itemGroups.map((group) => [group.sourceItemGroupId, group.options]));
  const items = new Map(menu.items.map((item) => [item.id, item]));
  const fries = items.get("cfa-group-100371");
  const sandwich = items.get("cfa-item-1000231");
  if (!fries || !sandwich?.nutrition || !fries.variants?.length) throw new Error("Verified ordering pilot items are absent.");

  function getEdge(groupId: string, tag: string) {
    const edge = groups.get(groupId)?.find((option) => option.tag === tag);
    if (!edge) throw new Error(`Missing verified ordering edge ${groupId}/${tag}`);
    return edge;
  }

  function includedGroups(groupId: string, itemId: string, allowPreparation: boolean): OrderingGroup[] {
    const item = items.get(itemId);
    if (!item) return [];
    return (groups.get(groupId) ?? []).flatMap<OrderingGroup>((edge) => {
      if (edge.itemClass !== "MODIFIER_GROUPING" || !edge.referencedItemGroupId) return [];
      const members = groups.get(edge.referencedItemGroupId) ?? [];
      if (allowPreparation && members.length > 0 && members.every((member) =>
        member.standardizedRecordId && /^ICE_(EXTRA|LITE|NONE)$/.test(member.tag ?? "") &&
        menu.ingredients.some((ingredient) => ingredient.id === member.standardizedRecordId && !ingredient.nutrition),
      )) return [{
        id: `${groupId}:${edge.optionIndex}`, label: edge.name ?? "Preparation",
        min: edge.minimum ?? edge.thirdPartyMinimum ?? 0, max: edge.maximum,
        options: members.map((member) => ({
          id: `${edge.referencedItemGroupId}:${member.optionIndex}`,
          itemId: member.standardizedRecordId!, label: member.name ?? "Ice",
          min: member.minimum ?? member.thirdPartyMinimum ?? undefined,
          max: member.maximum ?? undefined, role: "ingredient", effect: { kind: "none" },
        })),
      }];
      if (!edge.defaultTag) return [];
      const member = getEdge(edge.referencedItemGroupId, edge.defaultTag);
      const id = member.standardizedRecordId;
      const unit = id && item.ingredientNutritionContexts?.[id];
      if (!id || !unit || member.selectionRole !== "included" ||
          member.tag !== unit.source.tag || !item.ingredients?.includes(id)) return [];
      return [{
        id: `${groupId}:${edge.optionIndex}`,
        label: "Included options",
        min: edge.minimum ?? edge.thirdPartyMinimum ?? 0,
        max: edge.maximum,
        options: [{
          id: `${edge.referencedItemGroupId}:${member.optionIndex}`,
          label: member.name ?? "Modifier",
          itemId: id,
          role: "ingredient",
          min: member.minimum ?? member.thirdPartyMinimum ?? undefined,
          max: member.maximum ?? undefined,
          defaultQuantity: 1,
          effect: { kind: "included", nutrition: unit.nutrition, sourceId: unit.source.sourceId },
        }],
      }];
    });
  }

  function sizeGroup(groupId: string, defaultTag: string, label: string, role: OrderingOption["role"], familyId?: string, allowPreparation = false): OrderingGroup {
    const options = (groups.get(groupId) ?? []).map((edge): OrderingOption => {
      const itemId = edge.standardizedRecordId;
      const item = itemId && items.get(itemId);
      if (!itemId || !item || !item.nutrition) throw new Error(`No official panel for ordering edge ${groupId}/${edge.optionIndex}`);
      const familyVariant = familyId && items.get(familyId)?.variants?.find((variant) => variant.id === itemId);
      return {
        id: String(edge.optionIndex),
        label: familyVariant ? familyVariant.label : item.name,
        itemId: familyVariant ? familyId : itemId,
        variantId: familyVariant ? familyVariant.id : undefined,
        role,
        defaultQuantity: edge.tag === defaultTag ? 1 : 0,
        max: edge.maximum ?? 1,
        effect: { kind: "add", nutrition: item.nutrition, sourceId: item.source.nutrition?.sourceId },
        groups: edge.referencedItemGroupId ? includedGroups(edge.referencedItemGroupId, itemId, allowPreparation) : undefined,
      };
    });
    if (options.filter((option) => option.defaultQuantity).length !== 1) throw new Error(`No unique default for ordering group ${groupId}`);
    // The existing meal and size pickers select exactly one SKU. The raw
    // edges often omit bounds for these two app-level controls.
    return { id: groupId, label, min: 1, max: 1, options };
  }

  const comboSides = getEdge("100234", "MEAL_SIDES");
  const comboDrinks = getEdge("100234", "MEAL_BEVERAGES");
  const comboFries = getEdge(comboSides.referencedItemGroupId!, comboSides.defaultTag!);
  const comboCola = getEdge(comboDrinks.referencedItemGroupId!, comboDrinks.defaultTag!);
  const plans: Record<string, OrderingPlan> = {
    [fries.id]: {
      id: "chickfila-fries-v1",
      // The active size supplies the entire panel.
      baseNutrition: { calories: 0, protein: 0, carbs: 0, totalFat: 0, satFat: 0, transFat: 0, cholesterol: 0, sodium: 0, fiber: 0, sugars: 0 },
      groups: [sizeGroup("100371", "MD_WAFFLE_POTATO_FRIES", "Size", undefined, fries.id)],
    },
    [sandwich.id]: {
      id: "chickfila-sandwich-fries-cola-v1",
      baseNutrition: sandwich.nutrition,
      groups: [{
        id: "meal", label: "Meal", min: 1, max: 1,
        options: [{
          id: "entree", label: "Sandwich only", max: 1, defaultQuantity: 1, effect: { kind: "none" },
        }, {
          id: "100234", label: "Meal with waffle fries and Coca-Cola", max: 1, effect: { kind: "none" },
          groups: [
            sizeGroup(comboFries.referencedItemGroupId!, comboFries.defaultTag!, "Waffle fries", "side", fries.id),
            sizeGroup(comboCola.referencedItemGroupId!, comboCola.defaultTag!, "Coca-Cola", "drink"),
          ],
        }],
      }],
    },
  };

  for (const carrier of menu.items) {
    const anchor = carrier.comboConfig?.entreeItemId && items.get(carrier.comboConfig.entreeItemId);
    const sourceGroupId = carrier.source.menu.itemGroupId;
    if (!anchor || !anchor.nutrition || !sourceGroupId || anchor.id === sandwich.id) continue;
    const edges = groups.get(sourceGroupId) ?? [];
    // Compile fixed entrées only when the exact source identity is present.
    if (!edges.some((edge) => edge.itemGroupType === "Entree" && edge.standardizedRecordId === anchor.id)) continue;
    const sides = edges.filter((edge) => edge.itemGroupType === "Side");
    const drinks = edges.filter((edge) => edge.itemGroupType === "Beverage");
    const desserts = edges.filter((edge) => edge.itemGroupType === "Item" && edge.referencedItemGroupId === "100499");
    if (sides.length === 4 && desserts.length === 4 && drinks.length === 0 &&
        sides.every((edge) => edge.referencedItemGroupId === "100498" && edge.defaultTag)) {
      const owner = menu.items.find((item) => !item.sourceOnly && item.variants?.some((variant) => variant.id === anchor.id));
      if (!owner || plans[owner.id]) continue;
      const slots = [...sides, ...desserts].map((edge): OrderingGroup => ({
        ...sizeGroup(edge.referencedItemGroupId!, edge.defaultTag!, edge.name ?? "Component",
          edge.itemGroupType === "Side" ? "side" : "included-dessert", edge.itemGroupType === "Side" ? fries.id : undefined),
        // The same group is referenced by four distinct source edges.
        id: `${sourceGroupId}:${edge.optionIndex}`,
        min: edge.minimum ?? edge.thirdPartyMinimum ?? 1,
        max: edge.maximum ?? 1,
      }));
      plans[owner.id] = {
        id: `chickfila-family-${sourceGroupId}`,
        baseNutrition: anchor.nutrition,
        groups: [{
          id: "family", label: "Family meal", min: 1, max: 1,
          options: [{
            id: carrier.id, label: carrier.name, max: 1, defaultQuantity: 1, effect: { kind: "none" },
            itemId: owner.id, variantId: anchor.id, groups: slots,
          }],
        }],
      };
    } else if (!anchor.sourceOnly && !anchor.variants?.length && sides.length === 1 && drinks.length === 1 &&
        sides[0].defaultTag === "WAFFLE_POTATO_FRIES" && drinks[0].defaultTag === "COCA_COLA" && !plans[anchor.id]) {
      const side = getEdge(sides[0].referencedItemGroupId!, sides[0].defaultTag);
      const drink = getEdge(drinks[0].referencedItemGroupId!, drinks[0].defaultTag);
      plans[anchor.id] = {
        id: `chickfila-meal-${sourceGroupId}`,
        baseNutrition: anchor.nutrition,
        groups: [{
          id: "meal", label: "Meal", min: 1, max: 1,
          options: [
            { id: "entree", label: "Entrée only", max: 1, defaultQuantity: 1, effect: { kind: "none" } },
            {
              id: sourceGroupId, label: "Meal with waffle fries and Coca-Cola", max: 1, effect: { kind: "none" },
              groups: [
                sizeGroup(side.referencedItemGroupId!, side.defaultTag!, "Waffle fries", "side", fries.id, true),
                sizeGroup(drink.referencedItemGroupId!, drink.defaultTag!, "Coca-Cola", "drink", undefined, true),
              ],
            },
          ],
        }],
      };
    }
  }
  return plans;
}
