import test from "node:test";
import assert from "node:assert/strict";
import { getRankingCardMacroKeys } from "../lib/menuItemCard/rankingMacroDisplay.ts";
import { macroDisplayConfig, macroOrder } from "../components/nutrition/macroDisplay.ts";
import { macroColorTokens } from "../components/nutrition/macroColorTokens.ts";
import { proteinScoreTierStyles } from "../components/nutrition/proteinScoreStyles.ts";

test("Fiber alone automatically replaces carbs/fat while ordinary and cart macro order stays intact", () => {
  assert.deepEqual(getRankingCardMacroKeys("fiber"), ["calories", "protein", "fiber"]);
  for (const metric of [undefined, "protein", "calories", "protein-score", "carbs", "fat"]) assert.deepEqual(getRankingCardMacroKeys(metric), ["calories", "protein", "carbs", "totalFat"]);
  assert.deepEqual(macroOrder, ["calories", "protein", "carbs", "totalFat"]);
  assert.equal(macroDisplayConfig.fiber.label, "Fiber");
  assert.equal(macroDisplayConfig.fiber.unit, "g");
});
test("Protein Score restores its original tiers and Fiber retains green", () => {
  assert.equal(macroColorTokens.fiber.valueClassName, "text-[#047857]");
  assert.equal(proteinScoreTierStyles.elite.value, "text-[#047857]");
  assert.equal(proteinScoreTierStyles.elite.iconWrap, "bg-[#047857]");
  assert.equal(proteinScoreTierStyles.elite.chip, "bg-[#ECFDF3]");
  for (const styles of Object.values(proteinScoreTierStyles)) {
    assert.ok(!JSON.stringify(styles).includes("6366F1"));
  }
});

test("both List and Grid render only Calories, Protein and Fiber in Fiber mode", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const imported = await import("../components/menu-item-card/MenuItemMacroSummary.tsx");
  const Component = imported.default.default ?? imported.default;
  const base = { displayCalories: 400, displayProtein: 30, displayCarbs: 40, displayFat: 10, displayFiber: 7, caloriesDelta: 0, proteinDelta: 0, carbsDelta: 0, fatDelta: 0, quantityMultiplier: 1, hasActiveCustomization: false, actions: null };
  for (const rankedLayout of ["list", "grid"]) {
    const focused = renderToStaticMarkup(createElement(Component, { ...base, rankedLayout, rankMetric: "fiber" }));
    assert.match(focused, />FIBER</);
    assert.match(focused, />7g</);
    assert.doesNotMatch(focused, />CARBS</);
    assert.doesNotMatch(focused, />FAT</);
    const normal = renderToStaticMarkup(createElement(Component, { ...base, rankedLayout, rankMetric: "protein" }));
    assert.match(normal, />CARBS</);
    assert.match(normal, />FAT</);
    assert.doesNotMatch(normal, />FIBER</);
  }
});

test("manual display choices survive sort changes and clearing the override restores automatic display", () => {
  for (const metric of ["fiber", "protein", "calories"]) {
    assert.deepEqual(getRankingCardMacroKeys(metric, "standard"), ["calories", "protein", "carbs", "totalFat"]);
    assert.deepEqual(getRankingCardMacroKeys(metric, "fiber"), ["calories", "protein", "fiber"]);
  }
  assert.deepEqual(getRankingCardMacroKeys("fiber", undefined), ["calories", "protein", "fiber"]);
  assert.deepEqual(getRankingCardMacroKeys("protein", undefined), ["calories", "protein", "carbs", "totalFat"]);
});

test("manual display overrides render consistently in shared mobile, List and Grid macro rows", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const imported = await import("../components/menu-item-card/MenuItemMacroSummary.tsx");
  const Component = imported.default.default ?? imported.default;
  const base = { displayCalories: 400, displayProtein: 30, displayCarbs: 40, displayFat: 10, displayFiber: 7, caloriesDelta: 0, proteinDelta: 0, carbsDelta: 0, fatDelta: 0, quantityMultiplier: 1, hasActiveCustomization: false, actions: null };
  for (const rankedLayout of [undefined, "list", "grid"]) {
    const standard = renderToStaticMarkup(createElement(Component, { ...base, rankedLayout, rankMetric: "fiber", cardDisplayOverride: "standard" }));
    assert.match(standard, />CARBS</);
    assert.match(standard, />FAT</);
    assert.doesNotMatch(standard, />FIBER</);
    const fiber = renderToStaticMarkup(createElement(Component, { ...base, rankedLayout, rankMetric: "calories", cardDisplayOverride: "fiber" }));
    assert.match(fiber, />FIBER</);
    assert.doesNotMatch(fiber, />CARBS</);
  }
});

test("filter Reset clears display intent and display choices do not change eligible results", async () => {
  const { selectCategoryPreset } = await import("../lib/menuSections/categoryPresets.ts");
  const { filterMenuItems } = await import("../lib/menuSections/filtering.ts");
  const preset = { id: "main", label: "Main menu", ids: ["breakfast"] };
  const reset = selectCategoryPreset({}, preset);
  assert.equal(reset.cardDisplayOverride, undefined);
  assert.deepEqual(getRankingCardMacroKeys("fiber", reset.cardDisplayOverride), ["calories", "protein", "fiber"]);
  const items = [{ id: "one", name: "One", category: "breakfast", nutrition: { calories: 200, protein: 10, carbs: 20, totalFat: 5 } }];
  const context = { items, searchTerms: [], rankedChildSelections: {}, isRankingView: false };
  assert.deepEqual(filterMenuItems({ ...context, filters: { ...reset, cardDisplayOverride: "fiber" } }), filterMenuItems({ ...context, filters: reset }));
});
