import calculator from "../../../data/restaurants/mcdonalds/customization/raw/dna-calculator.json";
import metadata from "../../../data/restaurants/mcdonalds/raw/source-metadata.json";
import type { ItemCustomizationOverride, MenuItem, RestaurantMenu, SourceProvenanceValue } from "../../../types/menu";
import { adaptMcDonaldsMenuForRuntime } from "../../../lib/restaurantBuilders/mcdonalds/generatedRuntimeAdapter";
import { buildMcDonaldsRemainingSafeCustomization } from "../../../lib/restaurantBuilders/mcdonalds/remainingSafeCustomization";
import { buildMcDonaldsFromCaptures } from "../../importers/mcdonalds";
import type { AdapterItem, RestaurantAdapter, SourceRef } from "../contracts";
import type { RuntimeRelationships } from "../runtime-relationships";

const MENU = "mcdonalds:us:menu";
const NUTRITION = "mcdonalds:us:dna";
const CUSTOMIZATION = "mcdonalds:us:customization-evidence";
type Capture = Awaited<ReturnType<typeof buildMcDonaldsFromCaptures>>;

export function stageMcDonaldsRelationships(runtime: RestaurantMenu, unknown: ReadonlySet<string>): RuntimeRelationships {
  const usedRules = new Set<string>();
  const keep = (id: string) => !unknown.has(id.split(":")[0]);
  function customization(value?: ItemCustomizationOverride) {
    if (!value) return undefined;
    const ingredientCategories = value.ingredientCategories?.flatMap((group) => {
      const ingredients = group.ingredients.filter(keep);
      if (!ingredients.length) return [];
      usedRules.add(group.id ?? group.name);
      return [{ ...group, ingredients }];
    });
    return { ...value, ingredientCategories };
  }

  function itemRelationships(item: MenuItem) {
    const ownVariants = new Set(item.variants?.map((variant) => variant.id));
    const variants = Object.entries(item.customizationByVariantId ?? {})
      .filter(([id]) => ownVariants.has(id))
      .map(([id, override]) => [id, customization(override)!] as const);
    return {
      comboConfig: item.comboConfig, comboConfigByVariantId: item.comboConfigByVariantId,
      addonRefs: item.addonRefs, addonEligible: item.addonEligible, ingredientEligible: item.ingredientEligible,
      ingredients: item.ingredients?.filter(keep), customization: customization(item.customization),
      customizationByVariantId: variants.length ? Object.fromEntries(variants) : undefined,
      informationalIngredients: item.informationalIngredients?.filter((entry) => keep(entry.id)),
    };
  }

  const items = Object.fromEntries(runtime.items.map((item) => [item.id, itemRelationships(item)]));
  return {
    items,
    ingredients: Object.fromEntries((runtime.ingredients ?? []).map((entry) => [entry.id, {
      maxQuantity: entry.maxQuantity, defaultOrder: entry.defaultOrder, image: entry.image,
      canonicalIngredientId: entry.canonicalIngredientId, hideFromIngredientView: entry.hideFromIngredientView,
      ingredientViewName: entry.ingredientViewName, ingredientViewImage: entry.ingredientViewImage,
      ingredientViewCategories: entry.ingredientViewCategories, orderingOptionIdByCount: entry.orderingOptionIdByCount,
      orderingGroupIdByCount: entry.orderingGroupIdByCount, nutritionDeltaByCount: keep(entry.id) ? entry.nutritionDeltaByCount : undefined,
    }])),
    addonGroups: runtime.addonGroups ?? {},
    customizationRules: {
      ingredientCategories: Object.fromEntries(Object.entries(runtime.customizationRules?.ingredientCategories ?? {})
        .filter(([id]) => usedRules.has(id))),
    },
  };
}

export const mcdonaldsAdapter: RestaurantAdapter<Capture> = {
  id: "mcdonalds",
  name: "McDonald's",
  load: buildMcDonaldsFromCaptures,
  translate(capture) {
    const remaining = buildMcDonaldsRemainingSafeCustomization(capture.output);
    const runtime = adaptMcDonaldsMenuForRuntime(capture.output, remaining);
    const unknown = new Set(Object.keys(remaining.unverifiedNutrition));
    const items = runtime.items.map((item): AdapterItem => {
      const source: SourceRef = { sourceId: MENU, recordId: item.id };
      const nonNutritionComponent = item.source?.generated?.menu.role === "non_nutrition_bundle_component";
      return {
        id: item.id, name: item.name, image: item.image, tags: item.tags, order: item.defaultOrder,
        model: "standard", sourceCategory: item.categories[0], servingType: item.servingType,
        isAvailable: !item.sourceOnly, sourceOnly: item.sourceOnly, nonNutritionComponent, sources: [source],
        generatedSource: item.source?.generated, orderingIdentity: item.source?.menu,
        nutrition: nonNutritionComponent ? [] : [{ source: { sourceId: NUTRITION, recordId: item.id }, values: item.nutrition }],
        groups: [],
        variants: (item.variants ?? []).map((variant) => ({
          id: `${item.id}/${variant.id}`, sourceVariantId: variant.id, canonicalItemId: variant.canonicalItemId,
          label: variant.label, image: variant.image, tags: variant.tags, category: variant.categories[0],
          servingType: variant.servingType, isDefault: variant.id === item.defaultVariantId,
          generatedSource: variant.source?.generated, orderingIdentity: variant.source?.menu,
          source: { sourceId: NUTRITION, recordId: variant.id },
          nutrition: [{ source: { sourceId: NUTRITION, recordId: variant.id }, values: variant.nutrition }],
        })),
        requirePublishedDefaultVariant: Boolean(item.variants?.length),
      };
    });
    const ingredients = (runtime.ingredients ?? []).map((ingredient) => {
      const partial = remaining.unverifiedNutrition[ingredient.id];
      // The reviewed Ketchup Packet mapping carries the official packaged
      // SKU, so the standard packet supplies its full published panel.
      const packet = ingredient.canonicalIngredientId === "mcd-item-200268" && ingredient.name === "Ketchup Packet"
        ? runtime.items.find((item) => item.id === ingredient.canonicalIngredientId) : undefined;
      const source = packet ? { sourceId: NUTRITION, recordId: packet.id } : { sourceId: CUSTOMIZATION, recordId: ingredient.id };
      const values = partial ?? packet?.nutrition ?? ingredient.nutrition;
      return {
        id: ingredient.id, name: ingredient.name, sourceCategory: ingredient.categories[0], sources: [{ sourceId: CUSTOMIZATION, recordId: ingredient.id }],
        nutrition: values && Object.keys(values).length ? [{ source, values }] : [],
      };
    });
    const withheld = (runtime.ingredients ?? []).filter((ingredient) => unknown.has(ingredient.id));
    return {
      restaurant: { id: "mcdonalds", name: "McDonald's" },
      deduplicateBy: "identity", items, ingredients,
      categoryMap: Object.fromEntries([...items, ...ingredients].map((record) => [record.sourceCategory, record.sourceCategory])),
      sources: [
        { id: MENU, kind: "official_html", authority: "official", url: metadata.fullMenu, retrievedAt: metadata.capturedAt },
        { id: NUTRITION, kind: "public_api", authority: "official", url: metadata.itemDetailsEndpoint, retrievedAt: metadata.capturedAt },
        { id: CUSTOMIZATION, kind: "public_api", authority: "official", url: calculator.endpoint, retrievedAt: calculator.capturedAt,
          notes: "Reviewed mappings combine official DNA nutrient panels and saved ordering-option captures." },
      ],
      runtimeRelationships: stageMcDonaldsRelationships(runtime, unknown),
      configurationEvidence: {
        withheld: withheld.map((entry) => ({
          id: entry.id, label: entry.name, itemIds: runtime.items.filter((item) =>
            item.ingredients?.includes(entry.id) || item.customization?.ingredientCategories?.some((group) => group.ingredients.includes(entry.id)))
            .map((item) => item.id),
          capturedOptionIds: entry.orderingOptionIdByCount as SourceProvenanceValue,
          capturedGroupIds: entry.orderingGroupIdByCount as SourceProvenanceValue,
        })),
      },
      knownIssues: [{
        severity: "blocker", code: "modifier_macros_unverified",
        message: "Calories-only and portion-estimated modifier records remain draft evidence. Published base meals and verified modifier records can still be used in staging.",
        affectedCount: withheld.length, entityIds: withheld.slice(0, 20).map((entry) => entry.id),
      }],
    };
  },
};
