# Chipotle Import: Decision Log

This is a human-readable record of decisions made after analyzing Chipotle's
official source data — not a restatement of the analysis itself. See
`source-analysis.md` / `source-analysis.json` for the full source-relationship
analysis, `unnamed-metadata-analysis.md` / `unnamed-metadata-analysis.json`
for the unnamed-id follow-up, and `build-gaps-analysis.md` /
`build-gaps-analysis.json` for the Salad/Quesadilla/taco-tortilla follow-up.
Those documents are the evidence; this document is what we decided to do
about it. The importer records these decisions in generated-output
provenance so manually verified relationships remain distinguishable from
relationships explicitly present in captured structured sources.

This document covers decisions about **producing** `data/generated/chipotle/
restaurant.json` from raw Chipotle sources — i.e. source/data truth. Once
that generated data exists, a separate layer of decisions governs how
Macro Maxxer's runtime presents and builds on top of it (browse taxonomy,
navigation, image enrichment, legacy-ID compatibility, presentation-only
grouping/labeling, etc.) — those are recorded in `runtime-decisions.md`, not
here, to keep the two concerns from blurring together.

---

## 1. Unnamed menu-metadata ids

**Finding** (`source-analysis.md` §2, `unnamed-metadata-analysis.md`):
99 of `menu-metadata.json`'s 408 items had no authoritative name in any
structured field across `calculator-menu.json`, `menu-rules.json`, or
`online-meals.json`.

**Follow-up analysis determined** (`unnamed-metadata-analysis.md`):
- None of the 99 ids appear in `calculator-menu.json` (restaurant 469's
  active sellable menu).
- None appear in `menu-rules.json` (the national build-rule template).
- None appear in `online-meals.json`.
- They are national-metadata-only records: five near-complete LTO/regional
  protein families (Chorizo, Carne Asada, Plant-Based Chorizo, Garlic Steak,
  Chicken al Pastor — 48 ids), Smoked Brisket catering/side variants (3),
  Cauliflower Rice (3), Grilled Street Corn (8), 13 new specialty drinks,
  toppings/sauces (Monterey Jack Cheese, Adobo Ranch, Red Chimichurri, a
  Queso Blanco variant — 6), Supergrains, 3 desserts, and 11 pure duplicate
  reference ids for items already fully known elsewhere (5 core proteins,
  Fajita Veggies, Chili Lime Chips). 52 were confidently identified, 42
  likely-but-not-authoritatively, and 5 remain completely unknown.

**Decision:**
- Preserve all 99 ids in the raw source data as collected — no raw file is
  edited or filtered.
- Do **not** import any of the 99 ids into the active restaurant 469 menu.
- `calculator-menu.json` remains the sole authority for what restaurant 469
  currently sells and what the importer treats as importable/orderable.
  `menu-rules.json` and `menu-metadata.json` are template/reference sources,
  never an availability authority on their own (this generalizes the
  restaurant-scoped-availability-filter recommendation already made in
  `source-analysis.md` §10.C).
- No manual naming work is required to unblock the active-restaurant import.
  The 52 confidently-identified names in `unnamed-metadata-analysis.json`
  are available for later reference (e.g. a future "coming soon" or national
  catalog feature) but are not a blocker now.
- If any of these 99 ids ever appears in a future `calculator-menu.json`
  capture for restaurant 469 (i.e. Chipotle adds the item to this
  restaurant), it must be re-evaluated at that time using the live source
  data available then — not retroactively imported based on this analysis.

**Status: RESOLVED**

---

## 2. Fountain drink flavors

**Finding** (`source-analysis.md` §6):
Chipotle's ordering system (`calculator-menu.json`) models fountain drinks as
exactly two generic, size-only SKUs:
- `CMG-2001` — 22 fl oz Soda/Iced Tea
- `CMG-2002` — 32 fl oz Soda/Iced Tea

No individual flavor id (Coca-Cola Classic, Diet Coke, Sprite, Fanta Orange,
Dr. Pepper, etc.) exists anywhere in `calculator-menu.json`,
`menu-metadata.json`, or `menu-rules.json`. `CMG-2001`'s own
`menu-metadata.json` nutrition is a single flat placeholder value
(250cal/22fl oz) with an empty `customizations[]` array — there is no
structured branching to a chosen flavor.

The official nutrition PDF (`nutrition.json`), by contrast, lists 15+
individual fountain flavors with distinct, size-specific nutrition rows
(e.g. Coca-Cola Classic 22fl oz/260cal vs 32fl oz/380cal, Sprite, Fanta
Orange, Dr. Pepper, Mountain Dew, Pepsi-family variants, Chipotle Iced/Sweet
Tea, etc.).

**Decision:**
- Do **not** invent flavor-specific CMG ids. `CMG-2001`/`CMG-2002` are the
  only ordering-system identities that exist for fountain drinks and must be
  preserved as such — no synthetic id is fabricated to stand in for "Sprite"
  or "Diet Coke" at the ordering-system layer.
- `CMG-2001`/`CMG-2002` remain the official ordering/container source
  identity: they are what a customer actually orders, what carries real
  restaurant-469 pricing, and what any cart/ordering-facing code must key
  off of.
- Macro Maxxer's user-facing product surface should expose individual
  fountain flavors as **variants** of the fountain-drink product, with each
  variant's nutrition backed by the matching official PDF row (matched by
  flavor name + size, per the exact/normalized-name matching tiers already
  established in `source-analysis.md` §6).
- Each flavor/size variant must carry two distinct, explicitly-recorded
  provenance facts rather than one blended source:
  - its **ordering/container identity** comes from the generic
    `CMG-2001`/`CMG-2002` size record (this is what makes it orderable and
    priced at restaurant 469), and
  - its **nutrition identity** comes from the specific official PDF row for
    that flavor and size.
- Chipotle's generic 250cal (22fl oz)/300cal-class placeholder value from
  `menu-metadata.json` must **not** be used as the nutrition for any specific
  flavor variant — it is a fallback/average figure for the undifferentiated
  cup, not a real product's nutrition, and using it under a named flavor
  would misrepresent that flavor's actual macros.

**Status: RESOLVED**

---

## 3. Salad base

**Finding** (`build-gaps-analysis.md` Part A):
The official nutrition PDF contains a row for "Supergreens Salad Mix — 3 oz
— 15 calories." No separate CMG item exists for the Salad greens/base
anywhere in the captured live ordering sources (`calculator-menu.json`,
`menu-rules.json`, `menu-metadata.json`, `online-meals.json`) — confirmed
absent by exhaustive search, not merely unfound. Every Salad entree's own
menu-metadata nutrition value is protein-portion-only (e.g. `CMG-301`
Chicken Salad = 180cal/4oz, identical to Chicken Burrito/Bowl), so the
greens base is not folded into the entree id's own nutrition either.

**Decision:**
- Treat Supergreens Salad Mix as an implicit required base component of
  every Salad entree — it is always present, not a customer choice.
- Use the official PDF nutrition row (15cal/3oz) as its nutrition source.
- Do **not** invent a CMG id for it.
- A Salad's composed nutrition should include this base automatically
  (15cal/3oz), plus the selected protein and selected content items
  (rice/beans/toppings), exactly as those are already summed for
  Burrito/Bowl per `source-analysis.md` §3.

**Status: RESOLVED**

---

## 4. Adult Quesadilla base

**Finding** (`build-gaps-analysis.md` Part B):
None of the 7 adult Quesadilla entrees expose a separate CMG record for the
tortilla or the base cheese in any captured structured source — confirmed
absent in both `calculator-menu.json` and the national `menu-rules.json`
superset. (Kids Quesadilla, by contrast, does expose an explicit tortilla
record, `CMG-5401`, 80cal/1oz.) The official PDF has no adult
"Flour Tortilla (quesadilla)" row either, so both sides of a potential join
were simultaneously absent from the captured sources.

Manual verification against Chipotle's official live nutrition calculator
UI (outside the captured raw sources) confirmed the adult Quesadilla's
implicit base composition:
- 1 adult tortilla = 320cal, 9g fat, 8g protein, 50g carbs
- 3 standard cheese portions = 330cal, 24g fat, 18g protein, 3g carbs

The resulting Cheese Quesadilla base is 650cal, 33g fat, 26g protein, and
53g carbs before any selected protein, side, or addon is included.

**Decision:**
- Represent the adult Quesadilla's implicit base composition as:
  **1 × adult tortilla nutrition + 3 × standard cheese nutrition.**
- Treat this as base/container nutrition, applied before adding the
  selected protein, sides, or optional addons (Queso Blanco `CMG-4134`,
  Guacamole `CMG-1001`/`CMG-5301`, Cilantro Lime Sauce `CMG-5414`).
- "Standard cheese nutrition" refers to the same `CMG-5252` Cheese record
  (110cal/1oz) already used on Burrito/Bowl/Salad/Taco. The tortilla uses the
  verified adult-tortilla nutrition recorded in §6 below. It must **not** use
  the kids-context `CMG-5401` record (80cal/1oz), which is reserved for the
  Kids Quesadilla base described in §7.
- Preserve, in whatever the importer eventually encodes, that this 1
  tortilla + 3 cheese relationship was **manually verified against the
  official live Chipotle UI**, not directly encoded as separate CMG child
  records in any captured source — this provenance distinction matters
  because it cannot be re-derived from the raw sources alone if Chipotle's
  UI or portioning changes.
- Do **not** invent separate CMG ids for the implicit adult-quesadilla
  tortilla/cheese components.

**Status: RESOLVED**

---

## 5. Taco tortillas

**Finding** (`build-gaps-analysis.md` Part C):
`CMG-5501` (Soft Flour Tortilla) and `CMG-5503` (Crispy Corn Tortilla) are
structurally ambiguous: the exact same records, with the exact same
`unitCount:1`, are reused unchanged across all single-Taco **and** all
Tacos(3)-trio entrees, in both `calculator-menu.json` and `menu-rules.json`.
No quantity or multiplier field anywhere in the source data distinguishes a
1-tortilla need from a 3-tortilla need, and `CMG-5501`/`CMG-5503`'s own
metadata calorie values (250cal/3oz, 200cal/1.5oz) do not reconcile with the
PDF's per-tortilla figures under any tested arithmetic (a naive ×3 of the
PDF value comes within ~4-5% but not exactly, and can't be right for both
the single and trio context using one fixed number regardless).

The official PDF provides authoritative per-tortilla nutrition:
- Flour Tortilla (taco): 80 calories, 1 ea (adult)
- Crispy Corn Tortilla: 70 calories, 1 ea (adult)

**Decision:**
- Treat each official build context as its own authoritative panel; do not
  calculate one context by multiplying or dividing another context's rounded
  displayed values.
- Adult Taco (1): Soft Flour `83/2/13/3`, Crispy Corn `67/1/10/3`
  (calories/protein/carbs/fat).
- Adult Tacos (3): Soft Flour `250/7/40/8`, Crispy Corn `200/3/29/9`.
- Kids Build Your Own (2 tortillas per selectable serving): Soft Flour
  `170/5/27/5`, Crispy Corn `130/2/19/6`. Runtime quantity remains `1` because
  each source record already represents both tortillas.
- Kids Quesadilla continues to use the direct `CMG-5401` one-tortilla panel.
- Preserve each generated context record's existing CMG ordering/source
  identity and provenance.

**Status: RESOLVED** (generated data unchanged since — see runtime note below)

**Runtime note:** The generated `CMG-5401` record itself is untouched, but
the live Kids Quesadilla builder no longer *selects* it as the included
tortilla — see `runtime-decisions.md` §21 ("Kids Quesadilla flour tortilla
uses the 1-Taco 83-cal context"). This is a presentation/runtime override,
not a revision of the finding above.

---

## 6. Adult tortilla and Burrito base

**Finding:**
Manual verification against Chipotle's official live nutrition calculator
confirms that the adult tortilla used by adult Burritos and adult
Quesadillas has the following nutrition:
- 320 calories
- 9g fat
- 8g protein
- 50g carbs

The official PDF's `Flour Tortilla (burrito)` row independently supplies the
same nutrition values. The captured structured menu does not expose the
included Burrito tortilla as a separate child CMG record; `CMG-4026` is an
additional Double Wrap tortilla, not the identity of the included base.

**Decision:**
- Automatically include one verified adult tortilla as every adult
  Burrito's implicit required base.
- Use the same adult-tortilla nutrition for the tortilla component of every
  adult Quesadilla.
- Do **not** invent a CMG id for the implicit adult tortilla.
- Do **not** use Kids Quesadilla tortilla `CMG-5401` (80cal) for an adult
  Quesadilla.
- Preserve the provenance distinction: the numeric nutrition is backed by
  the official PDF adult-tortilla row, while its required inclusion in both
  adult Burritos and adult Quesadillas was manually verified in Chipotle's
  official live nutrition calculator UI.

**Status: RESOLVED**

---

## 7. Kids Quesadilla base

**Finding:**
Manual verification against Chipotle's official live nutrition calculator
confirms that the included Kids Quesadilla base is:
- 1 × Soft Flour Tortilla (`CMG-5401`) = 80 calories
- 1 × standard Cheese portion = 110 calories

The resulting base is 190 calories, 11g fat, 8g protein, and 14g carbs.
Selected protein/veggie filling, sides, and drink are added separately.

**Decision:**
- Represent the Kids Quesadilla base as exactly **1 × kids soft flour
  tortilla + 1 × standard cheese portion**.
- Preserve `CMG-5401` as the kids-tortilla source identity.
- Do **not** apply the adult Quesadilla's 3× cheese rule to Kids
  Quesadillas.
- Treat `Cheese Only` as the no-additional-filling form of this included
  base, rather than adding a second cheese portion.
- Preserve that the included tortilla-and-cheese relationship was manually
  verified against Chipotle's official live nutrition calculator UI; the
  kids tortilla and cheese nutrition values themselves are backed by their
  captured official records/PDF matches.

**Status: RESOLVED** (generated data unchanged since — see runtime note below)

**Runtime note:** The 1×cheese-not-3×cheese rule and the `CMG-5401` figures
above remain accurate as generated-data facts. The live builder's *included
tortilla selection* was later overridden for accuracy — see
`runtime-decisions.md` §20 ("Kids Quesadilla cheese stays 1× standard, never
the adult 3× rule") and §21 ("Kids Quesadilla flour tortilla uses the 1-Taco
83-cal context").

---

## 8. Half Pollo Asado (`CMG-5609`)

**Finding:**
`CMG-5609` is explicitly linked to standard Pollo Asado as a `HalfPortion`,
but it has no nutrition row in either metadata endpoint. The surrounding
direct official records strongly validate linear portioning: standard Pollo
Asado is 180cal/4oz, Kids Pollo Asado is 90cal/2oz, and single-Taco Pollo
Asado is 60cal/1.3oz.

**Decision:**
- Derive `CMG-5609` as exactly **0.5 × the standard 4oz Pollo Asado full
  nutrition panel**; expected calories are 90.
- Preserve `CMG-5609` and its explicit `HalfPortion` relationship as the
  ordering/source identity.
- Record that nutrition is derived from the official standard Pollo Asado
  panel plus the explicit half relationship, not from a direct `CMG-5609`
  nutrition record.
- This is a record-specific Pollo Asado decision and does not authorize
  blind scaling for other LTO proteins.

**Status: RESOLVED**

---

## 9. Side of Cilantro Lime Sauce (`CMG-5413`)

**Finding:**
`CMG-5413` identifies a 4oz/160cal side, but its live macro fields incorrectly
repeat the sane 2oz panel. Equivalent official record `CMG-5414` is also
4oz/160cal and supplies the internally sane full panel: 4g protein, 6g
carbohydrates, 12g total fat, 9g saturated fat, 0g trans fat, 600mg sodium,
2g fiber, and 4g sugar.

**Decision:**
- Keep `CMG-5413` as its own source/order identity.
- Use the sane official `CMG-5414` 4oz full nutrition panel for `CMG-5413`.
- Record the equivalent official source identity and the rejection of
  `CMG-5413`'s internally inconsistent panel in generated provenance.
- Do not infer any value from the broken `CMG-5413` macro fields.

**Status: RESOLVED**

---

## 10. Kids 16oz fountain container (`CMG-5551`)

**Finding:**
`CMG-5551` is a generic Kids 16fl-oz Soda/Iced Tea ordering container. Its
220cal live panel has zero carbohydrates/sugar and is a placeholder, not
valid flavor nutrition. As with the adult fountain containers, Chipotle
publishes flavor-specific official nutrition without flavor-specific CMG
ordering ids.

**Decision:**
- Model `CMG-5551` as one generic ordering/container identity with separate
  user-facing flavor variants; do not invent flavor-specific CMG ids.
- For each flavor, prefer its valid official 22fl-oz PDF row and scale the
  full available nutrition vector by **16/22**. If no valid 22fl-oz row
  exists, a valid equivalent 32fl-oz row may be scaled by **16/32**.
- Scale calories, protein, carbohydrates, total fat, saturated fat, trans
  fat, sodium, fiber, sugar, and cholesterol only when cholesterol is
  present in the source row. Never derive unavailable cholesterol.
- Each variant's provenance must retain `CMG-5551` as its generic ordering
  parent and record the flavor row, source size, and scaling factor.
- Never use `CMG-5551`'s placeholder 220cal/zero-carbohydrate live panel as
  flavor nutrition. If a candidate flavor has no valid official 22oz or
  32oz row, leave only that flavor unresolved rather than rejecting the
  entire 16oz container.

**Status: RESOLVED**

---

## 11. Structural Veggie hidden from protein/ingredient selection

**Finding:**
"Veggie" is Chipotle's explicit no-protein entree choice. Its own direct
entree-identity nutrition is a 0oz/0cal placeholder — the real calories a
Veggie order carries come from its default guacamole/fajita-vegetable
content components, not from a "Veggie protein" serving. Exposing that
0cal/0g placeholder as a normal selectable protein card (alongside Chicken,
Steak, etc., each with real per-serving macros) would misrepresent it as a
zero-calorie protein rather than what it actually is: the absence of a meat
protein.

**Decision:**
- Import the Veggie protein identity (standard context plus its Taco/Tacos
  (3) contexts) as real generated ingredient records, preserving the CMG
  source/provenance the same as every other protein.
- Mark each Veggie context record `hideFromIngredientView: true` so it is
  excluded from ingredient-selection surfaces (the per-entree ingredient
  builder and any full-catalog ingredient listing) while remaining a valid,
  queryable generated record.
- Do not delete or omit the Veggie records — this is a display flag on
  otherwise-authoritative generated data, not a data-availability decision.

**Type:** Source/data truth (encoded directly on the generated ingredient
records, not a runtime-only overlay).

**Implements:** `scripts/importers/chipotle.ts` (`hideFromIngredientView:
proteinName === "Veggie" ? true : undefined`, applied at both the standard
and Taco/Tacos(3) context sites) — the resulting flag is generated data
(`data/generated/chipotle/restaurant.json`) and is honored generically by
every runtime ingredient-listing code path (nothing Chipotle-specific reads
this flag at runtime).

**Status: RESOLVED**

---

## 12. Official ingredient/content ordering preserved from Chipotle's live source

**Finding:**
Chipotle's own live ordering system (`calculator-menu.json` /
`menu-metadata.json`) exposes an explicit sort order for entrees, tortillas,
and other content groups (e.g. `TortillaContentGroup`'s own order, each
entree's `menu-metadata.json` sort position). This is Chipotle's own
customer-facing ordering, not an artifact of collection order.

**Decision:**
- Derive each generated record's `defaultOrder` from Chipotle's own official
  live ordering source for that record's content group, rather than
  collection/appearance order in the raw capture or an arbitrary import-time
  assignment.
- Preserve this per-group official order faithfully; do not renumber or
  re-sort groups relative to each other beyond what the source itself
  encodes.

**Type:** Source/data truth (encoded as the generated `defaultOrder` field).

**Exception/context:** This is the *official* order baked into generated
data. Macro Maxxer's runtime layer separately applies a small number of its
own presentation-only order overrides on top of this (e.g. pinning Queso
Blanco last among toppings) — those are runtime decisions, not a revision of
the official order; see `runtime-decisions.md` §15.

**Implements:** `scripts/importers/chipotle.ts` (`officialOrder` /
`officialTortillaOrder` / `officialContentSortOrder` /
`officialEntreeSortOrder` helpers, applied wherever a generated record's
`defaultOrder` is set).

**Status: RESOLVED**

---

## Note on `source-analysis.md` / `source-analysis.json` / `build-gaps-analysis.md` / `build-gaps-analysis.json`

Per this project's own convention (see `data/review/chick-fil-a/`, where
raw-source findings live in `comparison.md`/`comparison.json` and decisions
made about those findings live separately in `import-decisions.md`, with
short `Status: ...` follow-up lines used elsewhere in this project's review
docs — see `data/review/chick-fil-a/manual-review.md` — to record an outcome
next to a finding without rewriting the finding itself), the original
findings in `source-analysis.md` / `source-analysis.json`,
`unnamed-metadata-analysis.md` / `unnamed-metadata-analysis.json`, and
`build-gaps-analysis.md` / `build-gaps-analysis.json` have **not** been
rewritten or deleted. What was added, matching that same short-pointer
convention: brief "resolved — see `import-decisions.md` §N" notes placed
directly next to the specific findings this document now resolves (the
Salad-base, adult-Quesadilla-base, and taco-tortilla ambiguities in
`build-gaps-analysis.md`/`.json`, and the corresponding earlier mentions of
the same three issues plus the fountain-drink and unnamed-id findings in
`source-analysis.md`/`.json`). Those documents remain the unedited
evidentiary record for *how* each conclusion was reached; this document
remains the single place recording *what was decided* as a result.
