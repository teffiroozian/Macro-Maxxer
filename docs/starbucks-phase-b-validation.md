# Starbucks Phase B validation

Scope: all 282 product/form entries and 706 sizes in the saved catalog; read-only checks against the saved national menu. No fetching, raw-data changes, or nutrition inference.

| Check | Gap count | Classification |
|---|---:|---|
| Entries missing nutrition | 22 | 21 expected: 16 whole-bean coffees, 4 unsweetened VIA coffees, 1 shopping bag. 1 suspicious: sweetened VIA coffee. |
| Sizes missing calories, carbs, fat, or protein | 22 | The same 22 single-size entries lack all four. The other 684 sizes have all four numeric, finite, nonnegative macros. |
| Entries with no nonempty default recipe | 106 | Expected for 59 food/merchandise entries, 19 packaged beverages, 21 retail coffees, and 7 plain brewed coffee/nitro/traveler entries. Empty defaults do not imply missing ingredient lists. |
| Entries with no customization/productOptions | 67 | Expected: 41 food/merchandise entries, 19 packaged beverages, 5 VIA coffees, 2 coffee travelers. |
| Entries with missing/malformed SKUs or size codes | 0 | Primary sizes and nested option/recipe size references checked. SKUs are nonempty numeric strings; size codes are nonempty strings. No duplicate primary size codes or SKUs within an entry. |
| Obvious malformed/incomplete responses | 0 structural | All entries contain matching named product details and sizes; all national-menu sizes are present. Recipe containers and default items have the expected structure. Nutrition omissions are classified above. |

282 unique menu pairs match 282 unique collected pairs; no duplicates or extra pairs. Counts above overlap. “Expected” is a contextual classification from product type and the saved payload, not an external confirmation. Retail coffee nutrition omissions are not zero nutrition. There are 119 empty/missing size-level default recipes across the 106 entries; no additional entries have partially missing recipes.

**Disjoint totals:** 176 clean entries; 105 expected exceptions; 1 suspicious entry.

**Suspicious entry only:** `810/via` — Starbucks VIA® Instant Sweetened Iced Coffee. Size `5-count` has null nutrition (all four core macros absent); ingredients are also null. Lack of customization/default recipe is expected for a packaged instant product, but the sweetened formulation makes missing nutrition a review gap. This may be an official-source omission, not a collection failure.
