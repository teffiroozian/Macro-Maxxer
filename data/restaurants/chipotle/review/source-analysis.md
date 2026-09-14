# Chipotle Source Relationship Analysis

**Scope:** Analysis only. No importer was built, no `restaurant.json`/`unresolved.json` was created, no raw file was modified. This document explains how Chipotle's six raw sources relate to each other so a future importer can be built without guessing. See `source-analysis.json` for the machine-readable version of every finding below.

Sources: `calculator-menu.json`, `menu-metadata.json`, `menu-rules.json`, `online-meals.json`, `nutrition.json` (+ their `*-source.json` collection metadata), `nutrition-paper-menu.pdf`.

---

## 1. Source Inventory

| Source | Scope | Records | Contains | Uniquely contributes |
|---|---|---|---|---|
| **calculator-menu.json** | Restaurant-specific (restaurant 469) | 120 top-level (65 entrees, 31 sides, 21 drinks, 3 non-food) + 72 distinct nested content ids = 192 unique ids | Build structure, pricing, restaurant availability, customization limits | Real pricing and the authoritative "what's actually sellable here" universe |
| **menu-metadata.json** | National (region=US) | 408 items, 18 groups, 31 itemSections | Calories+Portion nutrition, dietaryTags, thumbnails | Only source pairing a CMG id with nutrition and dietary tags — but item universe is a national superset, and items carry **no name field** |
| **menu-rules.json** | Country-level (US), universal template | 239 top-level + 89 nested = 328 unique ids | Same shape as calculator-menu plus build-limit fields (maxContents, maxHalfs, maxExtras, etc.), contentGroups | Strict superset of calculator-menu at the id level; the canonical build-rule template |
| **online-meals.json** | Restaurant-specific (restaurant 469) | 21 meals, 44 distinct CMG ids referenced | Preconfigured/curated meal bundles referencing other sources' ids | Only source describing named, priced, curated combinations (catering, influencer, high-protein) |
| **nutrition.json** | National (PDF) | 194 records, 72 distinct names | Full 11-field macro panel (fat, sodium, fiber, sugar, protein) | Only source with full macros — everything else only has Calories+Portion. Carries **no CMG ids** |

Both `nutrition.json` pages (2 and 3) duplicate all non-drink rows verbatim; they differ only in drink lineup (Coca-Cola-family page vs Pepsi-family page). 194 raw rows represent 72 distinct logical items, not 194 distinct products.

---

## 2. ID Relationships

| Pair | Overlap | Only in first | Only in second |
|---|---|---|---|
| calculator-menu vs menu-rules | 192 | 0 | 136 |
| calculator-menu vs menu-metadata | 189 | 3 (non-food) | 219 |
| menu-metadata vs menu-rules | 306 | 102 | 22 |
| online-meals vs calculator-menu | 43 | 1 (Chili Lime Chips) | 149 |
| online-meals vs menu-metadata | 44 | 0 | 364 |
| online-meals vs menu-rules | 44 | 0 | 284 |

**Key fact: menu-rules is a strict superset of calculator-menu.** Every one of calculator-menu's 192 ids exists in menu-rules with matching itemType/itemName; menu-rules simply carries ~136 additional ids (LTO proteins, national-only content, kids/half/extra variants for proteins restaurant 469 doesn't sell).

**menu-metadata's 219 calculator-menu-absent ids**, resolved as far as possible:
- 117 have a name recoverable from menu-rules — mostly four full LTO protein families (Smoked Brisket, Pollo Asado, Chicken Tinga, Crispy Chicken), each duplicating the Burrito/Bowl/Salad/Tacos/Quesadilla/Kids/Half/Extra pattern of the 6 core proteins, plus a Chili Lime Chips family, a Grilled Street Corn family, and assorted bottled drinks (Corona, Izze, Kiju, Topo Chico, etc.).
- 3 more resolve via `itemGroups[...].defaultItemId → displayName` (Cauliflower Rice variants).
- **99 have no name anywhere in the four structured JSON sources.** A name can only be *guessed* from the thumbnail image filename (e.g. `cmg-6606-chorizo`, `cmg-5165-garlic-steak`, `cmg-9004-churros`, `cmg-5410-red-chimichurri`) — not an authoritative field, and not treated as one here.

**Same real ingredient, multiple ids** — the clearest examples:
- **Guacamole**: `CMG-1001` (standard $2.95 add-on, 18 parent entrees) vs `CMG-5301` (same 230cal/4oz product, but the Veggie family's `defaultContent:true` no-charge inclusion).
- **Queso Blanco**: `CMG-1029` (burrito/bowl/salad topping, 120cal/2oz) vs `CMG-1034` (taco addon, same 120cal/2oz) vs `CMG-4134` (quesadilla addon, **240cal/4oz — double the portion**).
- **Protein "identity"**: `CMG-1`/`CMG-2`/`CMG-3`/`CMG-4`/`CMG-5`/`CMG-15` are simultaneously the Burrito-format entree's own itemId *and* the canonical id every Half/Extra record's `pricingReferenceItemId` points at, across every entree type (Bowl, Salad, Tacos, Quesadilla).

**pricingReferenceItemId** confirms Half/Extra linkage cleanly for all 6 core proteins (e.g. `CMG-5601` Half Chicken and `CMG-1101` Extra Chicken both reference `CMG-1`). Veggie and Cheese-Only have no Half/Extra records at all — there's no "half veggie" concept in the source.

---

## 3. Calculator Menu ↔ Menu Metadata

**Coverage:** 189/192 (98.4%) exact id match. The 3 misses are the non-food items (utensils/bowls), which correctly have no nutrition.

**The single most important structural finding in this whole analysis:** menu-metadata's nutrition value for an *entree* id is **not the composed meal's nutrition — it's only the primary protein's serving nutrition.**

- `CMG-1` "Chicken Burrito" → menu-metadata says 180cal/4oz. That's the PDF's plain "Chicken, 4oz, 180cal" row, not a ~700-calorie burrito.
- `CMG-1201` "Chicken Taco" (single) → 60cal — a smaller protein portion, because a taco uses less filling per unit than a burrito/bowl.
- `CMG-1216` "Chipotle Honey Chicken Taco" → 70cal/**1.3oz**, confirming portion is genuinely container-specific, not a recycled constant.
- `CMG-6` Veggie Burrito and `CMG-407` Cheese Only Quesadilla → **0cal**, because there's no discrete protein tied to those entree ids at all; their real calories live entirely in separately-keyed content items (fajita veggies, rice, beans, cheese...).

**Implication for the importer:** full composed-meal nutrition must be assembled as *entree's own protein-portion nutrition* + *nutrition of every selected content id*, each looked up independently. calculator-menu's `contents[]` defines what *can* be added, not what *is* added by default — see `defaultContent` in section 4.

Two concrete numeric conflicts surfaced (not exhaustively hunted, but not silently ignored either):
- Fresh Tomato Salsa / Roasted Chili-Corn Salsa: calories match exactly (25 / 80) but portion weight disagrees — menu-metadata says 3.5oz, PDF says 4oz.
- `CMG-5501` "Soft Flour Tortilla" (used inside the 3-taco trio entrees) shows 250cal/3oz in metadata, which doesn't cleanly match any PDF tortilla row (see section 6). *Resolved — see `import-decisions.md` §5: use the PDF's per-unit tortilla nutrition × actual taco count instead of this metadata value.*

No name conflicts were found anywhere — but that's partly because menu-metadata has no name field of its own; every name used to interpret it in this analysis came from calculator-menu.json or menu-rules.json.

---

## 4. Calculator Menu ↔ Menu Rules

**Coverage:** 100% (192/192) — every calculator-menu id exists in menu-rules with matching itemType/itemName.

**Rule fields match exactly** on every sampled shared id (Steak Burrito, Veggie Burrito, Chicken Bowl): `maxContents`, `maxCustomizations`, `maxOnTheSideCustomizations`, `maxExtras`, `maxHalfs`, `maxExtrasPlusHalfs` are identical between the two files. `contentGroups` (e.g. RiceContentGroup min1/max1) also match exactly. **menu-rules is the authoritative build-rule template; calculator-menu's restaurant-scoped copy mirrors it faithfully for shared ids.**

**Restaurant-specific vs national:**
- Pricing: calculator-menu has real prices; menu-rules has `unitPrice=0`/`unitDeliveryPrice=0` on every sampled record — not usable for pricing.
- `isUniversal`: flips between `false` (calculator-menu) and `true` (menu-rules) for the *identical id* — meaning not confidently resolved (see Unresolved Findings).
- `isItemAvailable`: `true` in menu-rules even for LTO items entirely absent from calculator-menu (e.g. Smoked Brisket) — rules-level availability does not imply restaurant-469 availability.

**Contents is always a strict subset:** calculator-menu's `contents[]` is a strict subset of menu-rules' `contents[]` for the same entree (Steak Burrito: 29 vs 39 items; Veggie Burrito: 18 vs 19). The extra items are consistently the four LTO proteins' Half/Extra/ExtraProtein records plus one national-only topping (`CMG-1010 Queso`). No case reversed — calculator-menu never has a content id absent from menu-rules.

**defaultContent** is `false` on almost every record. The one confirmed exception: the Veggie family sets `defaultContent:true` on `CMG-5301` Guacamole (auto-included, no charge) — matching in both files. This is the only reliable signal for "what's in the box if the customer changes nothing," and it must be applied per-entree, not assumed uniform.

**Array order does not carry cross-source meaning.** Filtering menu-rules' Steak Burrito contents down to only the ids calculator-menu also has produces the *same set* but a *different order* than calculator-menu's own array. Order is presentation-only within a single source; `contentGroupName`/`itemType` are the reliable groupers, not ordinal position.

---

## 5. Online Meals ↔ Normal Menu

44 distinct CMG ids are referenced across 21 meals. 43/44 exist in calculator-menu (the one exception, `CMG-5362` Chili Lime Chips, exists in menu-rules/menu-metadata but is absent from restaurant 469's actual sellable menu — flagged as a gap). All 44 exist in both menu-metadata and menu-rules.

**Structure:** each meal has `mealId`, `mealName`, `mealType` (`BuildYourOwn` / `HighProtein` / `Influencer`), `mealPrice`, a free-text `calories` field, and `entree`/`sides`/`drinks`. The entree's nested `contents[]` reuses the same CMG id vocabulary as calculator-menu but adds its own `quantity` and price-delta fields rather than referencing calculator-menu's contentGroup objects.

**The `calories` field is inconsistently shaped** — sometimes a plain number string (`"1550"`), sometimes a range (`"520 - 1220"` for BuildYourOwn catering bundles). Any importer touching this field needs explicit range-handling, not a naive `Number()` parse.

**Three structural variants worth calling out:**
1. **Standard meals** — a normal entree + optional sides/drinks (e.g. "Bardi Bowl with Chili Lime Chips").
2. **Catering bundles** (`BuildYourOwn`) — use an entirely separate 24oz+/`CMG-537x`/`539x` ingredient namespace, distinct from individual-order ids, priced $52+, tagged "Serves 4-6 people."
3. **Entree-less meals** — "High Protein Cup - Chicken/Steak" have `entree: null` and represent the *entire* product as a single `sides[]` entry. This pattern occurs nowhere else.

**Cross-listing:** 4 meals ("Josh Hart's High Protein Burrito," "Mikal Bridges High Protein Bowl," "Tara Davis-Woodhall High Protein Bowl," "Hunter Woodhall's High Protein Bowl") each appear **twice** — same composition/price/calories, different `mealId`, once tagged `HighProtein` and once `Influencer`. One of these duplicate pairs disagrees on protein grams (70g vs 71g for Mikal Bridges) — a genuine, if minor, data inconsistency. `mealType` is not a mutually exclusive partition.

These are best understood as **preconfigured/curated builds** — named products wrapping an existing selection of sellable ids at a set price — not a new ingredient vocabulary. Whether they become their own browse products or stay pure merchandising metadata is an importer decision, not made here.

---

## 6. PDF Nutrition ↔ Live Chipotle Items

Since `nutrition.json` carries no CMG ids, every join below is inferential (name / normalized name / calories / portion / adult-vs-kids context), cross-checked against menu-metadata's Calories+Portion pair.

**Exact / high-confidence** (calories and portion match exactly): Chicken, Steak, Carnitas, Sofritas, Black Beans, Pinto Beans, Cheese, Sour Cream, Guacamole (topping/side/large — all three sizes), Queso Blanco (entrée/side/large — all three sizes), Chips (regular/large), Chipotle-Honey Vinaigrette.

**Normalized-name high-confidence** (name shortened/altered live, values match): "Barbacoa" (PDF) ↔ "Beef Barbacoa" (live, `CMG-4`, 170cal/4oz exact); "Cilantro-Lime White/Brown Rice" (PDF) ↔ "White Rice"/"Brown Rice" (live — the "Cilantro-Lime" qualifier is dropped everywhere in the live sources even though it's part of Chipotle's own product name); "Fajita Vegetables" ↔ "Fajita Veggies"; "Romaine Lettuce (tacos)" ↔ "Romaine Lettuce."

**Portion/context-assisted:** Fresh Tomato Salsa and Roasted Chili-Corn Salsa (calories match exactly, portion weight conflicts — see section 3); Tomatillo salsas (calories match, PDF states fl oz vs metadata's oz for the same number); kids-section Chicken (`CMG-3002`, 90cal/2oz) matches the PDF kids row exactly, confirming the entree-nutrition-is-protein-only pattern (section 3) also holds for kids records.

**Ambiguous — not resolved, not forced:**
- `CMG-5501` "Soft Flour Tortilla" (250cal/3oz) vs PDF "Flour Tortilla (taco)" (80cal/1ea) — no clean match; 3oz may represent an aggregate of the 3-taco trio mislabeled with an oz unit, but this is speculation, not a finding. *Resolved — see `import-decisions.md` §5 and `build-gaps-analysis.md` Part C (deep follow-up confirming this can't be reconciled, plus the decision to use PDF per-unit nutrition × taco count instead).*
- The live CMG id for Supergreens Salad Mix and for the quesadilla-context tortilla were not isolated in this pass (salad/quesadilla content arrays weren't individually enumerated the way burrito contents were) — needs dedicated follow-up before import. *Resolved — see `build-gaps-analysis.md` Parts A and B (dedicated follow-up confirming both are genuinely absent from every source) and `import-decisions.md` §3-4 (decisions: use the PDF row for Salad's base; use a manually-UI-verified 1-tortilla+3-cheese composition for adult Quesadilla).*
- **Every fountain-drink flavor** (Coca-Cola Classic, Diet Coke, Sprite, Fanta Orange, Mello Yello, Pibb Xtra, Barq's, Minute Maid Lemonade, Powerade, Mug Root Beer, Dr. Pepper, Mountain Dew, Crush Orange, Sierra Mist, Lipton Raspberry Brisk, Pepsi family, Chipotle Iced/Sweet Tea) has **no joinable id at all**. calculator-menu only has a generic "22/32 fl oz Soda/Iced Tea" cup with one flat placeholder value (250cal/22floz) and an empty `customizations[]` — the specific flavor a customer picks is simply not represented anywhere in the live sources for this restaurant. *Resolved — see `import-decisions.md` §2.*

**Live items with no PDF match:**
- **Chipotle Honey Chicken** (entree, half, extra, kids forms) — no PDF row exists at all; likely introduced after the PDF's Oct-2024/Mar-2025 print.
- The 4 LTO proteins present in menu-rules but not calculator-menu (Brisket, Pollo Asado, Chicken Tinga, Crispy Chicken) — also absent from the PDF.
- The 99 unresolved menu-metadata-only ids (chorizo, carne asada, garlic steak, chicken al pastor, cauliflower rice, grilled street corn, desserts, adobo ranch, chimichurri, various drinks) — none appear in the PDF's 72 names.
- Restaurant 469's actual bottled/canned drink lineup (Open Water, Mexican Coke/Sprite, Jarritos, San Pellegrino, Poppi, Tractor agua frescas) — **zero** of the 21 calculator-menu drink names string-match a PDF name exactly. The PDF's drink section covers a different, only partially overlapping branded lineup.

---

## 7. Portion Relationships

**Half/Extra have their own explicit source nutrition — not purely importer-computed scaling.** menu-metadata carries a real Calories value for each Half/Extra content id:

| Item | Metadata calories | Base protein calories | Ratio |
|---|---|---|---|
| Half Chicken (`CMG-5601`) | 90 | 180 | exactly half |
| Half Steak (`CMG-5602`) | 75 | 150 | exactly half |
| Half Carnitas (`CMG-5603`) | 105 | 210 | exactly half |
| Extra Chicken (`CMG-1101`) | 360 | 180 | exactly double |
| Extra Steak (`CMG-1102`) | 300 | 150 | exactly double |

These ratios happen to be exactly 0.5x/2.0x in every sampled case — but this analysis treats that as a *coincidental cross-check*, not license to infer values that aren't explicitly present, per the task's instruction. **Caveat:** the paired `Portion` field on these same records reads `"0"` + unit (e.g. `"0oz"`) — almost certainly an unpopulated placeholder, since the catering-context equivalent (`CMG-1116` Extra Chicken under BuildYourOwn) does carry a real portion (360cal/8oz).

**Kids portions have their own explicit records, not a computed fraction.** `CMG-3002` Chicken Kids Build Your Own = 90cal/2oz, matching the PDF kids row exactly — both numbers trace to explicit source records (a menu-metadata entree id and a PDF table row respectively), not to the importer halving the adult value. Kids entrees also introduce content types with no adult equivalent: `Beverage` (No Drink/Chocolate Milk/Apple Juice/Soda/Milk — 5 options, identical across all 16 kids entrees) and `Side` (Kid's Fruit/Kid's Chips/No Included Sides).

**Side vs entree portions differ non-trivially for the same ingredient.** Guacamole: in-entree topping (`CMG-1001`, 230cal/4oz) = same size as "Side of Guacamole" (`CMG-1009`, 230cal/4oz) — consistent. But Queso Blanco: in-entree topping (`CMG-1029`, **2oz**) is *half* the size of "Side of Queso Blanco" (`CMG-1030`, **4oz**), and the quesadilla-context Queso addon (`CMG-4134`, **4oz**, double again) differs from both. **Simple scaling across Queso Blanco's three contexts would be unsafe** — three genuinely different real-world portions exist for one named ingredient, and none should be derived from another by a fixed ratio.

Chicken Taco's single-unit protein portion (`CMG-1201`, 60cal) is exactly one-third of the Tacos(3)-trio id (`CMG-201`, 180cal) — a clean internal ratio — but neither shares the burrito/bowl 4oz base unit at all, so it can't be cross-scaled against the core 180cal/4oz Chicken value.

---

## 8. Structural vs Sellable Records

| Pattern | itemTypes observed |
|---|---|
| Entree/build container | Burrito, Bowl, Salad, Quesadilla, Tacos (single), Tacos (trio, "(3)"), KidsBYO, KidsQuesadilla |
| Selectable ingredient/modifier | Rice, Beans, Toppings, Tortillas, Addon, Option, Optional, Included, Premium, Salsa, Beverage (kids), Side (kids) |
| Half/extra portion | HalfPortion, ExtraPortion, ExtraProtein (catering-only equivalent) |
| Standalone side | ChipsSalsa, Chips, Tortilla, Queso, Guac, GreenSalsa/TomatoSalsa/CornSalsa/RedSalsa, CilantroLime, ChipsQueso, ChipsGuac, SideChicken/SideSteak/SideHoneyChicken |
| Standalone drink | Soda (generic fountain), Coke, MexCoke, MexSprite, Tractor, Jarritos, Nantucket, OpenWater, SanPellegrino, Poppi |
| Kids item | KidsBYO/KidsQuesadilla entrees + kids-only Beverage/Side content types |
| Preconfigured meal | online-meals.json only — BuildYourOwn (catering), HighProtein, Influencer, entree-less standalone-side meals |
| Structural/content-group-only | `contentGroups` entries (RiceContentGroup, BeansContentGroup — no itemId/price of their own); menu-metadata's `itemSections` (31) and `itemGroups` (logical concept + defaultItemId + calorie range, e.g. FountainSoda, CauliRiceEntree) |
| Pricing/reference-only | Any content record with non-null `pricingReferenceItemId` — exclusively HalfPortion/ExtraPortion here |
| Non-food | `nonFoodItems[]` — Serving Utensils, Napkins & Utensils, 6 Serving Bowls (3 records, zero nutrition relevance) |

---

## 9. Conflicts, Gaps, Ambiguities

- **No structural linkage from PDF to anything.** Every PDF join is inferential; nothing in the raw data guarantees correctness.
- **menu-metadata has no name field**, and 99 of its 219 calculator-menu-absent ids have no name anywhere in the four JSON sources (only a non-authoritative thumbnail-filename hint). *Resolved — see `unnamed-metadata-analysis.md` (dedicated follow-up: none of the 99 appear in calculator-menu, menu-rules, or online-meals) and `import-decisions.md` §1 (decision: exclude from the active restaurant-469 import).*
- **Name drift**: "Barbacoa" vs "Beef Barbacoa"; "Cilantro-Lime White/Brown Rice" vs plain "White/Brown Rice."
- **Portion/unit conflicts**: Fresh Tomato Salsa & Roasted Chili-Corn Salsa disagree on portion weight (3.5oz metadata vs 4oz PDF) despite identical calories; Tomatillo salsas disagree on unit type (fl oz vs oz) at identical numeric value.
- **Meal-duplicate inconsistency**: "Mikal Bridges High Protein Bowl" reports 70g protein under one mealType and 71g under its Influencer-typed duplicate.
- **Unmatched PDF rows**: Flour Tortilla (taco); every individual fountain-drink flavor. *Resolved — see `import-decisions.md` §2 and §5.*
- **Live items missing full PDF nutrition**: Chipotle Honey Chicken (entirely absent from PDF); the 4 LTO proteins; the 99 unresolved metadata-only ids; restaurant 469's actual bottled/canned drink lineup (zero exact-name matches).
- **LTO/seasonal signals**: Chipotle Honey Chicken (sold, not in PDF); Brisket/Pollo Asado/Chicken Tinga/Crispy Chicken/Chili Lime Chips/Grilled Street Corn/Cauliflower Rice (in rules/metadata, not sold at 469, not in PDF) — `menu-metadata.itemGroups`' explicit Cauliflower Rice group entries (`CauliRiceEntree`/`CauliRiceSingleTaco`/`CauliRiceKids`) corroborate a national rollout that never reached this restaurant.
- **Location-specific items**: cannot be distinguished from format/temporal reasons using these sources alone — no second restaurant is represented for comparison.
- **Duplicated records**: `nutrition.json`'s page2/page3 verbatim duplication (documented by the collector itself); the 4 online-meal cross-listed duplicates.
- **Ambiguous fields**: `isUniversal`'s flipped meaning between calculator-menu and menu-rules for identical ids; `CMG-5362` Chili Lime Chips referenced by a meal but absent from calculator-menu-469; the `"0oz"` placeholder-looking Portion field on individual-order Half/Extra records; online-meals' mixed single-value/range `calories` field shape.

---

## 10. Importer Recommendations (not implemented)

**A. Existing generic rules from Chick-fil-A likely reusable as-is:**
- Preserve raw sources unchanged; fix logic and regenerate rather than hand-editing output.
- Distinguish a source SKU from a logical browse product (directly applicable to Half/Extra and the per-protein entree family).
- Never guess nutrition when source identity is ambiguous — leave for human review (applies directly to the fountain-drink non-join and the tortilla mismatch).
- Use a secondary nutrition source (the PDF, here) only when the match to a specific record is unambiguous.
- Keep structural-only records out of browse/search via one visibility flag (contentGroups, non-food items, pricing-reference-only records).
- Preserve source identity/provenance even when presentation changes (critical here given multiple-ids-per-real-ingredient).

**B. New generic rules Chipotle reveals:**
- Build-container nutrition is *compositional*: an entree's own nutrition record covers only its primary protein, not the finished meal. Any future build-your-own-style restaurant should expect this pattern, not assume one-fixed-payload-per-item.
- A national/universal catalog can be a strict superset of what one restaurant sells; id existence doesn't imply local availability — a restaurant-scoped source must be the sole availability authority.
- Half/Extra/portion relationships may have explicit source nutrition rather than requiring importer-side scaling; prefer the explicit record and only fall back to (clearly flagged) derived scaling when nothing explicit exists.
- The same real ingredient can legitimately carry multiple ids when portion or default-inclusion differs by context — a naive "merge by name" rule is unsafe without a portion/price/defaultContent equality check first.
- Preconfigured/curated meals can be a thin metadata layer over otherwise-ordinary build + customization records, including a variant with no entree container at all.
- A source nutrition file with zero foreign-key linkage needs an explicit match-confidence tiering (exact / normalized-name / portion-assisted / ambiguous / no-match), not a single matched/unmatched boolean.

**C. Chipotle-specific adapter logic:**
- Assemble entree nutrition as protein-portion nutrition (from the entree's own id) + nutrition of every selected content id, rather than trusting the entree id's own metadata value as final.
- Respect `defaultContent:true` per-entree (currently only the Veggie family's Guacamole) for "as-ordered, no changes" nutrition.
- Filter menu-rules'/menu-metadata's broader catalog down to calculator-menu's id set before considering anything importable.
- A name-resolution fallback chain: calculator-menu name → menu-rules name → unresolved/excluded, since menu-metadata itself never carries a name.
- Explicit, deliberate handling (not automatic joining) for the generic fountain-drink cup records.
- Awareness that the catering/BuildYourOwn ingredient-id namespace (`CMG-537x`/`539x`) must not be conflated with the individual-order namespace (`CMG-500x`/`505x`) despite identical display names.
- Deduplicate cross-listed online meals (by composition equality) before deciding whether to import both mealType-tagged copies, given the confirmed 70g/71g inconsistency.

---

## Reported Back

**Files created:**
- `data/review/chipotle/source-analysis.json`
- `data/review/chipotle/source-analysis.md`

**Highest-confidence source joins:**
- calculator-menu ↔ menu-rules: 100% id coverage, identical rule fields, template/instance relationship.
- calculator-menu/menu-rules ↔ menu-metadata: 98.4% id coverage for calculator-menu's universe.
- Core proteins/beans/rice/toppings/chips/guac/queso (PDF ↔ live): exact calorie+portion matches across ~20 items.

**Biggest ambiguities:**
- Fountain-drink flavors have no joinable id at all (generic flat-value cup only). *Resolved — `import-decisions.md` §2.*
- 99 menu-metadata ids have no name anywhere in structured data. *Resolved — `import-decisions.md` §1.*
- `isUniversal` flag's flipped meaning between sources. *Still open — not addressed by later follow-up work.*
- Flour tortilla (taco-context) nutrition mismatch. *Resolved — `import-decisions.md` §5.*

**PDF nutrition match coverage:** ~20+ core items (proteins, beans, rice, salsas, cheese, sour cream, guac/queso all sizes, chips, vinaigrette) matched exact or normalized-name high-confidence. Full macro fields (fat/sodium/fiber/sugar/protein) are *only* available for whatever the PDF successfully matches — everything else in the live system tops out at Calories+Portion.

**Unmatched counts:**
- Unmatched live items (no PDF nutrition): Chipotle Honey Chicken + all its variants, 4 LTO proteins, 99 unresolved metadata-only ids (*resolved — `import-decisions.md` §1*), and effectively all of restaurant 469's actual bottled/canned drink lineup (0/21 exact-name matches).
- Unmatched PDF rows: the taco flour tortilla row (*resolved — `import-decisions.md` §5*), and every individual fountain-flavor row (15+ named sodas/teas with no live id to attach to) (*resolved — `import-decisions.md` §2*).

**Half/extra/kids findings:** Half and Extra portions have explicit (not just inferable) nutrition values in menu-metadata, cross-validating at exactly 0.5x/2.0x of base — but this must be treated as a coincidental confirmation, not a scaling license, per the task's own instruction. Kids entrees have their own explicit nutrition too, matching the PDF kids section exactly. Queso Blanco is the clearest counter-example showing naive portion scaling would be unsafe: three genuinely different real portions (2oz topping / 4oz side / 4oz quesadilla-addon) for one ingredient name.

**New importer patterns Chipotle introduces (beyond Chick-fil-A):** compositional/build-your-own nutrition (entree nutrition ≠ meal nutrition), a national-superset-vs-restaurant-scoped-subset catalog relationship, explicit-but-imperfectly-labeled half/extra nutrition records, multiple ids for one real ingredient driven by ordering context, and preconfigured curated meals (including an entree-less variant) layered on top of the base ordering system.

**Is the source system understood well enough to begin building the importer?** For the core a-la-carte path (6 proteins × Burrito/Bowl/Salad/Tacos/Quesadilla, standard rice/beans/toppings, standard sides, guac/queso all sizes) — yes, the joins are exact and well-evidenced. Before building the full importer, three things are worth resolving first: (1) the fountain-drink flavor gap needs a deliberate decision (not an automatic join), (2) the Salad/Quesadilla content arrays need the same per-item enumeration burritos got in this pass (Supergreens Salad Mix and the quesadilla tortilla weren't isolated), and (3) a decision on how to treat the 99 unnamed/no-PDF-match ids and the four not-sold-here LTO protein families. None of these block starting the importer for the well-evidenced core; they do block claiming full menu coverage.

> **Follow-up status (added after this analysis):** all three of the items above have since been resolved. (1) and part of (3) — see `unnamed-metadata-analysis.md` (dedicated 99-id follow-up) and `import-decisions.md` §1 and §2. (2) — see `build-gaps-analysis.md` (dedicated Salad/Quesadilla/taco-tortilla follow-up) and `import-decisions.md` §3, §4, §5. The four not-sold-at-469 LTO protein families remain excluded from import per the same restaurant-scoped-availability principle as §1 and are not a separate open question. This paragraph is a pointer only; the original assessment above is left as written.
