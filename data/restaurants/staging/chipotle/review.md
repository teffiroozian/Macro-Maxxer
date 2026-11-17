# Chipotle — import review (draft)

Generated 2026-11-17T22:19:53.452Z. Status: **draft**. Not published; the live restaurant index is untouched.

- Structurally valid: **yes**
- Ready for approval: **no**
- Menu models: standard, build-your-own
- Items: 63 (55 standard, 8 build-your-own)
- Ingredients: 54
- Nutrition records: 468, of which 460 have all four core macros
- Records missing core macros: 8
- Unresolved nutrition conflicts: 0
- Publishable to the runtime schema today: 61 items, 74 ingredients (4 excluded)
- Ids: 272 in the registry, 40 new, 0 conflicts

## Sources

- `chipotle:calculator-menu` — https://services.chipotle.com/menuinnovation/v1/restaurants/469/onlinemenu/compressed?channelId=web&includeUnavailableItems=true (ordering_system; retrieved 2026-08-31T23:40:20.515Z)
- `chipotle:live-nutrition` — https://services.chipotle.com/menu-metadata/v1/menu-metadata/nutrition?channel=web&region=US (official; retrieved 2026-08-31T23:40:20.861Z)
- `chipotle:nutrition-pdf` — https://www.chipotle.com/content/dam/chipotle/menu/nutrition/US-Nutrition-Facts-Paper-Menu-3-2025.pdf (official; retrieved 2026-08-27)
- `chipotle:import-decisions` — data/restaurants/chipotle/review/import-decisions.md (official; retrieved 2026-08-31T23:40:20.515Z)

## Blockers (2)

- `core_nutrition_missing` — 7 record(s) have no published or agreed value for: calories, protein, carbs, totalFat. The values were left empty.
- `core_nutrition_missing` — 1 record(s) have no published or agreed value for: carbs. The values were left empty.

## Warnings (4)

- `portion_multiplier_missing` — Burrito › Protein › Pollo Asado › Half has no complete published nutrition and the source supports no factor for it; its nutrition stays unknown.
- `portion_multiplier_missing` — Bowl › Protein › Pollo Asado › Half has no complete published nutrition and the source supports no factor for it; its nutrition stays unknown.
- `portion_multiplier_missing` — Salad › Protein › Pollo Asado › Half has no complete published nutrition and the source supports no factor for it; its nutrition stays unknown.
- `portion_multiplier_missing` — Quesadilla › Protein › Pollo Asado › Half has no complete published nutrition and the source supports no factor for it; its nutrition stays unknown.

## Infos (89)

- `live_panel_rejected` — 33 live nutrition panel(s) were not used because they are placeholders or implausible: Extra Steak: live panel has a placeholder 0 portion; Half Steak: live panel has a placeholder 0 portion; Extra Chicken: live panel has a placeholder 0 portion; Half Chicken: live panel has a placeholder 0 portion; Extra Carnitas: live panel has a placeholder 0 portion; Half Carnitas: live panel has a placeholder 0 portion; Extra Beef Barbacoa: live panel has a placeholder 0 portion; Half Beef Barbacoa: live panel has a placeholder 0 portion; …
- `portion_choices_without_amounts` — The ordering source offers 1385 Light / Extra / Side / Half choices on contents but publishes no amounts for them; they are not imported.
- `non_food_items_not_imported` — 3 non-food ordering records (utensils, bowls) are not imported.
- `catering_not_imported` — 7 catering entree records (BYOProtein, BYOChips; serve 4–6) are not imported.
- `single_taco_tortilla_panels` — The single Taco and Tacos (3) share tortilla records whose panels describe three tortillas. The single Taco uses Chipotle's official one-tortilla panels instead: live CMG-5401 (Flour Tortilla, taco size) and the PDF's 1 ea Crispy Corn Tortilla row.
- `preconfigured_meals_not_imported` — 21 preconfigured online meals are not imported; the contracts have no preset-composition record.
- `duplicate_item_merged` — "Burrito" appeared more than once in Burrito; the records were merged into chipotle:item:burrito:burrito.
- `duplicate_item_merged` — "Burrito" appeared more than once in Burrito; the records were merged into chipotle:item:burrito:burrito.
- `duplicate_item_merged` — "Burrito" appeared more than once in Burrito; the records were merged into chipotle:item:burrito:burrito.
- `duplicate_item_merged` — "Burrito" appeared more than once in Burrito; the records were merged into chipotle:item:burrito:burrito.
- `duplicate_item_merged` — "Burrito" appeared more than once in Burrito; the records were merged into chipotle:item:burrito:burrito.
- `duplicate_item_merged` — "Burrito" appeared more than once in Burrito; the records were merged into chipotle:item:burrito:burrito.
- `duplicate_item_merged` — "Taco" appeared more than once in Tacos; the records were merged into chipotle:item:tacos:taco.
- `duplicate_item_merged` — "Taco" appeared more than once in Tacos; the records were merged into chipotle:item:tacos:taco.
- `duplicate_item_merged` — "Taco" appeared more than once in Tacos; the records were merged into chipotle:item:tacos:taco.
- `duplicate_item_merged` — "Taco" appeared more than once in Tacos; the records were merged into chipotle:item:tacos:taco.
- `duplicate_item_merged` — "Taco" appeared more than once in Tacos; the records were merged into chipotle:item:tacos:taco.
- `duplicate_item_merged` — "Tacos (3)" appeared more than once in Tacos; the records were merged into chipotle:item:tacos:tacos-3.
- `duplicate_item_merged` — "Tacos (3)" appeared more than once in Tacos; the records were merged into chipotle:item:tacos:tacos-3.
- `duplicate_item_merged` — "Tacos (3)" appeared more than once in Tacos; the records were merged into chipotle:item:tacos:tacos-3.
- `duplicate_item_merged` — "Tacos (3)" appeared more than once in Tacos; the records were merged into chipotle:item:tacos:tacos-3.
- `duplicate_item_merged` — "Tacos (3)" appeared more than once in Tacos; the records were merged into chipotle:item:tacos:tacos-3.
- `duplicate_item_merged` — "Taco" appeared more than once in Tacos; the records were merged into chipotle:item:tacos:taco.
- `duplicate_item_merged` — "Tacos (3)" appeared more than once in Tacos; the records were merged into chipotle:item:tacos:tacos-3.
- `duplicate_item_merged` — "Kids Build Your Own" appeared more than once in KidsBYO; the records were merged into chipotle:item:kidsbyo:kids-build-your-own.
- `duplicate_item_merged` — "Kids Build Your Own" appeared more than once in KidsBYO; the records were merged into chipotle:item:kidsbyo:kids-build-your-own.
- `duplicate_item_merged` — "Kids Build Your Own" appeared more than once in KidsBYO; the records were merged into chipotle:item:kidsbyo:kids-build-your-own.
- `duplicate_item_merged` — "Kids Build Your Own" appeared more than once in KidsBYO; the records were merged into chipotle:item:kidsbyo:kids-build-your-own.
- `duplicate_item_merged` — "Kids Build Your Own" appeared more than once in KidsBYO; the records were merged into chipotle:item:kidsbyo:kids-build-your-own.
- `duplicate_item_merged` — "Kids Build Your Own" appeared more than once in KidsBYO; the records were merged into chipotle:item:kidsbyo:kids-build-your-own.
- `duplicate_item_merged` — "Kids Build Your Own" appeared more than once in KidsBYO; the records were merged into chipotle:item:kidsbyo:kids-build-your-own.
- `duplicate_item_merged` — "Kids Quesadilla" appeared more than once in KidsQuesadilla; the records were merged into chipotle:item:kidsquesadilla:kids-quesadilla.
- `duplicate_item_merged` — "Kids Quesadilla" appeared more than once in KidsQuesadilla; the records were merged into chipotle:item:kidsquesadilla:kids-quesadilla.
- `duplicate_item_merged` — "Kids Quesadilla" appeared more than once in KidsQuesadilla; the records were merged into chipotle:item:kidsquesadilla:kids-quesadilla.
- `duplicate_item_merged` — "Kids Quesadilla" appeared more than once in KidsQuesadilla; the records were merged into chipotle:item:kidsquesadilla:kids-quesadilla.
- `duplicate_item_merged` — "Kids Quesadilla" appeared more than once in KidsQuesadilla; the records were merged into chipotle:item:kidsquesadilla:kids-quesadilla.
- `duplicate_item_merged` — "Kids Quesadilla" appeared more than once in KidsQuesadilla; the records were merged into chipotle:item:kidsquesadilla:kids-quesadilla.
- `duplicate_item_merged` — "Kids Quesadilla" appeared more than once in KidsQuesadilla; the records were merged into chipotle:item:kidsquesadilla:kids-quesadilla.
- `duplicate_item_merged` — "Bowl" appeared more than once in Bowl; the records were merged into chipotle:item:bowl:bowl.
- `duplicate_item_merged` — "Bowl" appeared more than once in Bowl; the records were merged into chipotle:item:bowl:bowl.
- `duplicate_item_merged` — "Bowl" appeared more than once in Bowl; the records were merged into chipotle:item:bowl:bowl.
- `duplicate_item_merged` — "Bowl" appeared more than once in Bowl; the records were merged into chipotle:item:bowl:bowl.
- `duplicate_item_merged` — "Bowl" appeared more than once in Bowl; the records were merged into chipotle:item:bowl:bowl.
- `duplicate_item_merged` — "Bowl" appeared more than once in Bowl; the records were merged into chipotle:item:bowl:bowl.
- `duplicate_item_merged` — "Salad" appeared more than once in Salad; the records were merged into chipotle:item:salad:salad.
- `duplicate_item_merged` — "Salad" appeared more than once in Salad; the records were merged into chipotle:item:salad:salad.
- `duplicate_item_merged` — "Salad" appeared more than once in Salad; the records were merged into chipotle:item:salad:salad.
- `duplicate_item_merged` — "Salad" appeared more than once in Salad; the records were merged into chipotle:item:salad:salad.
- `duplicate_item_merged` — "Salad" appeared more than once in Salad; the records were merged into chipotle:item:salad:salad.
- `duplicate_item_merged` — "Salad" appeared more than once in Salad; the records were merged into chipotle:item:salad:salad.
- `duplicate_item_merged` — "Quesadilla" appeared more than once in Quesadilla; the records were merged into chipotle:item:quesadilla:quesadilla.
- `duplicate_item_merged` — "Quesadilla" appeared more than once in Quesadilla; the records were merged into chipotle:item:quesadilla:quesadilla.
- `duplicate_item_merged` — "Quesadilla" appeared more than once in Quesadilla; the records were merged into chipotle:item:quesadilla:quesadilla.
- `duplicate_item_merged` — "Quesadilla" appeared more than once in Quesadilla; the records were merged into chipotle:item:quesadilla:quesadilla.
- `duplicate_item_merged` — "Quesadilla" appeared more than once in Quesadilla; the records were merged into chipotle:item:quesadilla:quesadilla.
- `duplicate_item_merged` — "Quesadilla" appeared more than once in Quesadilla; the records were merged into chipotle:item:quesadilla:quesadilla.
- `duplicate_item_merged` — "Large Side of Queso Blanco" appeared more than once in Side; the records were merged into chipotle:item:side:large-side-of-queso-blanco.
- `duplicate_item_merged` — "Large Side of Guacamole" appeared more than once in Side; the records were merged into chipotle:item:side:large-side-of-guacamole.
- `duplicate_item_merged` — "Large Tomatillo-Green Chili Salsa" appeared more than once in Side; the records were merged into chipotle:item:side:large-tomatillo-green-chili-salsa.
- `duplicate_item_merged` — "Large Fresh Tomato Salsa" appeared more than once in Side; the records were merged into chipotle:item:side:large-fresh-tomato-salsa.
- `duplicate_item_merged` — "Large Roasted Chili-Corn Salsa" appeared more than once in Side; the records were merged into chipotle:item:side:large-roasted-chili-corn-salsa.
- `duplicate_item_merged` — "Large Side of Cilantro Lime Sauce" appeared more than once in Side; the records were merged into chipotle:item:side:large-side-of-cilantro-lime-sauce.
- `duplicate_item_merged` — "Large Tomatillo-Red Chili Salsa" appeared more than once in Side; the records were merged into chipotle:item:side:large-tomatillo-red-chili-salsa.
- `nutrition_conflict_resolved` — Burrito › Rice › White Rice: satFat differs across sources — 0.5 (chipotle:live-nutrition) vs 1 (chipotle:nutrition-pdf); chipotle:live-nutrition was used by declared precedence.
- `nutrition_conflict_resolved` — Burrito › Rice › Brown Rice: satFat differs across sources — 1 (chipotle:live-nutrition) vs 0 (chipotle:nutrition-pdf); chipotle:live-nutrition was used by declared precedence.
- `nutrition_conflict_resolved` — Taco › Toppings › White Rice: satFat differs across sources — 0.5 (chipotle:live-nutrition) vs 1 (chipotle:nutrition-pdf); chipotle:live-nutrition was used by declared precedence.
- `nutrition_conflict_resolved` — Taco › Toppings › Brown Rice: satFat differs across sources — 1 (chipotle:live-nutrition) vs 0 (chipotle:nutrition-pdf); chipotle:live-nutrition was used by declared precedence.
- `nutrition_conflict_resolved` — Tacos (3) › Toppings › White Rice: satFat differs across sources — 0.5 (chipotle:live-nutrition) vs 1 (chipotle:nutrition-pdf); chipotle:live-nutrition was used by declared precedence.
- `nutrition_conflict_resolved` — Tacos (3) › Toppings › Brown Rice: satFat differs across sources — 1 (chipotle:live-nutrition) vs 0 (chipotle:nutrition-pdf); chipotle:live-nutrition was used by declared precedence.
- `nutrition_conflict_resolved` — Kids Build Your Own › Toppings › Tomatillo-Red Chili Salsa: fiber differs across sources — 1 (chipotle:live-nutrition) vs 2 (chipotle:nutrition-pdf); chipotle:live-nutrition was used by declared precedence.
- `nutrition_conflict_resolved` — Kids Build Your Own › Toppings › White Rice: satFat differs across sources — 0.5 (chipotle:live-nutrition) vs 1 (chipotle:nutrition-pdf); chipotle:live-nutrition was used by declared precedence.
- `nutrition_conflict_resolved` — Kids Build Your Own › Toppings › Brown Rice: satFat differs across sources — 1 (chipotle:live-nutrition) vs 0 (chipotle:nutrition-pdf); chipotle:live-nutrition was used by declared precedence.
- `nutrition_conflict_resolved` — Kids Quesadilla › Rice › White Rice: satFat differs across sources — 0.5 (chipotle:live-nutrition) vs 1 (chipotle:nutrition-pdf); chipotle:live-nutrition was used by declared precedence.
- `nutrition_conflict_resolved` — Kids Quesadilla › Rice › Brown Rice: satFat differs across sources — 1 (chipotle:live-nutrition) vs 0 (chipotle:nutrition-pdf); chipotle:live-nutrition was used by declared precedence.
- `nutrition_conflict_resolved` — Bowl › Rice › White Rice: satFat differs across sources — 0.5 (chipotle:live-nutrition) vs 1 (chipotle:nutrition-pdf); chipotle:live-nutrition was used by declared precedence.
- `nutrition_conflict_resolved` — Bowl › Rice › Brown Rice: satFat differs across sources — 1 (chipotle:live-nutrition) vs 0 (chipotle:nutrition-pdf); chipotle:live-nutrition was used by declared precedence.
- `nutrition_conflict_resolved` — Salad › Rice › White Rice: satFat differs across sources — 0.5 (chipotle:live-nutrition) vs 1 (chipotle:nutrition-pdf); chipotle:live-nutrition was used by declared precedence.
- `nutrition_conflict_resolved` — Salad › Rice › Brown Rice: satFat differs across sources — 1 (chipotle:live-nutrition) vs 0 (chipotle:nutrition-pdf); chipotle:live-nutrition was used by declared precedence.
- `nutrition_conflict_resolved` — Quesadilla › Dips › White Rice: satFat differs across sources — 0.5 (chipotle:live-nutrition) vs 1 (chipotle:nutrition-pdf); chipotle:live-nutrition was used by declared precedence.
- `nutrition_conflict_resolved` — Quesadilla › Dips › Brown Rice: satFat differs across sources — 1 (chipotle:live-nutrition) vs 0 (chipotle:nutrition-pdf); chipotle:live-nutrition was used by declared precedence.
- `nutrition_conflict_resolved` — Quesadilla › Addons › Queso Blanco: carbs differs across sources — 8 (chipotle:live-nutrition) vs 7 (chipotle:nutrition-pdf); chipotle:live-nutrition was used by declared precedence.
- `nutrition_conflict_resolved` — Quesadilla › Addons › Queso Blanco: transFat differs across sources — 0 (chipotle:live-nutrition) vs 1 (chipotle:nutrition-pdf); chipotle:live-nutrition was used by declared precedence.
- `nutrition_conflict_resolved` — Quesadilla › Addons › Queso Blanco: sodium differs across sources — 500 (chipotle:live-nutrition) vs 490 (chipotle:nutrition-pdf); chipotle:live-nutrition was used by declared precedence.
- `nutrition_conflict_resolved` — Rice › White Rice: satFat differs across sources — 0.5 (chipotle:live-nutrition) vs 1 (chipotle:nutrition-pdf); chipotle:live-nutrition was used by declared precedence.
- `nutrition_conflict_resolved` — Rice › Brown Rice: satFat differs across sources — 1 (chipotle:live-nutrition) vs 0 (chipotle:nutrition-pdf); chipotle:live-nutrition was used by declared precedence.
- `nutrition_conflict_resolved` — Toppings › White Rice: satFat differs across sources — 0.5 (chipotle:live-nutrition) vs 1 (chipotle:nutrition-pdf); chipotle:live-nutrition was used by declared precedence.
- `nutrition_conflict_resolved` — Toppings › Brown Rice: satFat differs across sources — 1 (chipotle:live-nutrition) vs 0 (chipotle:nutrition-pdf); chipotle:live-nutrition was used by declared precedence.
- `nutrition_conflict_resolved` — Dips › White Rice: satFat differs across sources — 0.5 (chipotle:live-nutrition) vs 1 (chipotle:nutrition-pdf); chipotle:live-nutrition was used by declared precedence.
- `nutrition_conflict_resolved` — Dips › Brown Rice: satFat differs across sources — 1 (chipotle:live-nutrition) vs 0 (chipotle:nutrition-pdf); chipotle:live-nutrition was used by declared precedence.
