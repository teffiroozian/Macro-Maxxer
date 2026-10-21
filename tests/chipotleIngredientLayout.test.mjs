import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import cardModule from "../components/menu-item-card/IngredientCompactCard.tsx";

const IngredientCard = cardModule.default ?? cardModule;
const baseProps = {
  item: { id: "chicken", name: "Chicken", nutrition: { calories: 180, protein: 32, carbs: 0, totalFat: 7 } },
  selectedItemImage: "/images/chicken.png",
  ingredientSelectionState: false,
  isIngredientSelectionDisabled: false,
  ingredientSelectionControl: "checkbox",
  calories: 180, protein: 32, carbs: 0, totalFat: 7,
  onSelectionChange: () => {},
  onCompactOptionSelect: () => {},
};

for (const layout of ["list", "grid"]) {
  test(`${layout} preserves selection, required locks, disabled limits, and keyboard behavior`, () => {
    const calls = [];
    const props = { ...baseProps, layout, onSelectionChange: (value) => calls.push(value) };
    const control = IngredientCard(props).props.children;
    control.props.onClick();
    assert.deepEqual(calls, [true]);
    IngredientCard({ ...props, ingredientSelectionState: true }).props.children.props.onClick();
    assert.deepEqual(calls, [true, false]);
    for (const state of [{ isIngredientLocked: true }, { isIngredientSelectionDisabled: true }, { readOnly: true }]) {
      IngredientCard({ ...props, ...state }).props.children.props.onClick();
    }
    assert.deepEqual(calls, [true, false]);
    const target = {};
    control.props.onKeyDown({ key: "Enter", target, currentTarget: target, preventDefault() {} });
    assert.deepEqual(calls, [true, false, true]);
    // Keyboard activation of a nested portion button must not toggle the card.
    control.props.onKeyDown({ key: "Enter", target: {}, currentTarget: target, preventDefault() {} });
    assert.equal(calls.length, 3);
  });
}

test("grid renders compact nutrition and selected portion controls without menu actions", () => {
  const markup = renderToStaticMarkup(React.createElement(IngredientCard, {
    ...baseProps, layout: "grid", ingredientSelectionState: true,
    activeCompactOptions: [{ id: "normal", label: "Normal" }, { id: "double", label: "Double" }],
    selectedCompactOptionId: "normal",
  }));
  for (const text of ["Chicken", "180", "32g", "0g", "7g", "Normal", "Double", 'aria-checked="true"']) {
    assert.ok(markup.includes(text), text);
  }
  assert.doesNotMatch(markup, /Protein Score|View Details|Quick Add|min-h-\[132px\]/);
  assert.match(markup, /grid grid-cols-2 items-end justify-start gap-x-3/);
});

test("portion buttons preserve the existing callback and stop the card click", () => {
  const calls = [];
  const card = IngredientCard({
    ...baseProps, layout: "grid", ingredientSelectionState: true,
    activeCompactOptions: [{ id: "normal", label: "Normal" }, { id: "double", label: "Double" }],
    selectedCompactOptionId: "normal", onCompactOptionSelect: (id) => calls.push(id),
  });
  function findControls(node) {
    if (!node || typeof node !== "object") return null;
    if (node.props?.onSelect) return node;
    for (const child of React.Children.toArray(node.props?.children)) {
      const result = findControls(child);
      if (result) return result;
    }
    return null;
  }
  const controls = findControls(card);
  assert.ok(controls);
  const buttons = controls.type(controls.props).props.children;
  let stopped = false;
  buttons[1].props.onClick({ preventDefault() {}, stopPropagation() { stopped = true; } });
  assert.deepEqual(calls, ["double"]);
  assert.equal(stopped, true);
});


test("grid reuses the row macro components and props at both breakpoints", () => {
  function macroGroups(layout) {
    const content = IngredientCard({ ...baseProps, layout }).props.children;
    return React.Children.toArray(content.props.children).slice(-2).map((group) =>
      React.Children.toArray(group.props.children).map((stat) => ({ type: stat.type, props: stat.props })),
    );
  }
  assert.deepEqual(macroGroups("grid"), macroGroups("list"));
});

test("grid keeps name and selected portion controls in the column beside the image", () => {
  const content = IngredientCard({
    ...baseProps, layout: "grid", ingredientSelectionState: true,
    activeCompactOptions: [{ id: "normal", label: "Normal" }, { id: "double", label: "Double" }],
  }).props.children;
  const header = React.Children.toArray(content.props.children)[0];
  assert.match(header.props.className, /items-start/);
  assert.doesNotMatch(header.props.className, /flex-col/);
  const nameColumn = React.Children.toArray(header.props.children)[1];
  const controls = React.Children.toArray(nameColumn.props.children)[1];
  assert.ok(controls.props.options);
  assert.equal(controls.props.compact, true);
});

test("ingredient rank precedes the name and stays the same across layouts and portions", () => {
  for (const layout of ["list", "grid"]) {
    for (const selected of [false, true]) {
      const markup = renderToStaticMarkup(React.createElement(IngredientCard, {
        ...baseProps, layout, rank: 3, ingredientSelectionState: selected,
        protein: selected ? 64 : 32,
        activeCompactOptions: [{ id: "normal", label: "Normal" }, { id: "double", label: "Double" }],
        selectedCompactOptionId: selected ? "double" : "normal",
      }));
      assert.match(markup, /font-heading shrink-0 font-bold tracking-tight text-slate-400/);
      assert.match(markup, />3\.<\/span> Chicken/);
    }
  }
});

test("Fiber ranking preserves Rows and desktop display while mobile Grid keeps four core macros", () => {
  for (const layout of ["list", "grid"]) {
    const content = IngredientCard({ ...baseProps, layout, rankMetric: "fiber", fiber: 3.5 }).props.children;
    const groups = React.Children.toArray(content.props.children).slice(-2);
    for (const [index, group] of groups.entries()) {
      const stats = React.Children.toArray(group.props.children);
      const mobileGrid = layout === "grid" && index === 0;
      assert.deepEqual(stats.map(({ props }) => props.macroKey), mobileGrid ? ["calories", "protein", "carbs", "totalFat"] : ["calories", "protein", "fiber"]);
      assert.equal(stats[2].props.value, mobileGrid ? 0 : 3.5);
      assert.equal(stats[2].props.labelVariant, "uppercase");
      assert.equal(stats[2].props.size, layout === "grid" ? "gridCard" : "card");
      assert.match(group.props.className, index === 0 ? /justify-start/ : /grid-cols-3/);
    }
    const markup = renderToStaticMarkup(React.createElement(IngredientCard, { ...baseProps, layout, rankMetric: "fiber", fiber: 3.5 }));
    assert.match(markup, />4g</); // Shared MacroStat rounds display values to whole grams.
    assert.match(markup, /text-\[#047857\]/);
    if (layout === "list") assert.doesNotMatch(markup, />Carbs<|>Fat<|>CARBS<|>FAT</);
  }
});

test("non-Fiber metrics retain four macros and missing Fiber stays unavailable", () => {
  for (const rankMetric of [undefined, "protein-score", "protein", "calories", "carbs", "fat"]) {
    const content = IngredientCard({ ...baseProps, rankMetric, fiber: 2 }).props.children;
    const group = React.Children.toArray(content.props.children).at(-1);
    assert.deepEqual(React.Children.toArray(group.props.children).map(({ props }) => props.macroKey), ["calories", "protein", "carbs", "totalFat"]);
  }
  const content = IngredientCard({ ...baseProps, rankMetric: "fiber" }).props.children;
  const group = React.Children.toArray(content.props.children).at(-1);
  assert.ok(Number.isNaN(React.Children.toArray(group.props.children)[2].props.value));
});

test("Chipotle mobile Rows and Grid use compact gaps while desktop spacing stays unchanged", () => {
  for (const layout of ["list", "grid"]) {
    for (const rankMetric of ["protein", "fiber"]) {
      const content = IngredientCard({ ...baseProps, layout, compactMobileControls: true, rankMetric, fiber: 3 }).props.children;
      const groups = React.Children.toArray(content.props.children).slice(-2);
      for (const [index, group] of groups.entries()) {
        if (index === 0 && layout === "grid") assert.match(group.props.className, /grid-cols-2/);
        else assert.doesNotMatch(group.props.className, /grid-cols-/);
        assert.match(group.props.className, index === 0 || layout === "grid" ? /justify-start/ : /justify-between/);
        const keys = React.Children.toArray(group.props.children).map(({ props }) => props.macroKey);
        assert.deepEqual(keys, rankMetric === "fiber" && !(index === 0 && layout === "grid") ? ["calories", "protein", "fiber"] : ["calories", "protein", "carbs", "totalFat"]);
      }
      if (layout === "grid") {
        assert.match(groups[0].props.className, /gap-x-3/);
        assert.match(groups[1].props.className, /gap-x-5/);
        assert.match(groups[1].props.className, /lg:gap-x-6/);
        for (const [index, group] of groups.entries()) {
          assert.match(group.props.className, index === 0 ? /grid-cols-2/ : /flex-wrap/);
          assert.match(group.props.className, /px-1\.5/);
        }
      } else {
        assert.match(groups[0].props.className, /gap-x-5/);
        assert.match(groups[1].props.className, /pl-4 md:flex md:w-72 md:shrink-0/);
      }
    }
  }
});

test("Chipotle mobile Rows retain their header layout and only add macro label breathing room", () => {
  const content = IngredientCard({ ...baseProps, layout: "list", compactMobileControls: true }).props.children;
  const children = React.Children.toArray(content.props.children);
  assert.doesNotMatch(children[0].props.className, /max-md:flex-col/);
  assert.match(children.at(-2).props.className, /\[&>div\]:gap-1/);
  assert.doesNotMatch(children.at(-1).props.className, /\[&>div\]:gap-1/);
});

test("manual ingredient Card display is preserved outside the fixed four-macro mobile Grid", () => {
  for (const layout of ["list", "grid"]) {
    for (const rankMetric of ["protein", "fiber", "calories", "protein-score"]) {
      for (const cardDisplayOverride of ["standard", "fiber", undefined]) {
        const content = IngredientCard({ ...baseProps, layout, compactMobileControls: true, rankMetric, cardDisplayOverride, fiber: 3 }).props.children;
        const expectedFiber = cardDisplayOverride === "fiber" || (cardDisplayOverride === undefined && rankMetric === "fiber");
        for (const [index, group] of React.Children.toArray(content.props.children).slice(-2).entries()) {
          const stats = React.Children.toArray(group.props.children);
          assert.deepEqual(stats.map(({ props }) => props.macroKey), expectedFiber && !(index === 0 && layout === "grid") ? ["calories", "protein", "fiber"] : ["calories", "protein", "carbs", "totalFat"]);
          assert.match(group.props.className, index === 0 || layout === "grid" ? /justify-start/ : /justify-between/);
        }
      }
    }
  }
});

test("Chipotle Grid titles reserve a non-wrapping badge and cap responsive name lines", () => {
  const props = { ...baseProps, compactMobileControls: true, rank: 2, ingredientPortionBadge: "1/2x", item: { ...baseProps.item, name: "Long Chipotle ingredient name" } };
  const markup = renderToStaticMarkup(React.createElement(IngredientCard, { ...props, layout: "grid" }));
  assert.match(markup, /max-md:whitespace-nowrap/);
  assert.match(markup, /md:max-h-\[2lh\]/);
  assert.doesNotMatch(markup, /line-clamp|text-ellipsis/);
  assert.match(markup, /relative flex w-full min-w-0 items-center/);
  assert.match(markup, /shrink-0 whitespace-nowrap rounded-md/);
  assert.equal((markup.match(/>1\/2x<\/span>/g) ?? []).length, 1);
  const rows = renderToStaticMarkup(React.createElement(IngredientCard, { ...props, layout: "list" }));
  assert.doesNotMatch(rows, /md:max-h-\[2lh\]/);
});


test("rendered mobile ingredient macros stay content-sized and left-aligned in every layout and selection state", () => {
  for (const layout of ["list", "grid"]) {
    for (const compactMobileControls of [false, true]) {
      for (const state of [{}, { ingredientSelectionState: true }, { isIngredientLocked: true }, { isIngredientSelectionDisabled: true }, { readOnly: true }]) {
        const props = { ...baseProps, layout, compactMobileControls, ...state };
        const markup = renderToStaticMarkup(React.createElement(IngredientCard, props));
        const groups = [...markup.matchAll(/<div class="([^"]*md:hidden[^"]*)">/g)];
        const mobile = groups.find(([, className]) => className.includes("border-t"));
        assert.ok(mobile, `${layout}, compact=${compactMobileControls}`);
        const className = mobile[1];
        assert.match(className, layout === "grid" ? /grid grid-cols-2 items-end justify-start gap-x-3/ : compactMobileControls ? /flex flex-wrap items-end justify-start gap-x-5/ : /flex flex-wrap items-end justify-start gap-x-3/);
        assert.match(className, /px-1\.5 pt-2/);
        assert.match(className, /\[&amp;&gt;div\]:flex-none/);
        assert.match(className, /\[&amp;&gt;div\]:min-w-0/);
        if (compactMobileControls && layout === "list") {
          assert.match(className, /\[&amp;&gt;div\]:items-center/);
          assert.match(className, /\[&amp;&gt;div\]:text-center/);
          assert.match(className, /\[&amp;&gt;div\]:w-max/);
          assert.doesNotMatch(className, /items-start|text-left/);
        } else {
          assert.match(className, /\[&amp;&gt;div\]:items-start/);
          assert.match(className, /\[&amp;&gt;div\]:text-left/);
        }
        assert.doesNotMatch(className, /justify-between|justify-around|space-between/);
        const content = IngredientCard(props).props.children;
        const row = React.Children.toArray(content.props.children).at(-2);
        assert.deepEqual(React.Children.toArray(row.props.children).map(({ props }) => props.macroKey), ["calories", "protein", "carbs", "totalFat"]);
      }
    }
  }
});
