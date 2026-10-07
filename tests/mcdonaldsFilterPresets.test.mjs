import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getRestaurantData } from "../lib/restaurants.ts";
import { getOfficialRankingItems } from "../lib/menuSections/ranking.ts";
import { getCategoryPresets, selectCategoryPreset } from "../lib/menuSections/categoryPresets.ts";
import { filterMenuItems } from "../lib/menuSections/filtering.ts";
const restaurant = await getRestaurantData("mcdonalds");
const rows = getOfficialRankingItems(restaurant.items.filter((item) => !item.sourceOnly));
const presets = Object.fromEntries(getCategoryPresets(rows, "mcdonalds").map((preset) => [preset.id, preset]));
const common = { items: rows, searchTerms: [], rankedChildSelections: {}, isRankingView: true, filterRankingCategories: false, rankingSort: "highest-protein" };

test("McDonald's category presets use normalized runtime taxonomy without changing Customize", () => {
  assert.deepEqual(presets.main.ids, ["burgers", "breakfast", "mcnuggets & strips", "chicken & fish", "snack wraps"]);
  assert.deepEqual(presets.drinks.ids, ["drinks", "mccafé", "sweets & treats"]);
  assert.deepEqual(presets.sauces.ids, ["sauces & condiments"]);
  for (const key of ["main", "drinks", "sauces"]) {
    const filters = selectCategoryPreset({}, presets[key]);
    const result = filterMenuItems({ ...common, filters });
    assert.ok(result.length > 0, key);
    assert.ok(result.every((row) => row.categories.some((category) => presets[key].ids.includes(category.toLowerCase()))), key);
  }
  for (const id of ["drinks", "fries & sides", "sweets & treats", "mccafé", "sauces & condiments"]) assert.ok(!presets.main.ids.includes(id));
  for (const id of presets.drinks.ids) assert.ok(presets.all.ids.includes(id));
  const sauces = filterMenuItems({ ...common, filters: selectCategoryPreset({}, presets.sauces) });
  const expected = rows.filter((row) => row.categories.includes("Sauces & Condiments"));
  assert.equal(sauces.length, expected.length); // same candidates used by Show N items
});

test("generated fries images are the source of truth for all runtime sizes", async () => {
  const generated = JSON.parse(await readFile(new URL("../data/restaurants/mcdonalds/generated/restaurant.json", import.meta.url), "utf8"));
  const reviewed = JSON.parse(await readFile(new URL("../data/restaurants/mcdonalds/review/image-overrides.json", import.meta.url), "utf8"));
  const source = generated.items.find((item) => item.id === "mcd-item-200066");
  const runtime = restaurant.items.find((item) => item.id === source.id);
  assert.equal(source.image, reviewed["200066"].imageUrl);
  assert.equal(runtime.image, source.image);
  assert.equal(source.variants.length, 4);
  for (const variant of source.variants) {
    assert.equal(variant.image, reviewed[variant.id.replace("mcd-item-", "")].imageUrl);
    assert.equal(runtime.variants.find((candidate) => candidate.id === variant.id).image, variant.image);
    assert.ok(variant.image.startsWith("https://s7d1.scene7.com/is/image/mcdonalds/"));
  }
});

test("20/40-piece nugget variants are data-owned shareables and excluded from Main entrées", async () => {
  const ids = ["mcd-item-200573", "mcd-item-200577", "mcd-item-203836", "mcd-item-203838"];
  const generated = JSON.parse(await readFile(new URL("../data/restaurants/mcdonalds/generated/restaurant.json", import.meta.url), "utf8"));
  for (const id of ids) {
    const sourceVariant = generated.items.flatMap((item) => item.variants ?? []).find((variant) => variant.id === id);
    const runtimeVariant = restaurant.items.flatMap((item) => item.variants ?? []).find((variant) => variant.id === id);
    assert.deepEqual(sourceVariant.categories, ["shareables"]);
    assert.deepEqual(runtimeVariant.categories, ["shareables"]);
    assert.deepEqual(runtimeVariant.nutrition, sourceVariant.nutrition);
    assert.equal(runtimeVariant.image, sourceVariant.image);
    assert.equal(runtimeVariant.label, sourceVariant.label);
  }
  const shareables = filterMenuItems({ ...common, filters: selectCategoryPreset({}, presets.shareables) });
  assert.deepEqual(shareables.map((item) => item.defaultVariantId).sort(), [...ids].sort());
  const main = filterMenuItems({ ...common, filters: selectCategoryPreset({}, presets.main) });
  assert.equal(main.length, 46);
  assert.equal(shareables.length, 4);
  assert.ok(main.every((item) => !ids.includes(item.defaultVariantId)));
  const all = filterMenuItems({ ...common, filters: selectCategoryPreset({}, presets.all) });
  assert.ok(ids.every((id) => all.some((item) => item.defaultVariantId === id)));
});
