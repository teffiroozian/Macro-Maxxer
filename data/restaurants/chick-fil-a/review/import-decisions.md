# Chick-fil-A Import: Decision Log

This is a human-readable record of what we learned converting Chick-fil-A's
official source data into the Macro Maxxer runtime model — not a technical
diff and not a restatement of the validator report (see `comparison.md` /
`manual-review.md` / `migration-readiness.md` in this same folder for those).

## 1. Raw Source Behaviors We Discovered

- **Size/count variants are separate SKUs.** Small/Medium/Large Waffle Potato
  Fries, or 5/8/12/30 Ct Nuggets, are each their own full record with their
  own `retailModifiedItemId`, grouped under one parent `ITEM_GROUPING` (an
  `itemGroupId`). Chick-fil-A's own `qtySizeAbbreviation` field usually (but
  not always — see §4) labels each sibling's differentiator directly.
- **Cheese choice is encoded as product variants, not a modifier.** e.g.
  "Spicy Deluxe Sandwich w/ Pepper Jack / American / Colby Jack / No Cheese"
  are four separate sellable SKUs under one grouping — structurally identical
  to a size-variant family, even though the real product identity is "one
  sandwich, choose your cheese."
- **The same product can be listed under more than one official category.**
  Some items appear in two of Chick-fil-A's own top-level categories at once
  (e.g. a side also listed under Breakfast), and separately some products
  exist as fully duplicate records under two categories rather than one
  dual-listed record — these two situations look similar but are not the same
  underlying data shape (see §5).
- **Structural/grouping records are mixed in with real products at the same
  graph level.** An `ITEM_GROUPING` that lists 2+ real `ITEM` children in the
  same category listing can either be a genuine product (Hash Browns,
  Nuggets) or a catalog-only reference list of components used elsewhere
  ("Filets", "Breakfast Proteins", "Breakfast Breads") — nothing in the raw
  fields (`itemType`, `dotComVisible`, `isSellable`, description) reliably
  tells them apart on its own.
- **Meal containers exist as separate records from their components.** A
  "Meal" is its own `ITEM_GROUPING` (`meal: true` / `itemType` containing
  `MEAL`) that references entree/side/beverage option groups — it is not the
  same record as the standalone entree, side, or drink it bundles.
- **Ingredients and modifiers live in the same graph as sellable products,**
  distinguished only by `itemClass` (`MODIFIER`) and `itemType`
  (`INGREDIENTS` vs. other modifier types), not by being in a separate file
  or namespace.
- **Nutrition comes from more than one official source.** A standalone
  nutrition table (by name match) and a separate "ordering system" nutrition
  feed (by `retailModifiedItemId` + `tag`) can each hold the authoritative
  value for different records, and occasionally the same record's real
  nutrition is only resolvable by combining a base item with its default
  modifiers from the ordering feed.
- **Some ingredient nutrition is context-dependent.** The same ingredient
  record can carry more than one valid nutrition payload depending on which
  parent item/relationship tag selected it — there is no single row that's
  "the" nutrition for that ingredient in isolation.
- **Official image URLs come from Chick-fil-A's own CDN** (`cfacdn.com`),
  available directly on each record (`desktopImage`, `webImage`,
  `mobileImage`, `pdpImages`) — no manual image sourcing was needed.
- **Internal ordering relationships exist that are never shown to the user
  directly** but must be preserved for correctness — e.g. which modifier is
  the DEFAULT selection in a group, or which items a meal's side/beverage
  slot actually allows — even when Macro Maxxer doesn't yet expose that flow.

## 2. Macro Maxxer Decisions We Made

- **One logical product card per family, not one per SKU.** Size/count/cheese
  variant siblings are folded into a single `MenuItem` with a `variants[]`
  list, not rendered as separate Menu cards.
- **Visible variant labels show only the differentiator** — "Small", "Large",
  "8 Ct", "Pepper Jack" — never the full repeated product name. The complete
  official name is still preserved in `source.menu.names`.
- **Cheese-style component differences normalize into a customization
  selector when that's the better Macro Maxxer UX**, using the exact same
  full-nutrition-swap `variants[]` mechanism as a size variant — never
  approximated by manually adding/subtracting ingredient macros. The
  selector is labeled by what it actually is (e.g. "Cheese") instead of the
  generic "Portion" label used for size/count groups.
- **Protein-specific salad and scramble SKUs use the same component-choice
  model.** The parent stays one browse product, Protein is a single-select
  customization, and each choice retains its exact official SKU nutrition.
  Paired child states such as "Nuggets - no hash browns" remain internal
  because they combine Protein with a separate ingredient-removal state.
- **Every logical product gets exactly one primary Macro Maxxer browse
  category** (`categories: [primaryBrowseCategory]`), even when Chick-fil-A
  lists it under more than one official section.
- **Variant SKUs inherit their logical parent's primary browse category.**
  Variant-level source relationships remain in provenance, but cannot move a
  Coffee/Beverage/Treat card into another section or inflate category counts.
- **Official multi-category membership is preserved as metadata**
  (`source.menu.officialCategories`) for provenance, but never creates a
  second browse card.
- **Ingredient/component records surface in Ingredients/customization, not
  Menu browsing.** This now explicitly includes catalog-only structural
  families (Filets, Breakfast Proteins/Breads) and orphaned duplicate ITEM
  records (a bare "Waffle", the ITEM-class "Gluten Free Bun") that looked
  sellable in the raw feed but are never actually chosen through any real
  ordering path.
- **Structural/source-only records stay internal** (`sourceOnly: true`) —
  resolvable for relationships and nutrition, excluded from Menu browsing,
  search, and ranking.
- **Standard Meals, Kid's Meals, and Family Style Meals are currently
  deferred** from browsing — their relationship data (entree/side/beverage
  options) is retained, but they are not yet promoted to browsable products.
- **Official backend nutrition can be used even when Chick-fil-A's own
  visible ordering UI hides it**, as long as the payload is a real,
  non-placeholder value — a UI hide flag is not evidence the nutrition is
  unofficial or wrong.
- **Context-dependent modifier nutrition resolves from the parent
  relationship/tag that selected it**, not from a single generic value
  attached to the ingredient in isolation.
- **Official Chick-fil-A image URLs are preferred over any older manually
  authored image mapping.**
- **Macro Maxxer's browse taxonomy can differ from Chick-fil-A's own category
  structure** when that produces clearer navigation for our use case (see the
  taxonomy below).
- **Ranking type (`servingType`) and browse category (`categories`) are
  separate concepts** — changing how something is categorized for browsing
  must never change how it's ranked/filtered as an entree, side, drink, etc.

### Current intended Chick-fil-A browse taxonomy (implemented in code)

In sidebar order:

1. Sandwiches
2. Chicken *(renamed from "Nuggets & Strips" during QA — reuses the existing generic "chicken" icon)*
3. Salads
4. Wraps
5. Breakfast
6. Sides
7. Coffee
8. Beverages
9. Treats
10. Kids
11. Sauces
12. Dressings
13. Condiments

This taxonomy and the single-primary-category assignment logic are live in
`primaryBrowseCategoryFor` (`scripts/importers/chick-fil-a.ts`). Two category
buckets currently render empty in practice (Kids, and to a lesser extent
Dressings/Condiments) because every record that officially belongs there is
also currently marked non-independently-sellable (`sourceOnly`) — that's a
sellability finding from QA, not a gap in the categorization rule itself.

## 3. Generic Rules for Future Restaurants

These are intended to generalize beyond Chick-fil-A:

- Preserve raw restaurant source data unchanged — never hand-edit a raw or
  generated file to fix a modeling problem; fix the importer/classification
  logic and regenerate.
- Distinguish a source SKU from a logical browse product — a size/count/
  component difference is not automatically a separate product.
- Canonicalize duplicate browse parents only from strong source identity
  evidence. Matching parent tags plus identical child retail-ID membership
  can prove two category/group occurrences are one logical product; display
  name equality alone cannot.
- Derive concise variant labels from the complete sibling set: remove shared
  product-family prefixes/suffixes only when every sibling retains a meaningful
  choice, and preserve a shared word when it is itself the base choice (for
  example `Lemonade` / `Diet Lemonade`). Full official names remain source
  metadata.
- When an official counted-package SKU explicitly reports nutrition on the
  same per-unit serving basis as its 1-count sibling and repeats the identical
  per-unit payload, derive the package total by multiplying every additive
  nutrition field by the official count. Record that provenance, and never
  override a distinct directly published pack-total payload.
- An official category parent with a default child, customer-visible parent
  metadata, and singular/plural family-name agreement across all child SKUs is
  one canonical flavor family. This is what turns the collected `Floats`
  source group into one `Float` browse product without merging unrelated
  frozen beverages.
- A customization modifier can also be a standalone browse product when its
  official item type places it in the Sauces or Dressings taxonomy; browse
  exposure must not remove its existing customization relationships.
  Independently sellable 8oz sauce bottles remain separate browse products
  beside dipping portions because each bottle has its own official retail
  identity, package nutrition, image, and price; flavor-name similarity alone
  is not sufficient reason to hide the sellable package record.
- A category-listed group with an official default child and a parent-name
  stem shared by every child is a coherent logical product even when its
  children occur nowhere else; occurrence count alone must not classify it
  as catalog residue.
- An official secondary source may complete a size family only when retail
  identity, parent-name stem, recognized size, tag stem, and nutrition all
  agree. This recovered Fruit Cup Large from the collected ordering source
  without inventing or hand-editing a generated option.
- Distinguish source category membership from the single primary Macro
  Maxxer browse category — keep the former as provenance metadata, use the
  latter (and only the latter) for what actually renders.
- Distinguish real variant families from structural/catalog-only groupings
  using official graph relationships (e.g. "is this record's children ever
  referenced anywhere besides their own family group?") rather than name
  patterns or `isSellable` alone, whenever the source graph makes that
  possible.
- Preserve source identity (official name, ids, category membership,
  nutrition source, image) even when Macro Maxxer changes how something is
  presented or organized.
- Keep internal structural records (meal containers, catalog-only groupings,
  variant children, orphaned components) out of user-facing browse, search,
  and ranking surfaces via one consistent visibility flag, rather than ad hoc
  per-surface filtering.
- Prefer official current source data over historical manually authored
  restaurant facts (images, categories, nutrition) whenever both exist.
- Use an official secondary nutrition source when the primary source is
  incomplete, but only when the match to a specific record is unambiguous.
- Never guess or approximate nutrition when official source identity is
  ambiguous — leave it for human review instead.
- Generated files are reproducible importer output, not a place for manual
  edits — any fix belongs in the importer/classification logic.
- Restaurant-specific overrides should exist only for genuine exceptions in
  that restaurant's own source data, not as a substitute for generic
  classification logic.
- User-facing organization (browse categories, labels, variant grouping)
  should optimize for Macro Maxxer's own use case, not blindly mirror the
  source restaurant's ordering-app UX.

## 4. Chick-fil-A-Specific Exceptions

These should NOT automatically become global behavior — they're responses to
specifics of Chick-fil-A's own feed:

- **The `GLUTENFREE_BUN_ENTREE` tag special-case.** Chick-fil-A's feed tags
  this one record distinctly enough to route it directly into
  customization-only handling; this is a Chick-fil-A tag value, not a
  generic mechanism other restaurants are expected to share.
- **The ordering-system nutrition feed's `retailModifiedItemId` + `tag`
  matching rule** is specific to how Chick-fil-A's ordering API identifies a
  record; another restaurant's secondary nutrition source will need its own
  matching key.
- **Deferral of Meals / Kid's Meals / Family Style Meals** is a Chick-fil-A
  QA scoping decision for this integration pass, not a statement that meal
  composition is unsupported architecture-wide.
- **The "Chicken" category name and its reuse of the generic `chicken`
  sidebar icon key** reflect Chick-fil-A's specific Nuggets/Strips/Chick-n-
  Minis family; another restaurant's chicken-item taxonomy may not map the
  same way.
- **Orphaned catalog-residue records** (a bare "Waffle" and "Gluten Free Bun"
  ITEM, the "Filets"/"Breakfast Proteins"/"Breakfast Breads" family listings)
  are leftovers specific to how Chick-fil-A's feed happens to list bread/
  protein reference data alongside real products. The *detection rule*
  (records referenced nowhere beyond their own listing) is generic; the fact
  that Chick-fil-A's feed has this residue at all is not something every
  restaurant's feed will necessarily do.
- **Hash Browns trail the official Sides sequence.** They remain a Macro
  Maxxer-specific addition to Sides, but their Breakfast-only source order
  must not disturb Chick-fil-A's official relative Sides order.
- **A grouping that contains explicitly identified non-menu residue remains
  structural.** Hiding only the residue leaf is insufficient because a
  promoted parent variant container would make it reachable again. For the
  current feed, `ICE_BAG_5_LB` identifies Bag of Ice and keeps its mixed
  Gallon Beverages container out of normal browse/search/quick-add surfaces.

## 5. Open / Deferred Decisions

- Full Meal composition (Standard Meals) is not yet promoted to browsable/
  orderable — relationship data exists, UI does not.
- Kid's Meal composition is deferred the same way.
- Family Style Meal support is deferred the same way.
- A richer nested/contextual customization schema (beyond the current
  ingredient-category + component-choice-variant model) has not been
  designed — today's model covers what Chick-fil-A's data needed so far.
- The "Chick-fil-A Sauce Flavored Waffle Potato Chips" side referenced in
  Chick-fil-A's current official Sides ordering does not exist anywhere in
  our currently collected raw source — it cannot be placed until (if ever)
  it appears in a future data collection.
- Broader runtime QA (cart, quick-add, edit-from-cart, search/ranking) beyond
  the representative items already spot-checked is still pending.

## 6. Future Restaurant Import Checklist

1. Collect the official menu source (raw, unmodified).
2. Collect the official nutrition source(s), including any secondary/
   ordering-system feed if the primary source is incomplete.
3. Preserve raw files unchanged — never hand-edit them.
4. Analyze the source graph and identify each record's structural role
   (`itemClass`, grouping relationships, meal/ingredient/modifier flags).
5. Identify logical products vs. size/count/component variants vs.
   ingredients/modifiers vs. purely structural nodes, using graph
   relationships before falling back to name patterns.
6. Match nutrition conservatively — exact/normalized/verified matches only;
   route anything ambiguous to human review rather than guessing.
7. Normalize into the Macro Maxxer schema (`MenuItem`, `variants`,
   `IngredientItem`, customization rules), preserving source identity via a
   `source` trace on every record.
8. Assign one primary Macro Maxxer browse category per logical product.
9. Preserve official source relationships/category membership as metadata,
   separate from the single browse category actually rendered.
10. Validate unresolved records and structural invariants with a dedicated
    validator script before wiring anything into the runtime.
11. Compare against any prior/legacy dataset only for Macro Maxxer-specific
    enrichment worth carrying forward (verified nutrition mappings, etc.) —
    never as a source of truth over the fresh official data.
12. Wire the generated data into the runtime behind the existing generic
    mechanisms (`sourceOnly`, `variants`, `categories`, `servingType`) rather
    than new restaurant-specific UI branches.
13. Perform representative manual QA across categories, variant groups,
    customization flows, and cart/edit paths before considering it done.
14. Record any genuinely restaurant-specific exceptions explicitly (as in
    §4 above) so they're never mistaken for generic architecture later.
