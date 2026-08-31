# Chipotle Import: Decision Log

This is a human-readable record of decisions made after analyzing Chipotle's
official source data — not a restatement of the analysis itself. See
`source-analysis.md` / `source-analysis.json` for the full source-relationship
analysis, `unnamed-metadata-analysis.md` / `unnamed-metadata-analysis.json`
for the unnamed-id follow-up, and `build-gaps-analysis.md` /
`build-gaps-analysis.json` for the Salad/Quesadilla/taco-tortilla follow-up.
Those documents are the evidence; this document is what we decided to do
about it. No importer logic has been implemented yet — these are decisions
to guide that work when it starts, not code.

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

Manual verification against Chipotle's live ordering/calculator UI (outside
the captured raw sources) confirmed the adult Quesadilla's implicit base
composition:
- 1 quesadilla tortilla
- 3 standard cheese portions

**Decision:**
- Represent the adult Quesadilla's implicit base composition as:
  **1 × quesadilla tortilla nutrition + 3 × standard cheese nutrition.**
- Treat this as base/container nutrition, applied before adding the
  selected protein, sides, or optional addons (Queso Blanco `CMG-4134`,
  Guacamole `CMG-1001`/`CMG-5301`, Cilantro Lime Sauce `CMG-5414`).
- "Standard cheese nutrition" refers to the same `CMG-5252` Cheese record
  (110cal/1oz) already used on Burrito/Bowl/Salad/Taco. "Quesadilla tortilla
  nutrition" has no adult-context source value anywhere in the captured raw
  data; the only quesadilla-tortilla-specific nutrition value that exists in
  any source is the kids-context `CMG-5401` record (80cal/1oz, itself a
  high-confidence match to the PDF's kids-only "Flour Tortilla (quesadilla)"
  row) — this is the natural candidate to source that per-unit value from,
  but which exact value to use is left for the importer implementation to
  confirm, not asserted as final here.
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
- Use the official PDF per-unit tortilla nutrition for composed taco
  nutrition, not the `CMG-5501`/`CMG-5503` metadata calorie values.
- **Single Taco = 1 × selected tortilla's official PDF nutrition.**
- **Tacos (3) = 3 × selected tortilla's official PDF nutrition.**
- Do **not** use the ambiguous `CMG-5501`/`CMG-5503` metadata calorie values
  as the final quantity-aware nutrition calculation — they remain
  unreconciled with the PDF and must not be trusted for per-unit math.
- Preserve `CMG-5501`/`CMG-5503` as the ordering/source identities (they are
  what the customer actually selects and what the cart/build logic must key
  off of for the tortilla choice) — only the *nutrition calculation* uses
  actual taco count × official PDF per-unit nutrition instead of the CMG
  metadata value.

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
