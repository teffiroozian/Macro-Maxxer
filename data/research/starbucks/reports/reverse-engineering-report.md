# Starbucks recipe-component reverse engineering

Screened all **587 sizes, 176 product/form pairs and 79 component IDs**. **0 high-confidence universal components; 18 conditional/context-specific estimates; 61 unsolved.** Estimates include size-specific serving allocations, not just pump/shot coefficients.

## Why the global sum is not valid

Literal quantity matrix rank: **31/79** (48 all-zero columns). Replacing categorical zeroes with presence raises rank to **77/79**, but the rejected fit has **46.0 kcal RMSE**. There are **49 groups** of identical recorded recipes with different nutrition. This is model misspecification as well as underdetermination.

Milk volumes, cream amounts, and entire coffee/food bases are missing. Quantity 0 is not a nutrient amount. Plain Cold Brew and Lemonade can both list only ice; warming-only food recipes are not complete ingredients.

## Conditional rate estimates

Nutrition order throughout: **kcal, carbs g, fat g, sugar g, protein g**. Decimal precision describes fitted arithmetic, not measurement certainty. All rate estimates remain context dependent.

| Component ID | Component | Nutrition per counted unit | Evidence | Confidence / cross-validation |
|---|---|---|---|---|
| 82 | Espresso Shot Option | 5, 1, -0, -0, 0.5 | 4 direct comparisons/equations | medium; absolute full vector not independently validated |
| 111 | Vanilla Syrup Option | 20, 5, 0, 5, 0 | 4 direct comparisons/equations | medium; absolute full vector not independently validated |
| 91 | Caramel Syrup Option | 22, 5.5, 0, 5.5, 0 | 14 direct comparisons/equations | low; absolute full vector not independently validated |
| 94 | Classic Syrup Option | 19, 4.8, 0, 4.8, 0 | 7 direct comparisons/equations | low; absolute full vector not independently validated |
| 109 | Vanilla Syrup Option | 1, 0.3, 0, 0.2, 0 | 42 direct comparisons/equations | low; absolute full vector not independently validated |
| 1211 | Caramel Syrup Option | 2, 0.2, 0, 0.2, 0 | 14 direct comparisons/equations | low; absolute full vector not independently validated |
| 2121333 | Mango Syrup Option | 17, 3.8, -0, 3.7, -0 | 24 direct comparisons/equations | medium; net effects cross-validated across 3 base families |

Espresso fits four plain hot Espresso totals; iced duplicates are not independent evidence. Americanos do not reproduce the full carb/protein vector. Vanilla uses four sweet-cream size contrasts and an explicit constant-cream assumption; extra cold-brew checks show that categorical cream states need not mean constant amounts.

The **42 protein-flavor comparisons** give rank 4 for 5 syrups. The four other syrup estimates use vanilla as an anchor; ID 109 and ID 1211 are the distinct IDs occurring in sugar-free products despite generic recipe names. Holding out each latte/matcha × hot/iced family checks relative predictions, not absolute nutrition. No assumption equates similarly named syrups.

## Size-specific serving estimates

These are **11 component estimates** with multiple contextual values. Milk is allocated from plain-milk totals. Lemonade is the net replacement of water in plain iced tea. Cream/foam rows subtract black Cold Brew plus counted vanilla; all nine cream estimates inherit uncertainty in that anchor. They must not be used as universal regular portions.

| ID | Component | Context / size | Nutrition per default portion |
|---|---|---|---|
| 63 | 2% Milk Base Option | iced Tall | 200, 19, 8, 19, 13 |
| 63 | 2% Milk Base Option | iced Grande | 260, 25, 10, 25, 17 |
| 63 | 2% Milk Base Option | iced Venti | 370, 36, 15, 36, 24 |
| 63 | 2% Milk Base Option | hot Kids | 100, 10, 4, 10, 7 |
| 63 | 2% Milk Base Option | hot Short | 100, 10, 4, 10, 7 |
| 63 | 2% Milk Base Option | hot Tall | 160, 15, 6, 15, 10 |
| 63 | 2% Milk Base Option | hot Grande | 200, 19, 8, 19, 13 |
| 63 | 2% Milk Base Option | hot Venti | 260, 25, 10, 25, 17 |
| 2122378 | Lemonade Fruit Juice Option | iced Tall | 35, 9, 0, 8, 0 |
| 2122378 | Lemonade Fruit Juice Option | iced Grande | 50, 12, 0, 11, 0 |
| 2122378 | Lemonade Fruit Juice Option | iced Venti | 70, 18, 0, 17, 0 |
| 2122378 | Lemonade Fruit Juice Option | iced Trenta | 100, 24, 0, 22, 0 |
| 28493 | Vanilla Protein Cold Foam Option | iced Tall | 205, 10, 12, 10, 13 |
| 28493 | Vanilla Protein Cold Foam Option | iced Grande | 255, 13, 16, 13, 17 |
| 28493 | Vanilla Protein Cold Foam Option | iced Venti | 275, 13, 17, 13, 18 |
| 28493 | Vanilla Protein Cold Foam Option | iced Trenta | 275, 13, 17, 13, 18 |
| 40729 | Orange Cream Cold Foam Option | iced Tall | 175, 17, 12, 15, 2 |
| 40729 | Orange Cream Cold Foam Option | iced Grande | 195, 18, 14, 17, 2 |
| 40729 | Orange Cream Cold Foam Option | iced Venti | 215, 20, 15, 19, 2 |
| 40729 | Orange Cream Cold Foam Option | iced Trenta | 235, 21, 16, 20, 2 |
| 2121866 | Vanilla Sweet Cream Creamer Option | iced Tall | 65, 4, 5, 4, 1 |
| 2121866 | Vanilla Sweet Cream Creamer Option | iced Grande | 65, 4, 5, 4, 1 |
| 2121866 | Vanilla Sweet Cream Creamer Option | iced Venti | 135, 8, 11, 8, 2 |
| 2121866 | Vanilla Sweet Cream Creamer Option | iced Trenta | 135, 8, 11, 8, 2 |
| 2123557 | Salted Caramel Cream Cold Foam Option | iced Tall | 165, 14, 12, 14, 2 |
| 2123557 | Salted Caramel Cream Cold Foam Option | iced Grande | 195, 16, 14, 16, 2 |
| 2123557 | Salted Caramel Cream Cold Foam Option | iced Venti | 205, 17, 15, 17, 2 |
| 2123557 | Salted Caramel Cream Cold Foam Option | iced Trenta | 215, 17, 15, 17, 2 |
| 2123643 | Chocolate Cream Cold Foam Option | iced Tall | 165, 14, 12, 13, 2 |
| 2123643 | Chocolate Cream Cold Foam Option | iced Grande | 195, 16, 14, 15, 3 |
| 2123643 | Chocolate Cream Cold Foam Option | iced Venti | 205, 17, 14, 15, 3 |
| 2123643 | Chocolate Cream Cold Foam Option | iced Trenta | 205, 16, 14, 15, 3 |
| 2123906 | Oatmilk and Soymilk Vanilla Sweet Creamer Option | iced Tall | 55, 4, 4, 4, 1 |
| 2123906 | Oatmilk and Soymilk Vanilla Sweet Creamer Option | iced Grande | 55, 4, 4, 3, 1 |
| 2123906 | Oatmilk and Soymilk Vanilla Sweet Creamer Option | iced Venti | 105, 8, 8, 7, 3 |
| 2123906 | Oatmilk and Soymilk Vanilla Sweet Creamer Option | iced Trenta | 105, 8, 8, 7, 3 |
| 2123865 | Salted Caramel Oatmilk and Soymilk Cold Foam Option | iced Tall | 105, 10, 7, 9, 2 |
| 2123865 | Salted Caramel Oatmilk and Soymilk Cold Foam Option | iced Grande | 105, 9, 6, 9, 2 |
| 2123865 | Salted Caramel Oatmilk and Soymilk Cold Foam Option | iced Venti | 115, 11, 7, 10, 2 |
| 2123865 | Salted Caramel Oatmilk and Soymilk Cold Foam Option | iced Trenta | 145, 13, 9, 12, 3 |
| 2123870 | Vanilla Oatmilk and Soymilk Cold Foam Option | iced Tall | 75, 6, 6, 5, 2 |
| 2123870 | Vanilla Oatmilk and Soymilk Cold Foam Option | iced Grande | 115, 9, 8, 8, 3 |
| 2123870 | Vanilla Oatmilk and Soymilk Cold Foam Option | iced Venti | 125, 9, 9, 8, 3 |
| 2123870 | Vanilla Oatmilk and Soymilk Cold Foam Option | iced Trenta | 135, 10, 9, 9, 3 |
| 2123868 | Chocolate Oatmilk and Soymilk Cold Foam Option | iced Tall | 125, 13, 8, 11, 3 |
| 2123868 | Chocolate Oatmilk and Soymilk Cold Foam Option | iced Grande | 145, 14, 9, 12, 3 |
| 2123868 | Chocolate Oatmilk and Soymilk Cold Foam Option | iced Venti | 165, 16, 10, 14, 4 |
| 2123868 | Chocolate Oatmilk and Soymilk Cold Foam Option | iced Trenta | 165, 16, 10, 13, 4 |

Milk: 8 source equations across 2 products; same named sizes have different hot/cold totals, so no fl-oz conversion. Lemonade: 12 contrasts across 3 tea families; peach-tea transfer fails. Each cold-brew cream: 4 size-specific equations, no independent absolute validation. See JSON for source row references, held-out residuals, and exact unit definitions.

## Unsolved components

Partial/relative findings do not count as full solutions. Con Panna supports approximately 25 kcal and 2.5 g fat for its topping, but negative carb/protein differences prevent a complete isolated five-macro vector. Tea Sachet spans distinct teas with different totals; it cannot be assigned a universal zero vector.

| ID | Component | Why not isolated |
|---|---|---|
| 41 | Ice Preparation Option | Preparation/selection flag, not a separately measured nutritional ingredient. Quantity is always zero. Treating it as a portion attributes hidden coffee, milk, or food nutrition to this flag. No standalone nutrient vector is isolated. |
| 42 | Water Option | Preparation/selection flag, not a separately measured nutritional ingredient. Quantity is always zero. Treating it as a portion attributes hidden coffee, milk, or food nutrition to this flag. No standalone nutrient vector is isolated. |
| 46 | Chocolate Chip Confection Option | Counted flavor/powder/sauce appears with unmeasured milk, toppings, or omitted Frappuccino/base ingredients. Minimal recipe swaps identify relative or bundled changes, not an absolute contribution. No independent anchored system isolates all five macros without assuming unchanged hidden portions. |
| 47 | Matcha Powder Tea Base Tea Powder Option | Counted chai/matcha co-varies with sweetener and unmeasured milk/base portions. Protein variants omit protein milk from recipes; Chaider omits its fruit base. Anchoring syrup does not determine the remaining milk volume or isolate powder/concentrate nutrition. |
| 48 | Vanilla Bean Sweet Powder Option | Counted flavor/powder/sauce appears with unmeasured milk, toppings, or omitted Frappuccino/base ingredients. Minimal recipe swaps identify relative or bundled changes, not an absolute contribution. No independent anchored system isolates all five macros without assuming unchanged hidden portions. |
| 67 | Whole Milk Base Option | Milk is selected with quantity 0; no physical volume or plain reference for this exact milk exists in C1. Beverage totals also contain unlisted bases and/or other changing ingredients. Per-fl-oz nutrition and pure milk contribution are not identifiable. |
| 71 | Temperature Option | Preparation/selection flag, not a separately measured nutritional ingredient. Quantity is always zero. Treating it as a portion attributes hidden coffee, milk, or food nutrition to this flag. No standalone nutrient vector is isolated. |
| 73 | Foam Preparation Option | Preparation/selection flag, not a separately measured nutritional ingredient. Quantity is always zero. Treating it as a portion attributes hidden coffee, milk, or food nutrition to this flag. No standalone nutrient vector is isolated. |
| 92 | Chai Tea Base Tea Concentrate Option | Counted chai/matcha co-varies with sweetener and unmeasured milk/base portions. Protein variants omit protein milk from recipes; Chaider omits its fruit base. Anchoring syrup does not determine the remaining milk volume or isolate powder/concentrate nutrition. |
| 93 | Cinnamon Dolce Syrup Option | Counted flavor/powder/sauce appears with unmeasured milk, toppings, or omitted Frappuccino/base ingredients. Minimal recipe swaps identify relative or bundled changes, not an absolute contribution. No independent anchored system isolates all five macros without assuming unchanged hidden portions. |
| 96 | Hazelnut Syrup Option | Counted flavor/powder/sauce appears with unmeasured milk, toppings, or omitted Frappuccino/base ingredients. Minimal recipe swaps identify relative or bundled changes, not an absolute contribution. No independent anchored system isolates all five macros without assuming unchanged hidden portions. |
| 101 | Pumpkin Sweet Sauce Option | Counted flavor/powder/sauce appears with unmeasured milk, toppings, or omitted Frappuccino/base ingredients. Minimal recipe swaps identify relative or bundled changes, not an absolute contribution. No independent anchored system isolates all five macros without assuming unchanged hidden portions. |
| 112 | White Chocolate Sweet Sauce Option | Counted flavor/powder/sauce appears with unmeasured milk, toppings, or omitted Frappuccino/base ingredients. Minimal recipe swaps identify relative or bundled changes, not an absolute contribution. No independent anchored system isolates all five macros without assuming unchanged hidden portions. |
| 114 | Tea Sachet Option | One generic Tea Sachet ID spans different teas. Four named tea products display zero macros; Chamomile Mint Blossom displays 5 kcal and 1 g carbs for Tall/Grande/Venti. No single infusion vector transfers across all products or represents dry sachet nutrition. |
| 125 | Whipped Cream Option | Whipped cream uses quantity 0 and no universal portion weight. Con Panna minus Espresso isolates about 25 kcal and 2.5 g fat, but carb/protein differences include negative values; all five nonnegative macros cannot be isolated reliably. Mocha portions cannot be assumed equal to Con Panna. |
| 126 | Caramel Sweet Sauce Drizzle Option | Topping/drizzle is a categorical regular portion with quantity 0. Its amount is unknown and it co-occurs with changing sauce/foam/base recipes. No controlled topping-only addition with demonstrably unchanged base is present. |
| 127 | Mocha Sweet Sauce Drizzle Option | Topping/drizzle is a categorical regular portion with quantity 0. Its amount is unknown and it co-occurs with changing sauce/foam/base recipes. No controlled topping-only addition with demonstrably unchanged base is present. |
| 130 | Cinnamon Powder Spice Option | Topping/drizzle is a categorical regular portion with quantity 0. Its amount is unknown and it co-occurs with changing sauce/foam/base recipes. No controlled topping-only addition with demonstrably unchanged base is present. |
| 135 | Pumpkin Spice Sweet Topping Option | Topping/drizzle is a categorical regular portion with quantity 0. Its amount is unknown and it co-occurs with changing sauce/foam/base recipes. No controlled topping-only addition with demonstrably unchanged base is present. |
| 137 | Cinnamon Dolce Sweet Topping Option | Topping/drizzle is a categorical regular portion with quantity 0. Its amount is unknown and it co-occurs with changing sauce/foam/base recipes. No controlled topping-only addition with demonstrably unchanged base is present. |
| 184 | Frappuccino Roast Option | Coffee and creme Frappuccino variants differ in roast count but also in omitted blend/base formulation. Whole-milk quantity is zero. Identical visible components do not establish the same hidden base, so per-roast-unit nutrition is confounded. |
| 191 | Coconut Flake Sweet Topping Option | Coconut cream foam and coconut-flake topping occur together in all four observed sizes with identical constant design columns. Only their combined size-specific residual is available; neither contribution is separately identifiable. |
| 207 | Cookie Crumble Sweet Topping Option | Topping/drizzle is a categorical regular portion with quantity 0. Its amount is unknown and it co-occurs with changing sauce/foam/base recipes. No controlled topping-only addition with demonstrably unchanged base is present. |
| 650 | Mocha Sweet Sauce Option | Counted flavor/powder/sauce appears with unmeasured milk, toppings, or omitted Frappuccino/base ingredients. Minimal recipe swaps identify relative or bundled changes, not an absolute contribution. No independent anchored system isolates all five macros without assuming unchanged hidden portions. |
| 1179 | Food Temperature Option | Preparation/selection flag, not a separately measured nutritional ingredient. Quantity is always zero. Treating it as a portion attributes hidden coffee, milk, or food nutrition to this flag. No standalone nutrient vector is isolated. |
| 1193 | Food Temperature Option | Preparation/selection flag, not a separately measured nutritional ingredient. Quantity is always zero. Treating it as a portion attributes hidden coffee, milk, or food nutrition to this flag. No standalone nutrient vector is isolated. |
| 1306 | Coconut Milk Base Option | Milk is selected with quantity 0; no physical volume or plain reference for this exact milk exists in C1. Beverage totals also contain unlisted bases and/or other changing ingredients. Per-fl-oz nutrition and pure milk contribution are not identifiable. |
| 27516 | Raspberry Cream Cold Foam Option | Foam amount is not numeric. It is either bundled with toppings/syrup or added to an unmeasured milk base that may be displaced. No plain cold-brew-plus-this-foam-only residual is available. Same-size net additions are context dependent, not isolated foam servings. |
| 27524 | Horchata Syrup Option | Counted flavor/powder/sauce appears with unmeasured milk, toppings, or omitted Frappuccino/base ingredients. Minimal recipe swaps identify relative or bundled changes, not an absolute contribution. No independent anchored system isolates all five macros without assuming unchanged hidden portions. |
| 27773 | Green Coffee Extract Blend | Green Coffee Extract Blend is a categorical selection with quantity 0. Energy/non-energy variants differ by this flag but retain hidden base changes; near-zero deltas do not prove the extract has zero nutrition or determine an amount. |
| 28234 | Banana Protein Cold Foam Option | Foam amount is not numeric. It is either bundled with toppings/syrup or added to an unmeasured milk base that may be displaced. No plain cold-brew-plus-this-foam-only residual is available. Same-size net additions are context dependent, not isolated foam servings. |
| 28582 | Banana Syrup Option | Counted flavor/powder/sauce appears with unmeasured milk, toppings, or omitted Frappuccino/base ingredients. Minimal recipe swaps identify relative or bundled changes, not an absolute contribution. No independent anchored system isolates all five macros without assuming unchanged hidden portions. |
| 34849 | Coconut Cream Cold Foam Option | Coconut cream foam and coconut-flake topping occur together in all four observed sizes with identical constant design columns. Only their combined size-specific residual is available; neither contribution is separately identifiable. |
| 37086 | Mango Cream Cold Foam Option | Foam amount is not numeric. It is either bundled with toppings/syrup or added to an unmeasured milk base that may be displaced. No plain cold-brew-plus-this-foam-only residual is available. Same-size net additions are context dependent, not isolated foam servings. |
| 40664 | Tropical Mango Pineapple Pearls Topping | Fruit/pearls counts are observed, but unlisted Refresher bases differ across matched products. Cannon Ball variants add a fruit component while their names imply a blend; the same recorded base recipe does not establish unchanged liquid composition. Net deltas cannot certify pure inclusions. |
| 40666 | Orange Cream Sweet Powder Option | Counted flavor/powder/sauce appears with unmeasured milk, toppings, or omitted Frappuccino/base ingredients. Minimal recipe swaps identify relative or bundled changes, not an absolute contribution. No independent anchored system isolates all five macros without assuming unchanged hidden portions. |
| 2121344 | Dried Strawberry Preserved Fruit Option | Fruit/pearls counts are observed, but unlisted Refresher bases differ across matched products. Cannon Ball variants add a fruit component while their names imply a blend; the same recorded base recipe does not establish unchanged liquid composition. Net deltas cannot certify pure inclusions. |
| 2121850 | Strawberry Puree Option | Strawberry puree has no volume. Strawberry lemonade/Frappuccino/matcha recipes contain unlisted bases or additional cream components. There is no controlled known-volume puree contrast. |
| 2122191 | Toasted Coconut Syrup Option | Counted flavor/powder/sauce appears with unmeasured milk, toppings, or omitted Frappuccino/base ingredients. Minimal recipe swaps identify relative or bundled changes, not an absolute contribution. No independent anchored system isolates all five macros without assuming unchanged hidden portions. |
| 2122222 | Espresso Roast Option | Preparation/selection flag, not a separately measured nutritional ingredient. Quantity is always zero. Treating it as a portion attributes hidden coffee, milk, or food nutrition to this flag. No standalone nutrient vector is isolated. |
| 2122556 | Oatmilk Milk Base Option | Milk is selected with quantity 0; no physical volume or plain reference for this exact milk exists in C1. Beverage totals also contain unlisted bases and/or other changing ingredients. Per-fl-oz nutrition and pure milk contribution are not identifiable. |
| 2122694 | Dark Caramel Sweet Sauce Option | Counted flavor/powder/sauce appears with unmeasured milk, toppings, or omitted Frappuccino/base ingredients. Minimal recipe swaps identify relative or bundled changes, not an absolute contribution. No independent anchored system isolates all five macros without assuming unchanged hidden portions. |
| 2122719 | Dried Dragonfruit Preserved Fruit Option | Fruit/pearls counts are observed, but unlisted Refresher bases differ across matched products. Cannon Ball variants add a fruit component while their names imply a blend; the same recorded base recipe does not establish unchanged liquid composition. Net deltas cannot certify pure inclusions. |
| 2123051 | Caramel Crunch Sweet Topping Option | Topping/drizzle is a categorical regular portion with quantity 0. Its amount is unknown and it co-occurs with changing sauce/foam/base recipes. No controlled topping-only addition with demonstrably unchanged base is present. |
| 2123075 | Peach Blend Fruit Juice Option | Peach juice is quantity 0, with no volume. Plain-tea and lemonade-tea comparisons produce different size-specific increments; added juice may replace another sweetened liquid. A net drink change is measurable, pure juice nutrition is not. |
| 2123154 | Honey Syrup Option | Counted flavor/powder/sauce appears with unmeasured milk, toppings, or omitted Frappuccino/base ingredients. Minimal recipe swaps identify relative or bundled changes, not an absolute contribution. No independent anchored system isolates all five macros without assuming unchanged hidden portions. |
| 2123166 | Cold Foam with Vanilla Sweet Cream Cold Foam Option | Foam amount is not numeric. It is either bundled with toppings/syrup or added to an unmeasured milk base that may be displaced. No plain cold-brew-plus-this-foam-only residual is available. Same-size net additions are context dependent, not isolated foam servings. |
| 2123218 | Espresso Shot Preparation Option | Preparation/selection flag, not a separately measured nutritional ingredient. Quantity is always zero. Treating it as a portion attributes hidden coffee, milk, or food nutrition to this flag. No standalone nutrient vector is isolated. |
| 2123273 | Signature Espresso Roast Option | Preparation/selection flag, not a separately measured nutritional ingredient. Quantity is always zero. Treating it as a portion attributes hidden coffee, milk, or food nutrition to this flag. No standalone nutrient vector is isolated. |
| 2123308 | Mango Dragonfruit Refresher Base Green Coffee Base Option | Both Refresher-base IDs occur together with quantity 0 in every one of their four rows. The columns are identical; blend proportions and base amounts are absent. Only a combined contribution could be represented. |
| 2123309 | Strawberry Acai Refresher Base Green Coffee Base Option | Both Refresher-base IDs occur together with quantity 0 in every one of their four rows. The columns are identical; blend proportions and base amounts are absent. Only a combined contribution could be represented. |
| 2123369 | Pumpkin Cream Cold Foam Option | Foam amount is not numeric. It is either bundled with toppings/syrup or added to an unmeasured milk base that may be displaced. No plain cold-brew-plus-this-foam-only residual is available. Same-size net additions are context dependent, not isolated foam servings. |
| 2123372 | Salted Brown Butter Sweet Topping Option | Topping/drizzle is a categorical regular portion with quantity 0. Its amount is unknown and it co-occurs with changing sauce/foam/base recipes. No controlled topping-only addition with demonstrably unchanged base is present. |
| 2123373 | Pistachio Sauce Sweet Sauce Option | Counted flavor/powder/sauce appears with unmeasured milk, toppings, or omitted Frappuccino/base ingredients. Minimal recipe swaps identify relative or bundled changes, not an absolute contribution. No independent anchored system isolates all five macros without assuming unchanged hidden portions. |
| 2123422 | Brown Sugar Syrup Option | Counted flavor/powder/sauce appears with unmeasured milk, toppings, or omitted Frappuccino/base ingredients. Minimal recipe swaps identify relative or bundled changes, not an absolute contribution. No independent anchored system isolates all five macros without assuming unchanged hidden portions. |
| 2123703 | Pistachio Cream Cold Foam Option | Foam amount is not numeric. It is either bundled with toppings/syrup or added to an unmeasured milk base that may be displaced. No plain cold-brew-plus-this-foam-only residual is available. Same-size net additions are context dependent, not isolated foam servings. |
| 2123814 | Lavender Cream Cold Foam Option | Foam amount is not numeric. It is either bundled with toppings/syrup or added to an unmeasured milk base that may be displaced. No plain cold-brew-plus-this-foam-only residual is available. Same-size net additions are context dependent, not isolated foam servings. |
| 2123815 | Lavender Sweet Powder Add-in Option | Counted flavor/powder/sauce appears with unmeasured milk, toppings, or omitted Frappuccino/base ingredients. Minimal recipe swaps identify relative or bundled changes, not an absolute contribution. No independent anchored system isolates all five macros without assuming unchanged hidden portions. |
| 2123907 | Pecan Syrup Option | Counted flavor/powder/sauce appears with unmeasured milk, toppings, or omitted Frappuccino/base ingredients. Minimal recipe swaps identify relative or bundled changes, not an absolute contribution. No independent anchored system isolates all five macros without assuming unchanged hidden portions. |
| 2123909 | Pecan Crunch Sweet Topping Option | Topping/drizzle is a categorical regular portion with quantity 0. Its amount is unknown and it co-occurs with changing sauce/foam/base recipes. No controlled topping-only addition with demonstrably unchanged base is present. |
| 2124008 | Brown Sugar Cream Cold Foam Option | Foam amount is not numeric. It is either bundled with toppings/syrup or added to an unmeasured milk base that may be displaced. No plain cold-brew-plus-this-foam-only residual is available. Same-size net additions are context dependent, not isolated foam servings. |

## Macro Maxxer limitation

- Default recipes are customization selections, not complete weighed ingredient formulas. E.g. Cold Brew and Lemonade can both list only Ice; muffins list only warming.
- Form one/modifier quantities of zero mean a categorical selection, not zero ingredient and not one known-volume portion.
- The compact dataset contains no milk/foam/pump volumes. Per-fl-oz milk and universal regular foam/drizzle portions cannot be inferred.
- Nutrition is rounded; small and negative differences do not establish exact zero values. No regulatory rounding intervals were assumed. Rate estimates are displayed to whole kcal and 0.1 g; unrounded fits and held-out errors remain in JSON. Leave-family-out ranges are sensitivity ranges, not confidence intervals.
- Protein syrup results require a conditional vanilla anchor and unchanged hidden milk contributions. Their common absolute offset is underdetermined without that anchor.
- Cold-brew foam residuals depend on that same vanilla anchor and coffee baseline; they are separate size-specific portions and are not independently validated in other drink families.
- Source includes identity/state collisions and missing bases; fitting all 587 rows with 79 coefficients gives a numerically convenient but physically invalid result.
- No estimates are approved as universal modifier coefficients for Macro Maxxer. Preserve context and unknowns; never fill unsolved values with zero.

Only the two requested results files were written. No data fetched, raw/compact datasets changed, or importer built.
