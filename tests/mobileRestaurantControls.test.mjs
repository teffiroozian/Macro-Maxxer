import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import controlsModule from "../components/ControlsRow.tsx";
import rankModule, { RankSelection } from "../components/controls/RankOptions.tsx";
import layoutModule from "../components/controls/ResultLayoutToggle.tsx";
import entreeModule from "../components/controls/EntreeOptions.tsx";
import panelModule from "../components/controls/RestaurantFiltersPanel.tsx";

const Controls = controlsModule.default ?? controlsModule;
const RankOptions = rankModule.default ?? rankModule;
const LayoutToggle = layoutModule.default ?? layoutModule;
const EntreeOptions = entreeModule.default ?? entreeModule;
const Panel = panelModule.default ?? panelModule;
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
const items = [
  { id: "chicken", name: "Chicken", categories: ["chicken"], servingType: "entree", nutrition: { calories: 200, protein: 30, carbs: 5, totalFat: 6 } },
  { id: "salad", name: "Salad", categories: ["salads"], servingType: "entree", nutrition: { calories: 150, protein: 15, carbs: 5, totalFat: 6 } },
];
const controls = (filters, overrides = {}) => {
  const markup = render(Controls, {
    restaurantId: "chickfila", view: "ranking", sort: "highest-protein", filters,
    calorieBounds: { min: 0, max: 600 }, sourceItems: items,
    rankedChildSelections: {}, isRankingView: true, filterRankingCategories: false,
    resultLayout: "list", onChange() {}, onSortChange() {}, onFiltersChange() {}, onResultLayoutChange() {}, ...overrides,
  });
  return markup.slice(markup.indexOf('aria-label="Menu controls"'), markup.indexOf('<div class="hidden lg:flex'));
};

test("mobile filter button is icon-only and its count badge follows active nutrition state", () => {
  const inactive = controls({});
  const inactiveFilter = inactive.slice(0, inactive.indexOf('</button>'));
  assert.match(inactiveFilter, /aria-label="Filters"/);
  assert.match(inactiveFilter, /lucide-sliders-horizontal/);
  assert.doesNotMatch(inactiveFilter, />Filters<|bg-\[#047857\]/);
  const active = controls({ proteinMin: 20, caloriesMax: 400 });
  const activeFilter = active.slice(0, active.indexOf('</button>'));
  assert.match(activeFilter, /aria-label="Filters, 2 active"/);
  assert.match(activeFilter, /bg-\[#047857\][^"]*">2<\/span>/);
  assert.doesNotMatch(activeFilter, />Filters</);
});

test("mobile pills show the selected sort with its icon and category preset or custom category", () => {
  const main = controls({ categories: ["chicken", "salads"], categoryPreset: "main" });
  assert.match(main, /Highest Protein/);
  assert.match(main, /lucide-drumstick/);
  assert.match(main, /Main menu/);
  assert.doesNotMatch(main, /Rank By|Menu \/ Categories/);
  assert.match(controls({ categories: ["salads"], categoryPreset: "custom" }), />Salads</);
});

test("shared rank options keep macro icons and both directions with the chosen direction selected", () => {
  const markup = render(RankOptions, { value: "lowest-calories", onChange() {}, colorful: true });
  for (const label of ["Protein", "Calories", "Protein Score", "Carbs", "Fat", "Fiber"]) {
    assert.match(markup, new RegExp(`aria-label="Highest ${label}"`));
    assert.match(markup, new RegExp(`aria-label="Lowest ${label}"`));
  }
  assert.match(markup, /aria-label="Lowest Calories" aria-pressed="true"/);
  assert.match(markup, /lucide-flame/);
  assert.match(render(RankSelection, { value: "lowest-calories", colorful: true }), /Lowest Calories/);
  assert.match(render(RankSelection, { value: "highest-protein-score" }), /Highest Protein Score/);
});

test("full sheet groups the layout toggle and close button on the right and retains its footer", () => {
  const markup = render(Panel, {
    restaurantId: "chickfila", items, value: {}, matchingCount: 2,
    headerControls: React.createElement(LayoutToggle, { value: "grid", onChange() {} }),
    onChange() {}, onClose() {}, onApply() {},
  });
  const header = markup.slice(markup.indexOf('<header'), markup.indexOf('</header>'));
  assert.match(header, />Filters<\/h2><div class="ml-auto flex items-center gap-2"><div[^>]*role="group" aria-label="Results layout"/);
  assert.ok(header.indexOf('aria-label="Results layout"') < header.indexOf('aria-label="Close filters"'));
  assert.match(header, /aria-label="Grid view" aria-pressed="true"/);
  assert.match(markup, /aria-expanded="true"[^>]*>[\s\S]*Menu \/ Categories/);
  assert.match(markup, />Reset<\/button>/);
  assert.match(markup, /Show 2 items/);
});

test("shared entree options retain dropdown styling, images, utilities, and selection", () => {
  const markup = render(EntreeOptions, { options: [
    { key: "choose-entree", label: "Choose entrée", onSelect() {} },
    { key: "bowl", label: "Bowl", image: "/bowl.png", selected: true, onSelect() {} },
    { key: "view-all-ingredients", label: "View All Ingredients", showDividerBefore: true, onSelect() {} },
  ] });
  assert.match(markup, /aria-pressed="true"[^>]*bg-black\/10/);
  assert.match(markup, /alt="Bowl"/);
  assert.match(markup, /lucide-utensils-crossed/);
  assert.match(markup, /lucide-layout-grid/);
  assert.doesNotMatch(markup, /bg-emerald-50/);
});


test("mobile row orders the focused controls and keeps every sort neutral", () => {
  const filters = { categories: ["chicken", "salads"], categoryPreset: "main" };
  for (const sort of ["highest-protein", "lowest-calories", "highest-protein-score", "lowest-fiber"]) {
    const row = controls(filters, { sort });
    const buttons = row.match(/<button[\s\S]*?<\/button>/g);
    assert.equal(buttons.length, 5);
    assert.match(buttons[0], /aria-label="Filters/);
    assert.match(buttons[1], /lucide-/);
    assert.doesNotMatch(buttons[1], /border-slate-950|bg-emerald-600|Rank By/);
    assert.match(buttons[1], /lucide-chevron-down/);
    assert.match(buttons[2], /Main menu/);
    assert.match(buttons[2], /lucide-chevron-down/);
    assert.doesNotMatch(buttons[2], /border-slate-950|bg-emerald-600/);
    assert.match(buttons[3], />Calories</);
    assert.match(buttons[4], />Protein</);
    assert.doesNotMatch(row, />Nutrition<|>Variants|>Size<|Card display/);
  }
  const builder = controls({}, {
    restaurantId: "chipotle",
    mobileEntreeOptions: [{ key: "bowl", label: "Bowl", image: "/bowl.png", selected: true, onSelect() {} }],
  }).match(/<button[\s\S]*?<\/button>/g);
  assert.equal(builder.length, 5);
  assert.match(builder[1], /Bowl/);
  assert.match(builder[1], /bowl\.png/);
  assert.match(builder[1], /lucide-chevron-down/);
  assert.doesNotMatch(builder[1], /border-slate-950|bg-emerald-600/);
  assert.match(builder[2], /Highest Protein/);
  assert.match(builder[2], /lucide-chevron-down/);
  assert.match(builder[3], />Calories</);
  assert.match(builder[4], />Protein</);
});

test("focused sheets show one title and immediately expose their existing options", () => {
  const base = { restaurantId: "chickfila", items, value: {}, matchingCount: 2, isMobileSheet: true, onChange() {}, onClose() {}, onApply() {} };
  for (const [focus, title, content] of [
    ["categories", "Categories", /Customize/],
    ["nutrition", "Nutrition", /Max calories/],
    ["calories", "Calories", /Max calories/],
    ["protein", "Protein", /Min protein/],
    ["variants", "Variants", /Show different serving sizes/],
  ]) {
    const markup = render(Panel, { ...base, focus });
    assert.match(markup, new RegExp(`>${title}<\\/h2>`));
    assert.doesNotMatch(markup, /aria-expanded=/);
    assert.match(markup, content);
  }
  const rank = render(Panel, { ...base, focus: "rank", leadingControls: React.createElement(RankOptions, { value: "highest-protein", onChange() {} }) });
  assert.equal((rank.match(/>Rank By</g) ?? []).length, 1);
  assert.match(rank, /aria-label="Lowest Protein"/);
});

test("mobile Nutrition owns additional sliders and card settings while desktop keeps its sections", () => {
  const base = { restaurantId: "chickfila", items, value: {}, matchingCount: 2, onChange() {}, onClose() {}, onApply() {} };
  const mobile = render(Panel, { ...base, isMobileSheet: true });
  const nutrition = mobile.slice(mobile.indexOf('>Nutrition</'), mobile.lastIndexOf('</section>'));
  for (const label of ["Max calories", "Min protein", "Max carbs", "Max fat", "Min fiber", "Max sodium", "Max sugar", "Card display"]) assert.ok(nutrition.includes(label));
  assert.doesNotMatch(mobile, />More nutrition</);
  const desktop = render(Panel, base);
  assert.match(desktop, />More nutrition</);
  assert.doesNotMatch(desktop, />Max sodium</);
});

test("mobile minimum protein renders four equal-width presets for low and high protein menus", () => {
  for (const protein of [0, 5, 10, 15, 40, 100]) {
    const markup = render(Panel, {
      restaurantId: "chipotle", items: items.map((item) => ({ ...item, nutrition: { ...item.nutrition, protein } })),
      value: {}, matchingCount: 2, isMobileSheet: true, focus: "protein",
      onChange() {}, onClose() {}, onApply() {},
    });
    const presets = markup.match(/<div class="mt-4 grid grid-flow-col auto-cols-fr[^>]*>([\s\S]*?)<\/div>/)?.[1];
    assert.ok(presets);
    assert.equal((presets.match(/<button /g) ?? []).length, 4);
    assert.match(presets, />Any<\/button>/);
    assert.equal((presets.match(/>\d+g\+<\/button>/g) ?? []).length, 3);
    const ceiling = Number(markup.match(/type="range" min="0" max="(\d+)"/)?.[1]);
    const thresholds = [...presets.matchAll(/>(\d+)g\+<\/button>/g)].map((match) => Number(match[1]));
    assert.ok(thresholds.every((value) => value <= ceiling));
  }
});


test("mobile rank rows preserve left-aligned icons, separators and right-hand direction controls", () => {
  const props = { value: "lowest-calories", onChange() {}, colorful: true };
  const mobile = render(RankOptions, props);
  assert.equal((mobile.match(/role="menuitemradio"/g) ?? []).length, 6);
  assert.match(mobile, /aria-label="Lowest Calories" aria-pressed="true"/);
  assert.match(mobile, /lucide-flame/);
  assert.match(mobile, /items-center gap-2\.5 px-3 text-left/);
  assert.match(mobile, /role="separator"/);
  assert.match(mobile, /items-center rounded-xl bg-slate-100/);
  assert.doesNotMatch(mobile, /grid-cols-2|min-h-36|flex-col items-center justify-center/);
  assert.doesNotMatch(mobile, /Default Order/);
  assert.match(render(RankOptions, { ...props, showDefault: true }), /Default Order/);
  assert.match(render(RankOptions, { ...props, desktop: true }), /role="separator"/);
});

test("mobile entree grid keeps images, active styling and selection callbacks", () => {
  const calls = [];
  const options = [
    { key: "bowl", label: "Bowl", image: "/bowl.png", selected: true, onSelect() { calls.push("bowl"); } },
    { key: "burrito", label: "Burrito", image: "/burrito.png", onSelect() { calls.push("burrito"); } },
  ];
  const mobile = render(EntreeOptions, { options, mobileGrid: true });
  assert.match(mobile, /^<div class="grid grid-cols-2 auto-rows-fr gap-2">/);
  assert.match(mobile, /alt="Bowl"/);
  assert.match(mobile, /alt="Burrito"/);
  assert.match(mobile, /flex-col items-center justify-center/);
  assert.match(mobile, /whitespace-normal break-words/);
  assert.match(mobile, /border-slate-200 bg-white/);
  assert.match(mobile, /aria-pressed="true"[^>]*border-slate-300 bg-slate-50/);
  assert.match(mobile, /class="object-contain"/);
  assert.doesNotMatch(mobile, /overflow-hidden|rounded-full|object-cover|bg-black\/10/);
  assert.match(mobile, /relative h-12 w-12 shrink-0/);
  const tree = EntreeOptions({ options, mobileGrid: true, onSelect() { calls.push("after"); } });
  const optionNodes = React.Children.toArray(tree.props.children);
  const buttons = optionNodes;
  buttons[1].props.onClick();
  assert.deepEqual(calls, ["burrito", "after"]);
  assert.match(render(EntreeOptions, { options }), /^<div class="grid gap-1">/);
});


test("Variants appears last only when supported and Categories stays beside Rank By", () => {
  const variantItems = [{ ...items[0], variants: [
    { id: "regular", label: "Regular", nutrition: items[0].nutrition },
    { id: "large", label: "Large", nutrition: { ...items[0].nutrition, protein: 45 } },
  ] }, items[1]];
  for (const restaurantId of ["chickfila", "mcdonalds", "starbucks"]) {
    const row = controls({ showRecipeVariants: false }, { restaurantId, sourceItems: variantItems });
    const buttons = row.match(/<button[\s\S]*?<\/button>/g);
    assert.equal(buttons.length, 6);
    assert.match(buttons[1], /Highest Protein/);
    assert.match(buttons[2], /lucide-chevron-down/);
    assert.doesNotMatch(buttons[2], /border-slate-950|bg-emerald-600/);
    assert.match(buttons.at(-1), />Variants</);
    assert.doesNotMatch(controls({}, { restaurantId }), />Variants</);
  }
  const base = { restaurantId: "chickfila", items: variantItems, value: { showRecipeVariants: false }, matchingCount: 2, onChange() {}, onClose() {}, onApply() {} };
  const mobile = render(Panel, { ...base, isMobileSheet: true });
  assert.ok(mobile.indexOf('>Categories</') < mobile.indexOf('>Nutrition</'));
  assert.ok(mobile.indexOf('>Variants</') > mobile.indexOf('Card display'));
  assert.ok(mobile.indexOf('>Variants</') > mobile.indexOf('Max sugar'));
  const desktop = render(Panel, base);
  assert.ok(desktop.indexOf('>Variants</') < desktop.indexOf('>Nutrition</'));
  const focused = render(Panel, { ...base, isMobileSheet: true, focus: "variants" });
  assert.equal((focused.match(/>Variants</g) ?? []).length, 1);
  assert.doesNotMatch(focused, /aria-expanded=/);
  assert.match(focused, /role="switch" aria-checked="false" aria-labelledby="variant-title-showRecipeVariants"/);
  assert.doesNotMatch(render(Panel, { ...base, isMobileSheet: true, showVariants: false }), />Variants</);
});
