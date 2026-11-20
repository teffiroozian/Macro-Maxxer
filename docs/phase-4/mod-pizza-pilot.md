# MOD Pizza pilot · November 19, 2026

The live import reached owner review in 83.52 seconds. It produced a structurally valid draft with 49 items and zero eligible panels. MOD remains blocked from launch.

```sh
npm run pipeline -- import mod --live --browser --record --enrich
```

Run ID `627ed4db-8040-4ebd-8aae-c51e59bdaaa0`. The run used Phase 3 commit `3c26810` before the pilot fix below. The timestamps in the artifacts are UTC. The local staging directory is `data/restaurants/staging/mod/imports/627ed4db-8040-4ebd-8aae-c51e59bdaaa0/`. Start with `import-run.json`. Read `discovery.md` and `extraction.md` for source outcomes and `normalization/{review.md,matches.json,validation.json,enrichment.md,publication-review.md,publication-review.json}` for the draft and held records. Captures and reports remain in local staging.

## Evidence and draft review

Discovery used 43 requests and render attempts across its first two levels. It proposed 12 sources. Six yielded records, five yielded no supported records, and one Koala config URL was handled only through its parent page. The two direct Koala catalog URLs were disallowed by robots.txt. Ordering pages supplied their embedded catalogs. The previously sent nutrition request is recorded as owner-reported. A reply is unrecorded.

| Evidence | Findings |
| --- | --- |
| Ordering stores 4080 and 4168 | 44 and 46 menu listings. The pages supplied ordering rules, choices, named portions and calorie fields. The sample covers two stores. National and catering coverage remain unverified. |
| Official nutrition table | 109 rows, 98 with a clean calorie value. It includes allergen indicators. It supplied no protein, carbs or fat. |
| Official 2023 nutrition page | 98 rows. Protein and carbs on 66 rows, fat on 44. All rows are held for freshness verification and serving equivalence. This was the only extracted source for those macros and the optional nutrients. |
| Official allergen page | 91 dated ingredient declarations. Current allergen indicators also came from the nutrition table. Item-level ingredient declarations require verification. |
| National menu | 22 item records, 15 portions and 67 nutrition rows. Coverage differs from the sampled stores. Italian Chop's national description omits chickpeas, which the Hamburg description lists. |

The draft contains 31 standard items, 18 builders and 154 ingredients. Its categories contain 13 pizzas, 5 salads, 1 side, 7 desserts, 1 kids meal, 17 beverages and 5 extras. Pizza captures distinguish 6-inch and 11-inch thin crust and three 11-inch alternative crusts. Ordering records retain Light, Regular and Extra selections, group rules and options. Captured sizes and portion labels do not establish measured amounts for each nutrient panel. The audit found 18 builders without a unique supported size or crust default. National salad sizes still need an ordering crosswalk. The published single-topping calorie basis does not verify multi-topping totals.

## Automation and manual work

| Measure | Result |
| --- | --- |
| Stages completed automatically | All six through publication review, including optional enrichment. One command, zero follow-up URLs and zero manual data edits during the run. |
| Extracted evidence | 42,060 records, including 41,658 ordering records from two stores. |
| Automated linkage | 41,629 records linked directly and 212 ordering containers represented by linked children. That covers 41,841 of 42,060 records (99.48%). All ordering records were accounted for. |
| Official reference linkage | 183 of 402 linked (45.52%). The 219 unresolved references are 56 current nutrition rows, 54 dated nutrition rows, 47 declarations and 62 national menu records. They are evidence requiring review, not 219 distinct decisions. |
| Validation | 529 valid checks, 12,813 incomplete, one conflict and 4,609 unsupported. The unsupported total includes 4,582 cases where a standalone panel is not expected. |
| Enrichment | 1,058 scoped customization fields verified. Zero current complete nutrition or measured portion checks verified. The report lists 393 nutrition, 113 declaration and 45 portion checks needing manual review. |
| Publication | Zero of 49 items eligible. Runtime projection emitted zero items and zero ingredients. Reference checks reported no broken links, and all 49 ID assignments stayed proposed in staging. |

The link rate is dominated by repeated ordering branches. The official reference link rate is more representative of manual reconciliation. The 83.52 seconds measures machine wall time only. No manual-only time baseline was collected.

## Publication blockers and next evidence

- None of the 12,821 draft nutrition records has all four verified core values. Validation reported 12,820 missing-core blockers, 44 needing source verification, 18 default-variant blockers, one unresolved conflict, and one unverified topping-additivity finding. These categories can overlap.
- CinnaMOD shows 1,190 calories in both store catalogs and 1,182 in the national table. Obtain comparable serving evidence and reconcile the discrepancy before selecting a value.
- Obtain current official core macros and measured serving quantities for the catalog, verify Light, Regular and Extra amounts by context, and reconcile the salad-size mapping, customization defaults and multi-topping basis. Resolve ambiguous same-name references with category and serving evidence. Confirm the Italian Chop recipe difference and refresh item-level ingredient evidence.
- Every item has unverified nutrition, held dependencies, no complete runtime panel, no existing comparable runtime panel, no single traceable complete panel, and unverified serving equivalence. The projection held 20 for lack of a complete variant, 23 for missing protein, carbs and fat, and six for missing all four core fields. Twenty-one linked or configurable items also require integration review.
- MOD needs separate launch integration and verified signature-menu coverage. The existing publisher handles eligible panels on an existing menu. The blocked review remains available for the owner and contains no candidate changes.

## Follow-up classification

| Classification | Disposition |
| --- | --- |
| Source-data gaps and conflicts | Current core macros, portion weights, default size or crust, topping additivity, national-to-store serving matches, ingredient freshness, and the CinnaMOD and Italian Chop discrepancies need official evidence or reconciliation. Ambiguous same-name records stay unlinked until their roles and quantities can be verified. The two catalog URLs disallowed by robots.txt are source access limits. |
| Confirmed reusable pipeline defect | Browser extraction accepted JSON from unrelated hosts and could deduplicate away the corresponding official JSON. Fixed and covered by a regression test. The pilot identified no other confirmed reusable defect behind the open validation findings. |
| Launch work and approval | Verify signature-menu coverage and complete the app's launch integration once the data supports it. Publication requires separate human approval. |

## Reusable pipeline fix

Reviewing browser extraction exposed a provenance bug. JSON from an unrelated host could inherit the official parent page's authority. A byte-identical third-party response could also suppress the real response during deduplication. Extraction now checks the response URL and final URL against the official or ordering hosts established during discovery before parsing or deduplicating. A regression test reproduced the incorrect acceptance and now verifies that the official source survives and the unrelated records are excluded. The live MOD run's browser pages yielded no menu or nutrition records, so its reported totals are unaffected.

## Phase 4 checklist assessment

| Original task | Assessment |
| --- | --- |
| Run first complete restaurant import | Complete through the staged owner review. |
| Review imported menu, macros, portions, and customizations | Complete for the two sampled stores and available national evidence. |
| Resolve extraction and validation failures | Open. The browser extraction defect was fixed, but the source and validation blockers above remain. |
| Approve and publish verified restaurant data | Open. No eligible records or approved launch. |
| Document findings and improve pipeline | Complete with this report and the browser provenance fix. |
