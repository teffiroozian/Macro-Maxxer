import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import actionsModule from "../components/menu-item-card/MenuCardActions.tsx";
import statModule from "../components/nutrition/MacroStat.tsx";
import { macroColorTokens } from "../components/nutrition/macroColorTokens.ts";
import { macroDisplayConfig } from "../components/nutrition/macroDisplay.ts";

const Actions = actionsModule.default ?? actionsModule;
const Stat = statModule.default ?? statModule;

test("redesigned compact and full menu actions retain meal wording, responsive details and add feedback", () => {
  const props = { itemName: "Chicken Bowl", isAddFeedbackVisible: false, onQuickAdd() {}, onViewDetails() {} };
  const compact = renderToStaticMarkup(React.createElement(Actions, { ...props, compactMobile: true }));
  const full = renderToStaticMarkup(React.createElement(Actions, props));
  assert.match(compact, />\+ Add<\/button>/);
  assert.match(compact, /hidden lg:inline-flex/);
  assert.match(full, />Add to Meal<\/button>/);
  for (const html of [compact, full]) {
    assert.match(html, /aria-label="Quick add Chicken Bowl to meal"/);
    assert.doesNotMatch(html, /to cart/);
  }
  const feedback = renderToStaticMarkup(React.createElement(Actions, { ...props, compactMobile: true, isAddFeedbackVisible: true }));
  assert.match(feedback, /disabled=""/);
  assert.match(feedback, />Added<\/button>/);
});

test("every redesigned metric supports compact styling and fiber renders through all card sizes", () => {
  for (const metric of Object.keys(macroDisplayConfig)) {
    for (const role of ["valueClassName", "compactValueClassName", "barValueClassName", "segmentClassName"]) {
      assert.equal(typeof macroColorTokens[metric][role], "string", `${metric}.${role}`);
      assert.ok(macroColorTokens[metric][role].length > 0);
    }
  }
  for (const size of ["gridCard", "card", "quick", "cartCompact", "ingredientCompact"]) {
    const html = renderToStaticMarkup(React.createElement(Stat, { macroKey: "fiber", value: 7, size, labelStyle: "ingredient" }));
    assert.match(html, /7g/);
    assert.match(html, /Fiber/);
    assert.match(html, /dark:text-accent-strong/);
    assert.doesNotMatch(html, /undefined/);
  }
});

test("mobile grid macro values use compact contrast while desktop retains saturated fat", () => {
  const grid = renderToStaticMarkup(React.createElement(Stat, { macroKey: "totalFat", value: 10, size: "gridCard" }));
  assert.match(grid, /dark:text-slate-300/);
  assert.match(grid, /dark:lg:text-\[#336dfa\]/);
  assert.match(grid, /text-lg leading-none font-bold lg:text-xl/);
});
