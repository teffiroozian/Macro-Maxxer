import test from "node:test";
import assert from "node:assert/strict";
import { getMenuPlacement } from "../lib/controls/menuPlacement.ts";

test("dropdowns fit horizontally and vertically at viewport edges", () => {
  for (const viewport of [{ left: 0, top: 0, width: 1024, height: 768 }, { left: 20, top: 30, width: 360, height: 300 }]) {
    for (const anchor of [{ left: viewport.left, top: viewport.top + 20, bottom: viewport.top + 60 }, { left: viewport.left + viewport.width - 30, top: viewport.top + viewport.height - 60, bottom: viewport.top + viewport.height - 20 }]) {
      const menu = getMenuPlacement(anchor, viewport, 360, 500);
      assert.ok(menu.left >= viewport.left + 8);
      assert.ok(menu.left + menu.width <= viewport.left + viewport.width - 8);
      assert.ok(menu.top >= viewport.top + 8);
      assert.ok(menu.top + menu.height <= viewport.top + viewport.height - 8);
      if (viewport.height < 500) assert.ok(menu.scrollMaxHeight < 500);
      else assert.ok(menu.scrollMaxHeight >= 500);
    }
  }
});
test("a fitting menu stays below its trigger without an overflow scroll range", () => {
  const menu = getMenuPlacement({ left: 100, top: 100, bottom: 140 }, { left: 0, top: 0, width: 1024, height: 768 }, 270, 180);
  assert.equal(menu.top, 148);
  assert.equal(menu.height, 194);
  assert.ok(menu.scrollMaxHeight >= 180);
});
test("menus flip above near the bottom and constrain long content internally", () => {
  const menu = getMenuPlacement({ left: 100, top: 600, bottom: 640 }, { left: 0, top: 0, width: 1024, height: 700 }, 360, 900);
  assert.equal(menu.top, 8);
  assert.equal(menu.height, 584);
  assert.equal(menu.scrollMaxHeight, 570);
});

test("Rank can stay below its trigger and scroll instead of flipping", () => {
  const anchor = { left: 100, top: 600, bottom: 640 };
  const menu = getMenuPlacement(anchor, { left: 0, top: 0, width: 1024, height: 768 }, 360, 900, false);
  assert.equal(menu.top, 648);
  assert.equal(menu.left, 100);
  assert.equal(menu.width, 360);
  assert.equal(menu.height, 112);
  assert.equal(menu.scrollMaxHeight, 98);
});
