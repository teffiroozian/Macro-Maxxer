# Chipotle Unnamed Metadata IDs — Resolution Analysis

**Scope:** Analysis only. No importer was built, no raw file was modified. This resolves, as far as the raw sources allow, the 99 `menu-metadata.json` item ids that `source-analysis.json` (section 2, `menuMetadataOnlyIds.unresolvedNoNameInAnyRawField`) flagged as having no name anywhere in `calculator-menu.json`, `menu-rules.json`, or `online-meals.json`. Machine-readable detail (per-id fields, evidence, family grouping) is in `unnamed-metadata-analysis.json`.

**Recomputation check:** re-deriving the 99-id list from scratch (menu-metadata's 408 items minus everything nameable via calculator-menu/menu-rules/itemGroups.defaultItemId) reproduced the exact same 99 ids as the prior analysis. All 99 were confirmed absent from `calculator-menu.json` **and** — via a deep literal-string search of the entire JSON tree, not just id-keyed lookups — absent from `menu-rules.json` and `online-meals.json` too. They exist only inside `menu-metadata.json`.

---

## Method

For every id, four things were pulled:

1. **Every menu-metadata field available**: `nutrition` (Calories + Portion), `thumbnailUrl`, `dietaryTags`, `tags` (which carry `promo` and, critically, free-text `tagline` marketing copy), `customizations`, and — on a handful of records — a `groupName` field pointing at a named `itemGroups` entry.
2. **Cross-references from `itemSections`** (31 named UI sections, e.g. `Dessert`, `AllDrinkContentGroup`) **and `groups`** (18 display groups, e.g. `Burrito`, `Chips & Sides`) — any section/group whose `items[].menuItemId` equals the target id.
3. **A deep search of the other three sources** for the literal id string anywhere in the tree (zero hits for all 99 — confirms these aren't just unresolved-by-name, they are genuinely absent from the ordering/rules graphs).
4. **Exact `thumbnailUrl` string matches** against every *already-named* menu-metadata item. An id sharing a pixel-identical product photo with a known, named item (e.g. the exact same JPEG Chick "cmg-6601-chicken" photo used by the already-resolved `CMG-1` "Chicken Burrito") is much stronger evidence than a thumbnail filename alone, because it ties the unresolved id directly to a confirmed real product rather than to an inferred guess from a filename string.

### Classification tiers

| Tier | Criterion |
|---|---|
| **Confidently identified** | At least one of: (a) exact photo match to an already-named item, (b) `groupName` → `itemGroups[key].displayName`, (c) a `tagline` marketing-copy tag *combined with* a specific (non-generic) thumbnail filename, together describing one product. |
| **Likely identified, not authoritative** | A specific, non-generic thumbnail filename slug exists (e.g. `cmg-6606-chorizo`) but nothing else corroborates it — the image filename is the *only* evidence, and a filename is not an authoritative name field. |
| **Completely unknown** | Thumbnail is the generic `https://www.chipotle.com/` placeholder (not a real product photo), and no section/group/tagline evidence exists either. No name was invented. |

---

## Results

| | Count |
|---|---|
| Confidently identified | **52** |
| Likely identified, not authoritative | **42** |
| Completely unknown | **5** |
| **Total** | **99** |
| In restaurant 469's active calculator-menu | **0** |

All 99 are, by construction, absent from restaurant 469's sellable menu. None should be treated as importable/orderable at this restaurant.

---

## Families

### 1. Five LTO/regional proteins — full entree families (48 ids)

The largest pattern by far: five proteins that never made it into `menu-rules.json` (so they weren't resolvable in the original pass) each have close to a full replica of the core-protein entree pattern — Burrito, Bowl, "Three Tacos" (trio), Salad, Quesadilla, "One Taco" (single), Kid's Build Your Own, Kid's Quesadilla — plus, for the more fully-populated ones, Half/Extra-portion and catering (Build-Your-Own / "Serves 2" side) variants.

| Protein | ids | Tier | Key evidence |
|---|---|---|---|
| **Chorizo** | 10 (`CMG-7/107/207/307/406/1105/1208/3008/3108/5606`) | Likely | Thumbnail slug `cmg-6606-chorizo` only, consistent across all 10; no tagline text |
| **Carne Asada** | 13 (`CMG-8/108/208/308/409/1107/1121/1130/1209/3010/3109/5388/5607`) | Confident (11/13) | Thumbnail `cmg-6608-carne-asada` + tagline "Our Most Tender Steak"; the two "Extra"-shaped records (`CMG-1107`, `CMG-5388`) lack a tagline and stay Likely |
| **Plant-Based (PB) Chorizo** | 8 (`CMG-12/114/212/312/413/1213/3014/3112`) | Confident (8/8) | Thumbnail `cmg-5164-pb-chorizo` + tagline "16g of Pea Protein"; `dietaryTags` include `vege`/`vega`, consistent with a plant-based product |
| **Garlic Steak** | 8 (`CMG-13/115/213/313/422/1214/3015/3113`) | Likely | Thumbnail `cmg-5165-garlic-steak` only; no tagline anywhere in this family |
| **Chicken al Pastor** | 11 (`CMG-14/116/214/314/425/1123/1132/1215/3016/3114/5407`) | Confident (11/11) | Thumbnail `CMG-5166-Chicken-al-Pastor` + tagline "Where Fire Meets Flavor" (entree contexts) or "Serves 2"/"28g Protein" (catering/side contexts) |

**Note on internal inconsistency:** within a family, calorie/portion values don't always follow the same scaling pattern seen in the core 6-protein family — e.g. Chorizo's "One Taco" record (`CMG-1208`) shows 300cal/4oz, identical to its Burrito record, whereas the core proteins' single-taco records are always a much smaller portion than their burrito/bowl records (Chicken Taco 60cal vs Chicken Burrito 180cal). This suggests these five protein families' metadata may be incompletely populated or still using placeholder/templated values — several of their `tags` include `promo:"nchide"` and `promo:"new"`/`"NEW"`, which read as an internal "not yet live / new item" flag rather than genuine promotional copy.

### 2. Smoked Brisket — extra/side/BYO variants (3 ids)

Smoked Brisket's core entree family (Burrito/Bowl/Salad/Tacos/Quesadilla/Kids/Half) *was* resolvable in the prior pass via `menu-rules.json`. These 3 ids are catering/side-format variants that menu-rules doesn't carry:

- `CMG-1124` (720cal/8oz) and `CMG-5408` (2170cal/24oz) — **exact photo match** to the known Smoked Brisket family; portions (8oz "serves 2" catering side, 24oz BYO catering entree) match the `BYOExtraProteinContentGroup`/`Build-Your-Own` group memberships found for them.
- `CMG-1133` (360cal/4oz, tagline "22g Protein") — thumbnail `cmg-1133-side-of-smoked-brisket`, in `ExtraProteinSideContentGroup`/`Chips & Sides` — a standalone "Side of Smoked Brisket," mirroring the already-known `CMG-1125` "Side of Chicken" pattern.

All 3: **confidently identified.**

### 3. Cauliflower Rice (3 ids) — confidently identified

`CMG-1039`, `CMG-1041`, `CMG-1406` each carry a `groupName` field pointing directly at a named `itemGroups` entry: `CauliRiceEntree` (60cal/4oz), `CauliRiceSingleTaco` (20cal/1.3oz), `CauliRiceKids` (30cal/2oz) — all with `displayName: "Mexican Cauliflower Rice"`. This is the single strongest evidence type available (a structured display name, not an inferred one) and confirms the family the original source-analysis already flagged as an LTO rice option.

### 4. Grilled Street Corn (8 ids) — likely identified

`CMG-1407` through `CMG-1414`, all sharing thumbnail slugs containing `grilled-street-corn` (regular side, large side, topping/premium context, and a "chips + corn" combo). Only `CMG-1412` (95cal/2oz, tagline "Served on the side") clears the confident bar. **Caveat:** several of these ids share the *identical* thumbnail slug (`cmg-1413-large-side-of-grilled-street-corn`) despite having different calories/portions (e.g. `CMG-1407` at 190cal/4oz vs `CMG-1413` at 380cal/8oz) — the product photo is evidently reused across multiple SKU sizes/contexts of the same item, so the filename confirms the *family* (Grilled Street Corn) reliably but does not reliably distinguish exact variant (regular side vs. large side vs. topping) from the filename alone. This was **not** guessed further.

### 5. New specialty drinks (13 ids) — likely identified

All confirmed by thumbnail slug only (no tagline/section text beyond `AllDrinkContentGroup`/`Drinks` group membership, which every drink shares and so isn't distinguishing):

- **Izze** (3): Blackberry, Grapefruit, Clementine (`CMG-2051/2052/2054`)
- **Dash Water** (3): Lemon, Peach, Raspberry (`CMG-2381/2382/2383`) — all 0cal, consistent with flavored still water
- **Charitea** (3): Black, Red, Mate (`CMG-2385/2398/2400`) — all 0cal, consistent with unsweetened bottled tea
- **Other** (4): Lemon Perfect Original (`CMG-2877`), Open Water Sparkling (`CMG-2879`, distinct from the already-known "Open Water Still"), Tepache Grapefruit Lime (`CMG-2880`), Tepache Tropical (`CMG-2881`)

### 6. Toppings / sauces (6 ids) — all confidently identified

- `CMG-3001` (110cal/2oz): **exact photo match** to "Cheese"/"Cheese Only Quesadilla," thumbnail filename additionally reads `monterey-jack-cheese` — this is Chipotle's cheese product (Monterey Jack), recorded at a 2oz portion context distinct from the standard 1oz topping.
- `CMG-4122` (120cal/2oz): **exact photo match** to "Side of Queso Blanco," though its own portion (2oz) matches the smaller *topping*-size Queso rather than the 4oz "side" size its photo is drawn from — a Queso Blanco variant, exact context not fully pinned down.
- `CMG-5355`/`CMG-5358` (110cal/2oz each): thumbnail `adobo-ranch` + taglines "Served on the Side"/"Made Fresh Daily" — **Adobo Ranch** sauce, in both an addon/topping context and a standalone-side context.
- `CMG-5410`/`CMG-5411` (190cal/2fl oz each): thumbnail `red-chimichurri` + taglines "Served on the Side"/"Made Daily" — **Red Chimichurri** sauce, same addon-vs-side dual context as Adobo Ranch.

### 7. Rice/grains alternative (1 id) — confidently identified

`CMG-5004` (200cal/4oz): thumbnail `supergrains` + tagline **"Brown Rice | Quinoa | Oats"** — a rice-alternative "Supergrains" blend, referenced in `RiceContentGroup`/`ToppingsContentGroup`/`OptionContentGroup`/`DipContentGroup`.

### 8. Desserts (3 ids)

- `CMG-9004` (320cal/4oz, tagline "Vegan | 3 Per Order," in the `Dessert` itemSection): **Churros** — confidently identified.
- `CMG-9005` (350cal/4oz, thumbnail `chocolate-crema`) and `CMG-9006` (420cal/4oz, thumbnail `caramel-crema`): also in the `Dessert` section and `Chips & Sides` group, but with only a generic `promo:"new"` tag and no tagline naming them — **likely identified** (Chocolate Crema, Caramel Crema — churro dipping sauces), not confidently.

### 9. Fajita Veggies contextual duplicate (1 id) — confidently identified

`CMG-408` (20cal/2.5oz, tagline "Includes Guacamole"): **exact photo match** to the already-known `CMG-5101` "Fajita Veggies" (20cal/2.5oz — identical nutrition too). The "Includes Guacamole" tagline suggests this specific id is used in a Veggie-entree-default composite/marketing context (consistent with the Veggie family's confirmed `defaultContent:true` Guacamole inclusion documented in the parent source-analysis) rather than being a distinct ingredient.

### 10. Duplicate identity records for already-known core proteins (5 ids) — all confidently identified

`CMG-5151` through `CMG-5155` are **exact photo and exact-nutrition duplicates** of the already-known Chicken (`CMG-1`, 180cal/4oz), Steak (`CMG-2`, 150cal/4oz), Carnitas (`CMG-3`, 210cal/4oz), Beef Barbacoa (`CMG-4`, 170cal/4oz), and Sofritas (`CMG-5`, 150cal/4oz) respectively — `CMG-5155` additionally carries the tagline "Plant-Based Protein," matching Sofritas exactly. These are **not new menu items** — they are alternate ids referencing the same real products, likely a separate reference/lookup set used by a different UI surface (e.g. a protein-swap picker) than the ones enumerated elsewhere. Nothing about their nutrition or identity is in question; only *why a second id exists* is unresolved.

### 11. Duplicate identity record for Chili Lime Chips (1 id) — confidently identified

`CMG-5373` (140cal/1oz): exact photo match to the already-known `CMG-5362` "Chili Lime Chips," but at a smaller/different portion (1oz vs. Chili Lime Chips' own value) — likely a kids-size or single-serving variant of the same product, exact context not pinned down beyond the confirmed identity.

### 12. Completely unknown (5 ids)

`CMG-2055`, `CMG-2056`, `CMG-2057` (all 16fl oz drinks, 170/160/160cal) and `CMG-2301`, `CMG-2302` (both 4oz food items, 230/240cal) all carry the generic `https://www.chipotle.com/` placeholder thumbnail and have no itemSections, groups, tags, or groupName reference of any kind. **No name is offered for these** — not even a low-confidence one. It's worth noting, purely as an observation and *not* as identification, that `CMG-2301`'s 230cal/4oz and `CMG-2302`'s 240cal/4oz numerically coincide with the already-known Guacamole (230cal/4oz) and "Side of Queso Blanco" (240cal/4oz) values — but a calorie coincidence with no textual or structural corroboration is exactly the kind of weak evidence this analysis was told not to turn into an invented name, so these remain unknown.

---

## Reported Back

- **Confidently identified:** 52 of 99.
- **Likely identified (not authoritative):** 42 of 99.
- **Completely unknown:** 5 of 99.
- **Major families represented:**
  - Five LTO/regional whole proteins with near-complete entree families — **Chorizo, Carne Asada, Plant-Based Chorizo, Garlic Steak, Chicken al Pastor** (48 ids total) — plus 3 more Smoked Brisket catering/side variants filling out a protein family that was already partially known.
  - **Cauliflower Rice** (3 ids, confirmed via structured `itemGroups` data — the strongest evidence tier).
  - **Grilled Street Corn** (8 ids, side/topping/combo family, exact variant boundaries unclear).
  - **13 new specialty drinks** across Izze, Dash Water, Charitea, and four others.
  - **6 toppings/sauces**: Monterey Jack Cheese, a Queso Blanco variant, Adobo Ranch, Red Chimichurri.
  - **Supergrains** (rice alternative) and **3 desserts** (Churros, Chocolate Crema, Caramel Crema).
  - **11 pure duplicates** of already-known items (5 core proteins + Fajita Veggies + Chili Lime Chips under alternate ids) — not new menu content at all, just a second reference id for something already fully understood.
- **Relevance to the active restaurant menu:** **none.** All 99 ids were independently re-confirmed absent from `calculator-menu.json`, and a deep full-tree search additionally confirmed all 99 are absent from `menu-rules.json` and `online-meals.json` as well — they exist solely inside the national `menu-metadata.json` catalog and are not currently orderable, buildable, or referenced anywhere in restaurant 469's data. They should be excluded from any importer's restaurant-469 scope; if useful at all, they'd only inform a future "national catalog" or "coming soon" feature layered on top of the core import, which is out of scope here.
