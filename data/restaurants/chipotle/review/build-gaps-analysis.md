# Chipotle Build Gaps — Salad, Quesadilla, Taco-Tortilla Follow-Up

**Scope:** Analysis only. No importer built, no raw file modified, no browser used. This is a targeted follow-up on three items the parent `source-analysis.md` flagged as unresolved: the Salad base, the Quesadilla tortilla, and the CMG-5501 taco-tortilla relationship. Machine-readable detail is in `build-gaps-analysis.json`.

---

## Part A — Salad

7 Salad entrees exist (`CMG-301` Chicken, `CMG-302` Steak, `CMG-303` Carnitas, `CMG-304` Beef Barbacoa, `CMG-305` Sofritas, `CMG-306` Veggie, `CMG-315` Chipotle Honey Chicken), all sharing identical `contentGroups` (`RiceContentGroup` min1/max1, `BeansContentGroup` min1/max1 — yes, salads structurally require a rice and a beans choice, same as Burrito/Bowl) and an identical content-item set: 6 `ExtraPortion` protein swaps, 3 `Beans`, 10 `Toppings` (including `CMG-5353` Chipotle-Honey Vinaigrette, `defaultContent:true` on every salad — the only entree family with an auto-included dressing), 5-6 `HalfPortion` protein swaps, 3 `Rice`. Veggie Salad is the exception: no Half/Extra records (no protein to swap), and it has **two** default items — `CMG-5353` Vinaigrette and `CMG-5301` Guacamole (the Veggie-family no-charge default guac already established in the parent analysis).

### Supergreens Salad Mix — searched exhaustively, confirmed absent

**No CMG id exists for the salad greens/base anywhere** — not in `calculator-menu.json`'s 7 Salad entrees, not in `menu-rules.json`'s 11 (the national superset), not in `menu-metadata.json`'s 408 items, not in `online-meals.json`. It is not a `Toppings`, `Rice`, `Beans`, `Addon`, or `Side` record; it simply never appears as a selectable or reference content item.

The *only* textual evidence it exists at all:
- `menu-metadata.json`'s `groups[]` entry for "Salad" has a marketing `description` field: *"Your choice of meat or sofritas served with our fresh supergreens lettuce blend made of Romaine, Baby Kale, and Baby Spinach..."* — free text, not structured.
- An `online-meals.json` entry ("High Protein - Low Calorie Bowl," which actually wraps `CMG-301` Chicken **Salad**, not a bowl) names "Supergreens Lettuce Mix" in its marketing description — but its own *structured* `entree.contents[]` array only lists Fajita Veggies, Fresh Tomato Salsa, Guacamole, No Beans, No Rice. The greens are named in prose and completely absent from the structured data in the very same record.

**Confirming the gap another way:** `CMG-301` Chicken Salad's own menu-metadata nutrition is 180cal/4oz — numerically identical to Chicken Burrito/Bowl (the established "entree nutrition = protein portion only" pattern from the parent analysis). The Supergreens base isn't folded into the entree's own id-level nutrition either.

**PDF row:** "Supergreens Salad Mix — 3 oz — 15 calories" (adult section).

**Classification: the search itself is CONFIRMED (a definitive negative result — no id exists), but the PDF-to-live join is AMBIGUOUS/UNJOINABLE** — there is no live record to attach it to at all. A Salad's true total nutrition, computed by summing content-item nutrition, will be short by this 15cal/3oz every time, and that should be surfaced as a known gap rather than patched with an invented id or a silently-added constant.

> **Resolved — see `import-decisions.md` §3.** Decision: treat Supergreens Salad Mix as an implicit required base component of every Salad entree, sourced from this PDF row (15cal/3oz), with no invented CMG id. This note is a pointer only; the AMBIGUOUS/UNJOINABLE finding above is left as originally written — the decision doesn't change what was found, only what the importer will do about it.

### Other Salad-specific findings
- Vinaigrette (`CMG-5353`, 220cal/2oz) — already-confirmed exact PDF match, `defaultContent:true` on every salad.
- No salad-exclusive topping or portion variant exists anywhere — every topping/rice/beans/half/extra id used on a Salad is the identical id already used on Burrito/Bowl.

---

## Part B — Quesadilla

7 adult Quesadilla entrees exist, all sharing identical `contentGroups`: `DipContentGroup` (min1/max3), `FillingsContentGroup` (min0/max999, and the *only* filling ever offered is `CMG-5101` Fajita Veggies), `AddonContentGroup` (min0/max999). This is a structurally different shape from Burrito/Bowl/Salad — **no `RiceContentGroup`, `BeansContentGroup`, or `TortillaContentGroup` at all** on the adult format. Rice/beans/salsas/sour cream/vinaigrette appear here only as optional dip-group sides, not required build components.

### No tortilla record, no cheese record — confirmed absent (adult only)

Searched all 7 adult Quesadilla entrees in both `calculator-menu.json` and `menu-rules.json`: **zero `itemType:"Tortillas"` records and zero `contentGroupName:"TortillaContentGroup"` declarations anywhere.** Same for cheese — no `Cheese`-named content record ever appears on a Quesadilla build.

**Contrast with Kids Quesadilla:** the 8 `KidsQuesadilla` entrees (e.g. `CMG-3101` Cheese Only Kids Quesadilla) *do* declare a `TortillaContentGroup` and *do* include an explicit tortilla record: **`CMG-5401` "Soft Flour Tortilla," `defaultContent:true`, 80cal/1oz.**

This matches PDF's **"Flour Tortilla (quesadilla)" — kids section only, 1 ea, 80 calories** exactly on calories (80=80; unit label differs, 1oz vs 1ea, same pattern flagged elsewhere in the parent analysis). **Classification: HIGH-CONFIDENCE, kids-context only.**

**For the adult context, both sides of a potential join are absent simultaneously** — no live CMG id, and no adult PDF row either (the PDF's "Flour Tortilla (quesadilla)" row only exists in the kids section). This is a symmetric structural gap, not a naming mismatch, and mirrors the Salad-greens finding in Part A exactly: adult Quesadilla's tortilla-and-cheese, like a salad's greens, are baked into the entree's identity with zero discrete nutrition tracking anywhere.

**Confirmed via entree-level nutrition too:** all 7 adult Quesadilla entree ids show the same protein-only value pattern (`CMG-401` 180cal/4oz, `CMG-402` 150cal/4oz, etc.; `CMG-407` Cheese Only = 0cal/0oz) — cheese and tortilla contribute nothing to these numbers.

> **Resolved — see `import-decisions.md` §4.** Manual verification against Chipotle's live ordering UI (outside these raw sources) confirmed the adult Quesadilla base is 1 quesadilla tortilla + 3 standard cheese portions; decision: represent this as 1×tortilla + 3×`CMG-5252` cheese base nutrition, applied before selected protein/addons, with the manual-verification provenance preserved. This note is a pointer only; the "both sides absent" finding above is left as originally written.

### CMG-4134 Queso Blanco — confirmed

`CMG-4134` (Addon, Quesadilla context) = **240cal/4oz — exactly double** the standard topping-size Queso (`CMG-1029`/`CMG-1034`, both 120cal/2oz). This matches PDF's **"Queso Blanco (side)"** row (4oz/240cal) exactly — **not** the "Queso Blanco (entreé)" row (2oz/120cal) that the topping-context ids match. The quesadilla addon is priced and portioned as a side-size scoop, consistent with its $2.95 optional-addon status. **Classification: CONFIRMED.**

(Also confirmed in passing: `CMG-5354` Chipotle-Honey Vinaigrette, the Quesadilla dip-context duplicate of Salad's `CMG-5353`, is the identical 220cal/2oz value — same product, alternate id, per the parent analysis's established multi-id pattern.)

---

## Part C — Taco Tortilla (CMG-5501)

### Every parent context

`CMG-5501` "Soft Flour Tortilla" (and its sibling `CMG-5503` "Crispy Corn Tortilla") appears in **all 14 Taco-format entrees** in `calculator-menu.json` — every single-taco entree (`CMG-1201`–`1206`, `1216`) **and** every Tacos(3)-trio entree (`CMG-201`–`206`, `215`), across all 7 proteins. No other parent context uses it.

### Single vs. Tacos(3): explicitly compared, structurally identical

Using Steak as the example (`CMG-1202` single vs `CMG-202` trio):

| | Single Taco (`CMG-1202`) | Tacos (3) (`CMG-202`) |
|---|---|---|
| Top-level `unitCount` | 1 | 1 |
| `TortillaContentGroup` min/max | 1 / 1 | 1 / 1 |
| `CMG-5501` record `unitCount` | 1 | 1 |
| `CMG-5501` `defaultContent` | false | false |

**Every field is identical.** This holds in both `calculator-menu.json` and `menu-rules.json` (checked independently in each). **There is no quantity, multiplier, or count field anywhere in the source data that distinguishes the trio's tortilla requirement from the single taco's.** The "3" exists only in the entree container's own separate itemId/itemName/price (`CMG-202` "Steak Tacos (3)" vs `CMG-1202` "Steak Taco") — never in the nested tortilla content record itself.

**Confirmed: no separate "single-serving" tortilla id exists.** The single taco and the 3-taco trio literally reference the same `CMG-5501`/`CMG-5503` records, unchanged.

### All related tortilla ids

| id | itemName | context | nutrition |
|---|---|---|---|
| `CMG-5501` | Soft Flour Tortilla | Taco (single + trio), all 7 proteins | 250cal/3oz |
| `CMG-5503` | Crispy Corn Tortilla | Taco (single + trio), all 7 proteins | 200cal/1.5oz |
| `CMG-5401` | Soft Flour Tortilla | Kids Quesadilla (8 entrees), default | 80cal/1oz |
| `CMG-5403` | 2 Crispy Corn Tortillas | KidsBYO (8 entrees) | 140cal/1oz |
| `CMG-5404` | 2 Soft Flour Tortillas | KidsBYO (8 entrees) | 170cal/2oz |
| `CMG-4026` | Double Wrap with Tortilla | Burrito extra-tortilla option | 320cal/1oz |

### Reconciliation attempt — cannot be resolved without guessing

PDF rows: Flour Tortilla (taco) adult 80cal/1ea; Crispy Corn Tortilla adult 70cal/1ea; both also have kids-section 2-count rows (170cal/2ea and 130cal/2ea respectively).

- **Naive 3x check:** 80 × 3 = 240, but `CMG-5501` = 250cal — a 10cal (~4%) gap, not an exact multiple. Same pattern for `CMG-5503`: 70 × 3 = 210 vs. live 200cal.
- **The unitCount problem is decisive:** even setting the 10cal gap aside, `CMG-5501` is referenced with the *identical* `unitCount:1` for both the single taco (which needs 1 tortilla, ≈80cal by the PDF) and the trio (which needs 3, ≈240cal by the PDF). One fixed value cannot correctly represent both a 1-tortilla and a 3-tortilla serving without an explicit multiplier field — and no such field exists anywhere in the source.
- **The kids rows don't rescue a multiplication rule either:** `CMG-5404` "2 Soft Flour Tortillas" (170cal) vs. PDF's kids 2-tortilla row (170cal) is an exact match — but even here, that 170 isn't a clean 2× of the adult 80cal single-tortilla figure (2×80=160≠170). If Chipotle's own kids-2-count figure isn't a strict double of its own adult-1-count figure, there's no basis for assuming `CMG-5501`'s value is a strict triple of anything either.

**No hypothesis for what `CMG-5501`'s 250cal/3oz actually represents (a 3-tortilla aggregate with a rounding/vendor difference vs. an entirely different, larger tortilla product) is confirmed by the source data. Both remain speculative and neither is asserted as fact.**

### Final classification

| Relationship | Classification |
|---|---|
| `CMG-5501` ↔ PDF "Flour Tortilla (taco)" | **AMBIGUOUS** |
| `CMG-5503` ↔ PDF "Crispy Corn Tortilla" | **AMBIGUOUS** |
| No id distinguishes single-taco vs. 3-taco tortilla need | **CONFIRMED** (negative finding) |
| No quantity-multiplier field exists anywhere in the taco structure | **CONFIRMED** (negative finding) |
| `CMG-5401` ↔ PDF "Flour Tortilla (quesadilla)," kids | **HIGH-CONFIDENCE** |
| `CMG-4134` Queso Blanco ↔ PDF "Queso Blanco (side)" | **CONFIRMED** |
| Supergreens Salad Mix ↔ any live id | **AMBIGUOUS/UNJOINABLE** (no id exists) |
| Adult Quesadilla tortilla/cheese ↔ any live id or PDF row | **AMBIGUOUS/UNJOINABLE** (both sides absent) |

This sharpens, but does not overturn, the parent analysis's original "ambiguous" call on the taco tortilla — the earlier finding was a single observed number mismatch; this pass confirms *why* it can't be resolved (no scaling field exists at all, and even the most favorable multiplication doesn't land exactly) rather than leaving it as an open question.

> **Resolved — see `import-decisions.md` §5.** Decision: abandon the ambiguous `CMG-5501`/`CMG-5503` metadata calorie values for nutrition purposes; use the official PDF's per-unit tortilla nutrition (80cal flour / 70cal crispy corn, 1 ea) × actual taco count instead — Single Taco = 1× that value, Tacos(3) = 3×. `CMG-5501`/`CMG-5503` are kept as the ordering/selection identities only. This note is a pointer only; the AMBIGUOUS classifications above are left as originally written — they explain why the metadata values themselves couldn't be trusted, which is exactly why the decision routes around them instead of using them.

---

## Cross-Cutting Observation

Salad's missing greens base and adult Quesadilla's missing tortilla+cheese are the same underlying pattern: a physically real, PDF-documented component baked into an entree's identity/price with **no discrete CMG id, no contentGroup entry, and no nutrition record anywhere** in any of the four structured sources. Combined with the already-known Veggie Burrito/Bowl case (fajita veggies standing in for "protein" with no separate tracking), this now looks like a general Chipotle data-modeling convention: components considered *inherent to the format* are excluded from the build/nutrition-calculator graph entirely, while components considered *optional choices* (rice, beans, toppings, protein swaps) are always exposed. Any importer computing full composed-meal nutrition for Salad or adult Quesadilla entrees will systematically undercount by these untracked amounts — known and quantifiable for Salad (15cal), unknown for adult Quesadilla (no PDF baseline exists to even estimate from) — and this should be surfaced to a human reviewer as a structural limitation, not silently patched.

---

## Reported Back

- **Exact Salad base CMG id:** **none exists.** Confirmed absent across all 4 structured sources after an exhaustive search; only free-text marketing copy (in `menu-metadata.json`'s group description and one `online-meals.json` entry) names "Supergreens Lettuce Mix" at all.
- **Exact Quesadilla tortilla CMG id:** **`CMG-5401` for Kids Quesadilla only** (80cal/1oz, high-confidence match to the PDF's kids-only "Flour Tortilla (quesadilla)" row). **No id exists for the adult Quesadilla tortilla**, and cheese has no id in either context.
- **Exact taco tortilla relationships:** `CMG-5501` (flour) and `CMG-5503` (crispy corn) are used identically, with no distinguishing quantity field, across all 14 single-taco and Tacos(3)-trio entrees. Confirmed: no separate id or multiplier exists for the trio format. The 250cal/3oz and 200cal/1.5oz live values do not reconcile with the PDF's 80cal/1ea and 70cal/1ea per-tortilla figures under any tested arithmetic relationship.
- **What is resolved:** the Salad-base and adult-Quesadilla-tortilla/cheese searches (confirmed absent, not just unfound); the Kids Quesadilla tortilla PDF join (high-confidence); the CMG-4134 Queso Blanco PDF join (confirmed); the taco single-vs-trio structural question (confirmed identical, no multiplier exists).
- **What remains genuinely unresolved:** what `CMG-5501`/`CMG-5503`'s 250cal/3oz and 200cal/1.5oz values actually represent; how (or whether) to account for Salad's 15cal/3oz Supergreens gap and the adult Quesadilla's completely untracked tortilla+cheese contribution in any future nutrition calculation.
- **Does any of this require another browser investigation?** No new browser research is needed to *understand* these three gaps — the raw sources already contain everything obtainable, and this pass exhausted it (deep full-tree searches across all four JSON sources plus the PDF-derived `nutrition.json`). If Macro Maxxer later decides it must have an exact live nutrition figure for Supergreens Salad Mix, the taco tortilla, or the quesadilla tortilla+cheese, that would require either accepting the PDF's standalone figures as reasonable substitutes (a judgment call, not a data-discovery task) or a fresh live lookup of Chipotle's nutrition calculator UI to see whether it applies a scaling rule client-side that never reached these raw API captures — but that is a product/import decision to make later, not something blocked on more browsing right now.

> **Follow-up status (added after this analysis): all three open questions above have since been decided — see `import-decisions.md` §3 (Salad base: use the PDF row, no invented id), §4 (adult Quesadilla base: 1×tortilla + 3×standard cheese, per manual live-UI verification — the "another browser investigation" this document anticipated did happen, for this one item specifically), and §5 (taco tortillas: use PDF per-unit nutrition × actual taco count, bypassing the ambiguous CMG-5501/CMG-5503 metadata values entirely rather than resolving what they represent). This paragraph is a pointer only; the bullets above are left as originally written to preserve the reasoning that led to each decision.**
