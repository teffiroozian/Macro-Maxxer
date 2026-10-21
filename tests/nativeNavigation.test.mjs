import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import OrderBagIcon from "../components/icons/OrderBagIcon.tsx";
import { getOrderCountLabel, getOrderCountDigit, getActiveNativeDestination, isKeyboardViewportReduced } from "../lib/native/navigation.ts";

test("My Meal announces quantity with singular/plural and caps only the visible digit", () => {
  for (const [count, label, digit] of [[0, "My Meal", ""], [1, "My Meal, 1 item", "1"], [3, "My Meal, 3 items", "3"], [12, "My Meal, 12 items", "9+"]]) {
    assert.equal(getOrderCountLabel(count), label);
    assert.equal(getOrderCountDigit(count), digit);
    const icon = renderToStaticMarkup(createElement(OrderBagIcon.default ?? OrderBagIcon, { count }));
    assert.match(icon, /aria-hidden="true"/);
    assert.equal(icon.includes("native-order-count"), count > 0);
    if (digit) assert.ok(icon.includes(`>${digit}</span>`));
    assert.ok(!icon.includes("badge"));
  }
});

test("native destinations resolve nested menus and leave unrelated pages inactive", () => {
  for (const [path, active] of [["/", "home"], ["/search", "search"], ["/cart", "order"], ["/restaurants", "restaurants"], ["/restaurant/chipotle", "restaurants"], ["/restaurant/chickfila/sandwich", "restaurants"], ["/privacy", null]]) {
    assert.equal(getActiveNativeDestination(path), active);
  }
});

test("keyboard fallback ignores small browser-chrome changes", () => {
  assert.equal(isKeyboardViewportReduced(844, 800), false);
  assert.equal(isKeyboardViewportReduced(844, 500), true);
  assert.equal(isKeyboardViewportReduced(390, 390), false);
});
