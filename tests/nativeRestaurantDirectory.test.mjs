import test from "node:test";
import assert from "node:assert/strict";
import { groupByLetter, matchRestaurants, sortRestaurants } from "../lib/native/restaurantDirectory.ts";
import { moveFavorite } from "../lib/native/homeCollections.ts";
const list = ["Starbucks", "McDonald's", "Chipotle", "Chick-fil-A", "MOD Pizza", "Panda Express"].map((name) => ({ name }));
const names = (items) => items.map((r) => r.name);

test("directory sorts by name and groups by first letter", () => {
  const sorted = sortRestaurants(list);
  assert.deepEqual(names(sorted), ["Chick-fil-A", "Chipotle", "McDonald's", "MOD Pizza", "Panda Express", "Starbucks"]);
  assert.deepEqual(groupByLetter(sorted).map((g) => [g.letter, g.restaurants.length]), [["C", 2], ["M", 2], ["P", 1], ["S", 1]]);
  assert.equal(groupByLetter([{ name: "7-Eleven" }])[0].letter, "#");
});

test("search matches word starts and ignores case, accents and punctuation", () => {
  assert.deepEqual(names(matchRestaurants(list, "chi")), ["Chipotle", "Chick-fil-A"]);
  for (const q of ["chickfila", "Chick fil a", "FIL A"]) assert.deepEqual(names(matchRestaurants(list, q)), ["Chick-fil-A"]);
  assert.deepEqual(names(matchRestaurants(list, "mcdonalds")), ["McDonald's"]);
  assert.deepEqual(names(matchRestaurants(list, "McDonald’s")), ["McDonald's"]);
  assert.deepEqual(names(matchRestaurants(list, "express")), ["Panda Express"]);
  assert.equal(matchRestaurants(list, " ").length, list.length);
  for (const q of ["sushi", "!!"]) assert.deepEqual(matchRestaurants(list, q), []);
});

test("favorites move both ways and leave unknown ids alone", () => {
  const ids = ["a", "b", "gone", "c"];
  assert.deepEqual(moveFavorite(ids, "a", "c"), ["b", "gone", "c", "a"]);
  assert.deepEqual(moveFavorite(ids, "c", "a"), ["c", "a", "b", "gone"]);
  assert.deepEqual(moveFavorite(ids, "a", "a"), ids);
  assert.deepEqual(moveFavorite(ids, "x", "a"), ids);
});
