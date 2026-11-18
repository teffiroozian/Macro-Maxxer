import { compileChickFilASourceOrdering } from "./chick-fil-a-source-ordering";
import { buildChickFilAOrderingPlans } from "./chick-fil-a-ordering";
import { readFile } from "node:fs/promises";
import { buildChickFilAFromCaptures } from "../../importers/chick-fil-a";
import type { AdapterItem, NutritionInput, PartialNutrition, RestaurantAdapter, SourceRef } from "../contracts";

const MENU = "chickfila:ordering-menu";
const TABLE = "chickfila:nutrition-table";
const ORDERING = "chickfila:ordering-nutrition";
const RAW = "data/restaurants/chick-fil-a/raw";

// Reviewed catalog placement from the ranking/filter redesign (056eed5).
// The ordering capture places these pack SKUs under their parent entrées.
const SHAREABLE_PACKS = new Map<string, { category: string; variantServingType?: AdapterItem["servingType"] }>([
  ["cfa-item-1008141", { category: "shareables" }],
  ["cfa-item-1006616", { category: "shareables", variantServingType: "shareable" }],
  ["cfa-item-1007846", { category: "shareables", variantServingType: "shareable" }],
  ["cfa-item-1009275", { category: "shareables" }],
]);

type CaptureMetadata = { source: string; retrieved: string; locationId?: string };
type Extracted = Awaited<ReturnType<typeof buildChickFilAFromCaptures>>["restaurantOutput"];
type Trace = { menu: { recordId: string }; nutrition?: { sourceId?: string; nutritionSource?: string; servingSize?: unknown; orderingDefaultModifierSourceIds?: string[]; derivation?: { quantity: number; quantitySource: string; perUnitRetailModifiedItemId: string } } };
type PanelRecord = { nutrition?: PartialNutrition; source: Trace };

function panel(record: PanelRecord): NutritionInput {
  const evidence = record.source.nutrition;
  if (!record.nutrition || !evidence || evidence.derivation) return [];
  return [{
    source: {
      sourceId: evidence.nutritionSource === "ordering_system" ? ORDERING : TABLE,
      recordId: evidence.sourceId,
      path: evidence.orderingDefaultModifierSourceIds,
    },
    values: record.nutrition,
    basis: typeof evidence.servingSize === "number"
      ? { kind: "per_serving_unit", amount: evidence.servingSize }
      : { kind: "whole_item", description: typeof evidence.servingSize === "string" ? evidence.servingSize : undefined },
  }];
}

function isPreparationOnly(ingredient: Extracted["ingredients"][number] | undefined) {
  return Boolean(ingredient && !ingredient.nutrition &&
    ingredient.source.menu.tags.some((tag) => /^ICE_(EXTRA|LITE|NONE)$/.test(tag)));
}

function translateMenu(menu: Extracted) {
  const ingredients = new Map(menu.ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const records = new Map([...menu.items, ...menu.ingredients].map((record) => [record.id, record]));
  const sourceGroups = new Map(menu.sourceRelationships.itemGroups.map((group) => [group.sourceItemGroupId, group]));
  const deferred = new Set(menu.runtimeIntegration.deferredItems.map((item) => item.itemId));
  const customizationOnly = new Set(menu.runtimeIntegration.customizationItems.map((item) => item.itemId));
  const bySourceId = new Map(menu.items.map((item) => [item.source.menu.recordId, item]));
  const compositionFor = (record: PanelRecord): AdapterItem["composition"] => {
    const derivation = record.source.nutrition?.derivation;
    if (!derivation) return undefined;
    const sourceId = `retailModifiedItemId:${derivation.perUnitRetailModifiedItemId}`;
    const unit = bySourceId.get(sourceId);
    if (!unit) throw new Error(`Missing Chick-fil-A portion base ${sourceId}`);
    return [{
      label: unit.name,
      quantity: derivation.quantity,
      role: "scaled_source",
      ref: { kind: "item", id: unit.id },
      evidence: derivation.quantitySource,
      source: { sourceId: MENU, recordId: record.source.menu.recordId },
    }];
  };
  const groupsFor = (owner: Extracted["items"][number], ownerId: string): AdapterItem["groups"] =>
    (owner.customization?.ingredientCategories ?? []).map((category, index) => {
      const id = `${ownerId}:group:${index}`;
      const match = category.id?.match(/\[CFA (\d+):(\d+)\]$/);
      const parent = match && sourceGroups.get(match[1])?.options.find((option) => option.optionIndex === Number(match[2]));
      const rule = category.id ? menu.customizationRules.ingredientCategories[category.id] : undefined;
      const source: SourceRef = { sourceId: MENU, recordId: parent?.referencedItemGroupId ?? undefined, path: match ? [match[1], match[2]] : undefined };
      return {
        id,
        label: category.name,
        role: category.ingredients.length > 0 &&
          category.ingredients.every((id) => isPreparationOnly(ingredients.get(id))) ? "preparation" : "modification",
        minSelections: parent?.minimum ?? parent?.thirdPartyMinimum ?? rule?.minQuantity ?? null,
        maxSelections: parent?.maximum ?? rule?.maxQuantity ?? null,
        source,
        options: category.ingredients.map((ingredientId) => {
          const record = records.get(ingredientId)!;
          const context = owner.ingredientNutritionContexts?.[ingredientId];
          const weight = context?.source.servingWeight;
          return {
            id: `${id}:${ingredientId}`,
            label: record.name,
            ingredientId: ingredients.has(ingredientId) ? ingredientId : undefined,
            isDefault: owner.ingredients?.includes(ingredientId) ?? false,
            isAvailable: true,
            source: { ...source, recordId: record.source.menu.recordId },
            nutrition: context ? [{
              source: { sourceId: ORDERING, recordId: context.source.sourceId },
              values: context.nutrition,
              basis: weight ? { kind: "selected_portion", amount: weight.amount, unit: weight.unit } : undefined,
            }] : panel(record),
          };
        }),
      };
    });

  return {
    items: menu.items.map((item): AdapterItem => ({
      id: item.id,
      name: item.name,
      model: "standard",
      sourceCategory: SHAREABLE_PACKS.get(item.id)?.category ?? item.categories[0],
      servingType: item.servingType,
      isAvailable: !item.sourceOnly && !deferred.has(item.id) && !customizationOnly.has(item.id),
      sourceOnly: item.sourceOnly || deferred.has(item.id) || customizationOnly.has(item.id),
      orderingIdentity: { tags: item.source.menu.tags, pins: item.source.menu.pins },
      nutrition: panel(item),
      composition: compositionFor(item),
      variants: (item.variants ?? []).map((variant) => ({
        id: `${item.id}/${variant.id}`,
        sourceVariantId: variant.id,
        orderingIdentity: { tags: variant.source.menu.tags, pins: variant.source.menu.pins },
        image: variant.image,
        label: variant.label,
        category: SHAREABLE_PACKS.get(variant.id)?.category ?? variant.categories[0],
        servingType: SHAREABLE_PACKS.get(variant.id)?.variantServingType ?? variant.servingType,
        isDefault: variant.id === item.defaultVariantId,
        nutrition: panel(variant),
        source: { sourceId: MENU, recordId: variant.source.menu.recordId },
        composition: compositionFor(variant),
        groups: variant.ingredientNutritionContexts || item.customizationByVariantId?.[variant.id] ? groupsFor({
          ...item,
          customization: item.customizationByVariantId?.[variant.id] ?? item.customization,
          ingredientNutritionContexts: variant.ingredientNutritionContexts ?? item.ingredientNutritionContexts,
        }, `${item.id}/${variant.id}`) : undefined,
      })),
      groups: groupsFor(item, item.id),
      image: item.image,
      order: item.defaultOrder,
      sources: [{ sourceId: MENU, recordId: item.source.menu.recordId }],
    })),
    ingredients: menu.ingredients.map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
      sourceCategory: ingredient.categories[0],
      nutrition: panel(ingredient),
      contextualNutritionOnly: ingredient.nutritionResolvedByContext,
      preparationOnly: isPreparationOnly(ingredient) || undefined,
      sources: [{ sourceId: MENU, recordId: ingredient.source.menu.recordId }],
    })),
  };
}

type Captures = { menu: Extracted; metadata: CaptureMetadata[] };

export const chickFilAAdapter: RestaurantAdapter<Captures> = {
  id: "chickfila",
  name: "Chick-fil-A",
  async load() {
    const [{ restaurantOutput }, metadata] = await Promise.all([
      buildChickFilAFromCaptures(),
      Promise.all(["menu-source.json", "source.json", "ordering-nutrition-source.json"].map(async (file) =>
        JSON.parse(await readFile(`${RAW}/${file}`, "utf8")) as CaptureMetadata,
      )),
    ]);
    return { menu: restaurantOutput, metadata };
  },
  translate({ menu, metadata }) {
    const translated = translateMenu(menu);
    const { additionalOrderingPlans } = compileChickFilASourceOrdering(menu);
    return {
      restaurant: { id: this.id, name: this.name },
      sources: metadata.map((entry, index) => ({
        id: [MENU, TABLE, ORDERING][index],
        kind: index === 1 ? "official_document" : "public_api",
        authority: index === 1 ? "official" : "ordering_system",
        url: entry.source,
        retrievedAt: entry.retrieved,
        scope: entry.locationId ? `Location ${entry.locationId}` : undefined,
      })),
      deduplicateBy: "identity",
      categoryMap: Object.fromEntries([...translated.items, ...translated.ingredients].map((record) => [record.sourceCategory, record.sourceCategory])),
      ...translated,
      orderingPlans: buildChickFilAOrderingPlans(menu),
      additionalOrderingPlans,
      orderingGraph: {
        source: { sourceId: MENU },
        roots: menu.sourceRelationships.categoryRoots.map(({ name, itemIds }) => ({ name, itemIds })),
        groups: menu.sourceRelationships.itemGroups.flatMap(({ sourceItemGroupId, options }) =>
          sourceItemGroupId ? [{ id: sourceItemGroupId, options }] : [],
        ),
      },
      runtimeRelationships: {
        items: Object.fromEntries(menu.items.map((item) => [item.id, {
          comboConfig: item.comboConfig,
          comboConfigByVariantId: item.comboConfigByVariantId,
          addonRefs: item.addonRefs,
          addonEligible: item.addonEligible,
          ingredientEligible: item.ingredientEligible,
          ingredientRef: item.ingredientRef,
          ingredients: item.ingredients,
          customization: item.customization,
          customizationByVariantId: item.customizationByVariantId,
          informationalIngredients: item.informationalIngredients,
          proteinExtraByVariantId: item.proteinExtraByVariantId,
          ingredientNutritionContexts: item.ingredientNutritionContexts,
          variantGroupKind: item.variantGroupKind,
          variantGroupLabel: item.variantGroupLabel,
          variantContexts: Object.fromEntries((item.variants ?? []).flatMap((variant) =>
            variant.ingredientNutritionContexts ? [[variant.id, variant.ingredientNutritionContexts]] : [],
          )),
        }])),
        ingredients: Object.fromEntries(menu.ingredients.map((ingredient) => [ingredient.id, {
          maxQuantity: ingredient.maxQuantity,
          defaultOrder: ingredient.defaultOrder,
          image: ingredient.image,
          contextualNutritionUnits: ingredient.contextualNutritionUnits,
        }])),
        addonGroups: menu.addonGroups,
        customizationRules: menu.customizationRules,
      },
      knownIssues: [{
        severity: "blocker",
        code: "nested_ordering_graph_not_executable",
        message: "The supported menu can run in staging. Full ordering approval is withheld for source-only entrée states without a verified visible mapping and modifier contexts without evidence for the nutrition effect.",
        sourceIds: [MENU, ORDERING],
      }],
    };
  },
};
