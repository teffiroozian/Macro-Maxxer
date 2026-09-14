# Chipotle Runtime & Presentation: Decision Log

This is a human-readable record of decisions about how Macro Maxxer's
**runtime** presents, navigates, and builds on top of the already-generated
`data/generated/chipotle/restaurant.json`. It is the companion to
`import-decisions.md`, which covers a different concern: how that generated
data itself was produced from raw Chipotle sources (source/data truth).
Nothing in this document changes, re-derives, or overrides generated
nutrition, portions, or source identity — every decision here is either a
presentation overlay (labels, images, grouping, order, navigation) or a
selection-time build-configuration choice (which already-generated record a
given UI context selects), never a new nutrition value.

The evidentiary planning work behind most of this document lives in:
- `enrichment-plan.md` / `enrichment-plan.json` — the approved
  browse-taxonomy, presentation-family, navigation, and legacy-ID-migration
  plan.
- `runtime-enrichment-audit.md` / `runtime-enrichment-audit.json` — the
  audit comparing the old hand-authored Chipotle runtime data against
  generated data, which the plan above resolves.
- `runtime-image-enrichment.json` — the official-image mapping keyed by
  generated record ID.

Those documents are the "why we're allowed to do this" evidence; this
document is "what was actually decided and implemented," matching the same
convention `import-decisions.md` already established. As in that document,
each entry below states what the decision is, why it exists, whether it's
source/data truth or Macro Maxxer presentation/runtime behavior (all
entries here are the latter unless explicitly noted), any exception, and
which file/config implements it.

---

## 1. Keep the detailed old Macro Maxxer browse taxonomy as the primary presentation layer

**Decision:** Chipotle's generated data collapses almost everything into a
few coarse source categories (Sides, Beverages, Preconfigured Meals). Macro
Maxxer's runtime instead presents the old, more detailed taxonomy — Chips &
Dips, Single Sides, Protein Meals, Protein Cups, Drinks, Fountain Drinks,
Tractor Beverages, Kids Drinks, and Kids — as an overlay placement, with
every generated record explicitly assigned into exactly the categories the
plan specifies.

**Why:** The coarse generated categories are not presentation-equivalent to
what Macro Maxxer's browse UI needs; the old detailed taxonomy was already a
proven, more useful user-facing structure and is preserved rather than
discarded.

**Type:** Macro Maxxer presentation/runtime behavior. Generated source
categories are untouched underneath.

**Exception/context:** Placement rules (e.g. all Chili Lime Chips products
under Chips & Dips; four regular salsa ingredients staying context-bound
rather than promoted to standalone Single Sides membership) are explicit
per-category, not inferred.

**Implements:** `data/restaurants/chipotle-generated-presentation.ts`
(`CHIPOTLE_BROWSE_TAXONOMY`, built from `enrichment-plan.json`'s
`browseTaxonomy.categories`).

---

## 2. Group regular/large (and flavor-size) items as presentation variants

**Decision:** Where the generated data models a "regular" and "large" (or
"22 oz"/"32 oz"/"16 oz") version of the same product as two (or more)
separate standalone generated records, the runtime presents them as one UI
card with a variant selector instead of two duplicate cards — for 13 side
regular/large families, 4 Tractor Beverage size families, and 23 fountain
drink flavor families (69 generated 16/22/32 oz variant references).

**Why:** Two full-width cards for "Chips" and "Chips (Large)" reads as
duplication to a user comparing products, even though they are legitimately
separate orderable/priced generated records.

**Type:** Macro Maxxer presentation/runtime behavior — a presentation
"family" is a UI card, not a catalog record.

**Exception/context:** A selected option always commits the *exact*
generated record or nested variant ID; the family construct never merges,
deletes, or re-keys the underlying generated identities. The four
cross-collection regular salsas (`CMG-5201`/`5202`/`5203`/`5204`) may only
join a family where the generated relationship already makes that
ingredient a valid selection — the enrichment layer does not promote them
to unconditional standalone membership.

**Implements:** `data/restaurants/chipotle-generated-presentation.ts`
(`makeBrowseCards()` / `CHIPOTLE_PRESENTATION_CARDS`, `fountainCards`,
`recordFamilies`), driven by `enrichment-plan.json`'s
`presentationVariantFamilies`; consumed in
`lib/restaurantBuilders/chipotle/generatedRuntimeAdapter.ts`
(`presentationItems` in `adaptGeneratedChipotleMenuForRuntime`).

---

## 3. Preserve the old Chipotle navigation, mapped onto generated build targets

**Decision:** The familiar nine-choice entree chooser (Bowl, Burrito,
Quesadilla, Salad, Tacos, High Protein Menu, Kid's Meal, Chips & Sides,
Drinks) is kept as the primary navigation, instead of exposing the eight raw
generated build containers (`bowl`, `burrito`, `salad`, `quesadilla`,
`taco`, `tacos-3`, `kids-build-your-own`, `kids-quesadilla`) or the
generated `browse_groups` pseudo-entrees directly.

**Why:** The generated build-target/navigation keys don't match the old
runtime's `CHIPOTLE_ENTREE_IDS`, and the old nine-choice chooser is a
proven, familiar entry-point structure worth keeping rather than exposing
the generated schema's own shape to the user.

**Type:** Macro Maxxer presentation/runtime behavior. Legacy navigation keys
are presentation/router state only and never replace the generated
selection identity.

**Exception/context:** "Tacos" and "Kid's Meal" are each a choice between
two generated build targets (Taco vs. Tacos (3); Kids BYO vs. Kids
Quesadilla) rather than a 1:1 mapping. "High Protein Menu", "Chips &
Sides", and "Drinks" are `browse_groups` pseudo-entrees with no single
generated record of their own — they route to a set of browse categories
instead.

**Implements:** `data/restaurants/chipotle-generated-presentation.ts`
(`CHIPOTLE_PRESENTATION_NAVIGATION`, from `enrichment-plan.json`'s
`navigation`); `lib/restaurantBuilders/chipotle/generatedRuntimeAdapter.ts`
(`buildGeneratedChipotleBuilderConfig`'s `entreeOptions`).

---

## 4. Official remote Chipotle image usage

**Decision:** Every generated record's runtime image is looked up by
generated ID against an official-image map sourced from Chipotle's own CDN
(`www.chipotle.com`, `miinternal-cdn.chipotle.com`), never downloaded into
`/public` and never hand-written into generated JSON. A record with no
official mapping falls back to the Chipotle brand logo, never a
mismatched/reused old asset.

**Why:** Official Chipotle product photography is more accurate and more
complete (146/149 generated records, 100% of ingredients) than the old
hand-curated local image set, and keeping it remote avoids duplicating or
going stale against Chipotle's own asset pipeline.

**Type:** Macro Maxxer presentation/runtime behavior.

**Exception/context:** Three source-only non-food records (Napkins &
Utensils, Serving Bowls, Serving Utensils) intentionally need no image.
Variants inherit their parent record's image unless a future mapping
supplies a distinct one. Next's server-side image optimizer proxies every
remote image through `/_next/image`, which re-resolves the hostname and
rejects the request under DNS64 network conditions even though the source
URL and `next.config.ts`'s allowlist are both correct — Chipotle's official
CDN hosts hit this in practice, so their images render `unoptimized`
(skipping the proxy) while every other image, including every other
restaurant's, keeps normal Next optimization. `chipotlestrg-cdn.chipotle.com`
is deliberately **not** allowlisted in `next.config.ts` — no active
enrichment mapping uses it yet.

**Implements:** `data/review/chipotle/runtime-image-enrichment.json` (the
only official-image source); `data/restaurants/chipotle-generated-presentation.ts`
(`CHIPOTLE_OFFICIAL_IMAGE_BY_GENERATED_ID`, `imageForGeneratedRecord`,
`chipotlePresentationImageForGeneratedId`, `CHIPOTLE_PRESENTATION_FALLBACK_IMAGE`,
`CHIPOTLE_IMAGE_REMOTE_HOSTS`); `components/ui/AppImage.tsx` (the
DNS64/unoptimized workaround); `next.config.ts` (`images.remotePatterns` for
both hosts).

---

## 5. Obsolete old records are dropped, never silently mapped to a similar current product

**Decision:** Nine old runtime records with no current generated
counterpart (`side-of-chicken-al-pastor-high-protein`, `chicken-al-pastor`,
`topo-chico-mineral-water`, `grapefruit-izze`, `blackberry-izze`,
`minute-maid-lemonade-fountain`, `lemonade-blue-sky-fountain`,
`mango-orange-blue-sky-fountain`, `maine-root-root-beer-fountain`) are
treated as permanently obsolete. Any stale URL or persisted cart referencing
one of them is invalidated gracefully — never redirected to a
similar-looking current product.

**Why:** These products no longer exist on Chipotle's current menu; picking
"the closest current product" on their behalf would misrepresent what the
user actually ordered/selected.

**Type:** Macro Maxxer presentation/runtime behavior (a migration-policy
decision about old, no-longer-generated identities — the generated dataset
itself has no obsolete-record concept).

**Implements:** `data/restaurants/chipotle-generated-legacy-ids.ts`
(`CHIPOTLE_GENERATED_LEGACY_ID_CONFIG.obsoleteInvalidations`); resolved in
`lib/restaurantBuilders/chipotle/legacyCompatibility.ts`
(`resolveChipotleLegacyId`, `status: "obsolete"` branch).

---

## 6. Legacy ID migration policy

**Decision:** Generated IDs are canonical. Every old (pre-generated-data)
identity is resolved through one explicit, typed policy rather than
best-effort string matching:
- **Canonical** — the "legacy" id already *is* a generated ID/variant ID.
- **One-to-one** — a direct, unambiguous old-ID → generated-ID mapping (35
  of these).
- **Presentation family** — resolves through a regular/large or size
  family; an old parent ID defaults to Regular/22 oz, an old variant ID
  resolves to its exact generated record/variant.
- **Contextual** — resolves only given an explicit build-target context
  (protein family, tortilla family, or Guacamole/Queso Blanco/Cilantro Lime
  Sauce relationship); with no context supplied, the result is `ambiguous`,
  never a guess.
- **Obsolete** — see §5.
- **Never-silently-migrated** — `kids-mandarins`, `kids-blueberries`, and
  the old generic `tortilla` identity are explicitly excluded from silent
  migration even though a current replacement exists, because the old and
  current identities are not equivalent (different nutrition/relationship);
  the replacement may be offered as an explicit user choice instead.
- **Unknown** — no approved mapping exists at all.

**Why:** A single principled resolution path (rather than ad hoc lookups
scattered per surface) keeps old URLs and persisted carts from ever
resolving to a nutritionally-incorrect or merely similar-looking current
record.

**Type:** Macro Maxxer presentation/runtime behavior.

**Exception/context:** Guacamole/Queso Blanco/Cilantro Lime Sauce resolve
through the selected generated build's actual ingredient relationship
(matched by name within that build's own ingredient categories), never by
taking the first same-name record found anywhere.

**Implements:** `lib/restaurantBuilders/chipotle/legacyCompatibility.ts`
(`resolveChipotleLegacyId`, `resolveChipotleLegacyItemRoute`,
`resolveChipotleLegacyCartMainItem`,
`resolveChipotleLegacyCartIngredientId`); config in
`data/restaurants/chipotle-generated-legacy-ids.ts`.

---

## 7. Generated data remains authoritative for nutrition/source truth

**Decision:** At every runtime layer — items, ingredients, variants,
presentation families, browse cards — generated IDs, nutrition, portions,
availability, and source provenance are read through and displayed, never
recalculated, merged with old hand-authored values, or replaced. Presentation
work (taxonomy, order, labels, grouping, images, navigation) is additive
metadata on top of generated identities, not a competing data source.

**Why:** This is the explicit boundary the enrichment plan sets to keep
"useful old presentation" from silently reintroducing "outdated old
nutrition/relationships" — the two were deliberately kept separable.

**Type:** Governing principle across all of the presentation/runtime
decisions in this document; restates a project-level rule, not a value
judgment made about generated data.

**Implements:** Stated explicitly as
`CHIPOTLE_GENERATED_PRESENTATION_CONFIG.identityPolicy` in
`data/restaurants/chipotle-generated-presentation.ts` ("Presentation cards
retain exact generated recordId/variantId members; they never merge or
replace source identities."); enforced structurally by
`lib/restaurantBuilders/chipotle/generatedRuntimeAdapter.ts`, which only
ever adapts/relabels generated records and never introduces a fabricated
nutrition value.

---

## 8. Tortilla contextual labels: Tortilla / Double Wrap with Tortilla / Side Tortilla

**Decision:** The single generated tortilla-side record `chipotle-cmg-4026`
displays under three different names depending on context, because its
generated name ("Double Wrap with Tortilla") only correctly describes one of
those contexts:
- **"Tortilla"** — the generic label, used everywhere there's no specific
  entree context (e.g. the entree-agnostic View All Ingredients comparison,
  and Quesadilla's included base).
- **"Double Wrap with Tortilla"** — only on Burrito, where selecting it
  really does mean an *extra* tortilla wrapped around the burrito.
- **"Side Tortilla"** — a separate synthesized ingredient ID
  (`chipotle-cmg-4025-bowl-side`) for Bowl's optional add-on, which reuses
  `chipotle-cmg-4025` ("Tortilla on the Side")'s exact nutrition/source
  under its own ID rather than the generic `chipotle-cmg-4026`, because Bowl
  has no generated ingredient record of its own for this add-on.

**Why:** One generated record's real-world meaning genuinely differs by
build context; showing "Double Wrap with Tortilla" on every surface (or the
generic "Tortilla" on Burrito, where it's misleading) would be less
accurate than the entree-specific label.

**Type:** Macro Maxxer presentation/runtime behavior (label only; nutrition
and source identity are unchanged).

**Implements:**
`lib/restaurantBuilders/chipotle/ingredientMenuItems.ts`
(`resolveChipotleIngredientDisplayName`, `tortillaSideGenericLabel`,
`tortillaSideLabelByEntree`);
`lib/restaurantBuilders/chipotle/generatedRuntimeAdapter.ts`
(`buildBowlSideTortillaIngredient`, which mints
`chipotle-cmg-4025-bowl-side`).

---

## 9. Burrito included tortilla behavior

**Decision:** Every adult Burrito automatically includes exactly one
required, locked tortilla (`chipotle-cmg-4026-burrito-base`, labeled
"Tortilla" — see §8) — the *only* included ingredient pinned to Burrito's
Included Ingredients. `chipotle-cmg-4026` ("Double Wrap with Tortilla")
itself is deliberately **not** pre-selected/pinned: it stays eligible as a
genuine optional upsell add-on, unlike Quesadilla, whose tortilla+cheese
base is structurally included.

**Why:** Burrito's included base tortilla and Burrito's optional second
("double wrap") tortilla are two different real choices with the same
underlying generated nutrition record; conflating them (e.g. auto-including
the "double wrap" record) would misrepresent a genuine upsell as already
included.

**Type:** Macro Maxxer presentation/runtime behavior (a build-configuration
choice; both tortilla nutrition values are generated data).

**Implements:**
`lib/restaurantBuilders/chipotle/generatedRuntimeAdapter.ts`
(`buildGeneratedChipotleBuilderConfig`'s `entreeOptions.burrito`
`includedIngredientIds: ["chipotle-cmg-4026-burrito-base"]`, and
`ingredientIdsByEntree.burrito` keeping `chipotle-cmg-4026` eligible-but-
unselected).

---

## 10. Bowl optional Side Tortilla

**Decision:** Bowl offers an optional "Side Tortilla" add-on (unselected by
default), reusing `chipotle-cmg-4025`'s ("Tortilla on the Side") exact
nutrition and source under its own runtime ID
(`chipotle-cmg-4025-bowl-side`) rather than a fabricated nutrition value,
and rather than reusing the generic `chipotle-cmg-4026` id (which would
collide Bowl's side add-on with Burrito's Double Wrap or the base Bowl
build itself).

**Why:** Bowl has no generated ingredient record of its own for this
add-on — `chipotle-cmg-4025` only exists as a standalone generated menu item
(the Chips & Sides browse card) — so this projects that already-generated
record's real nutrition/provenance into a selectable Bowl-build ingredient
without inventing new data or duplicating IDs across unrelated meanings.

**Type:** Macro Maxxer presentation/runtime behavior. The nutrition/source
is exactly `chipotle-cmg-4025`'s generated data, carried over under a new
ID.

**Implements:**
`lib/restaurantBuilders/chipotle/generatedRuntimeAdapter.ts`
(`buildBowlSideTortillaIngredient`;
`ingredientIdsByEntree.bowl` includes `"chipotle-cmg-4025-bowl-side"`, kept
out of `includedIngredientIds` so it's optional, not pre-selected).

---

## 11. Salad included Romaine Lettuce

**Decision:** Romaine Lettuce (`chipotle-cmg-5351`) is a required, locked
included ingredient of every Salad, added explicitly rather than left as an
ordinary selectable topping.

**Why:** Romaine isn't in the generated Salad's own topping list — it's a
real, separately-existing selectable topping elsewhere, distinct from the
implicit, unlisted Supergreens base mix already baked into the Salad
entree's own generated nutrition — so it has to be added explicitly as
Salad's required base component rather than assumed present.

**Type:** Macro Maxxer presentation/runtime behavior (a build-configuration
choice; Romaine's own nutrition is generated data).

**Implements:**
`lib/restaurantBuilders/chipotle/generatedRuntimeAdapter.ts`
(`entreeOptions.salad.includedIngredientIds` and
`ingredientIdsByEntree.salad`, both including `"chipotle-cmg-5351"`).

---

## 12. Salad vinaigrette included by default, but removable

**Decision:** Chipotle-Honey Vinaigrette (`chipotle-cmg-5353`) is included
and selected by default on Salad, but — unlike Romaine Lettuce (§11), which
is a required, non-removable lock — the user can remove and re-add it.

**Why:** The two "included ingredients" are not the same kind of inclusion:
Romaine is structurally required, the vinaigrette is a default choice the
user can decline.

**Type:** Macro Maxxer presentation/runtime behavior.

**Implements:**
`lib/restaurantBuilders/chipotle/generatedRuntimeAdapter.ts`
(`entreeOptions.salad.includedIngredientIds` includes
`"chipotle-cmg-5353"`; `chipotle.includedRemovableIngredientIds:
["chipotle-cmg-5353"]` is the field that distinguishes it from a locked
inclusion like Romaine).

---

## 13. Toppings ordering

**Decision:** Within the runtime ingredient display, Queso Blanco
(`chipotle-cmg-1029`) is pinned to sort last among toppings, overriding its
official generated `defaultOrder`.

**Why:** The eligible topping set changes between entree contexts, and
Queso Blanco reads better anchored at the end of the topping list rather
than shifting position as other toppings become eligible/ineligible around
it.

**Type:** Macro Maxxer presentation/runtime behavior — a presentation-only
order override. Does not change generated data or the relative order of any
other topping (see `import-decisions.md` §12 for the official ordering this
sits on top of).

**Implements:**
`lib/restaurantBuilders/chipotle/generatedRuntimeAdapter.ts`
(`RUNTIME_INGREDIENT_DISPLAY_ORDER_BY_ID`, a maximal sort key applied only
to `chipotle-cmg-1029`).

---

## 14. High Protein preset image treatment

**Decision:** Protein Meals cards (the "Josh Hart's High Protein Burrito"
style editorial photography — food composited with an athlete portrait) get
a distinct `object-cover object-[60%_50%]` crop treatment, isolated from
every other Chipotle image (near-square product shots) including this same
navigation group's own Protein Cups.

**Why:** That editorial photography is wide (3:2) — wider than every
container it renders in — so a plain centered `object-cover` crop cuts into
either the food or the athlete's face; biasing the crop right-of-center
protects the athlete's face (the thing most likely to look broken if
cropped badly) while keeping most of the food composition in frame.

**Type:** Macro Maxxer presentation/runtime behavior (visual treatment
only).

**Implements:** `lib/restaurantBuilders/chipotle/highProtein.ts`
(`isChipotleHighProteinPresetMealArtwork`,
`CHIPOTLE_PRESET_MEAL_IMAGE_CLASSNAME`).

---

## 15. Prebuilt meal full ingredient composition/customization behavior

**Decision:** Editable High Protein preset meals (bowls/burritos/tacos built
from a real configured ingredient list) are treated as fully editable builds
— their nutrition is derived by summing that real ingredient composition,
and opening one for editing reconstructs the equivalent build configuration
(entree, selected ingredients/quantities, protein portion mode, taco
shell/count, kids-meal mode) from the generated preset's own `ingredients`
list. Protein Cups, which share the same High Protein navigation group but
are single pre-portioned items with no ingredients array to sum, are
explicitly excluded from this path and always use their own direct
nutrition instead.

**Why:** Treating a Protein Cup as if it had an editable ingredient
composition would be wrong (it has none); treating an editable preset as a
fixed single item would prevent the customization a "build" is supposed to
support and would silently ignore any protein-quantity signal already
present in its generated composition (e.g. a preset whose ingredient list
implies a double-protein portion).

**Type:** Macro Maxxer presentation/runtime behavior (a build-reconstruction
adapter over generated preset data; the underlying ingredient
composition/nutrition is generated data).

**Implements:** `lib/restaurantBuilders/chipotle/highProtein.ts`
(`isChipotleEditablePresetBuildItem`, `isChipotleProteinCupItem`,
`buildHighProteinBuildConfiguration`); the preset-referenced-item projection
in `lib/restaurantBuilders/chipotle/generatedRuntimeAdapter.ts`
(`presetItemIngredients` in `adaptGeneratedChipotleMenuForRuntime`).

---

## 16. Kids Meal navigation label

**Decision:** The navigation entry that targets the generated
`chipotle-kids-build-your-own` build (and its Kids Quesadilla sibling
choice) displays as **"Kid's Meal"** in the main nine-choice chooser, while
the equivalent choice inside the Kids sub-flow itself displays as
**"Kid's Build Your Own"**.

**Why:** "Kid's Meal" is the short, official top-level navigation name that
matches the old runtime's familiar chooser; "Kid's Build Your Own"
disambiguates the specific build once the user is already inside the Kids
sub-flow choosing between BYO and Quesadilla.

**Type:** Macro Maxxer presentation/runtime behavior (label only — the
underlying id/generatedId pair and build target are unchanged).

**Implements:**
`lib/restaurantBuilders/chipotle/generatedRuntimeAdapter.ts`
(`entreeOptions["kids-meal"]`, label override to `"Kid's Meal"`, same
pattern used for the "Tacos" navigation label).

---

## 17. Kids Build Your Own tortilla serving handling

**Decision:** Each generated Kids BYO tortilla record already represents
*two* tortillas' worth of official nutrition
(`chipotle-cmg-5403`/`chipotle-cmg-5404`, per `import-decisions.md` §5).
The runtime treats selecting that record as choosing **one serving**
(quantity stays `1`) rather than letting the user pick a tortilla quantity
that would double-count the already-doubled nutrition.

**Why:** The generated record's nutrition already is the two-tortilla kids
serving; a generic "pick a quantity" control would let a user select "2" and
silently get four tortillas' worth of nutrition.

**Type:** Macro Maxxer presentation/runtime behavior layered on top of an
import-time nutrition decision (`import-decisions.md` §5) — the nutrition
numbers themselves are not decided here, only how the builder treats the
record as a selectable unit.

**Implements:**
`lib/restaurantBuilders/chipotle/generatedRuntimeAdapter.ts`
(`kidsBuildYourOwnTortillaIdsByOption`, `kidsTacoShellIngredientIds`); the
per-entree ingredient builder's `isKidsBuildYourOwnTacoShellOption` handling
in `lib/restaurantBuilders/chipotle/ingredientMenuItems.ts`.

---

## 18. Kids Quesadilla cheese stays 1× standard, never the adult 3× rule

**Decision:** Kids Quesadilla's included base uses exactly **one** standard
cheese portion (`chipotle-cmg-5252`), never the adult Quesadilla's 3×-cheese
rule (`import-decisions.md` §4). The runtime explicitly distinguishes "this
is the adult Quesadilla's included cheese" (which becomes a synthesized
triple-portion variant) from "this is Kids Quesadilla's included cheese"
(which stays a single, unmultiplied portion) by build context, not by the
ingredient ID alone (the same `chipotle-cmg-5252` record is used in both
places).

**Why:** Both entrees include the exact same generated cheese ingredient
record; without an explicit context check, a shared "included cheese →
triple it" rule (built for adult Quesadilla) could incorrectly apply to Kids
Quesadilla too.

**Type:** Macro Maxxer presentation/runtime behavior layered on top of
import-time nutrition decisions (`import-decisions.md` §4, §7) — restates
how the *runtime* enforces the distinction those decisions established,
rather than deciding new numbers.

**Implements:**
`lib/restaurantBuilders/chipotle/generatedRuntimeAdapter.ts`
(`cheeseIngredientId: "chipotle-cmg-5252"`,
`specialVariantIds.quesadillaTripleCheese`); the context check itself is
`isAdultQuesadillaTripleCheeseSelection` (verified in
`tests/chipotleKidsMeal.test.mjs` to be `true` only for adult Quesadilla and
`false` for Kids Quesadilla).

---

## 19. Base category in View All Ingredients

**Decision:** The Chipotle "View All Ingredients" comparison page's
"Included Ingredients" category is relabeled **"Base"** (that page only —
the per-entree ingredient builder's own "Included Ingredients" category and
label are untouched) and sorted to appear directly under the "All
Ingredients" filter chip, ahead of every other ingredient category.

**Why:** "Included Ingredients" reads oddly as a flat browse-category name
on an entree-agnostic comparison page (there's no per-entree "build" for it
to be "included" in); "Base" reads correctly there, and putting it first
matches its role as the most foundational category to compare.

**Type:** Macro Maxxer presentation/runtime behavior (label and sort order
only; scoped to this one page).

**Implements:**
`lib/restaurantBuilders/chipotle/ingredientMenuItems.ts`
(`buildAllChipotleIngredientMenuItems`, renames `"Included Ingredients"` →
`"Base"` on the returned category array — used **only** by this page, never
by the per-entree builder); `data/menuCategoryConfig.ts`
(`INGREDIENT_SECTION_ORDER`, `"base"` placed first).

---

## 20. Grouping context-specific tortilla records into presentation variants

**Decision:** On the View All Ingredients page only, the several official
Chipotle tortilla records that represent the same product at different
serving contexts are folded into one card per real product, exposed as a
variant switcher, instead of one duplicate card per context:
- **Crispy Corn Tortilla** — 1 Taco / 2 Tacos / 3 Tacos.
- **Soft Flour Tortilla** — 1 Taco / 2 Tacos / 3 Tacos (no separate "Kids
  Quesadilla" variant — see §21).
- **Tortilla** (`chipotle-cmg-4026-burrito-base`) — stays a single
  standalone card with no variants; its numerically-identical twin
  `chipotle-cmg-4026` is not shown as a second duplicate card.

**Why:** These context records exist because the per-entree builder needs
to select the right one for the current build (§17, `import-decisions.md`
§5) — that distinction is meaningless on an entree-agnostic browse/compare
page, where it previously produced up to ~10 near-duplicate tortilla cards
for what a user perceives as 2-3 real products.

**Type:** Macro Maxxer presentation/runtime behavior, presentation-grouping
only. Every generated record's own ID, nutrition, and provenance is
preserved underneath and still drives the actual per-entree builder via
`buildChipotleIngredientMenuItems` unchanged.

**Exception/context:** "2 Tacos" quantities/labels are the official
2-tortilla Kids serving records, relabeled consistently with their 1/3-taco
siblings rather than as a separate "Kids" concept.

**Implements:**
`lib/restaurantBuilders/chipotle/ingredientMenuItems.ts`
(`CHIPOTLE_ALL_INGREDIENTS_TORTILLA_FAMILIES`,
`chipotleAllIngredientsTortillaVariantMemberIds`,
`CHIPOTLE_ALL_INGREDIENTS_HIDDEN_DUPLICATE_IDS`, both consumed only inside
`buildAllChipotleIngredientMenuItems`).

---

## 21. Kids Quesadilla flour tortilla uses the 1-Taco 83-cal context

**Decision:** Both the live Kids Quesadilla build and its View All
Ingredients presentation card now use the official single-Taco Soft Flour
Tortilla nutrition (`chipotle-tortilla-soft-flour-taco`: 83 cal / 3g fat /
2g protein / 13g carbs), not the generated Kids Quesadilla composition's own
tortilla record (`chipotle-cmg-5401`: 80 cal / 2.5g fat / 2g protein / 13g
carbs). No separate "Kids Quesadilla" tortilla variant is shown on the View
All Ingredients Soft Flour Tortilla card — it now shows only 1/2/3 Tacos
(§20), since the Kids Quesadilla context uses the same panel as 1 Taco.

**Why:** `chipotle-cmg-5401` is a rounded duplicate of the already-official,
more precise single-taco panel; using the more accurate, already-official
record instead of the generated composition's own slightly-rounded one
removes an unnecessary near-duplicate nutrition panel without inventing any
new figure.

**Type:** Macro Maxxer presentation/runtime behavior — a deliberate,
explicit override of which already-generated record the live builder
selects. This is the one runtime decision in this document that changes
observable build behavior (Kids Quesadilla's included-tortilla nutrition
total moves from 190 → 193 cal), not merely a label/grouping/order change;
`chipotle-cmg-5401` itself remains an intact, valid generated record — it is
simply no longer selected for this build context.

**Exception/context:** The matching legacy-ID resolution for old Kids
Quesadilla soft-tortilla URLs/carts was updated to point at
`chipotle-tortilla-soft-flour-taco` too, so legacy resolution stays
consistent with what the live builder actually selects.

**Implements:**
`lib/restaurantBuilders/chipotle/generatedRuntimeAdapter.ts`
(`kidsQuesadillaIncludedIngredientIds`, and `ingredientIdsByEntree
["kids-quesadilla"]`, which drops `chipotle-cmg-5401` from eligibility and
adds `chipotle-tortilla-soft-flour-taco`);
`lib/restaurantBuilders/chipotle/ingredientMenuItems.ts` (§20's family
definition, which excludes the old record via
`CHIPOTLE_ALL_INGREDIENTS_HIDDEN_DUPLICATE_IDS`);
`lib/restaurantBuilders/chipotle/legacyCompatibility.ts`
(`resolveContextualTortilla`'s `"chipotle-kids-quesadilla"` target).

---

## 22. Grouping proteins into one user-facing card each in All Ingredients

**Decision:** On the View All Ingredients page, each of the six real
proteins (Pollo Asado, Chicken, Steak, Beef Barbacoa, Carnitas, Sofritas)
appears as exactly one card. Each primary protein record's own
Normal/Half/Extra portion variants are extended with its Taco/Kids context
records as further variants on the same card (1 Taco, 3 Tacos, Kids — Kids
Build Your Own and Kids Quesadilla fold into one "Kids" variant since their
official nutrition is identical for every protein), instead of rendering
each context as its own duplicate card. Guacamole and Queso Blanco's
kids-meal "protein slot" alternative records
(`chipotle-protein-guacamole-kids-byo`,
`chipotle-protein-guacamole-kids-quesadilla`,
`chipotle-protein-queso-blanco-kids-byo`) are excluded entirely — they carry
the generated `"Proteins"` category only because a kid can pick them
*instead of* a protein slot, but they are not proteins and shouldn't appear
in a Proteins comparison list. Structural Veggie (`import-decisions.md`
§11) stays excluded via its own `hideFromIngredientView` flag, unchanged.

**Why:** The generated data models ~30 separate protein-family records
(6 proteins × 5 contexts, plus the kids protein-slot alternatives) because
the per-entree builder needs the right context record; a comparison page
should show what a user perceives as "the proteins," not every hidden
selection-context duplicate.

**Type:** Macro Maxxer presentation/runtime behavior, presentation-grouping
only. Generated IDs/nutrition are preserved underneath and still drive the
actual per-entree builder unchanged; the Proteins category count reflects
these 6 grouped cards, not the ~30 underlying records.

**Implements:**
`lib/restaurantBuilders/chipotle/ingredientMenuItems.ts`
(`CHIPOTLE_ALL_INGREDIENTS_PROTEIN_FAMILIES`,
`chipotleAllIngredientsProteinVariantMemberIds`,
`CHIPOTLE_ALL_INGREDIENTS_NON_PROTEIN_IDS`, consumed only inside
`buildAllChipotleIngredientMenuItems`);
`components/restaurant-view/chipotle/ChipotleRestaurantBuilderView.tsx`
(proteins deliberately excluded from the generic Normal/Double portion
toggle so it doesn't conflict with the richer variant list above).

---

## 23. Side of Pollo Asado uses standard entree Pollo Asado nutrition in runtime presentation

**Decision:** The standalone "Side of Pollo Asado" browse card
(`chipotle-cmg-1141`) displays the standard entree Pollo Asado protein's
"Normal" nutrition (180 cal / 4oz, from `chipotle-protein-pollo-asado`'s
default variant) instead of its own generated standalone-side nutrition
panel (220 cal / 5oz, which is itself a valid, officially-sourced generated
record).

**Why:** Runtime browse cards should read consistently with the same
serving context used everywhere else Pollo Asado appears (as an
entree/protein portion), rather than switching to this one standalone
side's own different official portion size (5oz vs. the usual 4oz protein
serving) purely because it happens to be sold as its own item.

**Type:** Macro Maxxer presentation/runtime behavior — a deliberate display
substitution. `chipotle-cmg-1141` keeps its own generated identity, image,
and source as the card's underlying record; only its *displayed nutrition*
is resolved from a different (also generated, also official) record.

**Exception/context:** This is presentation-only: the card's underlying
identity/image/source remains `chipotle-cmg-1141`'s own generated
provenance. No generated nutrition value is duplicated or edited — this
maps generated identities together, it doesn't invent a value.

**Implements:**
`lib/restaurantBuilders/chipotle/generatedRuntimeAdapter.ts`
(`RUNTIME_ITEM_NUTRITION_SOURCE_BY_ID["chipotle-cmg-1141"]`, resolved via
`runtimeItemNutrition`).

---

## 24. Display rounding for derived nutrition

**Decision:** User-facing calorie/protein/carb/fat values are always
rounded to the nearest whole number for display (`Math.round`); protein
density (grams of protein per 100 calories) is the one exception, rounded
to one decimal place instead. Rounding happens only at display time and
never mutates the underlying stored/generated nutrition precision.

**Why:** Chipotle's runtime produces plenty of derived/scaled values with
floating-point noise — portion multipliers (Normal/Half/Extra, Light/Extra),
taco-count math, kids double-tortilla servings, and quantity scaling all
compound rounding — and displaying raw floats (e.g. `16.665999999999997`)
would look broken; rounding only for display, never in storage, keeps
downstream math exact.

**Type:** Macro Maxxer presentation/runtime behavior. This formatting
utility is shared app-wide (not Chipotle-specific), but Chipotle's own
derived-nutrition surfaces are exactly the kind of value it exists to clean
up, and its correctness is verified against Chipotle's own generated data
(the "High Protein Taco" card).

**Implements:** `components/nutrition/macroDisplay.ts`
(`formatMacroDisplayNumber`, `formatProteinScoreDisplay`).

---

## Note on cross-references to `import-decisions.md`

Several entries above (§13, §17, §18, §20, §21) build directly on numbered
decisions in `import-decisions.md`. Those import-time decisions were **not**
rewritten to reflect this document — per that document's own established
convention (see its closing note), a finding or decision is never rewritten
after the fact; a short pointer is added next to it instead. Two such
pointers were added in this update: a "Runtime note" under
`import-decisions.md` §5 and §7, pointing here to §21 and §18/§20, where the
live Kids Quesadilla tortilla selection now deliberately differs from what
those import-time sections describe as still-generated (and still
unmodified) data.
