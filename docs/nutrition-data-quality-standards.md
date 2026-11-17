# Nutrition & Data-Quality Standards

Status: **approved policy (v1, 2026-11-17)**. The policy decisions below were approved by the project owner. The implementation items are planned, not built. Companion to [`docs/restaurant-import-roadmap.md`](./restaurant-import-roadmap.md) (Phase 1, "Establish nutrition and data-quality standards").

This document says what "good enough to publish" means for any Macro Maxxer restaurant: standard, build-your-own, or hybrid. It is based on the existing pipeline (`scripts/pipeline/contracts.ts`, `nutrition.ts`, `engine.ts`, `validate.ts`, `ids.ts`) and on what the Chipotle and MOD Pizza pilot imports produced (`data/restaurants/staging/{chipotle,mod}/`, `docs/research/mod-pizza/`).

## How to read this document

Each rule has exactly one **level** and one **status**:

| Level | Meaning |
|---|---|
| **Mandatory** | Breaking it keeps the affected record (or restaurant) from being published. |
| **Recommended** | Best practice. Any deviation is written down in the restaurant's review. |

| Status | Meaning |
|---|---|
| **Enforced** | The current code already does this. |
| **Partial** | The code does part of it; the gap is named. |
| **Planned** | Approved policy that is not implemented yet. Listed in [Implementation requirements](#implementation-requirements). |

**Approver.** "Approval" in this document always means explicit approval by the project owner. Nothing is published, and no manual resolution takes effect, without it.

---

## 1. Required nutrition fields and missing values

| Rule | Level | Status |
|---|---|---|
| Core macros are **calories, protein, carbs, totalFat** (`CORE_NUTRIENTS`). A record reaches the runtime menu only when all four are known (`toRuntimeNutrition`). | Mandatory | Enforced |
| Optional nutrients (satFat, transFat, cholesterol, sodium, fiber, sugars) may be absent. An absent value means "not published." It is never stored as 0. | Mandatory | Enforced |
| **Missing macros are never made up.** They are not estimated from calories, borrowed from a similar item, or set to 0. A blank cell in a source stays blank. | Mandatory | Enforced |
| A record missing a core macro is held back from publication, not shown with a placeholder. | Mandatory | Enforced |
| Review reports separate "calories only" records from "no nutrition at all," so a reviewer can see how close a record is. | Recommended | Planned |

Pilot evidence:
- **MOD Pizza:** no inspected official source publishes protein, carbs, or fat. All 13,651 nutrition records lack at least one core macro, so nothing is publishable.
- **Chipotle:** 49 of 534 records lack core macros (48 have none of the four; 1 is missing only carbs). Those 49 are held back.

## 2. Sources, precedence, provenance, and freshness

### 2.1 Provenance

| Rule | Level | Status |
|---|---|---|
| Every nutrition value is stored as an observation tied to a declared source, with its authority, URL, `retrievedAt`, and `sourceUpdatedAt` when the source states one. | Mandatory | Enforced |
| Every item, variant, and ingredient cites at least one declared source (`untraceable_record`, `unknown_source` errors). | Mandatory | Enforced |

### 2.2 Source precedence (approved decision 1)

When two sources describe **the same item, the same portion, and the same nutrient**, the pipeline uses this order:

1. **Current, trustworthy ordering-system nutrition.** This means the restaurant's live ordering or menu-nutrition system as it is served today.
2. **Official published nutrition** (nutrition PDF, nutrition web page). This is the baseline, and the fallback whenever no current ordering-system value qualifies.
3. Anything else (third party) is never used for core macros.

An ordering-system value counts as **current and trustworthy** only if all of these hold:
- It was retrieved within the restaurant's freshness window (§2.3).
- Its serving basis matches the other source's: the same item, the same portion or size, and a comparable unit.
- It passes plausibility checks: no placeholder zeros, and calories roughly consistent with the macros (planned check).
- Several sampled stores, if sampled, agree with each other.

If any check fails, the official value is used. If there is no official value either, the nutrient stays unknown.

| Rule | Level | Status |
|---|---|---|
| Precedence applies only on a matching item, portion, and nutrient. Values for different servings are never compared or swapped. | Mandatory | Partial: `ServingBasis` is recorded, but `reconcileNutrition` compares values without checking basis. |
| Current ordering-system nutrition outranks older official nutrition, subject to the checks above. | Mandatory | Partial: precedence is set per adapter (`nutritionPrecedence`). There is no universal default and no freshness or plausibility gate. |
| Implausible or placeholder panels are rejected before reconciliation and reported. | Mandatory | Partial: Chipotle's adapter does this (59 panels rejected, `live_panel_rejected`); it is not universal. |
| Every resolved conflict records which source won and why. | Mandatory | Enforced (`nutrition_conflict_resolved`) |

How the pilots fit this policy:
- **Chipotle:** the adapter already ranks the live nutrition API (retrieved 2026-08-31) above the March 2025 nutrition PDF. That matches the policy, so no change is needed.
- **MOD Pizza:** under this policy, current ordering data would generally win over the nutrition page for calories. That only applies where the serving basis matches, though. The ordering site says its topping calories describe a one-topping pizza, which may not be the basis the nutrition page uses, and Frank's RedHot (120 vs 0) fails plausibility. MOD stays blocked either way, because protein, carbs, and fat are unpublished.

### 2.3 Freshness (approved decision 2)

| Rule | Level | Status |
|---|---|---|
| Any source retrieved more than **90 days** ago raises a `source_stale` warning. | Mandatory | Enforced (`validate.ts`, `maxSourceAgeDays` = 90) |
| A restaurant may set a **shorter** window, for example for seasonal menus. It may never set a longer one. The reason is recorded in the adapter. | Mandatory | Planned |
| A stale source must be re-collected before its restaurant is published or republished. | Mandatory | Planned: today stale sources only produce a warning. |

## 3. Accuracy, serving sizes, and tolerances (approved decision 3)

### 3.1 Calorie tolerance

Published calories and the sum of their components are treated as agreeing when the difference is within:

```
tolerance = min(20, max(5, 2% of the published calories)) kcal
```

| Published kcal | Tolerance |
|---:|---:|
| 50 | 5 |
| 250 | 5 |
| 500 | 10 |
| 1,000 | 20 |
| 1,500 | 20 (capped) |

### 3.2 Rounding allowance for other nutrients

Restaurants round values on their nutrition panels, so two sources can disagree slightly without either being wrong. The rounding allowance defines "slightly." Two values within it are treated as agreeing: the higher-precedence value is used and the difference is logged as information, not as a conflict.

| Nutrients | Allowance |
|---|---|
| protein, carbs, totalFat, satFat, transFat, fiber, sugars | ±1 g |
| sodium, cholesterol | ±10 mg |

Anything beyond the allowance is a real conflict (§6).

### 3.3 Checked against the Chipotle data

The thresholds were checked against `data/restaurants/staging/chipotle/draft.json` (read only):

- **Calories:** all 11 composed Chipotle items that have their own published calorie figure equal their component sum **exactly** (for example, Chips & Guacamole: 540 + 230 = 770). The new tolerance changes no Chipotle result. Two items, *Large Chili Lime Chips & Guacamole* and *Large Chili Lime Chips & Queso Blanco*, have no draft nutrition, and the parity report says no pairing confirmed their published calories. Their observations in the draft are empty, so this is a source or adapter question, not a tolerance one. It is tracked as a Chipotle follow-up.
- **Rounding:** all 26 Chipotle conflicts that precedence resolved fall inside the allowance: satFat 0.5 vs 1 or 1 vs 0, fiber 1 vs 2, carbs 8 vs 7, transFat 0 vs 1, sodium 500 vs 490. Under this policy they become logged rounding differences rather than conflicts. The values chosen do not change.
- **Plausibility caveat:** an allowance of ±1 g is relatively large for nutrients near 0. The Brown Rice satFat difference (1 vs 0) is within the allowance but means "some" vs "none." The review report should still list rounding differences so a reviewer can spot this pattern.

| Rule | Level | Status |
|---|---|---|
| Calorie tolerance as defined in §3.1 | Mandatory | Planned: the engine uses a flat `compositionCalorieTolerance` (default 10; Chipotle sets 10). |
| Rounding allowance as defined in §3.2, applied to both composition checks and source-to-source comparisons | Mandatory | Planned: today non-calorie nutrients must match exactly, and any source difference counts as a conflict. |
| A portion is never derived from another portion without a sourced multiplier. Chipotle's "Half Pollo Asado" stays unknown (`portion_multiplier_missing`). | Mandatory | Enforced |

## 4. Published vs. calculated nutrition

| Rule | Level | Status |
|---|---|---|
| A complete, conflict-free published panel always wins over a calculation. Calculations only fill gaps. | Mandatory | Enforced (`publishedIsFinal`) |
| Every calculated record carries its derivation: `scaled` (base, factor, evidence) or `composed` (components). | Mandatory | Enforced |
| A composed total exists for a nutrient only when every component publishes that nutrient. A missing part is never counted as 0. | Mandatory | Enforced (`composition_incomplete`) |
| Portion multipliers must come from the source or from documented evidence. They are never assumed (for example "Extra = 2×"). | Mandatory | Enforced |
| When a composed total disagrees with the published total beyond tolerance, the restaurant's review shows the published figure, the total, and which one was kept. | Mandatory | Enforced (`composition_mismatch`) |

## 5. Variants, customizations, and build-your-own (approved decision 4)

The pipeline verifies **building blocks and rules, not every possible combination**. A build-your-own item counts as nutrition-complete when all of these hold:

1. Its **default build** has complete core macros.
2. Every **component and option** a customer can select has complete core macros at every **portion** it offers. A portion with no sourced value is unavailable rather than guessed.
3. Its **customization rules** are valid: min/max selections, required groups, exclusive options, and exactly one default portion per option.

Totals for any other combination are calculated live from these verified parts.

| Rule | Level | Status |
|---|---|---|
| Selection limits are consistent and satisfiable (`selection_rule_invalid` blocker; `required_group_unsatisfiable` warning). | Mandatory | Enforced |
| `null` min/max means "the source states no limit." No limit is invented. | Mandatory | Enforced |
| A build-your-own item has at least one ingredient group. | Mandatory | Enforced |
| Exactly one default portion per option (`portion_default_invalid`). | Mandatory | Enforced as a warning. Planned: a blocker for build-your-own items. |
| Nutrition-completeness check per build-your-own item, as defined above | Mandatory | Planned |
| Where a source warns that its numbers aren't additive (for example MOD's "topping calories apply to a one-topping pizza"), summed totals are labeled unverified and cannot be published until clarified. | Mandatory | Partial: reported as a warning (`topping_calories_not_additive_verified`); not yet a blocker. |
| Preconfigured meals (named sets of builder selections) are not imported until the contracts can represent them. | Recommended | Enforced: Chipotle's 21 are reported as `preconfigured_meals_not_imported`. |

## 6. Conflicts and manual verification (approved decision 5)

| Rule | Level | Status |
|---|---|---|
| A difference beyond the §3 tolerances that precedence (§2.2) cannot settle stays **unresolved**. It is never averaged or guessed, and it blocks the affected record (`nutrition_conflict`). | Mandatory | Enforced |
| A conflict settled by precedence is logged with the winning source. | Mandatory | Enforced |
| A **manual resolution** takes effect only with the project owner's explicit approval **and** documented evidence. | Mandatory | Planned |

Each manual resolution must record:
- the conflict it settles (record id, nutrient, the competing values),
- the chosen value,
- the evidence: a document, an email from the restaurant, a photo of in-store nutrition, or a URL with retrieval date. "Seems right" is not evidence,
- who approved it and when.

A manual resolution is stored as its own source type, so it stays traceable and ages under §2.3 like any other source. It never silently overwrites a source observation.

Current state: MOD Pizza has 21 unresolved calorie conflicts between its ordering data and nutrition page. Chipotle has **0** unresolved conflicts.

## 7. Restaurant- and location-specific differences (approved decision 6)

| Rule | Level | Status |
|---|---|---|
| Pilot imports sample **at least two locations**. Every source records its store scope, and catalogs built from samples are labeled "sampled, not national" (`store_coverage_partial`). | Mandatory | Enforced as reporting (MOD: stores 4080 and 4168). Planned: a blocker when fewer than two are sampled. |
| When sampled stores agree with each other, their shared data is used under §2.2. | Mandatory | Planned |
| When sampled stores disagree on something that changes macros, the record is blocked for review. When they disagree only on description or availability, a warning is raised and the official national version is used (MOD's Italian Chop chickpeas is the example). | Mandatory | Partial: `recipe_conflict` and `selection_rule_conflict` are reported as warnings only. |
| **Regional variation stays simple.** Macro Maxxer publishes one national menu per restaurant. Region-only items and per-region nutrition are not modeled until a restaurant actually needs them. | Recommended | Policy |

## 8. Blockers, warnings, approval, and partial publication (approved decision 7)

### 8.1 Severity and approval

| Rule | Level | Status |
|---|---|---|
| **Errors** (structure) fail the draft. **Blockers** keep records or the restaurant out of `readyForApproval`. **Warnings and info** are shown to the reviewer and never block. | Mandatory | Enforced (`validate.ts`) |
| Pipeline output is always `status: "draft"`. Promotion to the runtime menu is a separate, manual step. | Mandatory | Enforced |
| Nothing is published to the runtime menu (`data/restaurants/*`, `lib/restaurants.ts`) without the project owner's explicit approval of that restaurant's review report. | Mandatory | Enforced by process; there is no automated publish step yet. |

### 8.2 Partial publication

A restaurant may publish a subset of its menu, under these conditions:
- **Only fully validated records** are published: complete core macros, no unresolved conflicts, and valid rules (§1, §5, §6). A build-your-own item is published only if it meets §5 in full. Options that fail are left out only when leaving them out doesn't break a required group.
- **Meaningful main-menu coverage is required.** The restaurant's signature or main categories (for example Chipotle's burrito/bowl/tacos, MOD's pizzas) must be represented. A restaurant can't launch with only sides and drinks. The reviewer confirms coverage when approving.
- Everything held back is listed as a **known gap** in the review report and on the restaurant's Nutrition & Data Sources page (§8.3).

| Rule | Level | Status |
|---|---|---|
| Publish only fully validated records | Mandatory | Partial: projection to the runtime schema already excludes incomplete records ("Publishable to the runtime schema today" in `review.md`). |
| Main-menu coverage confirmed at approval | Mandatory | Planned |
| Held-back records listed as known gaps | Mandatory | Planned |

Current Chipotle state: 62 items and 89 ingredients are publishable to the runtime schema today, with 20 records excluded. The draft shows 49 records missing core macros, 4 Half Pollo Asado portions without a factor, and 0 unresolved conflicts.

### 8.3 Restaurant-facing "Nutrition & Data Sources" page (planned)

Every published restaurant gets a reusable page, generated from the same draft and review data, showing:
- **Sources:** each source's name and link, and whether it's official, the ordering system, or a manual resolution.
- **Last verified:** the date of the most recent successful freshness check (§9), plus the source's own "last updated" date when it states one.
- **Coverage:** items and ingredients published vs. found, and which categories are included.
- **Known gaps:** items held back and specific missing values, for example "Half Pollo Asado: no published nutrition."

The restaurant index already carries `nutritionSourceUrl`, `nutritionSourceAttribution`, and `lastUpdated`. The page extends those fields rather than replacing them.

## 9. Updates without introducing bad data (approved decision 8)

### 9.1 Update cycle

Every update goes through the same steps:

1. **Weekly automated source check.** Each published restaurant's sources are re-fetched or re-hashed (`sha256` already exists on `SourceDescriptor`). If nothing changed, only the "last verified" date updates.
2. **Meaningful data diff.** If a source changed, the import is re-run into a **new draft** and compared with the published data. The diff shows added and removed items, changed nutrients beyond the §3 tolerances, changed rules, and changed ids. Changes inside the tolerances are listed separately and marked "rounding only."
3. **Draft validation.** `validateDraft` and every rule in this document run on the new draft.
4. **Review report.** The report shows the diff, old and new values side by side.
5. **Manual approval before publishing.** No automated step ever publishes. A changed nutrition value on a published item always needs re-approval.

### 9.2 Protecting saved meals and ids

| Rule | Level | Status |
|---|---|---|
| Ids never change because a name changed. The id registry only grows (`ids.ts`); a re-import mints new ids only for records it doesn't recognize, and reports id conflicts. | Mandatory | Enforced |
| **Saved-meal nutrition is preserved.** A saved meal keeps the nutrition captured when it was saved. Menu updates never rewrite it. | Mandatory | Partial: cart items store `nutritionPerItem` (`types/cart.ts`), but `lib/cart/cartItemLookup.ts` re-resolves some saved items against the current menu. Needs an audit. |
| A removed item stays resolvable for existing saved meals (its id is kept in the registry), even though it no longer appears on the menu. | Mandatory | Planned |
| The weekly check produces a report, never a publish. | Mandatory | Planned |

---

## Implementation requirements

These are approved but **not implemented**. They belong in Phase 2 unless noted. None are built as part of this Phase 1 task.

| # | Requirement | Section | Where |
|---|---|---|---|
| R1 | Default source precedence: current ordering-system data first, official data as fallback, gated on freshness, plausibility, and matching basis | §2.2 | `nutrition.ts reconcileNutrition`, `contracts.ts` |
| R2 | Compare values only when their serving basis matches | §2.2 | `nutrition.ts` |
| R3 | Universal plausibility check (placeholder zeros; calories consistent with macros) | §2.2 | engine pre-reconciliation step |
| R4 | Per-restaurant freshness window (shorter only); stale source blocks publishing | §2.3 | `validate.ts`, adapter config |
| R5 | Calorie tolerance `min(20, max(5, 2%))` | §3.1 | `nutrition.ts composeNutrition`, `contracts.ts` |
| R6 | Rounding allowance (±1 g, ±10 mg) for compositions and source comparisons | §3.2 | `nutrition.ts` |
| R7 | Per-item build-your-own completeness check; default-portion rule becomes a blocker | §5 | `validate.ts` |
| R8 | "Not additive" source warnings become blockers on summed totals | §5 | engine and adapters |
| R9 | Manual-resolution source type with evidence, approver, and date | §6 | `contracts.ts`, engine |
| R10 | At least two sampled locations; macro-changing disagreements between stores block | §7 | `validate.ts`, adapters |
| R11 | Partial-publication projection, main-menu coverage confirmation, known-gaps list | §8.2 | `scripts/pipeline/project.ts`, review report |
| R12 | Nutrition & Data Sources page (reusable component plus data feed) | §8.3 | app; Phase 2 or 3 |
| R13 | Weekly source check, meaningful diff, re-validation, review report; no auto-publish | §9.1 | Phase 6 ("ongoing nutrition freshness checks"), designed in Phase 2 |
| R14 | Audit saved-meal re-resolution so saved nutrition is never rewritten | §9.2 | `lib/cart/cartItemLookup.ts` |
| R15 | Keep removed items resolvable for saved meals | §9.2 | `ids.ts`, runtime loader |
| R16 | Review reports separate "calories only" records from "no nutrition" | §1 | review report generator |

Chipotle follow-up (not a standards item): find out why *Large Chili Lime Chips & Guacamole* and *Large Chili Lime Chips & Queso Blanco* have no draft nutrition, given that the matching standard-size combos compose exactly.

## How these standards drive Phase 2

- **"Implement automated nutrition and customization validation"** is R1–R10: the rules in §§2–7 become code paths in `nutrition.ts`, `engine.ts`, and `validate.ts`, each producing the error/blocker/warning severity stated here.
- **"Build review reports and approval-based publishing"** is §8 and R11, R12, R16: the review report gains a coverage and known-gaps section, and a publish step that refuses any record failing the mandatory rules and requires the project owner's approval.
- **"Build restaurant data normalization"** already enforces most of §§1, 4, and 5; Phase 2 changes its precedence and tolerance defaults (R1, R2, R5, R6).
- **Update handling (§9)** is designed in Phase 2 so the draft/diff format supports it, and scheduled in Phase 6.

Any new adapter written in Phase 2 or later must declare its sources with authority and dates, its precedence (or accept the default), any shorter freshness window, its store scope, and any known issues. That's enough for every rule above to run without restaurant-specific code in the engine.
