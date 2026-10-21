import assert from "node:assert/strict";
import test from "node:test";
import { createSheetLayers } from "../lib/controls/sheetLayers.ts";

function fixture() {
  const entries = [undefined];
  const travel = [];
  const calls = [];
  let index = 0;
  let locked = false;
  const layers = createSheetLayers({
    push(id) { entries.splice(++index); entries[index] = id; },
    back(steps) { travel.push(steps); },
    active(open) { locked = open; },
  });
  const flush = () => { while (travel.length) { index -= travel.shift(); layers.pop(entries[index]); } };
  const open = (name) => {
    let remove;
    remove = layers.open(() => { calls.push(name); remove(); });
    return remove;
  };
  const back = () => { index--; layers.pop(entries[index]); };
  return { layers, open, flush, back, calls, entries, get locked() { return locked; }, get index() { return index; } };
}

test("repeated X, Escape and Back dismiss only a child and keep the parent locked and open", () => {
  const f = fixture();
  const closeParent = f.open("parent");
  for (let i = 0; i < 24; i++) {
    const closeChild = f.open(i % 2 ? "macro-split" : "protein-score");
    if (i % 3 === 0) closeChild();
    else if (i % 3 === 1) f.layers.escape();
    else f.back();
    f.flush();
    assert.equal(f.index, 1);
    assert.equal(f.locked, true);
    assert.ok(!f.calls.includes("parent"));
  }
  closeParent();
  f.flush();
  assert.equal(f.index, 0);
  assert.equal(f.locked, false);
  assert.equal(f.layers.escape(), false);
});

test("Back and Escape dismiss the topmost sheet first", () => {
  const f = fixture();
  f.open("parent"); f.open("child");
  f.back();
  assert.deepEqual(f.calls, ["child"]);
  assert.equal(f.locked, true);
  f.layers.escape(); f.flush();
  assert.deepEqual(f.calls, ["child", "parent"]);
  assert.equal(f.index, 0);
  assert.equal(f.locked, false);
});

test("a rapid child reopen waits for the previous close's history travel", () => {
  const f = fixture();
  f.open("parent");
  const close = f.open("old-child");
  close();
  f.open("new-child");
  f.flush();
  assert.equal(f.index, 2);
  f.back();
  assert.deepEqual(f.calls, ["new-child"]);
  assert.equal(f.locked, true);
});

test("closing the parent dismisses its children and handles pending history cleanup", () => {
  const f = fixture();
  const closeParent = f.open("parent");
  const closeChild = f.open("child");
  closeChild();
  closeParent();
  f.flush();
  assert.equal(f.index, 0);
  assert.equal(f.locked, false);
  f.open("new-parent");
  f.open("child");
  f.layers.escape(); f.flush();
  assert.deepEqual(f.calls, ["child"]);
});

test("an explicit parent close cleans up an open child without leaving orphan history", () => {
  const f = fixture();
  const closeParent = f.open("parent");
  f.open("child");
  closeParent();
  f.flush();
  assert.deepEqual(f.calls, ["child"]);
  assert.equal(f.locked, false);
  assert.equal(f.index, 0);
});
