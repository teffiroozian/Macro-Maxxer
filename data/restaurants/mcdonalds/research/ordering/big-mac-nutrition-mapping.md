# Big Mac modifier nutrition mapping

Captured and validated 2026-09-23. Ordering IDs come from `raw/big-mac-item-page.json`; raw nutrition values come from `../../customization/raw/dna-calculator.json`. Negative values apply to remove actions and positive values to extra/add actions.

## Modifier deltas

| Ordering option | Option ID | DNA component/context | Calories | Protein (g) | Carbs (g) | Fat (g) | Status |
|---|---|---|---:|---:|---:|---:|---|
| No Mac Sauce | `43914730745` | `301554` / `big-mac-sauce` | -139.989950 | -0.417170 | -3.527747 | -13.803009 | Exact; independently validated by the no-sauce full-item capture. |
| No Diced Onions | `43914730746` | `300041` / `big-mac-diced-onions` | -4.948640 | -0.142628 | -1.087440 | -0.003546 | Exact Big Mac-parent portion. |
| No Shredded Lettuce | `43914730747` | `300098` / `big-mac-shredded-lettuce` | -3.976000 | -0.255600 | -0.843480 | -0.039760 | Exact Big Mac-parent portion. |
| No Pickle | `43914730748` | `300042` / `big-mac-pickle` | -0.626400 | -0.036000 | -0.104000 | -0.003280 | Exact Big Mac-parent portion. |
| No American Cheese | `43914730749` | `301518` / `american-cheese-single` | -50.113645 | -2.597960 | -1.362864 | -3.818859 | Exact; independently validated by the no-cheese full-item capture. |
| No 1/10 Lb Beef | `43914730750` | `300038` / `big-mac-beef-single` | -93.856392 | -7.267289 | -0.287753 | -7.071372 | Exact one-patty portion; two copies equal the Big Mac default beef context exactly. |
| No Salt | `43914730751` | No discrete DNA component/context | unresolved | unresolved | unresolved | unresolved | Unresolved. Grill seasoning is embedded in the beef component and cannot be separated from the captured DNA recipe. |
| No Big Mac® Bun | `43914730752` | `302510` / `big-mac-bun` | -194.022400 | -6.876220 | -37.385140 | -2.073890 | Exact Big Mac-parent bun portion. |
| Extra Mac Sauce | `43914730753` | `301554` / `big-mac-sauce` | +139.989950 | +0.417170 | +3.527747 | +13.803009 | Exact standard sauce portion. |
| Extra Diced Onions | `43914730754` | `300041` / `big-mac-diced-onions` | +4.948640 | +0.142628 | +1.087440 | +0.003546 | Exact standard Big Mac onion portion. |
| Extra Shredded Lettuce | `43914730755` | `300098` / `big-mac-shredded-lettuce` | +3.976000 | +0.255600 | +0.843480 | +0.039760 | Exact standard Big Mac lettuce portion. |
| Extra Pickle | `43914730756` | `300042` / `big-mac-pickle` | +0.626400 | +0.036000 | +0.104000 | +0.003280 | Exact standard Big Mac pickle portion. |
| Extra American Cheese | `43914730757` | `301518` / `american-cheese-single` | +50.113645 | +2.597960 | +1.362864 | +3.818859 | Exact single-slice portion. |
| Extra 1/10 Lb Beef | `43914730758` | `300038` / `big-mac-beef-single` | +93.856392 | +7.267289 | +0.287753 | +7.071372 | Exact one-patty portion; validated against the two-patty Big Mac context. |
| Extra Salt | `43914730759` | No discrete DNA component/context | unresolved | unresolved | unresolved | unresolved | Unresolved. Ordering supplies no calorie value and DNA does not expose seasoning separately. |
| Add x2 Slc Tomato | `43914730760` | `301407` / 2 × `tomato-single-slice` | +3.081600 | +0.150656 | +0.665968 | +0.034240 | Inferred from two exact single-slice units. Linearity is validated because 3 × the single-slice capture exactly equals the independent three-slice QP capture for every raw nutrient. No direct two-slice context exists. |
| Add Mayonnaise | `43914730761` | `300430` / `qpc-add-mayonnaise` | +100.625724 | +0.149725 | +0.350706 | +10.952827 | Exact standard mayonnaise portion: the DNA quantity is identical across captured menu recipes and the ordering label independently matches 100 calories. |

The raw DNA values are retained rather than replacing them with rounded ordering labels. This explains apparent differences such as ordering's 100-calorie beef label versus 93.856392 raw DNA calories, and 200-calorie bun label versus 194.0224 raw DNA calories.

## Repeated-ingredient validation

- `big-mac-beef-default` (`200463(300038)`) equals exactly 2 × `big-mac-beef-single` (`200477(300038)`) across calories, protein, carbohydrate, fat, sodium, and every other captured nutrient. The remove/extra beef toggle therefore changes the sandwich by one patty.
- `qpc-add-tomato` (`200765(301407)`) equals exactly 3 × `tomato-single-slice` (`200497(301407)`) across the captured raw nutrients. The two-slice ordering option can be calculated as 2 × the exact single-slice context, but remains classified as inferred because the API has no direct two-slice parent context.

## Salt

McDonald's DNA describes the beef as prepared with grill seasoning (salt and black pepper), but exposes no salt/seasoning component and no configurable no-salt or extra-salt nutrition context. The ordering response leaves calories blank for both salt options. Consequently, their complete nutrition deltas—including sodium—cannot be calculated without inventing data. They must remain unresolved even though salt itself would not normally contribute calories or macronutrients.

## Extra-group maximum

Group `9605358905` contains exactly nine Boolean options, its customer-facing subtitle says “Select up to 9,” and each option has null per-option quantity bounds. The structured `maxNumOptions` value of 10 is therefore an unattainable generic/stale cap rather than evidence of a missing tenth choice. The effective limit is nine: all nine captured options may be selected once. No ordering ID or option is missing.

## Readiness

All non-salt modifiers have a usable nutrition mapping. Tomato is a validated arithmetic inference rather than a directly captured two-slice context. `No Salt` and `Extra Salt` remain unresolved and cannot be nutrition-accurately implemented from the captured sources.

Big Mac customization is fully ready only if the salt choices are omitted. It is not fully ready for all 17 captured options.
