import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NATIVE_RECENTS_KEY, readNativeRecents, persistNativeRecents, addNativeRecent, removeNativeRecent, clearNativeRecentStorage, resolveNativeRecent, toNativeRecentRef } from "../lib/search/nativeRecentSearches.ts";
import { nativeResultCount, nativeResultPresentation, readNativeLayout, NATIVE_LAYOUT_KEY } from "../lib/search/nativeSearchPresentation.ts";
import NativeMenuItemCard from "../components/native/search/NativeMenuItemCard.tsx";
import { loadSearchIndex } from "../lib/search/searchIndex.ts";
import { searchAllContent } from "../lib/search/searchAllContent.ts";
import { clearQueries, readRecentQueries, recordQuery, removeQuery } from "../lib/search/recentQueries.ts";
import { filterSearchResults, nextRanking, rankingNote, rankSearchResults, searchFilterChips } from "../lib/native/searchResults.ts";
const storage = new Map();
globalThis.window = { location: { href: "http://localhost:3000/search" }, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key,value) => storage.set(key,value) }, dispatchEvent() {} };

test("unified native recents seed legacy keys once, dedupe, cap, remove and persist clears", () => {
  storage.clear();
  storage.set("recentlySearchedRestaurants", '["chickfila","chipotle"]');
  storage.set("recentlySearchedMenuItems", '[{"kind":"menu-item","restaurantId":"chickfila","itemId":"sandwich"}]');
  let refs = readNativeRecents();
  assert.deepEqual(refs.map(ref => ref.kind), ["restaurant","restaurant","menu-item"]);
  const item = refs[2];
  refs = addNativeRecent(refs,item);
  assert.deepEqual(refs[0], item);
  assert.equal(refs.length,3);
  for(let i=0;i<8;i++) refs = addNativeRecent(refs,{kind:"menu-item",restaurantId:"chickfila",itemId:`item-${i}`});
  assert.equal(refs.length,6);
  assert.equal(refs[0].itemId,"item-7");
  refs = removeNativeRecent(refs,refs[0]);
  assert.equal(refs.length,5);
  persistNativeRecents(refs);
  assert.deepEqual(readNativeRecents(),refs);
  clearNativeRecentStorage();
  for(const key of [NATIVE_RECENTS_KEY,"recentlySearchedRestaurants","recentlySearchedMenuItems"]) assert.equal(storage.get(key),"[]");
  storage.set("recentlySearchedRestaurants", '["starbucks"]');
  assert.deepEqual(readNativeRecents(),[]);
});

test("native history ignores malformed and unresolved refs and unavailable restaurants", async () => {
  storage.set(NATIVE_RECENTS_KEY,'[null,{},4,{"kind":"bad","restaurantId":"x"}]');
  assert.deepEqual(readNativeRecents(),[]);
  storage.set(NATIVE_RECENTS_KEY,'broken');
  assert.deepEqual(readNativeRecents(),[]);
  const index = await loadSearchIndex();
  const restaurants = index.map(e => e.restaurant);
  const source = index.find(e => e.restaurant.id === "chickfila");
  const result = { kind:"menu-item", restaurant: source.restaurant, item: source.items[0] };
  assert.equal(resolveNativeRecent(toNativeRecentRef(result),restaurants,index).item.id,result.item.id);
  assert.equal(resolveNativeRecent({kind:"restaurant",restaurantId:"missing"},restaurants,index),null);
  assert.equal(resolveNativeRecent({kind:"restaurant",restaurantId:"x"},[{id:"x",isComingSoon:true}],index),null);
  assert.equal(resolveNativeRecent({kind:"menu-item",restaurantId:"chickfila",itemId:"gone"},restaurants,index),null);
});

test("result count labels and grid/list persistence", () => {
  for(const [n,r,m] of [[0,"0 restaurants","0 menu items"],[1,"1 restaurant","1 menu item"],[3,"3 restaurants","3 menu items"]]) {
    assert.equal(nativeResultCount(n,"restaurants"),r);
    assert.equal(nativeResultCount(n,"menu-items"),m);
  }
  storage.delete(NATIVE_LAYOUT_KEY); assert.equal(readNativeLayout(),"grid");
  storage.set(NATIVE_LAYOUT_KEY,"list"); assert.equal(readNativeLayout(),"list");
  storage.set(NATIVE_LAYOUT_KEY,"bad"); assert.equal(readNativeLayout(),"grid");
});

test("native menu cards retain default variant nutrition and expose missing fields as unknown", () => {
  const restaurant = {id:"test",name:"Test",logo:"/logo.svg"};
  const item = {id:"test-item",name:"Test sandwich",image:"",nutrition:{calories:500},defaultVariantId:"small",variants:[{id:"small",label:"Small",nutrition:{calories:123,protein:4,carbs:5}}]};
  const result = {kind:"menu-item",restaurant,item};
  const presentation = nativeResultPresentation(result);
  assert.equal(presentation.nutrition.calories,123);
  assert.deepEqual(presentation.missing,["totalFat"]);
  for(const layout of ["grid","list"]) {
    const html = renderToStaticMarkup(createElement(NativeMenuItemCard.default ?? NativeMenuItemCard,{result,layout,onSelect(){}}));
    assert.match(html,/123 calories, 4 grams protein, 5 grams carbs, unknown grams fat/);
    assert.ok(html.includes("—"));
    assert.ok(!html.includes("0g"));
  }
});

test("recent queries can be removed one at a time and cleared", () => {
  storage.clear();
  for (const query of ["chicken","latte","burrito"]) recordQuery(query);
  assert.deepEqual(readRecentQueries(),["burrito","latte","chicken"]);
  removeQuery("LATTE");
  assert.deepEqual(readRecentQueries(),["burrito","chicken"]);
  clearQueries();
  assert.deepEqual(readRecentQueries(),[]);
});

test("search ranking and filters reuse menu metrics and keep relevance order for ties", async () => {
  const results = searchAllContent(await loadSearchIndex(),"burrito");
  assert.equal(rankSearchResults(results,null),results);
  assert.ok(results.some(result => result.kind === "builder-entree"));
  for (const direction of ["high","low"]) {
    const ranked = rankSearchResults(results,{metric:"protein",direction});
    assert.equal(ranked.length,results.length);
    assert.equal(ranked.at(-1).kind,"builder-entree");
    const values = ranked.filter(r => r.kind === "menu-item").map(r => nativeResultPresentation(r).nutrition.protein);
    assert.deepEqual(values,[...values].sort((a,b) => direction === "high" ? b-a : a-b));
  }
  assert.equal(filterSearchResults(results,{}),results);
  const filtered = filterSearchResults(results,{caloriesMax:450});
  assert.ok(filtered.length > 0);
  assert.ok(filtered.every(r => r.kind === "menu-item" && nativeResultPresentation(r).nutrition.calories <= 450));
  assert.match(rankingNote(rankSearchResults(results,{metric:"score",direction:"high"})[0],{metric:"score",direction:"high"}),/^\d+\.\dg \/ 100 cal$/);
  assert.equal(rankingNote(results[0],{metric:"protein",direction:"high"}),"");
});

test("tapping a ranking starts in its natural direction and then flips", () => {
  assert.deepEqual(nextRanking(null,"protein"),{metric:"protein",direction:"high"});
  assert.deepEqual(nextRanking(null,"calories"),{metric:"calories",direction:"low"});
  assert.deepEqual(nextRanking({metric:"calories",direction:"low"},"calories"),{metric:"calories",direction:"high"});
  assert.deepEqual(nextRanking({metric:"calories",direction:"high"},"fat"),{metric:"fat",direction:"low"});
  assert.deepEqual(searchFilterChips({caloriesMax:450,proteinMin:undefined,scoreMin:9}).map(c => c.label),["450 cal or less","9+ Protein Score"]);
});
