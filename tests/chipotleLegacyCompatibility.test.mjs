import assert from "node:assert/strict";
import { test } from "node:test";

import { CHIPOTLE_HOMEPAGE_EDITORIAL } from "../data/restaurants/chipotle-homepage-editorial.ts";
import { CHIPOTLE_GENERATED_RUNTIME_MENU } from "../lib/restaurantBuilders/chipotle/generatedRuntimeAdapter.ts";
import {
  CHIPOTLE_LEGACY_COMPATIBILITY_SUMMARY,
  resolveChipotleLegacyCartIngredientId,
  resolveChipotleLegacyCartMainItem,
  resolveChipotleLegacyId,
  resolveChipotleLegacyItemRoute,
} from "../lib/restaurantBuilders/chipotle/legacyCompatibility.ts";
import { chipotlePresentationGroupForCompatibleId } from "../data/restaurants/chipotle-generated-presentation.ts";
import {
  isChipotleHighProteinMenuItem,
  isChipotleProteinCupItem,
} from "../lib/restaurantBuilders/chipotle/highProtein.ts";

function standardCart(itemId, variantId) {
  return {
    id: `cart-${itemId}`,
    restaurantId: "chipotle",
    itemId,
    name: itemId,
    image: "",
    quantity: 1,
    macrosPerItem: { calories: 0, protein: 0, carbs: 0, totalFat: 0 },
    nutritionPerItem: { calories: 0, protein: 0, carbs: 0, totalFat: 0 },
    selection: { type: "standard", variantId },
  };
}

test("high-confidence one-to-one legacy IDs resolve to canonical generated IDs", () => {
  assert.deepEqual(resolveChipotleLegacyId("high-protein-high-fiber-bowl"), {
    status: "resolved",
    legacyId: "high-protein-high-fiber-bowl",
    recordId: "chipotle-meal-6ba21999-f6b8-4a83-803a-bf68ef319c5e",
    method: "one_to_one",
  });
  assert.equal(CHIPOTLE_LEGACY_COMPATIBILITY_SUMMARY.contextFreeAutomaticIds, 106);
});

test("safe old item URLs resolve, including promoted Kids presentation records", () => {
  const resolved = resolveChipotleLegacyItemRoute("double-high-protein-bowl");
  assert.equal(resolved.status, "resolved");
  assert.equal(
    resolved.canonicalSlug,
    "chipotle-meal-56ab2f6e-747d-46f9-9cf6-9ebc2855d86d",
  );

  const promotedKidsItem = resolveChipotleLegacyItemRoute("kids-chips");
  assert.equal(promotedKidsItem.status, "resolved");
  assert.equal(promotedKidsItem.recordId, "chipotle-cmg-1401");
});

test("persisted cart main IDs preserve presentation-family size and flavor", () => {
  const largeChips = resolveChipotleLegacyCartMainItem(
    standardCart("chips", "large-chips"),
  );
  assert.equal(largeChips.status, "resolved");
  assert.equal(largeChips.recordId, "chipotle-cmg-1016");
  assert.equal(largeChips.variantId, undefined);

  const dietCoke = resolveChipotleLegacyCartMainItem(
    standardCart("diet-coke-fountain", "diet-coke-fountain-32-fl-oz"),
  );
  assert.equal(dietCoke.status, "resolved");
  assert.equal(dietCoke.recordId, "chipotle-fountain-32-fl-oz");
  assert.equal(
    dietCoke.variantId,
    "chipotle-fountain-32-fl-oz-diet-coke",
  );
});

test("old build carts resolve main build and contextual ingredient identities", () => {
  const buildCart = {
    ...standardCart("chipotle-build"),
    selection: {
      type: "build-your-own",
      buildConfiguration: {
        baseItemId: "tacos",
        ingredients: [],
        options: { selectedTacoCount: 1 },
      },
    },
  };
  const main = resolveChipotleLegacyCartMainItem(buildCart);
  assert.equal(main.status, "resolved");
  assert.equal(main.recordId, "chipotle-taco");
  assert.equal(
    resolveChipotleLegacyCartIngredientId("chicken", main).recordId,
    "chipotle-protein-chicken-taco",
  );
  assert.equal(
    resolveChipotleLegacyCartIngredientId("guacamole", main).recordId,
    "chipotle-cmg-1207",
  );
});

test("obsolete and ambiguous legacy identities are never silently replaced", () => {
  assert.equal(
    resolveChipotleLegacyId("topo-chico-mineral-water").status,
    "obsolete",
  );
  assert.equal(
    resolveChipotleLegacyId("minute-maid-lemonade-fountain-32-fl-oz").status,
    "obsolete",
  );
  assert.equal(resolveChipotleLegacyId("chicken").status, "ambiguous");
  assert.equal(resolveChipotleLegacyId("tortilla").status, "ambiguous");
  assert.equal(CHIPOTLE_LEGACY_COMPATIBILITY_SUMMARY.ambiguousWithoutContextIds, 13);
  assert.equal(CHIPOTLE_LEGACY_COMPATIBILITY_SUMMARY.obsoleteIds, 9);
});

test("generated presentation lookup replaces old entreeGroup filtering", () => {
  assert.equal(
    chipotlePresentationGroupForCompatibleId("chips"),
    "chips-sides",
  );
  assert.equal(
    chipotlePresentationGroupForCompatibleId("chipotle-cmg-2810"),
    "drinks",
  );
  assert.equal(
    chipotlePresentationGroupForCompatibleId(
      "chipotle-meal-6ba21999-f6b8-4a83-803a-bf68ef319c5e",
    ),
    "high-protein-menu",
  );

  const cup = CHIPOTLE_GENERATED_RUNTIME_MENU.items.find(
    (item) => item.id === "chipotle-cmg-1125",
  );
  assert.ok(cup);
  assert.equal(isChipotleHighProteinMenuItem(cup, "chipotle"), true);
  assert.equal(isChipotleProteinCupItem(cup, "chipotle"), true);
});

test("every canonical homepage Chipotle editorial ID exists in generated data", () => {
  const records = new Set([
    ...CHIPOTLE_GENERATED_RUNTIME_MENU.items.map((item) => item.id),
    ...(CHIPOTLE_GENERATED_RUNTIME_MENU.ingredients ?? []).map(
      (ingredient) => ingredient.id,
    ),
  ]);
  const refs = [
    CHIPOTLE_HOMEPAGE_EDITORIAL.previewItem,
    ...CHIPOTLE_HOMEPAGE_EDITORIAL.buildItems.flatMap((entry) => [
      entry.item,
      ...entry.addOns,
    ]),
    ...CHIPOTLE_HOMEPAGE_EDITORIAL.reviewItems.map((entry) => entry.item),
  ];
  assert.deepEqual(
    refs.filter((ref) => !records.has(ref.id)),
    [],
  );
  assert.ok(refs.every((ref) => ref.id.startsWith("chipotle-")));
});
