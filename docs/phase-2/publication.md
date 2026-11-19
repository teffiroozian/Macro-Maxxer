# Phase 2 · Review and approval-based publishing

The extraction-backed pipeline generates `publication-review.md` and `publication-review.json` under `data/restaurants/staging/<restaurant>/normalization/`. Add `--enrich` to produce the supplemental evidence report alongside them. The publication review shows before-and-proposed panels, linked sources and servings, missing nutrition, unresolved conflicts, unsupported options and variants, and the decisions needed for each item. The existing validation and match reports preserve ingredient-level findings and all unlinked records.

## Approval and production history

Partial approval selects specific draft IDs from one exact review. The publish command requires an owner-provided JSON file with the following fields.

| Field | Required content |
|---|---|
| `intent` | `publish` |
| `approvedBy` | `Tef`, the project owner named in the handoff |
| `approvedAt` | ISO 8601 timestamp after review generation |
| `reviewSha256` | Exact digest shown in that review |
| `confirmMainMenuCoverage` | `true`, after reviewing which signature categories the active menu retains |
| `records` | Array of objects containing the selected `draftId` |

The owner supplies the approval file outside the pipeline. The file records an explicit decision and is not an identity authentication service. Review generation never creates approval. When publication is authorized, the command is `npm run pipeline:publish -- chipotle --apply <owner-approval.json>`. It revalidates the draft, evidence freshness, registry mapping, and exact production baseline before applying anything. It rejects changes to the reviewed inputs and blocks ineligible records. A missing field in a newer panel leaves the production value and prior provenance intact. A supported change to another field carries that prior provenance forward for the retained nutrient. An exclusive lock prevents concurrent runs of the publisher. It archives the exact prior menu, reviewed draft, review, approval, and replacement digest under `data/restaurants/<restaurant>/history/<review-sha256>/` before atomically replacing the active menu file. Only the selected nutrition panels and their nutrition traces are changed.

The publisher currently handles verified, independent nutrition panels on existing Chipotle items. Builders, configurable items, shared ingredients, new items, and a restaurant launch require integration review. Partial updates preserve the existing live main menu and all unselected records. A later owner-approved launch needs its own verified main-menu coverage, runtime integration, and disclosure of held-back records.

## Pilot results

| Restaurant | Ready for explicit approval | Verified and unchanged | Blocked items |
|---|---:|---:|---:|
| MOD Pizza | 0 | 0 | 49 |
| Chipotle | 0 | 36 | 30 |

The final review of the original Chipotle pilot capture preserves the eight existing cholesterol values and their historical source traces. The U.S. calculator confirms the corresponding core values and servings but supplies no cholesterol replacement. All eight are now unchanged. Missing or dated nutrition, unverified portions, and linked customization or builder changes remain blocked.

MOD remains blocked on missing verified macros, open customization and serving questions, and launch integration. The owner confirmed sending the nutrition information email. The send date and reply status are unrecorded.

## End-to-end QA · November 19, 2026

Both pilots were run live from discovery through browser-aware extraction, then through normalization, validation, enrichment, and publication review. MOD produced 42,060 extraction records and Chipotle produced 1,879. The lower Chipotle count reflects deduplicated passive captures. Extraction collected five discovered passive sources through their parent pages and made no direct calls to those discovered endpoints. Both drafts passed structural and runtime-reference validation. The reviews show no proposed production changes.

Publication was exercised only against temporary menu copies. The tests applied one eligible fixture item while retaining the unselected items, previous menu bytes, and historical optional nutrition provenance. Missing approval, stale baselines, mismatched servings, old source evidence, and ineligible records were rejected. The pilot copies also rejected attempts to apply the MOD launch and an unchanged former Chipotle omission candidate.
