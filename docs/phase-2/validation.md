# Phase 2 · Automated nutrition and customization validation

Extraction-backed runs of the existing pipeline now run the quality audit in addition to structural and runtime relationship checks. The original raw-adapter runs keep their existing behavior.

```sh
npm run pipeline -- mod-pizza --from-extraction
npm run pipeline -- chipotle --from-extraction /path/to/chipotle/extraction-records.json
```

Read `normalization/review.md` for the blocker summary and `normalization/validation.json` for record-level status, reason codes, missing core nutrients, source verification references, and source-record dispositions. `matches.json` retains the disposition and provenance for each extracted source record.

- **Valid** passes the applicable checks for the reported record or rule.
- **Incomplete** lacks required source values. Missing quantities and nutrients remain absent.
- **Conflicting** has unresolved source values or a published recipe panel outside the allowed difference from its documented component totals.
- **Unsupported** lacks an applicable verified basis or has an invalid relationship, implausible panel, or undocumented derivation. Entries such as preparation options and portion containers that require no standalone panel carry a separate, non-blocking reason.

The audit checks published observations and normalized values, screens complete panels against 4/4/9 energy with the existing Chipotle plausibility tolerance, and checks recipe totals using the approved calorie and nutrient rounding allowances. It checks scoped selection rules, recipe and ingredient links, serving compatibility, and portion factors. Stale and comparison-only observations cannot substantiate a selected value. The validator neither changes values nor selects a winner for unresolved source conflicts.

## Pilot results

| Validation entries | MOD Pizza | Chipotle |
|---|---:|---:|
| Valid | 529 | 313 |
| Incomplete | 12,813 | 120 |
| Conflicting | 1 | 0 |
| Unsupported | 4,609 | 122 |
| Unsupported with no standalone panel expected | 4,582 | 49 |

Both drafts are structurally valid and blocked from approval. Counts include individual options, portions, customization rules, and component checks.

- **MOD Pizza:** Current protein, carbs, and fat remain missing. There is one unresolved calorie disagreement for CinnaMOD. Eighteen builders do not identify a unique default size or crust. The published one-topping calorie basis still needs clarification before multi-topping totals can be relied on.
- **Chipotle:** 193 expected nutrition checks lack core values, including 73 entries with only dated nutrition evidence. The dated PDF is retained for comparison. Unverified portion panels and online presets remain unresolved.
