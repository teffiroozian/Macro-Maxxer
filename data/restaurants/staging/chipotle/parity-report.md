# Chipotle parity report — universal engine vs existing generated menu

Draft generated 2026-11-18T21:11:46.360Z from the raw captures in `data/restaurants/chipotle/raw/`. Compared against `data/restaurants/chipotle/generated/restaurant.json`, which was not read by the adapter.

**896 of 979 comparisons match.** 83 comparisons differ, producing 83 findings.

| Section | Compared | Match | Differ |
|---|---:|---:|---:|
| Menu items and categories | 77 | 75 | 2 |
| Nutrition values (standard items) | 119 | 92 | 27 |
| Build-your-own containers | 8 | 4 | 4 |
| Selection groups and rules | 36 | 31 | 5 |
| Ingredients and portion sizes | 272 | 251 | 21 |
| Stable ids | 244 | 234 | 10 |
| Customizations and runtime compatibility | 223 | 209 | 14 |

| Classification | Findings |
|---|---:|
| Missing universal functionality | 0 |
| Legitimate Chipotle-specific behavior | 51 |
| Generated menu departs from the raw source | 23 |
| Withheld from the runtime menu: nutrition incomplete (cause listed under nutrition) | 4 |
| Presentation only | 5 |
| Unexplained — needs investigation | 0 |

## Engine and runtime capabilities the comparison shows are missing

| Capability | Findings |
|---|---:|

## Legitimate Chipotle-specific behavior (51)

### Nutrition values (standard items) (26)

| Record | Field | Generated | Draft | Why |
|---|---|---|---|---|
| Large Side of Queso Blanco | nutrition | calories 480, protein 20, carbs 14, totalFat 37, satFat 23, transFat 1.5, cholesterol 120, sodium 980, fiber 0, sugars 5 | calories 480, protein 20, carbs 14, totalFat 37, satFat 23, transFat 1.5, sodium 980, fiber 0, sugars 5 | The generated record takes cholesterol from the PDF row "Queso Blanco (large)", linked through the importer's hand-written size-suffix table; no mechanical name match exists. cholesterol: generated 120, draft has none. |
| Side of Queso Blanco | nutrition | calories 240, protein 10, carbs 8, totalFat 18, satFat 12, transFat 0, cholesterol 60, sodium 500, fiber 0, sugars 2 | calories 240, protein 10, carbs 8, totalFat 18, satFat 12, transFat 0, sodium 500, fiber 0, sugars 2 | The generated record takes cholesterol from the PDF row "Queso Blanco (side)", linked through the importer's hand-written size-suffix table; no mechanical name match exists. cholesterol: generated 60, draft has none. |
| Large Side of Guacamole | nutrition | calories 460, protein 4, carbs 16, totalFat 44, satFat 7, transFat 0, cholesterol 0, sodium 740, fiber 12, sugars 2 | calories 460, protein 4, carbs 16, totalFat 44, satFat 7, transFat 0, sodium 740, fiber 12, sugars 2 | The generated record takes cholesterol from the PDF row "Guacamole (large)", linked through the importer's hand-written size-suffix table; no mechanical name match exists. cholesterol: generated 0, draft has none. |
| Side of Guacamole | nutrition | calories 230, protein 2, carbs 8, totalFat 22, satFat 3.5, transFat 0, cholesterol 0, sodium 370, fiber 6, sugars 1 | calories 230, protein 2, carbs 8, totalFat 22, satFat 3.5, transFat 0, sodium 370, fiber 6, sugars 1 | The generated record takes cholesterol from the PDF row "Guacamole (topping/side)", linked through the importer's hand-written size-suffix table; no mechanical name match exists. cholesterol: generated 0, draft has none. |
| Large Chili Lime Chips & Guacamole | nutrition | calories 1250, protein 15, carbs 123, totalFat 80, satFat 12, transFat 0, sodium 1920, fiber 14, sugars 7 | none | Generated value sums an importer-approved pairing of component records. The draft found no pairing of the named records whose calories confirm this product's published calories, so it composed nothing. calories: generated 1250, draft has none; protein: generated 15, draft has none; carbs: generated 123, draft has none; totalFat: generated 80, draft has none; satFat: generated 12, draft has none; transFat: generated 0, draft has none; sodium: generated 1920, draft has none; fiber: generated 14, draft has none; sugars: generated 7, draft has none. |
| Large Chili Lime Chips & Queso Blanco | nutrition | calories 1270, protein 31, carbs 121, totalFat 73, satFat 28, transFat 1.5, sodium 2160, fiber 2, sugars 10 | none | Generated value sums an importer-approved pairing of component records. The draft found no pairing of the named records whose calories confirm this product's published calories, so it composed nothing. calories: generated 1270, draft has none; protein: generated 31, draft has none; carbs: generated 121, draft has none; totalFat: generated 73, draft has none; satFat: generated 28, draft has none; transFat: generated 1.5, draft has none; sodium: generated 2160, draft has none; fiber: generated 2, draft has none; sugars: generated 10, draft has none. |
| Fountain Drink (22 fl oz) › Minute Maid Lemonade | variant | absent | chipotle:item:drink:22-fl-oz-soda-iced-tea:minute-maid-lemonade (calories 280, protein 0, carbs 75, totalFat 0, satFat 0, transFat 0, cholesterol 0, sodium 95, fiber 0, sugars 75) | The official PDF lists this drink at this cup size; the existing importer does not treat it as a flavor of this fountain cup. |
| Fountain Drink (22 fl oz) › Lemonade - Blue Sky | variant | absent | chipotle:item:drink:22-fl-oz-soda-iced-tea:lemonade-blue-sky (calories 300, protein 0, carbs 78, totalFat 0, satFat 0, transFat 0, cholesterol 0, sodium 95, fiber 0, sugars 74) | The official PDF lists this drink at this cup size; the existing importer does not treat it as a flavor of this fountain cup. |
| Fountain Drink (22 fl oz) › Mango Orange - Blue Sky | variant | absent | chipotle:item:drink:22-fl-oz-soda-iced-tea:mango-orange-blue-sky (calories 300, protein 0, carbs 75, totalFat 0, satFat 0, transFat 0, cholesterol 0, sodium 80, fiber 0, sugars 74) | The official PDF lists this drink at this cup size; the existing importer does not treat it as a flavor of this fountain cup. |
| Fountain Drink (22 fl oz) › Maine Root Root Beer | variant | absent | chipotle:item:drink:22-fl-oz-soda-iced-tea:maine-root-root-beer (calories 170, protein 0, carbs 62, totalFat 0, satFat 0, transFat 0, cholesterol 0, sodium 45, fiber 0, sugars 62) | The official PDF lists this drink at this cup size; the existing importer does not treat it as a flavor of this fountain cup. |
| Fountain Drink (22 fl oz) › Tractor Berry Agua Fresca | variant | absent | chipotle:item:drink:22-fl-oz-soda-iced-tea:tractor-berry-agua-fresca (calories 200, protein 0, carbs 50, totalFat 0, satFat 0, transFat 0, cholesterol 0, sodium 10, fiber 0, sugars 49) | The official PDF lists this drink at this cup size; the existing importer does not treat it as a flavor of this fountain cup. |
| Fountain Drink (22 fl oz) › Tractor Watermelon Limeade | variant | absent | chipotle:item:drink:22-fl-oz-soda-iced-tea:tractor-watermelon-limeade (calories 230, protein 0, carbs 56, totalFat 0, satFat 0, transFat 0, cholesterol 0, sodium 5, fiber 0, sugars 50) | The official PDF lists this drink at this cup size; the existing importer does not treat it as a flavor of this fountain cup. |
| Fountain Drink (22 fl oz) › Tractor Lemonade | variant | absent | chipotle:item:drink:22-fl-oz-soda-iced-tea:tractor-lemonade (calories 170, protein 0, carbs 43, totalFat 0, satFat 0, transFat 0, cholesterol 0, sodium 10, fiber 0, sugars 37) | The official PDF lists this drink at this cup size; the existing importer does not treat it as a flavor of this fountain cup. |
| Fountain Drink (22 fl oz) › Tractor Mandarin Agua Fresca | variant | absent | chipotle:item:drink:22-fl-oz-soda-iced-tea:tractor-mandarin-agua-fresca (calories 190, protein 0, carbs 47, totalFat 0, satFat 0, transFat 0, cholesterol 0, sodium 0, fiber 0, sugars 47) | The official PDF lists this drink at this cup size; the existing importer does not treat it as a flavor of this fountain cup. |
| Fountain Drink (22 fl oz) › Tropicana Lemonade | variant | absent | chipotle:item:drink:22-fl-oz-soda-iced-tea:tropicana-lemonade (calories 280, protein 0, carbs 74, totalFat 0, satFat 0, transFat 0, cholesterol 0, sodium 290, fiber 0, sugars 74) | The official PDF lists this drink at this cup size; the existing importer does not treat it as a flavor of this fountain cup. |
| Fountain Drink (22 fl oz) › Sobe Yumberry Pomegranate | variant | absent | chipotle:item:drink:22-fl-oz-soda-iced-tea:sobe-yumberry-pomegranate (calories 0, protein 0, carbs 0, totalFat 0, satFat 0, transFat 0, cholesterol 0, sodium 85, fiber 0, sugars 0) | The official PDF lists this drink at this cup size; the existing importer does not treat it as a flavor of this fountain cup. |
| Fountain Drink (32 fl oz) › Minute Maid Lemonade | variant | absent | chipotle:item:drink:32-fl-oz-soda-iced-tea:minute-maid-lemonade (calories 400, protein 0, carbs 110, totalFat 0, satFat 0, transFat 0, cholesterol 0, sodium 140, fiber 0, sugars 110) | The official PDF lists this drink at this cup size; the existing importer does not treat it as a flavor of this fountain cup. |
| Fountain Drink (32 fl oz) › Lemonade - Blue Sky | variant | absent | chipotle:item:drink:32-fl-oz-soda-iced-tea:lemonade-blue-sky (calories 440, protein 0, carbs 113, totalFat 0, satFat 0, transFat 0, cholesterol 0, sodium 135, fiber 0, sugars 108) | The official PDF lists this drink at this cup size; the existing importer does not treat it as a flavor of this fountain cup. |
| Fountain Drink (32 fl oz) › Mango Orange - Blue Sky | variant | absent | chipotle:item:drink:32-fl-oz-soda-iced-tea:mango-orange-blue-sky (calories 430, protein 0, carbs 109, totalFat 0, satFat 0, transFat 0, cholesterol 0, sodium 120, fiber 0, sugars 108) | The official PDF lists this drink at this cup size; the existing importer does not treat it as a flavor of this fountain cup. |
| Fountain Drink (32 fl oz) › Maine Root Root Beer | variant | absent | chipotle:item:drink:32-fl-oz-soda-iced-tea:maine-root-root-beer (calories 240, protein 0, carbs 90, totalFat 0, satFat 0, transFat 0, cholesterol 0, sodium 65, fiber 0, sugars 90) | The official PDF lists this drink at this cup size; the existing importer does not treat it as a flavor of this fountain cup. |
| Fountain Drink (32 fl oz) › Tractor Berry Agua Fresca | variant | absent | chipotle:item:drink:32-fl-oz-soda-iced-tea:tractor-berry-agua-fresca (calories 290, protein 0, carbs 72, totalFat 0, satFat 0, transFat 0, cholesterol 0, sodium 15, fiber 0, sugars 72) | The official PDF lists this drink at this cup size; the existing importer does not treat it as a flavor of this fountain cup. |
| Fountain Drink (32 fl oz) › Tractor Watermelon Limeade | variant | absent | chipotle:item:drink:32-fl-oz-soda-iced-tea:tractor-watermelon-limeade (calories 330, protein 0, carbs 82, totalFat 0, satFat 0, transFat 0, cholesterol 0, sodium 10, fiber 0, sugars 72) | The official PDF lists this drink at this cup size; the existing importer does not treat it as a flavor of this fountain cup. |
| Fountain Drink (32 fl oz) › Tractor Lemonade | variant | absent | chipotle:item:drink:32-fl-oz-soda-iced-tea:tractor-lemonade (calories 250, protein 0, carbs 62, totalFat 0, satFat 0, transFat 0, cholesterol 0, sodium 15, fiber 0, sugars 53) | The official PDF lists this drink at this cup size; the existing importer does not treat it as a flavor of this fountain cup. |
| Fountain Drink (32 fl oz) › Tractor Mandarin Agua Fresca | variant | absent | chipotle:item:drink:32-fl-oz-soda-iced-tea:tractor-mandarin-agua-fresca (calories 280, protein 0, carbs 69, totalFat 0, satFat 0, transFat 0, cholesterol 0, sodium 5, fiber 0, sugars 69) | The official PDF lists this drink at this cup size; the existing importer does not treat it as a flavor of this fountain cup. |
| Fountain Drink (32 fl oz) › Tropicana Lemonade | variant | absent | chipotle:item:drink:32-fl-oz-soda-iced-tea:tropicana-lemonade (calories 400, protein 0, carbs 108, totalFat 0, satFat 0, transFat 0, cholesterol 0, sodium 420, fiber 0, sugars 108) | The official PDF lists this drink at this cup size; the existing importer does not treat it as a flavor of this fountain cup. |
| Fountain Drink (32 fl oz) › Sobe Yumberry Pomegranate | variant | absent | chipotle:item:drink:32-fl-oz-soda-iced-tea:sobe-yumberry-pomegranate (calories 0, protein 0, carbs 0, totalFat 0, satFat 0, transFat 0, cholesterol 0, sodium 120, fiber 0, sugars 0) | The official PDF lists this drink at this cup size; the existing importer does not treat it as a flavor of this fountain cup. |

### Ingredients and portion sizes (5)

| Record | Field | Generated | Draft | Why |
|---|---|---|---|---|
| Burrito › Protein › Pollo Asado › Half | nutrition | calories 90, protein 14.5, carbs 1.5, totalFat 3.5, satFat 1.5, transFat 0, sodium 175, fiber 0, sugars 0.5 | none (source publishes no calorie figure for this portion, so no factor) | The source lists this portion without any nutrition record; the generated value applies a record-specific approved factor (approved_portion_scaling). |
| Bowl › Protein › Pollo Asado › Half | nutrition | calories 90, protein 14.5, carbs 1.5, totalFat 3.5, satFat 1.5, transFat 0, sodium 175, fiber 0, sugars 0.5 | none (source publishes no calorie figure for this portion, so no factor) | The source lists this portion without any nutrition record; the generated value applies a record-specific approved factor (approved_portion_scaling). |
| Salad › Protein › Pollo Asado › Half | nutrition | calories 90, protein 14.5, carbs 1.5, totalFat 3.5, satFat 1.5, transFat 0, sodium 175, fiber 0, sugars 0.5 | none (source publishes no calorie figure for this portion, so no factor) | The source lists this portion without any nutrition record; the generated value applies a record-specific approved factor (approved_portion_scaling). |
| Quesadilla › Protein › Pollo Asado › Half | nutrition | calories 90, protein 14.5, carbs 1.5, totalFat 3.5, satFat 1.5, transFat 0, sodium 175, fiber 0, sugars 0.5 | none (source publishes no calorie figure for this portion, so no factor) | The source lists this portion without any nutrition record; the generated value applies a record-specific approved factor (approved_portion_scaling). |
| Kids Build Your Own › Tortillas › 2 Crispy Corn Tortillas | nutrition | calories 130, protein 2, carbs 19, totalFat 6, satFat 1, transFat 0, cholesterol 0, sodium 0, fiber 2, sugars 0 | calories 140, protein 2, carbs 18, totalFat 6, satFat 0, transFat 0, sodium 0, fiber 2, sugars 0 | Generated values come from the importer's hand-maintained per-item table (CHIPOTLE_KIDS_BYO_TORTILLA_NUTRITION_BY_ITEM_ID["CMG-5403"]), not from a mechanical match. calories: generated 130, draft 140; carbs: generated 19, draft 18; satFat: generated 1, draft 0; cholesterol: generated 0, draft has none. |

### Selection groups and rules (1)

| Record | Field | Generated | Draft | Why |
|---|---|---|---|---|
| Burrito › Options | group | absent | chipotle:item:burrito:burrito:options (Double Wrap with Tortilla) | The ordering source offers this group; the existing importer does not expose it on this container. |

### Stable ids (5)

| Record | Field | Generated | Draft | Why |
|---|---|---|---|---|
| Veggie › Normal | portion id | chipotle-protein-veggie-normal | not emitted | Generated value comes from a documented manual decision (structural_zero_choice). |
| new ingredient-variant ids | minted | none | 10: chipotle-cmg-5551-minute-maid-lemonade, chipotle-cmg-5551-lemonade-blue-sky, chipotle-cmg-5551-mango-orange-blue-sky, chipotle-cmg-5551-maine-root-root-beer, chipotle-cmg-5551-tractor-berry-agua-fresca, chipotle-cmg-5551-tractor-watermelon-limeade, chipotle-cmg-5551-tractor-lemonade, chipotle-cmg-5551-tractor-mandarin-agua-fresca, … | The draft carries records the live menu has no id for (catering builds, extra fountain flavors, groups and options the importer does not expose). They are given new ids and never reuse an existing one. |
| new category ids | minted | none | 9: burrito-protein, burrito-options, taco-protein, tacos-3-protein, kids-build-your-own-protein, kids-quesadilla-protein, bowl-protein, salad-protein, … | The draft carries records the live menu has no id for (catering builds, extra fountain flavors, groups and options the importer does not expose). They are given new ids and never reuse an existing one. |
| new ingredient ids | minted | none | 1: chipotle-cheese-base | The draft carries records the live menu has no id for (catering builds, extra fountain flavors, groups and options the importer does not expose). They are given new ids and never reuse an existing one. |
| new variant ids | minted | none | 20: chipotle-fountain-22-fl-oz-minute-maid-lemonade, chipotle-fountain-22-fl-oz-lemonade-blue-sky, chipotle-fountain-22-fl-oz-mango-orange-blue-sky, chipotle-fountain-22-fl-oz-maine-root-root-beer, chipotle-fountain-22-fl-oz-tractor-berry-agua-fresca, chipotle-fountain-22-fl-oz-tractor-watermelon-limeade, chipotle-fountain-22-fl-oz-tractor-lemonade, chipotle-fountain-22-fl-oz-tractor-mandarin-agua-fresca, … | The draft carries records the live menu has no id for (catering builds, extra fountain flavors, groups and options the importer does not expose). They are given new ids and never reuse an existing one. |

### Customizations and runtime compatibility (14)

| Record | Field | Generated | Draft | Why |
|---|---|---|---|---|
| ingredients.hideFromIngredientView | runtimeField | on 3 record(s) | never emitted | A display flag set by an import decision (hide the structural Veggie choice). |
| menu.importMetadata | runtimeField | on 1 record(s) | never emitted | Bookkeeping of the existing importer; the draft's own sources and issues play this role. |
| menu.runtimeIntegration | runtimeField | on 1 record(s) | never emitted | A status note written by the existing importer. |
| Tomatillo-Green Chili Salsa (chipotle-cmg-5203) | display order | 7 | 11 | The projection carries the position Chipotle's own section order gives this record. The importer replaces the source order for a hand-verified list of toppings (VERIFIED_TOPPING_ORDER_BY_ITEM_ID in scripts/importers/chipotle.ts). |
| Tomatillo-Red Chili Salsa (chipotle-cmg-5204) | display order | 8 | 12 | The projection carries the position Chipotle's own section order gives this record. The importer replaces the source order for a hand-verified list of toppings (VERIFIED_TOPPING_ORDER_BY_ITEM_ID in scripts/importers/chipotle.ts). |
| Sour Cream (chipotle-cmg-5251) | display order | 9 | 13 | The projection carries the position Chipotle's own section order gives this record. The importer replaces the source order for a hand-verified list of toppings (VERIFIED_TOPPING_ORDER_BY_ITEM_ID in scripts/importers/chipotle.ts). |
| Cheese (chipotle-cmg-5252) | display order | 11 | 15 | The projection carries the position Chipotle's own section order gives this record. The importer replaces the source order for a hand-verified list of toppings (VERIFIED_TOPPING_ORDER_BY_ITEM_ID in scripts/importers/chipotle.ts). |
| Queso Blanco (chipotle-cmg-1029) | display order | 2 | 18 | The projection carries the position Chipotle's own section order gives this record. The importer replaces the source order for a hand-verified list of toppings (VERIFIED_TOPPING_ORDER_BY_ITEM_ID in scripts/importers/chipotle.ts). |
| Fresh Tomato Salsa (chipotle-cmg-5201) | display order | 4 | 9 | The projection carries the position Chipotle's own section order gives this record. The importer replaces the source order for a hand-verified list of toppings (VERIFIED_TOPPING_ORDER_BY_ITEM_ID in scripts/importers/chipotle.ts). |
| Romaine Lettuce (chipotle-cmg-5351) | display order | 12 | 16 | The projection carries the position Chipotle's own section order gives this record. The importer replaces the source order for a hand-verified list of toppings (VERIFIED_TOPPING_ORDER_BY_ITEM_ID in scripts/importers/chipotle.ts). |
| Fajita Veggies (chipotle-cmg-5101) | display order | 10 | 14 | The projection carries the position Chipotle's own section order gives this record. The importer replaces the source order for a hand-verified list of toppings (VERIFIED_TOPPING_ORDER_BY_ITEM_ID in scripts/importers/chipotle.ts). |
| Roasted Chili-Corn Salsa (chipotle-cmg-5202) | display order | 5 | 10 | The projection carries the position Chipotle's own section order gives this record. The importer replaces the source order for a hand-verified list of toppings (VERIFIED_TOPPING_ORDER_BY_ITEM_ID in scripts/importers/chipotle.ts). |
| Guacamole (chipotle-cmg-1001) | display order | 3 | 8 | The projection carries the position Chipotle's own section order gives this record. The importer replaces the source order for a hand-verified list of toppings (VERIFIED_TOPPING_ORDER_BY_ITEM_ID in scripts/importers/chipotle.ts). |
| Chipotle-Honey Vinaigrette (chipotle-cmg-5353) | display order | 6 | 19 | The projection carries the position Chipotle's own section order gives this record. The importer replaces the source order for a hand-verified list of toppings (VERIFIED_TOPPING_ORDER_BY_ITEM_ID in scripts/importers/chipotle.ts). |

## Generated menu departs from the raw source (23)

### Nutrition values (standard items) (1)

| Record | Field | Generated | Draft | Why |
|---|---|---|---|---|
| Fountain Drink (32 fl oz) › Diet Coke, Caffeine Free | nutrition | calories 0, protein 0, carbs 0, totalFat 0, satFat 0, transFat 0, cholesterol 0, sodium 130, fiber 0, sugars 0 | calories 0, protein 0, totalFat 0, satFat 0, transFat 0, cholesterol 0, sodium 130, fiber 0, sugars 0 | The official PDF cell is blank for this nutrient; the importer's PDF reader substitutes 0, the draft leaves it unknown. carbs: generated 0, draft has none. |

### Build-your-own containers (4)

| Record | Field | Generated | Draft | Why |
|---|---|---|---|---|
| Burrito | nutrition | calories 500, protein 40, carbs 50, totalFat 16, satFat 3.5, cholesterol 125, sodium 910, fiber 3, sugars 0 | calories 500, protein 40, carbs 50, totalFat 16, satFat 3.5, transFat 0, cholesterol 125, sodium 910, fiber 3, sugars 0 | Every nutrient the generated total carries matches. The draft total also carries nutrients every component publishes, which the generated total omits: transFat: draft 0, generated has none. |
| Salad | nutrition | calories 415, protein 34, carbs 21, totalFat 23, satFat 5.5, sodium 1175, fiber 3, sugars 13 | calories 415, protein 34, carbs 21, totalFat 23, satFat 5.5, transFat 0, cholesterol 125, sodium 1175, fiber 3, sugars 13 | Every nutrient the generated total carries matches. The draft total also carries nutrients every component publishes, which the generated total omits: transFat: draft 0, generated has none; cholesterol: draft 125, generated has none. |
| Quesadilla | nutrition | calories 830, protein 58, carbs 53, totalFat 40, satFat 18.5, cholesterol 215, sodium 1480, fiber 3, sugars 0 | calories 830, protein 58, carbs 53, totalFat 40, satFat 18.5, transFat 0, cholesterol 215, sodium 1480, fiber 3, sugars 0 | Every nutrient the generated total carries matches. The draft total also carries nutrients every component publishes, which the generated total omits: transFat: draft 0, generated has none. |
| Kids Quesadilla | nutrition | calories 280, protein 23, carbs 14, totalFat 13.5, satFat 6.5, cholesterol 95, sodium 500, sugars 0 | calories 280, protein 23, carbs 14, totalFat 13.5, satFat 6.5, transFat 0, sodium 500, fiber 0.5, sugars 0 | Shared nutrients match. A nutrient is totalled in the draft only when every component publishes it; the generated total includes a nutrient that a component record does not publish: transFat: draft 0, generated has none; cholesterol: generated 95, draft has none; fiber: draft 0.5, generated has none. |

### Selection groups and rules (4)

| Record | Field | Generated | Draft | Why |
|---|---|---|---|---|
| Burrito › Toppings | allowNone | false | true (minimum none, no none option) | The generated flag disagrees with the source's minimum and none option for this group. |
| Bowl › Toppings | allowNone | false | true (minimum none, no none option) | The generated flag disagrees with the source's minimum and none option for this group. |
| Salad › Toppings | allowNone | false | true (minimum none, no none option) | The generated flag disagrees with the source's minimum and none option for this group. |
| Quesadilla › Protein | members | 7 ingredients | 6 options | Draft options are the raw source's own list for this container. Generated only: veggie. |

### Ingredients and portion sizes (13)

| Record | Field | Generated | Draft | Why |
|---|---|---|---|---|
| Quesadilla › Protein › Steak › Extra | portion | chipotle-protein-steak-extra (calories 300, protein 42, carbs 2, totalFat 12, satFat 5, transFat 0, cholesterol 160, sodium 660, fiber 2, sugars 0) | not offered (source offers Normal, Half) | The ordering source does not offer this portion of this protein on this container. |
| Quesadilla › Protein › Chicken › Extra | portion | chipotle-protein-chicken-extra (calories 360, protein 64, carbs 0, totalFat 14, satFat 6, transFat 0, cholesterol 250, sodium 620, fiber 0, sugars 0) | not offered (source offers Normal, Half) | The ordering source does not offer this portion of this protein on this container. |
| Quesadilla › Protein › Carnitas › Extra | portion | chipotle-protein-carnitas-extra (calories 420, protein 46, carbs 0, totalFat 24, satFat 14, transFat 0, cholesterol 130, sodium 900, fiber 0, sugars 0) | not offered (source offers Normal, Half) | The ordering source does not offer this portion of this protein on this container. |
| Quesadilla › Protein › Beef Barbacoa › Extra | portion | chipotle-protein-beef-barbacoa-extra (calories 340, protein 48, carbs 4, totalFat 14, satFat 5, transFat 0, cholesterol 130, sodium 1060, fiber 2, sugars 0) | not offered (source offers Normal, Half) | The ordering source does not offer this portion of this protein on this container. |
| Quesadilla › Protein › Sofritas › Extra | portion | chipotle-protein-sofritas-extra (calories 300, protein 16, carbs 18, totalFat 20, satFat 3, transFat 0, cholesterol 0, sodium 1120, fiber 6, sugars 10) | not offered (source offers Normal, Half) | The ordering source does not offer this portion of this protein on this container. |
| Quesadilla › Protein › Pollo Asado › Extra | portion | chipotle-protein-pollo-asado-extra (calories 200, protein 23, carbs 5, totalFat 10, satFat 2, transFat 0, sodium 680, fiber 1, sugars 3) | not offered (source offers Normal, Half) | The ordering source does not offer this portion of this protein on this container. |
| Kids Build Your Own › Tortillas › 2 Soft Flour Tortillas | nutrition | calories 170, protein 5, carbs 27, totalFat 5, satFat 0, transFat 0, cholesterol 0, sodium 320, fiber 1, sugars 0 | calories 170, protein 5, carbs 27, totalFat 5, satFat 0, transFat 0, sodium 320, fiber 1, sugars 0 | The official PDF cell is blank for this nutrient; the importer's PDF reader substitutes 0, the draft leaves it unknown. cholesterol: generated 0, draft has none. |
| Kids Build Your Own › Kids Drink › Organic Chocolate Milk | nutrition | calories 160, protein 9, carbs 24, totalFat 3, satFat 2, transFat 0, sodium 220, fiber 1, sugars 22 | calories 160, protein 9, carbs 24, totalFat 3, satFat 2, transFat 0, cholesterol 15, sodium 220, fiber 1, sugars 22 | The draft carries published values the generated record omits (a calorie-confirmed official PDF row). cholesterol: draft 15, generated has none. |
| Kids Build Your Own › Kids Drink › Organic Apple Juice | nutrition | calories 100, protein 0, carbs 25, totalFat 0, satFat 0, transFat 0, sodium 10, fiber 0, sugars 22 | calories 100, protein 0, carbs 25, totalFat 0, satFat 0, transFat 0, cholesterol 0, sodium 10, fiber 0, sugars 22 | The draft carries published values the generated record omits (a calorie-confirmed official PDF row). cholesterol: draft 0, generated has none. |
| Kids Build Your Own › Kids Drink › Organic Milk | nutrition | calories 110, protein 8, carbs 12, totalFat 2.5, satFat 1.5, transFat 0, sodium 125, fiber 0, sugars 12 | calories 110, protein 8, carbs 12, totalFat 2.5, satFat 1.5, transFat 0, cholesterol 15, sodium 125, fiber 0, sugars 12 | The draft carries published values the generated record omits (a calorie-confirmed official PDF row). cholesterol: draft 15, generated has none. |
| Kids Quesadilla › Kids Drink › Organic Chocolate Milk | nutrition | calories 160, protein 9, carbs 24, totalFat 3, satFat 2, transFat 0, sodium 220, fiber 1, sugars 22 | calories 160, protein 9, carbs 24, totalFat 3, satFat 2, transFat 0, cholesterol 15, sodium 220, fiber 1, sugars 22 | The draft carries published values the generated record omits (a calorie-confirmed official PDF row). cholesterol: draft 15, generated has none. |
| Kids Quesadilla › Kids Drink › Organic Apple Juice | nutrition | calories 100, protein 0, carbs 25, totalFat 0, satFat 0, transFat 0, sodium 10, fiber 0, sugars 22 | calories 100, protein 0, carbs 25, totalFat 0, satFat 0, transFat 0, cholesterol 0, sodium 10, fiber 0, sugars 22 | The draft carries published values the generated record omits (a calorie-confirmed official PDF row). cholesterol: draft 0, generated has none. |
| Kids Quesadilla › Kids Drink › Organic Milk | nutrition | calories 110, protein 8, carbs 12, totalFat 2.5, satFat 1.5, transFat 0, sodium 125, fiber 0, sugars 12 | calories 110, protein 8, carbs 12, totalFat 2.5, satFat 1.5, transFat 0, cholesterol 15, sodium 125, fiber 0, sugars 12 | The draft carries published values the generated record omits (a calorie-confirmed official PDF row). cholesterol: draft 15, generated has none. |

### Stable ids (1)

| Record | Field | Generated | Draft | Why |
|---|---|---|---|---|
| Guacamole | ingredient id | chipotle-cmg-5301 | not emitted | No builder option in the raw ordering menu resolves to this live record through its source keys (CMG-5301; live_full_nutrition). |

## Withheld from the runtime menu: nutrition incomplete (cause listed under nutrition) (4)

### Stable ids (4)

| Record | Field | Generated | Draft | Why |
|---|---|---|---|---|
| Large Chili Lime Chips & Guacamole | item id | chipotle-cmg-5366 | withheld: missing calories, protein, carbs, totalFat | The draft record exists but is not projected: missing calories, protein, carbs, totalFat. |
| Large Chili Lime Chips & Queso Blanco | item id | chipotle-cmg-5367 | withheld: missing calories, protein, carbs, totalFat | The draft record exists but is not projected: missing calories, protein, carbs, totalFat. |
| Fountain Drink (32 fl oz) › Diet Coke, Caffeine Free | variant id | chipotle-fountain-32-fl-oz-diet-coke-caffeine-free | withheld: missing carbs | The draft record exists but is not projected: missing carbs. |
| Pollo Asado › Half | portion id | chipotle-protein-pollo-asado-half | withheld: missing calories, protein, carbs, totalFat | The draft portion exists but is not projected: missing calories, protein, carbs, totalFat. |

## Presentation only (5)

### Menu items and categories (2)

| Record | Field | Generated | Draft | Why |
|---|---|---|---|---|
| Fountain Drink (22 fl oz) | name | Fountain Drink (22 fl oz) | 22 fl oz Soda/Iced Tea | The importer renames this record for display; the source name is kept in the draft. |
| Fountain Drink (32 fl oz) | name | Fountain Drink (32 fl oz) | 32 fl oz Soda/Iced Tea | The importer renames this record for display; the source name is kept in the draft. |

### Ingredients and portion sizes (3)

| Record | Field | Generated | Draft | Why |
|---|---|---|---|---|
| Burrito › Protein › Veggie › Normal | portion | chipotle-protein-veggie-normal (calories 0, protein 0, carbs 0, totalFat 0, satFat 0, transFat 0, sodium 0, fiber 0, sugars 0) | option has no portions | The source offers a single portion here; the draft keeps it on the option instead of a one-entry portion list. |
| Bowl › Protein › Veggie › Normal | portion | chipotle-protein-veggie-normal (calories 0, protein 0, carbs 0, totalFat 0, satFat 0, transFat 0, sodium 0, fiber 0, sugars 0) | option has no portions | The source offers a single portion here; the draft keeps it on the option instead of a one-entry portion list. |
| Salad › Protein › Veggie › Normal | portion | chipotle-protein-veggie-normal (calories 0, protein 0, carbs 0, totalFat 0, satFat 0, transFat 0, sodium 0, fiber 0, sugars 0) | option has no portions | The source offers a single portion here; the draft keeps it on the option instead of a one-entry portion list. |
