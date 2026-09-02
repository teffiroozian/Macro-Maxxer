# Final Chipotle Enrichment Plan

Finalized: 2026-09-01  
Status: **Approved — ready to move to runtime compatibility blockers**

This is a planning/configuration artifact only. It does not wire generated Chipotle into runtime, change loaders/cart behavior, modify raw or generated data, change `next.config.ts`, or download images.

The machine-readable configuration is `data/review/chipotle/enrichment-plan.json`.

## Final decision state

All eight enrichment/product decisions are resolved. No further product choice is required before runtime compatibility work begins.

The implementation boundary is now explicit:

- Generated Chipotle remains authoritative for IDs, menu membership, source identity, nutrition, portions, availability, and relationships.
- The enrichment layer owns browse taxonomy, presentation order, card families, navigation grouping, legacy-ID migration, and remote images.
- Presentation families never merge, delete, or re-key generated records.
- Old IDs are never canonical.

## Obsolete and formerly ambiguous records

The nine definitively obsolete records will not migrate:

- `side-of-chicken-al-pastor-high-protein`
- `chicken-al-pastor`
- `topo-chico-mineral-water`
- `grapefruit-izze`
- `blackberry-izze`
- `minute-maid-lemonade-fountain`
- `lemonade-blue-sky-fountain`
- `mango-orange-blue-sky-fountain`
- `maine-root-root-beer-fountain`

Stale URLs/carts referencing them should be invalidated gracefully, never mapped to a similar-looking current product.

The three previously ambiguous records are resolved:

- `kids-mandarins` and `kids-blueberries` disappear as identities. Current UI uses `chipotle-cmg-1402` **Kid's Fruit**.
- Old generic `tortilla` does not survive as an identity, nutrition panel, or relationship. Generated tortilla identities remain authoritative.
- Neither fruit nor generic tortilla persisted selections should silently migrate. The stale selection should be invalidated with a route back to the relevant current menu context.

## Primary browse taxonomy

The old detailed Macro Maxxer taxonomy is the primary presentation layer. Generated source categories stay intact underneath.

| Presentation category | Generated records | Placement rule |
|---|---:|---|
| Chips & Dips | 20 | Traditional chips/dip records plus all 10 Chili Lime Chips products. |
| Single Sides | 15 | Guac, Cilantro Lime Sauce, four salsa families, queso, and tortilla. Four regular salsa records remain context-bound ingredients. |
| Protein Meals | 11 | Every supported current HighProtein/Influencer generated meal. |
| Protein Cups | 3 | Chicken, Steak, and current Pollo Asado sides. |
| Drinks | 11 | Surviving packaged drinks plus Tractor RTD, Jarritos, and San Pellegrino. |
| Fountain Drinks | 2 generated size parents / 23 presentation families | One card per flavor, backed by exact 22 oz and 32 oz generated variants. |
| Tractor Beverages | 8 generated size records / 4 presentation families | One card per flavor with exact 22 oz and 32 oz records. |
| Kids Drinks | 4 | Milk, chocolate milk, apple juice, and the Kids 16 oz fountain container. |
| Kids | 2 | Kid's Chips and current Kid's Fruit. |

The exact category → generated-ID arrays are in the JSON plan.

Ingredient presentation keeps the existing order:

1. Included Ingredients
2. Proteins
3. Rice
4. Beans
5. Toppings
6. Side

Generated per-entree customization relationships continue to decide eligibility. Presentation labels may combine source categories such as Salsas, Queso, Sauces, Guacamole, Dressing, and Lettuce under **Toppings**, but cannot broaden what a build permits.

### Cross-collection salsa constraint

The regular salsa identities CMG-5201, CMG-5202, CMG-5203, and CMG-5204 are generated ingredients/selectable components; their large counterparts are standalone generated items. They may appear together in a presentation family only where the generated relationship makes the regular component valid. The enrichment layer must not promote those ingredients to unconditional standalone menu membership.

## Relative display order

Preserve old relative order among every surviving mapped record in its old category. Insert current new-only records deterministically without disturbing those anchors.

Tie-break order:

1. Explicit family/category placement in the JSON plan.
2. Official online-meal `sortOrder` for new preset meals.
3. Generated source order where available.
4. Sanitized display name.

Category rules:

- Chips & Dips: keep traditional Chips, Chips & Guac, salsa combinations, and Chips & Queso order. Place each Chili Lime size/dip family immediately after its traditional counterpart; Chili Lime salsa combinations follow the traditional salsa block.
- Single Sides: Guacamole, Cilantro Lime Sauce, Fresh Tomato, Red, Green, Corn, Queso, Tortilla.
- Protein Meals: official new featured meals with source order 1–5 first, then preserve Double High Protein Bowl, High Protein-High Fiber Bowl, High Protein-Low Calorie Bowl, Double High Protein Burrito, High Protein Taco.
- Protein Cups: Chicken, Steak, Pollo Asado.
- Fountain Drinks: preserve the 13 surviving old flavor positions, then append the 10 current new flavors in generated variant order.
- Tractor: Watermelon Limeade, Lemonade, Mandarin Agua Fresca, Berry Agua Fresca.
- Kids Drinks: Milk, Chocolate Milk, Apple Juice, then 16 oz Soda/Iced Tea.
- Kids: Kid's Chips, then Kid's Fruit.

## Presentation variant families

There are 40 explicit presentation families:

- 13 side regular/large families
- 4 Tractor 22/32 oz families
- 23 fountain flavor families

A family is a UI card, not a catalog record. A selected option always commits the exact generated record or nested variant ID.

### Side families

| Presentation family | Regular generated ID | Large generated ID |
|---|---|---|
| Chips | `chipotle-cmg-1002` | `chipotle-cmg-1016` |
| Side of Guacamole | `chipotle-cmg-1009` | `chipotle-cmg-1025` |
| Chips & Guacamole | `chipotle-cmg-1003` | `chipotle-cmg-1015` |
| Chips & Queso Blanco | `chipotle-cmg-1032` | `chipotle-cmg-1033` |
| Side of Cilantro Lime Sauce | `chipotle-cmg-5413` | `chipotle-cmg-5416` |
| Side of Fresh Tomato Salsa | `chipotle-cmg-5201` ingredient | `chipotle-cmg-5398` |
| Side of Tomatillo-Red Chili Salsa | `chipotle-cmg-5204` ingredient | `chipotle-cmg-5500` |
| Side of Tomatillo-Green Chili Salsa | `chipotle-cmg-5203` ingredient | `chipotle-cmg-5400` |
| Side of Roasted Chili-Corn Salsa | `chipotle-cmg-5202` ingredient | `chipotle-cmg-5399` |
| Side of Queso Blanco | `chipotle-cmg-1030` | `chipotle-cmg-1031` |
| Chili Lime Chips | `chipotle-cmg-5362` | `chipotle-cmg-5363` |
| Chili Lime Chips & Guacamole | `chipotle-cmg-5364` | `chipotle-cmg-5366` |
| Chili Lime Chips & Queso Blanco | `chipotle-cmg-5365` | `chipotle-cmg-5367` |

### Tractor families

| Flavor | 22 oz | 32 oz |
|---|---|---|
| Watermelon Limeade | `chipotle-cmg-2019` | `chipotle-cmg-2020` |
| Lemonade | `chipotle-cmg-2010` | `chipotle-cmg-2011` |
| Mandarin Agua Fresca | `chipotle-cmg-2012` | `chipotle-cmg-2013` |
| Berry Agua Fresca | `chipotle-cmg-2017` | `chipotle-cmg-2018` |

The distinct 12 oz `chipotle-cmg-2838` Tractor Organic Lemonade remains in **Drinks**, not this fountain-size family.

### Fountain families

Each of these 23 flavors becomes one presentation card:

- Coca-Cola Classic
- Diet Coke
- Diet Coke, Caffeine Free
- Coca-Cola Zero
- Coca Cola Life
- Sprite
- Fanta Orange
- Dr. Pepper
- Diet Dr. Pepper
- Mountain Dew
- Diet Mountain Dew
- Mello Yello
- Pibb Xtra
- Barq's Root Beer
- Mug Root Beer
- Pepsi
- Diet Pepsi
- Sierra Mist
- Crush Orange
- Powerade Mountain Berry Blast
- Chipotle Iced Tea
- Chipotle Sweet Iced Tea
- Lipton Raspberry Brisk Iced Tea

For slug `{flavor}`:

- 22 oz uses parent `chipotle-fountain-22-fl-oz`, variant `chipotle-fountain-22-fl-oz-{flavor}`.
- 32 oz uses parent `chipotle-fountain-32-fl-oz`, variant `chipotle-fountain-32-fl-oz-{flavor}`.
- 16 oz uses parent `chipotle-cmg-5551`, variant `chipotle-fountain-16-fl-oz-{flavor}`, visible only in the Kids context.

The JSON enumerates all 23 slugs and identifies the 13 surviving legacy fountain parents. All 69 generated 16/22/32 variant references were verified.

## Legacy navigation → generated targets

Keep the current nine-choice user-facing navigation:

| Legacy navigation key | Label | Generated target |
|---|---|---|
| `bowl` | Bowl | `chipotle-bowl` |
| `burrito` | Burrito | `chipotle-burrito` |
| `quesadilla` | Quesadilla | `chipotle-quesadilla` |
| `salad` | Salad | `chipotle-salad` |
| `tacos` | Tacos | Choice between `chipotle-taco` and `chipotle-tacos-3`; default Tacos (3). |
| `high-protein-menu` | High Protein Menu | Browse Protein Meals + Protein Cups. |
| `kids-meal` | Kid's Meal | Choice between `chipotle-kids-build-your-own` and `chipotle-kids-quesadilla`; default BYO. |
| `chips-sides` | Chips & Sides | Browse Chips & Dips + Single Sides. |
| `drinks` | Drinks | Browse Drinks + Fountain Drinks + Tractor Beverages + Kids Drinks. |

Legacy navigation keys are presentation/router state only. They never replace the generated selection identity.

## Kid's Fruit

Use generated `chipotle-cmg-1402` **Kid's Fruit**.

Its official image is already mapped:

`https://www.chipotle.com/content/dam/chipotle/menu/menu-items/cmg-1402-kids-fruit/web-desktop/order.png`

The old `/restaurants/chipotle/menu/sides/fruit.png` artwork is fallback-only. Old Mandarins/Blueberries names and identities are not exposed or migrated silently.

## Legacy URL/cart migration policy

Generated IDs are canonical. The plan contains 35 direct one-to-one redirects plus family and contextual rules.

- One-to-one mapping: redirect/migrate directly to the generated ID.
- Presentation family: the old parent defaults to Regular/22 oz; a saved old variant selects its exact generated record/variant.
- Protein family: resolve using persisted build context—adult standard, single Taco, Tacos (3), Kids BYO, or Kids Quesadilla.
- Tortilla family: resolve by generated build target, taco count, and Kids context.
- Guacamole/queso/Cilantro Lime Sauce: resolve through the selected generated build's actual relationship, never by taking the first same-name record.
- Missing/invalid context: do not guess. Invalidate gracefully.
- Obsolete record: invalidate and return the user to the relevant current menu.

`kids-mandarins`, `kids-blueberries`, and generic `tortilla` are explicitly excluded from silent migration. The current replacement may be offered as a user choice.

## Official image enrichment

Use `data/review/chipotle/runtime-image-enrichment.json` as the only official-image enrichment source.

Coverage:

- 146/149 generated records
- 74/77 items
- 72/72 ingredients
- all 88 variants inherit the parent image

Application rules:

- Lookup by generated record ID.
- Apply the mapped remote URL at the enrichment/runtime boundary.
- Family cards use the selected/default generated member's mapped image.
- Context records may share official imagery when the map resolves them to the same URL.
- Variants inherit parent images unless a future official mapping provides a distinct image.
- Do not write URLs into generated JSON by hand and do not download them into `/public`.

The only records requiring no image are:

- `chipotle-cmg-6110` — Napkins & Utensils
- `chipotle-cmg-6111` — 6 Serving Bowls
- `chipotle-cmg-6112` — Serving Utensils

All three are source-only non-food records.

### Next.js remote-image requirements

During runtime compatibility work, add these narrow `images.remotePatterns` entries to `next.config.ts`:

```ts
{
  protocol: "https",
  hostname: "www.chipotle.com",
  pathname: "/content/dam/chipotle/menu/**",
},
{
  protocol: "https",
  hostname: "miinternal-cdn.chipotle.com",
  pathname: "/assets/menuinnovation/**",
},
```

Do not allowlist `chipotlestrg-cdn.chipotle.com` unless a future active enrichment mapping actually uses it.

## Runtime blockers for the next phase

Product/enrichment decisions are complete. The next phase is implementation work:

1. Build a typed enrichment adapter using this plan and the image map.
2. Reconcile legacy navigation keys with generated build targets/browse groups.
3. Resolve default-variant nutrition for eight variant-container ingredients before the existing builder scales nutrition.
4. Add a compatible generated provenance type boundary.
5. Replace legacy `entreeGroup` checks with enrichment/group lookups or generated source-role logic.
6. Implement legacy route redirects and cart migration/invalidation.
7. Re-key homepage Chipotle editorial IDs.
8. Add the two image remote patterns and verify every image surface.
9. Switch page and cart loaders atomically only after the compatibility layer passes QA.

## Final assessment

**Yes — all enrichment and product decisions are resolved enough to move on to runtime blockers.**

No further human product decision remains in this plan. Any remaining questions are implementation and validation details, and generated Chipotle should stay unwired until those blockers are completed.
