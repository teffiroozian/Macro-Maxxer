import assert from "node:assert/strict";
import { test } from "node:test";

import generatedChipotle from "../data/generated/chipotle/restaurant.json" with { type: "json" };
import {
  CHIPOTLE_BROWSE_TAXONOMY,
  CHIPOTLE_GENERATED_PRESENTATION_CONFIG,
  CHIPOTLE_INGREDIENT_CATEGORY_PRESENTATION,
  CHIPOTLE_PRESENTATION_CARDS,
  CHIPOTLE_PRESENTATION_NAVIGATION,
  chipotlePresentationGroupForGeneratedId,
  validateChipotleGeneratedPresentation,
} from "../data/restaurants/chipotle-generated-presentation.ts";

test("generated Chipotle presentation adapter passes its integrity checks", () => {
  const result = validateChipotleGeneratedPresentation();
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.unplacedBrowseableItemIds, []);
  assert.equal(result.browseableItemIds.length, 66);
  assert.equal(result.officialImageRecordIds.length, 148);
  assert.deepEqual(
    result.fallbackImageRecordIds.sort(),
    ["chipotle-cmg-6110", "chipotle-cmg-6111", "chipotle-cmg-6112"],
  );
  assert.deepEqual(result.fallbackImageRecordIds.sort(), result.sourceOnlyRecordIds.sort());
});

test("legacy navigation labels resolve only to generated records or browse groups", () => {
  assert.deepEqual(
    CHIPOTLE_PRESENTATION_NAVIGATION.map(({ id, label }) => [id, label]),
    [
      ["bowl", "Bowl"],
      ["burrito", "Burrito"],
      ["quesadilla", "Quesadilla"],
      ["salad", "Salad"],
      ["tacos", "Tacos"],
      ["high-protein-menu", "High Protein Menu"],
      ["kids-meal", "Kids"],
      ["chips-sides", "Chips & Sides"],
      ["drinks", "Drinks"],
    ],
  );
  assert.equal(chipotlePresentationGroupForGeneratedId("chipotle-bowl"), "bowl");
  assert.equal(chipotlePresentationGroupForGeneratedId("chipotle-cmg-1141"), "high-protein-menu");
  assert.equal(chipotlePresentationGroupForGeneratedId("chipotle-cmg-2810"), "drinks");
});

test("presentation families keep every generated record and variant identity intact", () => {
  const generatedRecords = new Map(
    [...generatedChipotle.items, ...generatedChipotle.ingredients].map((record) => [record.id, record]),
  );
  for (const card of CHIPOTLE_PRESENTATION_CARDS) {
    for (const member of card.members) {
      const generatedRecord = generatedRecords.get(member.recordId);
      assert.ok(generatedRecord, `${card.id}: ${member.recordId}`);
      if (member.variantId) {
        assert.ok(
          generatedRecord.variants?.some((variant) => variant.id === member.variantId),
          `${card.id}: ${member.variantId}`,
        );
      }
    }
  }
  assert.equal(
    CHIPOTLE_PRESENTATION_CARDS.filter((card) => card.members.length > 1).length,
    40,
  );
  assert.equal(
    CHIPOTLE_PRESENTATION_CARDS.filter((card) => card.id.startsWith("fountain-")).length,
    23,
  );
});

test("browse taxonomy and ingredient presentation preserve approved labels and order", () => {
  assert.deepEqual(
    CHIPOTLE_BROWSE_TAXONOMY.map((category) => category.label),
    [
      "Chips & Dips",
      "Single Sides",
      "Protein Meals",
      "Protein Cups",
      "Drinks",
      "Fountain Drinks",
      "Tractor Beverages",
      "Kids Drinks",
      "Kids",
    ],
  );
  assert.deepEqual(
    [...new Set(Object.values(CHIPOTLE_INGREDIENT_CATEGORY_PRESENTATION)
      .sort((left, right) => left.displayOrder - right.displayOrder)
      .map((category) => category.label))],
    ["Included Ingredients", "Proteins", "Rice", "Beans", "Toppings", "Side"],
  );
  assert.equal(CHIPOTLE_GENERATED_PRESENTATION_CONFIG.kidsFruit.generatedId, "chipotle-cmg-1402");
  assert.match(CHIPOTLE_GENERATED_PRESENTATION_CONFIG.kidsFruit.image, /cmg-1402-kids-fruit/i);
});
