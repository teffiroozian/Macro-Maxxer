# Chipotle Runtime Enrichment Audit

Audit date: 2026-08-31  
Old runtime menu: `data/restaurants/chipotle.json`  
Generated menu: `data/generated/chipotle/restaurant.json`  
Scope: comparison and reporting only. Neither input dataset nor any runtime file was changed.

## Verdict

The generated dataset is ready to be the canonical source of Chipotle menu truth, nutrition, portions, identities, and relationships. It is **not a direct runtime drop-in** and is **not ready after a simple image/category overlay alone**.

Promotion should wait for two separate pieces of work:

1. A generated-ID enrichment layer that carries forward local images, browse taxonomy/order, and navigation presentation.
2. A runtime compatibility adapter for the old Chipotle navigation model, `entreeGroup` behavior, variant-container ingredient nutrition, generated provenance typing, legacy IDs/carts/routes, homepage IDs, and coordinated page/cart data loading.

There is no remaining nutrition or current-menu data problem blocking promotion.

## Inventory

| Measure | Old | Generated |
|---|---:|---:|
| Menu items | 60 | 77 |
| Ingredients | 24 | 72 |
| Top-level records | 84 | 149 |
| Variants | 62 | 88 |
| Nutrition panels, including variants | 115 | 229 |
| Records with source provenance | 13 | 149 |
| Local image assignments | 84 | 0 |
| Item image placeholders (`"none"`) | 0 | 77 |
| Ingredients without `image` | 0 | 72 |

Mapping result:

- 72 of 84 old top-level records have high-confidence logical mappings.
- 54 of 62 old variants have high-confidence mappings.
- Those mappings reach 104 unique generated records because generated data correctly splits many old logical products into source/context-specific records.
- 12 old records lack a high-confidence current counterpart: 9 are obsolete and 3 require a product decision.
- 45 generated records have no old counterpart.

The machine-readable audit contains every mapping and all 149 generated records are accounted for exactly once as either mapped or new-only.

## Classification of meaningful differences

### 1. KEEP GENERATED

Keep generated values for:

- IDs and official source identities
- current menu membership and availability
- names when the source naming differs
- all nutrition and portions
- variants/default variants where the source models variants
- serving types and source-only status
- build, ingredient, and customization relationships
- quantities and selection limits
- Pollo Asado and Chili Lime Chips records
- preconfigured-meal structures

Discard all 115 old hand-built nutrition panels: 53 top-level panels plus 62 variant panels. Also discard the 13 old source objects, 12 old item ingredient lists, and 10 old `ingredientRef` links as authority. They may explain legacy behavior, but they must not override generated source data.

The old file also contains `addedSugars` and one `polyunsaturatedFat` value that the generated source does not carry. Those isolated old values are not a basis for merging partial old nutrition into current records.

### 2. PRESERVE OLD ENRICHMENT

The useful Macro Maxxer-specific enrichment is:

| Enrichment | Old evidence | Preservation rule |
|---|---:|---|
| Local images | 84 record assignments | Re-key by the high-confidence mappings. A family image may serve several generated context records. Never bring old nutrition with it. |
| Browse categories | 84 records | Preserve detailed presentation families such as Chips & Dips, Single Sides, Protein Meals, Protein Cups, Fountain Drinks, Tractor Beverages, and Kids Drinks as an overlay if that taxonomy is approved. |
| Relative display order | 84 records | Preserve relative order within mapped legacy families; do not blindly copy absolute numbers because 45 generated records are new. |
| `entreeGroup` | 60 old items | Preserve the user-facing grouping concept through a generated-ID map or runtime adapter. Do not add it to generated JSON by hand. |
| Ingredient category order/labels | 6 ordered categories and 6 friendly labels | Preserve as presentation config, re-keyed to generated category IDs. |
| Builder navigation labels/images | 9 old chooser entries plus 2 kids sub-options | Preserve the UI presentation while adapting each choice to generated build/menu records. |

The old file has no short names, search aliases, keywords, custom descriptions, featured/default flags, custom slugs, item-level UI labels, explicit ranking eligibility, browse-visibility flags, or status badges. There is nothing to migrate for those field families.

### 3. OBSOLETE OLD DATA

The following old records are no longer supported by the current restaurant-469 generated menu:

| Old ID | Name | Why obsolete |
|---|---|---|
| `side-of-chicken-al-pastor-high-protein` | Side of Chicken al Pastor | Chicken al Pastor is not current. |
| `chicken-al-pastor` | Chicken al Pastor ingredient | Chicken al Pastor is not current. |
| `topo-chico-mineral-water` | Topo Chico Mineral Water | No current Topo Chico record. San Pellegrino is a different product. |
| `grapefruit-izze` | Grapefruit Izze | No current generated counterpart. |
| `blackberry-izze` | Blackberry Izze | No current generated counterpart. |
| `minute-maid-lemonade-fountain` | Minute Maid Lemonade | Absent from both generated fountain size containers. |
| `lemonade-blue-sky-fountain` | Lemonade - Blue Sky | Absent from both generated fountain size containers. |
| `mango-orange-blue-sky-fountain` | Mango Orange - Blue Sky | Absent from both generated fountain size containers. |
| `maine-root-root-beer-fountain` | Maine Root Root Beer | Absent from both generated fountain size containers. |

These 9 records' category/order/image assignments have no current product target. Some use image files shared with surviving records, but that does not preserve the obsolete product identity.

Two more old items are superseded rather than safely equivalent:

- `kids-mandarins`
- `kids-blueberries`

The current source has one `chipotle-cmg-1402` **Kid's Fruit** record. The old names must not survive as current products. Their shared generic fruit artwork is a separate human decision.

The old generic `tortilla` ingredient is also not identity-equivalent to either current `chipotle-cmg-4026` **Double Wrap with Tortilla** or `chipotle-cmg-4025` **Tortilla on the Side**. Its old 320-calorie nutrition and old build relationship must be discarded; only the artwork may be reusable.

### 4. NEEDS HUMAN DECISION

1. **Browse taxonomy:** keep the detailed old Macro Maxxer sections as the primary UI taxonomy, or use generated coarse categories and retain old labels only as secondary grouping. Recommended: preserve the old detailed taxonomy as an overlay, then explicitly place new-only records.
2. **Side-card grouping:** keep generated regular/large records as separate cards, or re-present them as old-style variants. Recommended: keep generated records separate for the first promotion; any later regrouping should be presentation-only and preserve source IDs.
3. **Builder navigation:** keep the familiar nine-choice chooser or expose the eight generated build containers directly. Recommended: retain the old chooser and adapt it to generated IDs so Chips & Sides, Drinks, High Protein, grouped Kids, and grouped Tacos remain first-class entry points.
4. **Kid's Fruit image:** reuse the old generic fruit artwork for `chipotle-cmg-1402` without preserving Mandarins/Blueberries identities. Recommended: yes.
5. **Legacy identity policy:** redirect/migrate old item URLs and persisted carts, or allow them to expire. Recommended: redirect and migrate one-to-one mappings; invalidate ambiguous/obsolete entries with a clear message.
6. **New-only image policy:** curate images before promotion or launch with category/logo fallbacks. Recommended: require at least safe fallbacks, prioritizing build containers, Pollo Asado, Chili Lime Chips, and current preset meals.

## High-confidence old → generated mapping

The complete exact mapping is in `runtime-enrichment-audit.json`. The important structural mappings are below.

### Sides

| Old logical record | Generated record(s) |
|---|---|
| `chips` | `chipotle-cmg-1002`, `chipotle-cmg-1016` |
| `side-of-guacamole` | `chipotle-cmg-1009`, `chipotle-cmg-1025` |
| `chips-guacamole` | `chipotle-cmg-1003`, `chipotle-cmg-1015` |
| `chips-fresh-tomato-salsa` | `chipotle-cmg-1005` |
| `chips-tomatillo-red-chili-salsa` | `chipotle-cmg-1007` |
| `chips-tomatillo-green-chili-salsa` | `chipotle-cmg-1006` |
| `chips-roasted-chili-corn-salsa` | `chipotle-cmg-1008` |
| `chips-queso-blanco` | `chipotle-cmg-1032`, `chipotle-cmg-1033` |
| `side-of-cilantro-lime-sauce` | `chipotle-cmg-5413`, `chipotle-cmg-5416` |
| `side-of-fresh-tomato-salsa` | `chipotle-cmg-5201`, `chipotle-cmg-5398` |
| `side-of-tomatillo-red-chili-salsa` | `chipotle-cmg-5204`, `chipotle-cmg-5500` |
| `side-of-tomatillo-green-chili-salsa` | `chipotle-cmg-5203`, `chipotle-cmg-5400` |
| `side-of-roasted-chili-corn-salsa` | `chipotle-cmg-5202`, `chipotle-cmg-5399` |
| `side-of-queso-blanco` | `chipotle-cmg-1030`, `chipotle-cmg-1031` |
| `tortilla-on-the-side` | `chipotle-cmg-4025` |
| `kids-chips` | `chipotle-cmg-1401` |

The old side variants must not overwrite the generated records. Their useful contribution is the family image, browse placement, and relative order.

### High-protein meals and cups

| Old record | Generated record |
|---|---|
| `double-high-protein-bowl` | `chipotle-meal-56ab2f6e-747d-46f9-9cf6-9ebc2855d86d` |
| `high-protein-high-fiber-bowl` | `chipotle-meal-6ba21999-f6b8-4a83-803a-bf68ef319c5e` |
| `high-protein-low-calorie-bowl` | `chipotle-meal-be88e387-62ed-4271-877c-7216b6485387` |
| `double-high-protein-burrito` | `chipotle-meal-1a3697bb-88c5-4f2e-a061-85ac3cfa0a28` |
| `high-protein-taco` | `chipotle-meal-2991ff70-3dfb-47af-84e0-cbe547e5395f` |
| `side-of-chicken-high-protein` | `chipotle-cmg-1125` |
| `side-of-steak-high-protein` | `chipotle-cmg-1126` |

Preserve images and Protein Meals/Protein Cups presentation. Generated meal composition and nutrition replace every old manual ingredient list.

### Beverages

High-confidence packaged/RTD mappings:

- `mexican-coca-cola` → `chipotle-cmg-2810`
- `mexican-sprite` → `chipotle-cmg-2839`
- `coke-zero` → `chipotle-cmg-2849`
- `poppi-strawberry-lemon` → `chipotle-cmg-2884`
- `poppi-orange` → `chipotle-cmg-2883`
- `apple-juice` → `chipotle-cmg-2101`
- `open-water-still` → `chipotle-cmg-2878`

Each old Tractor flavor maps to two generated size records:

- Watermelon Limeade → `chipotle-cmg-2019`, `chipotle-cmg-2020`
- Organic Lemonade → `chipotle-cmg-2010`, `chipotle-cmg-2011`
- Mandarin Agua Fresca → `chipotle-cmg-2012`, `chipotle-cmg-2013`
- Berry Agua Fresca → `chipotle-cmg-2017`, `chipotle-cmg-2018`

Kids drinks map to `chipotle-cmg-5554` Organic Milk, `chipotle-cmg-5553` Organic Chocolate Milk, and `chipotle-cmg-5552` Organic Apple Juice.

Thirteen old fountain flavor records map by identical flavor label to variants under both generated parents `chipotle-fountain-22-fl-oz` and `chipotle-fountain-32-fl-oz`: Barq's Root Beer, Coca-Cola Classic, Coca Cola Life, Coca-Cola Zero, Diet Coke, caffeine-free Diet Coke, Pibb Xtra, Sprite, Fanta Orange, Powerade Mountain Berry Blast, Mello Yello, Chipotle Iced Tea, and Chipotle Sweet Iced Tea.

### Ingredients

- Old crispy and soft tortilla families map to the generated taco, 3-taco, and kids context records. Generated context IDs and nutrition stay intact.
- Romaine, cheese, guacamole, Cilantro Lime Sauce, all four salsas, sour cream, fajita veggies, and queso have direct logical-family mappings. Guacamole and queso fan out to their current context-specific generated records.
- Steak, chicken, carnitas, beef barbacoa, and sofritas each map to five generated contexts: standard, single Taco, Tacos (3), Kids Build Your Own, and Kids Quesadilla. Standard records also carry their generated Normal/Half/Extra variants.
- White rice, brown rice, black beans, and pinto beans map directly to CMG-5001, CMG-5002, CMG-5051, and CMG-5052.

## Generated records with no old counterpart

There are 45.

| Family | Count | IDs / examples |
|---|---:|---|
| Build containers | 8 | `chipotle-burrito`, `chipotle-bowl`, `chipotle-salad`, `chipotle-quesadilla`, `chipotle-taco`, `chipotle-tacos-3`, `chipotle-kids-build-your-own`, `chipotle-kids-quesadilla` |
| Chili Lime Chips products | 10 | CMG-5362 through the regular/large dip combinations: `chipotle-cmg-5362`, `5363`, `5364`, `5365`, `5366`, `5367`, `5369`, `5370`, `5371`, `5372` |
| Pollo Asado side | 1 | `chipotle-cmg-1141` |
| Current beverages | 4 | `chipotle-cmg-2838`, `2022`, `2021`, `2805` — Tractor Organic Lemonade, Jarritos Guava, Jarritos Mango, San Pellegrino Sparkling |
| Source-only non-food | 3 | `chipotle-cmg-6112`, `6110`, `6111` |
| Current influencer/cross-listed meals | 6 | Josh Hart, Bardi Bowl, Mikal Bridges, Salish Matter, Tara Davis-Woodhall, Hunter Woodhall |
| New ingredient/context records | 13 | Double Wrap, two vinaigrette portions, Kid's Fruit, Kids 16 oz fountain parent, three Veggie contexts, five Pollo Asado contexts |

The 13 new ingredient/context IDs are:

- `chipotle-cmg-4026`
- `chipotle-cmg-5353`
- `chipotle-cmg-5354`
- `chipotle-cmg-1402`
- `chipotle-cmg-5551`
- `chipotle-protein-veggie`
- `chipotle-protein-veggie-taco`
- `chipotle-protein-veggie-tacos-3`
- `chipotle-protein-pollo-asado`
- `chipotle-protein-pollo-asado-taco`
- `chipotle-protein-pollo-asado-tacos-3`
- `chipotle-protein-pollo-asado-kids-byo`
- `chipotle-protein-pollo-asado-kids-quesadilla`

## Runtime assumptions the generated schema does not yet satisfy

These are promotion blockers, not generated-data defects.

1. **Navigation keys differ.** Runtime `CHIPOTLE_ENTREE_IDS` expects `bowl`, `burrito`, `quesadilla`, `salad`, `tacos`, `high-protein-menu`, `kids-meal`, `chips-sides`, and `drinks`. Generated `builderConfig` exposes `burrito`, `bowl`, `salad`, `quesadilla`, `taco`, `tacos-3`, `kids-build-your-own`, and `kids-quesadilla`. Current URL parsing rejects the new taco/kids keys, and several old keys have no generated config entry.
2. **Chipotle-specific builder presentation config is absent.** Generated config does not carry the old category label/order layer, kids selector options, taco-shell ID list, kids double-side IDs, or special quesadilla variant ID. Relationship values must be re-keyed; old relationship IDs cannot simply be copied.
3. **`entreeGroup` is absent.** Current Chips & Sides, Drinks, and High Protein list filtering depends on it, and editable high-protein preset recognition checks `entreeGroup === "high-protein-menu"`.
4. **Page and cart loaders must switch together.** `lib/restaurants.ts` and `lib/cart/cartItemLookup.ts` both still use the old Chipotle file. The Chick-fil-A migration correctly changed both paths together.
5. **Old IDs are externally observable.** Item URL slugs derive from `item.id`, persisted cart main-item lookup is strict by ID, and all mapped generated IDs differ. A migration/redirect policy is required.
6. **Homepage IDs are hard-coded.** `app/page.tsx` references two old high-protein meal IDs plus old guacamole, queso, chicken, and fajita IDs.
7. **Generated provenance has no compatible runtime type.** `MenuItem.source` currently expects `menu.tags` and `menu.pins`; generated Chipotle source objects carry provider/restaurant/menu-role/nutrition provenance instead. Define a compatible union or typed adapter boundary instead of using an unchecked broad cast.
8. **Eight variant-container ingredients have no base `nutrition`.** `chipotle-cmg-5551` plus the seven standard protein-family parents have valid variants/default variants, but `IngredientItem.nutrition` is required and the current Chipotle ingredient builder scales `ingredient.nutrition` before resolving a variant. The runtime must resolve default-variant nutrition first.
9. **Images are not runtime-safe yet.** All generated items contain `image: "none"`; all ingredients omit `image`. Runtime handling of `"none"` is not uniform across all image surfaces.
10. **Browse presentation changes sharply.** The generated menu collapses most old sections into Sides, Beverages, and Preconfigured Meals. It is data-valid, but not presentation-equivalent.

Three source-only non-food generated records are not a blocker by themselves: the shared runtime now has `isStandaloneMenuItem` filtering. Promotion QA should still verify every Chipotle browse/search/ranking surface uses it.

## Chick-fil-A precedent applied

The existing Chick-fil-A migration established the right separation:

- registry metadata remains in `data/restaurants/index.json`;
- generated menu/source data replaces hand-authored source facts;
- only explicit product enrichment is migrated;
- the page loader and cart lookup switch together;
- hard-coded editorial IDs are re-keyed;
- the old file remains temporarily as fallback/reference;
- runtime schema gaps are fixed outside generated JSON.

Chipotle should follow the same approach, with an additional builder/navigation adapter because its old runtime behavior is more restaurant-specific than Chick-fil-A's.

## Final readiness assessment

| Question | Answer |
|---|---|
| Is generated Chipotle authoritative and validated? | Yes. |
| Should old nutrition, portions, IDs, or relationships be merged in? | No. |
| Is there valuable old enrichment? | Yes: images, detailed browse taxonomy/order, and builder navigation presentation. |
| Can generated JSON replace the old file directly? | No. |
| Is a simple enrichment overlay enough? | No; runtime adapters and ID migration are also required. |
| Is the dataset ready to replace old runtime data after enrichment **and** compatibility work? | Yes. |

The recommended next step is to approve the six product/UI decisions above, then implement a separate generated-ID enrichment/config layer and runtime adapter without deleting or rewriting either dataset.
