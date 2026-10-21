import test from "node:test";
import assert from "node:assert/strict";
import { macroSplitWidths, groupByRestaurant, itemCountLabel, formatWhole } from "../components/native/cart/cartPresentation.ts";

test("macro split widths enforce minimum and sum to 100", () => {
  const w = macroSplitWidths({ protein: 212, carbs: 261, totalFat: 129 });
  assert.ok(Math.abs(w.protein + w.carbs + w.totalFat - 100) < 1e-9);
  const small = macroSplitWidths({ protein: 500, carbs: 1, totalFat: 1 });
  assert.ok(small.carbs > 10);
  const empty = macroSplitWidths({ protein: 0, carbs: 0, totalFat: 0 });
  assert.ok(Math.abs(empty.protein - 100 / 3) < 1e-9);
});
test("groups keep first-seen restaurant order", () => {
  const g = groupByRestaurant([{ restaurantId: "b", id: 1 }, { restaurantId: "a", id: 2 }, { restaurantId: "b", id: 3 }]);
  assert.deepEqual(g.map(([id, items]) => [id, items.length]), [["b", 2], ["a", 1]]);
});
test("labels", () => {
  assert.equal(itemCountLabel(1), "1 item");
  assert.equal(itemCountLabel(7), "7 items");
  assert.equal(formatWhole(1234.4), "1,234");
  assert.equal(formatWhole(NaN), "—");
  assert.equal(formatWhole(5, "g"), "5g");
});
