# Phase 2 · Build restaurant data normalization

Run the existing pipeline with an extraction input. It reads both the extraction records and the sibling `extraction.json` summary from the same run.

```sh
npm run pipeline -- mod-pizza --from-extraction
npm run pipeline -- chipotle --from-extraction /path/to/chipotle/extraction-records.json
```

With no input path, the command uses `data/restaurants/staging/<id>/extraction-records.json`. It writes `draft.json`, `review.md`, `validation.json`, and `matches.json` under `data/restaurants/staging/<id>/normalization/`, alongside the draft projection and proposed ID assignments. The match file records the input path, source locator, verification flags, and target IDs. It includes each unmatched row and identifies duplicate captures and ordering containers represented by their children. The source bundle retains the raw text, ranges, unpublished cells, and allergen declarations. Extraction-backed runs reject registry writes.

MOD uses the extracted ordering trees through the existing MOD adapter. National rows use the established category crosswalk and exact names. Confirmed identity matches with uncertain serving equivalence remain comparison evidence. The 2023 macro values are held for verification, and national salad portions with unverified size equivalence stay unlinked. There is one unresolved whole-item calorie conflict for CinnaMOD.

Chipotle uses the saved calculator catalog for ordering structure. The adapter joins extracted panels and corroborating menu rules by calculator ID and uses the existing PDF matcher, including portion checks. The dated PDF remains comparison evidence. Extra and Half portions with missing panels stay incomplete. In this mode the adapter skips estimates from calorie ratios or inferred recipe combinations. The saved calculator capture lacks enough verified configuration to recreate extracted online presets, so they remain unlinked.

## QA results

Both drafts passed structural validation and runtime relationship checks. Approval remains blocked for both.

| | MOD Pizza | Chipotle |
|---|---:|---:|
| Draft items | 49 | 66 |
| Ingredients | 154 | 54 |
| Variants | 85 | 65 |
| Source records directly linked | 41,629 | 690 |
| Ordering containers represented by linked children | 212 | 0 |
| Unique records without draft links | 219 | 999 |
| Repeated captures or duplicate PDF rows | 0 | 9,913 |

MOD linked every sampled ordering product, option, and portion directly or through the existing ordering structure. Among the official references, 56 current nutrition rows, 54 older nutrition rows, 47 ingredient declarations, and 62 national menu records remain unlinked. Chipotle's 999 unlinked unique records include 242 unknown calculator IDs, 65 withheld panels, four panels with a calculator ID but no retained draft entity, and 688 other unmatched records. Among the 194 PDF rows, 96 linked as evidence, 70 repeat another row, and 28 remain unmatched.
