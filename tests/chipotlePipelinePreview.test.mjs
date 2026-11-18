import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

import { CHIPOTLE_GENERATED_RUNTIME_MENU as live } from "../lib/restaurantBuilders/chipotle/generatedRuntimeAdapter.ts";
import { getChipotleBuilderEntryHref, parseChipotleBuilderNavState } from "../lib/restaurantBuilders/chipotle/builderNavigation.ts";
import { getIngredientCategoryMaxSelections, resolveIncludedIngredientIds } from "../lib/restaurantBuilders/chipotle/index.ts";
import { buildChipotleIngredientMenuItems } from "../lib/restaurantBuilders/chipotle/ingredientMenuItems.ts";
import { getChipotlePipelinePreviewMenu } from "../lib/restaurantBuilders/chipotle/pipelinePreview.ts";

const preview = getChipotlePipelinePreviewMenu();

const ENTREES = ["burrito", "bowl", "salad", "quesadilla", "taco"];

function builderItems(menu, selectedEntree) {
  const { builderConfig, ingredients } = menu;
  const options = { selectedEntree, selectedKidsMeal: "build-your-own", selectedTacoShell: "soft", selectedTacoCount: 3, builderConfig };
  const includedIds = resolveIncludedIngredientIds(options);
  return buildChipotleIngredientMenuItems({
    restaurantId: "chipotle",
    ingredients,
    selectedEntree,
    selectedTacoCount: 3,
    selectedKidsMeal: "build-your-own",
    selectedIncludedIngredientIds: includedIds,
    tacoShellIngredientIds: builderConfig.chipotle.tacoShellIngredientIds,
    getIngredientPortionMultiplier: () => 1,
    getSelectedIngredientPortionMultiplier: () => 1,
    builderConfig,
  });
}

test("preview menu runs through the live Chipotle runtime adapter", () => {
  assert.equal(preview.hasBuildYourOwn, true);
  assert.deepEqual(Object.keys(preview.builderConfig.entreeOptions).sort(), Object.keys(live.builderConfig.entreeOptions).sort());
  for (const id of ["chipotle-burrito", "chipotle-bowl", "chipotle-cmg-1007"]) assert.ok(preview.items.some((item) => item.id === id), id);
});

test("a drink size the pipeline withholds is dropped, never given another drink's nutrition", () => {
  // The 32 fl oz Caffeine Free Diet Coke has no published carbs, so the
  // pipeline withholds it; its card must not borrow the cup's default flavor.
  const card = preview.items.find((item) => item.id === "chipotle-fountain-22-fl-oz-diet-coke-caffeine-free");
  assert.deepEqual(card.variants.map((variant) => variant.label), ["22 fl oz"]);
  const records = new Map([...preview.items, ...preview.ingredients].flatMap((record) => (record.variants ?? []).map((variant) => [variant.id, variant])));
  for (const item of preview.items) {
    for (const variant of item.variants ?? []) {
      if (!variant.canonicalItemId) continue;
      const own = [...preview.items, ...preview.ingredients].find((record) => record.id === variant.canonicalItemId);
      const source = own?.variants?.find((entry) => entry.id === variant.id) ?? (own && !own.variants ? own : records.get(variant.id));
      if (source?.nutrition) assert.equal(variant.nutrition.calories, source.nutrition.calories, `${item.name} › ${variant.label}`);
    }
  }
});

test("catering builders are not in the preview; the single taco uses official one-tortilla panels", () => {
  for (const id of ["chipotle-byoprotein", "chipotle-byochips"]) assert.ok(!preview.items.some((item) => item.id === id), id);
  const soft = preview.ingredients.find((ingredient) => ingredient.id === "chipotle-tortilla-soft-flour-taco");
  const crispy = preview.ingredients.find((ingredient) => ingredient.id === "chipotle-tortilla-crispy-corn-taco");
  assert.deepEqual([soft.nutrition.calories, soft.nutrition.totalFat, crispy.nutrition.calories], [80, 2.5, 70]);
  assert.ok(!preview.ingredients.some((ingredient) => /contentgroup|^chipotle-proteins-/.test(ingredient.id)));
  // "Cheese Only" is the no-protein choice, not a second portion of cheese.
  const kids = preview.items.find((item) => item.id === "chipotle-kids-quesadilla");
  assert.ok(kids.customization.ingredientCategories.find((category) => category.name === "Protein").allowNone);
  assert.ok(!preview.ingredients.some((ingredient) => ingredient.name === "Cheese Only"));
  assert.ok(preview.items.every((item) => item.name === item.name.trim()));
});

for (const entree of ENTREES) {
  test(`preview menu drives the ${entree} builder like the live menu`, () => {
    const liveItems = builderItems(live, entree);
    const previewItems = builderItems(preview, entree);
    const core = (items) =>
      new Map(items.map((item) => [item.id, [item.nutrition.calories, item.nutrition.protein, item.nutrition.carbs, item.nutrition.totalFat]]));
    const a = core(liveItems);
    const b = core(previewItems);
    const shared = [...a.keys()].filter((id) => b.has(id));
    assert.ok(shared.length >= a.size * 0.8, `${entree}: ${shared.length} of ${a.size} live builder options present`);
    // Shared options must carry the same core macros. Known exception: the
    // kids 16 fl oz soda, whose default flavor is the first PDF row rather
    // than Coca-Cola.
    const known = (id) => id === "chipotle-cmg-5551";
    const differing = shared.filter((id) => JSON.stringify(a.get(id)) !== JSON.stringify(b.get(id)) && !known(id));
    assert.deepEqual(differing, [], entree);
  });
}

for (const enabled of [false, true]) {
  test(`menu, cart and persisted build use the same Chipotle catalog (preview ${enabled})`, () => {
    const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", `
      import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
      import { getRestaurantData } from "./lib/restaurants.ts";
      import { getRestaurantItemRouteData } from "./lib/restaurantItemRouteData.ts";
      import {
        getCartRestaurantMenu,
        resolveCartItemMainItem,
        resolveCartItemCustomizationCards,
      } from "./lib/cart/cartItemLookup.ts";
      import {
        fromUniversalChipotleBuildConfiguration,
        toUniversalChipotleBuildConfiguration,
      } from "./lib/restaurantBuilders/chipotle/cartAdapter.ts";
      import { CHIPOTLE_GENERATED_RUNTIME_MENU as production } from "./lib/restaurantBuilders/chipotle/generatedRuntimeAdapter.ts";
      import { getChipotlePipelinePreviewMenu } from "./lib/restaurantBuilders/chipotle/pipelinePreview.ts";

      const preview = ${enabled};
      const expected = preview ? getChipotlePipelinePreviewMenu() : production;
      const menu = await getRestaurantData("chipotle");
      assert.equal(getCartRestaurantMenu("chipotle"), expected);
      assert.equal(menu.builderConfig, expected.builderConfig);
      assert.equal(menu.ingredients, expected.ingredients);

      if (preview) {
        const id = "chipotle-cmg-6112";
        const utensils = menu.items.find((item) => item.id === id);
        assert.equal(utensils.sourceOnly, true);
        assert.equal(utensils.nutrition, undefined);
        assert.equal(await getRestaurantItemRouteData("chipotle", id), null);
        assert.equal(resolveCartItemMainItem({ restaurantId: "chipotle", itemId: id, selection: { type: "standard" } }), null);
      }

      const drinkId = "chipotle-fountain-32-fl-oz";
      const variantId = "chipotle-fountain-32-fl-oz-diet-coke-caffeine-free";
      const drink = { restaurantId: "chipotle", itemId: drinkId, selection: { type: "standard" } };
      assert.equal(resolveCartItemMainItem(drink).nutrition.calories, preview ? 430 : 380);
      const savedDrink = { ...drink, selection: { ...drink.selection, variantId } };
      assert.equal(Boolean(resolveCartItemMainItem(savedDrink)), !preview);
      assert.equal(Boolean(await getRestaurantItemRouteData("chipotle", drinkId, variantId)), !preview);
      const legacyDrink = {
        ...drink,
        itemId: "diet-coke-fountain",
        selection: { type: "standard", variantId: "diet-coke-fountain-32-fl-oz" },
      };
      assert.equal(resolveCartItemMainItem(legacyDrink).variantLabel, "Diet Coke");

      const cheeseId = "chipotle-cheese-base";
      const persisted = JSON.parse(JSON.stringify({
        baseItemId: "tacos",
        ingredients: [
          { id: "chicken", quantity: 1, portion: "half" },
          { id: cheeseId, quantity: 1 },
        ],
        options: { selectedTacoCount: 3 },
      }));
      const build = fromUniversalChipotleBuildConfiguration(persisted);
      const chickenId = "chipotle-protein-chicken-tacos-3";
      assert.deepEqual(build.selectedIngredientItems[chickenId], { quantity: 1 });
      assert.equal(build.splitPortionModeById[chickenId], "half");
      const savedBuild = {
        restaurantId: "chipotle",
        itemId: "chipotle-build",
        selection: { type: "build-your-own", buildConfiguration: persisted },
      };
      const cards = resolveCartItemCustomizationCards(savedBuild);
      assert.equal(cards[0].name, "Chicken");
      assert.ok(cards[0].nutrition);
      assert.equal(cards[1].nutrition?.calories, preview ? 110 : undefined);

      savedBuild.selection.buildConfiguration = toUniversalChipotleBuildConfiguration(build);
      assert.deepEqual(resolveCartItemCustomizationCards(savedBuild).map((card) => card.nutrition),
        cards.map((card) => card.nutrition));
      const chicken = savedBuild.selection.buildConfiguration.ingredients.find((entry) => entry.id === chickenId);
      chicken.variantId = "chipotle-withheld-test-variant";
      assert.equal(Boolean(resolveCartItemCustomizationCards(savedBuild)[0].nutrition), !preview);
    `], {
      encoding: "utf8",
      env: { ...process.env, NEXT_PUBLIC_CHIPOTLE_PIPELINE_PREVIEW: enabled ? "1" : "0" },
    });
    assert.ifError(result.error);
    assert.equal(result.status, 0, result.stderr || result.stdout);
  });
}

test("Chipotle builder deep links use the real entrée configuration in both catalogs", () => {
  for (const menu of [live, preview]) {
    const href = getChipotleBuilderEntryHref("/restaurant/chipotle", "chipotle-bowl", menu.builderConfig);
    const url = new URL(href, "https://example.test");
    assert.equal(url.searchParams.get("view"), "ingredients");
    assert.equal(parseChipotleBuilderNavState(url.searchParams, menu.builderConfig.entreeOptions, "all").entree, "bowl");
    assert.equal(getChipotleBuilderEntryHref("/restaurant/chipotle", "chipotle-cmg-1002", menu.builderConfig), undefined);
    assert.equal(getIngredientCategoryMaxSelections({
      category: "proteins", selectedEntree: "bowl", selectedKidsMeal: "build-your-own", builderConfig: menu.builderConfig,
    }), 2);
    assert.equal(getIngredientCategoryMaxSelections({
      category: "side", selectedEntree: "kids-meal", selectedKidsMeal: "build-your-own", builderConfig: menu.builderConfig,
    }), 1);
  }
});

test("all 11 curated meals retain verified defaults and reopen legacy cart selections", async () => {
  const { buildHighProteinBuildConfiguration, isChipotleEditablePresetBuildItem } = await import("../lib/restaurantBuilders/chipotle/highProtein.ts");
  const { calculateChipotlePresetNutrition } = await import("../lib/restaurantBuilders/chipotle/nutrition.ts");
  const { fromUniversalChipotleBuildConfiguration, toUniversalChipotleBuildConfiguration } = await import("../lib/restaurantBuilders/chipotle/cartAdapter.ts");
  const { serializeCartItems, deserializeCartItems } = await import("../lib/cart/persistence.ts");
  const presets = live.items.filter((item) => item.source?.generated?.menu.role === "preconfigured_meal");
  assert.equal(presets.length, 11);
  assert.equal(preview.items.filter((item) => item.mealPreset).length, 11);

  for (const original of presets) {
    const item = preview.items.find(({ id }) => id === original.id);
    assert.ok(isChipotleEditablePresetBuildItem(item, "chipotle"), original.name);
    assert.deepEqual(item.ingredients, original.ingredients);
    assert.equal(item.mealPreset.builderItemId, original.source.generated.menu.buildBaseItemId);
    assert.deepEqual(item.nutrition, original.nutrition);
    const legacy = buildHighProteinBuildConfiguration(original, live.ingredients);
    const factory = buildHighProteinBuildConfiguration(item, preview.ingredients);
    assert.deepEqual(factory, legacy, original.name);
    const saved = { id: item.id, itemId: item.id, restaurantId: "chipotle", name: item.name,
      image: item.image, quantity: 1, macrosPerItem: item.nutrition, nutritionPerItem: item.nutrition,
      selection: { type: "build-your-own", buildConfiguration: toUniversalChipotleBuildConfiguration(legacy) } };
    const [restored] = deserializeCartItems(serializeCartItems([saved]));
    const current = fromUniversalChipotleBuildConfiguration(restored.selection.buildConfiguration);
    assert.deepEqual(calculateChipotlePresetNutrition(item, current, preview.ingredients).nutrition, item.nutrition, item.name);
  }

  const bowl = preview.items.find(({ name }) => name === "Double High Protein Bowl");
  const edit = buildHighProteinBuildConfiguration(bowl, preview.ingredients);
  const lightRice = bowl.mealPreset.selections.find(({ quantity }) => quantity === 0.5);
  edit.selectedIngredientItems[lightRice.itemId].quantity = 1;
  assert.equal(calculateChipotlePresetNutrition(bowl, edit, preview.ingredients).nutrition.calories, 865);
});
