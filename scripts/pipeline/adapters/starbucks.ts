import type { SourceProvenanceValue } from "../../../types/menu";
import { buildStarbucksFromCaptures, readStarbucksSizeNutrition } from "../../importers/starbucks";
import type { AdapterItem, RestaurantAdapter, SourceRef } from "../contracts";

type Capture = Awaited<ReturnType<typeof buildStarbucksFromCaptures>>;
const CATALOG = "starbucks:us:catalog";
const DETAILS = "starbucks:us:detail";

function productKey(number: number, form: string) {
  return `${number}/${form.toLowerCase()}`;
}

export const starbucksAdapter: RestaurantAdapter<Capture> = {
  id: "starbucks",
  name: "Starbucks",
  load: buildStarbucksFromCaptures,
  translate({ raw, items: extracted, unresolvedOutput }) {
    const byProduct = new Map(extracted.map((item) => [
      productKey(item.source.menu.productNumber, item.source.menu.formCode), item,
    ]));
    const filtered = new Set(unresolvedOutput.filteredRecords.map((entry) => entry.sku));
    const items: AdapterItem[] = [];
    const products: Record<string, SourceProvenanceValue> = {};
    const optionSets: Record<string, SourceProvenanceValue> = {};
    const defaultValueSets: Record<string, SourceProvenanceValue> = {};
    const keys = new Map<string, string>();
    function intern(kind: string, table: Record<string, SourceProvenanceValue>, value?: SourceProvenanceValue) {
      if (value === undefined) return undefined;
      const signature = `${kind}:${JSON.stringify(value)}`;
      const previous = keys.get(signature);
      if (previous) return previous;
      const id = `${kind}-${Object.keys(table).length + 1}`;
      keys.set(signature, id);
      table[id] = value;
      return id;
    }
    for (const { response, retrievedAt } of raw.responses) {
      const product = response.products![0];
      const identity = productKey(product.productNumber, product.formCode);
      const existing = byProduct.get(identity);
      const sizes = product.sizes.filter((size) => !filtered.has(size.sku));
      if (!sizes.length) continue;
      const id = existing?.id ?? `starbucks-${identity.replace("/", "-")}`;
      const category = existing?.categories[0] ?? product.productType;
      const catalogRef: SourceRef = { sourceId: CATALOG, recordId: identity };
      products[id] = {
        sourceId: DETAILS,
        recordId: identity,
        retrievedAt,
        optionSetId: intern("options", optionSets, product.productOptions),
        sizes: Object.fromEntries(sizes.map((size) => [size.sku, {
          sizeCode: size.sizeCode,
          recipe: size.recipe,
          defaultValueSetId: intern("defaults", defaultValueSets, size.defaultOptionValues),
        }])),
      };
      items.push({
        id, name: existing?.name ?? product.name,
        model: "standard", sourceCategory: category, tags: existing?.tags,
        servingType: existing?.servingType ?? "single", isAvailable: product.inCatalog !== false,
        image: existing?.image ?? product.imageURL ?? "none", order: existing?.defaultOrder,
        sources: [catalogRef], nutrition: [], groups: [],
        generatedSource: existing?.source,
        requirePublishedDefaultVariant: true,
        variants: sizes.map((size) => {
          const variantId = `starbucks-sku-${size.sku}`;
          const variant = existing?.variants.find((entry) => entry.id === variantId);
          const source: SourceRef = { sourceId: DETAILS, recordId: size.sku, path: [identity] };
          const values = readStarbucksSizeNutrition(size.nutrition);
          return {
            id: variantId, sourceVariantId: size.sku,
            label: variant?.label ?? size.name,
            category, tags: variant?.tags, servingType: existing?.servingType,
            isDefault: existing ? existing.defaultVariantId === variantId : size.default === true,
            source, generatedSource: variant?.source,
            nutrition: Object.keys(values).length ? [{
              source, values, basis: { kind: "whole_item", description: size.nutrition?.servingSize?.displayValue },
            }] : [],
          };
        }),
      });
    }
    // Published catalog order is used for browse and makes projection reproducible.
    items.sort((left, right) => (left.order ?? Infinity) - (right.order ?? Infinity) || left.id.localeCompare(right.id));
    return {
      restaurant: { id: "starbucks", name: "Starbucks" },
      deduplicateBy: "identity",
      sources: [{
        id: CATALOG, kind: "public_api", authority: "official",
        url: raw.provenance.menuEndpoint, retrievedAt: raw.provenance.menuRetrievedAt,
        scope: raw.region, sha256: raw.menuSha256,
      }, {
        id: DETAILS, kind: "public_api", authority: "official",
        url: raw.provenance.productEndpointTemplate,
        retrievedAt: raw.provenance.detailRetrievedAtRange?.latest ?? raw.provenance.menuRetrievedAt,
        scope: raw.region,
      }],
      categoryMap: Object.fromEntries(items.map((item) => [item.sourceCategory, item.sourceCategory])),
      items, ingredients: [], configurationEvidence: { products, optionSets, defaultValueSets },
      knownIssues: [{
        severity: "blocker",
        code: "customization_nutrition_unverified",
        message: "Milk, syrup and modifier choices and recipe quantities are retained as evidence. The US capture does not establish nutrition for changed builds or the volumes needed for valid substitution deltas.",
        sourceIds: [DETAILS],
      }, {
        severity: "info",
        code: "non_food_merchandise_not_imported",
        message: "Shopping-bag merchandise is outside the food menu.",
        affectedCount: filtered.size,
      }],
    };
  },
};
