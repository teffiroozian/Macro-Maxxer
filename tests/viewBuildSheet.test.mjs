import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import drawerModule from "../components/restaurant-view/BuildSummaryDrawer.tsx";
import barModule from "../components/StickyMacroTotalsBar.tsx";
import chartModule from "../components/nutrition/MacroSplitChart.tsx";
import { buildMacroSegments } from "../components/nutrition/macroSegments.ts";
const Drawer = drawerModule.default ?? drawerModule;
const Bar = barModule.default ?? barModule;
const Chart = chartModule.default ?? chartModule;
const totals = { calories: 260, protein: 20, carbs: 20, totalFat: 10, fiber: 3, sugars: 0, sodium: 300 };

test("macro split uses 4/4/9 calories and updates when portions change", () => {
  const segments = buildMacroSegments({ protein: 20, carbs: 20, fat: 10 });
  assert.deepEqual(segments.map((segment) => segment.percent), [32, 32, 36]);
  assert.equal(segments.reduce((sum, segment) => sum + segment.percent, 0), 100);
  const markup = renderToStaticMarkup(React.createElement(Chart, { segments }));
  assert.match(markup, /width:32%/);
  assert.match(markup, /width:36%/);
  assert.match(markup, /Fat 10g, 36% of macro calories/);
  const changed = buildMacroSegments({ protein: 40, carbs: 20, fat: 10 });
  assert.ok(changed[0].percent > segments[0].percent);
  assert.ok(changed[2].percent < segments[2].percent);
  assert.ok(buildMacroSegments({ protein: 0, carbs: 0, fat: 0 }).every((segment) => segment.percent === 0));
});

test("View Build has a close button outside its independent scroller and a full-width chart", () => {
  const markup = renderToStaticMarkup(React.createElement(Drawer, {
    adjustedNutritionLabelTotals: totals, selectedBuildName: "Chicken Bowl", selectedEntreeLabel: "Bowl", selectedIngredientCount: 0,
    groupedSelectedIngredientEntries: [], ingredientPortionLabelById: {}, lockedIngredientIds: new Set(), restaurantLogo: "/logo.svg",
    onAdjustIngredientQuantity() {}, onClose() {}, variant: "panel",
  }));
  assert.match(markup, /aria-label="Close build summary"/);
  assert.ok(markup.indexOf('aria-label="Close build summary"') < markup.indexOf('overflow-y-auto overscroll-contain lg:hidden'));
  assert.match(markup, /group -mx-2 flex w-full min-w-0/);
});

test("mobile View Build caps the entire sheet at 90dvh and preserves its non-scrolling footer", () => {
  const markup = renderToStaticMarkup(React.createElement(Bar, {
    totals, detailsOpen: true, detailsContent: React.createElement("div", null, "Build content"), onSecondaryAction() {},
  }));
  assert.match(markup, /max-height:min\(90dvh, calc\(100dvh - var\(--safe-area-top\)/);
  assert.match(markup, /h-\[90dvh\]/);
  assert.match(markup, /min-h-0 flex-1 overflow-hidden transition-\[max-height\]/);
  assert.match(markup, /shrink-0 px-4 pt-2 pb-\[max\(1rem,env\(safe-area-inset-bottom\)\)\]/);
});
