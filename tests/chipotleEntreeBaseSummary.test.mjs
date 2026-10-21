import assert from "node:assert/strict";
import { test } from "node:test";
import { getEntreeBaseSummary } from "../components/restaurant-view/chipotle/entreeBaseSummary.ts";
import { CHIPOTLE_GENERATED_RUNTIME_MENU as menu } from "../lib/restaurantBuilders/chipotle/generatedRuntimeAdapter.ts";

const { ingredients, builderConfig } = menu;

function withKidsOptions(ids) {
  return {
    ...builderConfig,
    chipotle: {
      ...builderConfig.chipotle,
      kidsMealOptions: builderConfig.chipotle.kidsMealOptions.filter(({ id }) => ids.includes(id)),
    },
  };
}

test("Kid's starting macros all come from the lowest-calorie configured meal and shell", () => {
  const candidates = ["crispy", "soft"].map((shell) => {
    const config = withKidsOptions(["build-your-own"]);
    config.chipotle = {
      ...config.chipotle,
      kidsBuildYourOwnTortillaIdsByOption: {
        crispy: builderConfig.chipotle.kidsBuildYourOwnTortillaIdsByOption[shell],
        soft: builderConfig.chipotle.kidsBuildYourOwnTortillaIdsByOption[shell],
      },
    };
    return getEntreeBaseSummary("kids-meal", ingredients, config);
  });
  candidates.push(getEntreeBaseSummary("kids-meal", ingredients, withKidsOptions(["quesadilla"])));
  candidates.forEach(({ nutrition }) => assert.ok(nutrition));
  const lowest = candidates.reduce((a, b) => a.nutrition.calories <= b.nutrition.calories ? a : b);
  const summary = getEntreeBaseSummary("kids-meal", ingredients, builderConfig);
  assert.deepEqual(summary, lowest);
  assert.match(summary.description, /Kid's Build Your Own: 2 Crispy Corn Tortillas/);
});

test("missing nutrition for any kid's base does not fabricate a minimum", () => {
  const missingId = builderConfig.chipotle.kidsQuesadillaIncludedIngredientIds[0];
  const summary = getEntreeBaseSummary("kids-meal", ingredients.filter(({ id }) => id !== missingId), builderConfig);
  assert.equal(summary.nutrition, null);
});

test("bowl has an empty required base and category cards have no defined base", () => {
  const bowl = getEntreeBaseSummary("bowl", ingredients, builderConfig);
  assert.deepEqual(bowl.nutrition, { calories: 0, protein: 0, carbs: 0, totalFat: 0 });
  assert.equal(bowl.description, "No required ingredients");
  for (const id of ["high-protein-menu", "chips-sides", "drinks"]) {
    assert.equal(getEntreeBaseSummary(id, ingredients, builderConfig).nutrition, null);
  }
});
