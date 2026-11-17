# MOD Pizza — import review (draft)

Generated 2026-11-17T19:29:37.883Z. Status: **draft**. Not published; the live restaurant index is untouched.

- Structurally valid: **yes**
- Ready for approval: **no**
- Menu models: standard, build-your-own
- Items: 50 (31 standard, 19 build-your-own)
- Ingredients: 155
- Nutrition records: 13651, of which 0 have all four core macros
- Records missing core macros: 13651
- Unresolved nutrition conflicts: 21
- Publishable to the runtime schema today: 0 items, 0 ingredients (351 excluded)
- Ids: 0 in the registry, 50 new, 0 conflicts

## Sources

- `mod:ordering:4080` — https://orders.modpizza.com/store/4080 (ordering_system; retrieved 2026-10-20)
- `mod:ordering:4168` — https://orders.modpizza.com/store/4168 (ordering_system; retrieved 2026-10-20)
- `mod:nutrition-html` — https://modpizza.com/nutrition/ (official; retrieved 2026-10-20; source updated 2026-08-25T23:19:03Z)

## Blockers (24)

- `macros_unpublished` — No inspected official MOD Pizza source publishes protein, carbohydrates or fat. Only calories are imported; the other core macros are left empty and MOD Pizza cannot be published until an official macro specification is obtained.
- `nutrition_conflict` — CinnaMOD: calories differs across sources — 1190 (mod:ordering:4080) vs 1190 (mod:ordering:4168) vs 1182 (mod:nutrition-html). No value was chosen.
- `nutrition_conflict` — Sauces › Frank’s RedHot Buffalo Sauce: calories differs across sources — 120 (mod:ordering:4080) vs 120 (mod:ordering:4168) vs 0 (mod:nutrition-html). No value was chosen.
- `nutrition_conflict` — Sauces › Spicy Tomato Sauce: calories differs across sources — 15 (mod:ordering:4080) vs 15 (mod:ordering:4168) vs 12 (mod:nutrition-html). No value was chosen.
- `nutrition_conflict` — Cheeses › Asiago: calories differs across sources — 130 (mod:ordering:4080) vs 130 (mod:ordering:4168) vs 110 (mod:nutrition-html). No value was chosen.
- `nutrition_conflict` — Cheeses › Cheddar: calories differs across sources — 115 (mod:ordering:4080) vs 115 (mod:ordering:4168) vs 110 (mod:nutrition-html). No value was chosen.
- `nutrition_conflict` — Cheeses › Feta: calories differs across sources — 90 (mod:ordering:4080) vs 90 (mod:ordering:4168) vs 70 (mod:nutrition-html). No value was chosen.
- `nutrition_conflict` — Cheeses › Gorgonzola: calories differs across sources — 110 (mod:ordering:4080) vs 110 (mod:ordering:4168) vs 100 (mod:nutrition-html). No value was chosen.
- `nutrition_conflict` — Cheeses › Mozzarella: calories differs across sources — 80 (mod:ordering:4080) vs 80 (mod:ordering:4168) vs 90 (mod:nutrition-html). No value was chosen.
- `nutrition_conflict` — Cheeses › Parmesan: calories differs across sources — 120 (mod:ordering:4080) vs 120 (mod:ordering:4168) vs 130 (mod:nutrition-html). No value was chosen.
- `nutrition_conflict` — Cheeses › Plant-Based Cheese: calories differs across sources — 113 (mod:ordering:4080) vs 113 (mod:ordering:4168) vs 80 (mod:nutrition-html). No value was chosen.
- `nutrition_conflict` — Cheeses › Ricotta: calories differs across sources — 85 (mod:ordering:4080) vs 85 (mod:ordering:4168) vs 100 (mod:nutrition-html). No value was chosen.
- `nutrition_conflict` — Meats › Canadian Bacon: calories differs across sources — 65 (mod:ordering:4080) vs 65 (mod:ordering:4168) vs 50 (mod:nutrition-html). No value was chosen.
- `nutrition_conflict` — Meats › Grilled Chicken: calories differs across sources — 75 (mod:ordering:4080) vs 75 (mod:ordering:4168) vs 70 (mod:nutrition-html). No value was chosen.
- `nutrition_conflict` — Meats › Plant-Based Italian Sausage: calories differs across sources — 115 (mod:ordering:4080) vs 90 (mod:nutrition-html). No value was chosen.
- `nutrition_conflict` — Meats › Salami: calories differs across sources — 100 (mod:ordering:4080) vs 100 (mod:ordering:4168) vs 90 (mod:nutrition-html). No value was chosen.
- `nutrition_conflict` — Meats › Spicy Chicken Sausage: calories differs across sources — 105 (mod:ordering:4080) vs 105 (mod:ordering:4168) vs 90 (mod:nutrition-html). No value was chosen.
- `nutrition_conflict` — Veggies, Herbs & Good Stuff › Green Bell Peppers: calories differs across sources — 10 (mod:ordering:4080) vs 5 (mod:nutrition-html). No value was chosen.
- `nutrition_conflict` — Veggies, Herbs & Good Stuff › Mushrooms: calories differs across sources — 5 (mod:ordering:4080) vs 5 (mod:ordering:4168) vs 0 (mod:nutrition-html). No value was chosen.
- `nutrition_conflict` — Veggies, Herbs & Good Stuff › Pineapple: calories differs across sources — 45 (mod:ordering:4080) vs 45 (mod:ordering:4168) vs 40 (mod:nutrition-html). No value was chosen.
- `nutrition_conflict` — Finishing Sauces › Ranch: calories differs across sources — 66 (mod:ordering:4080) vs 66 (mod:ordering:4168) vs 50 (mod:nutrition-html). No value was chosen.
- `nutrition_conflict` — Finishing Sauces › Sriracha Ranch: calories differs across sources — 40 (mod:ordering:4080) vs 40 (mod:ordering:4168) vs 35 (mod:nutrition-html). No value was chosen.
- `core_nutrition_missing` — 12273 record(s) have no published or agreed value for: protein, carbs, totalFat. The values were left empty.
- `core_nutrition_missing` — 1378 record(s) have no published or agreed value for: calories, protein, carbs, totalFat. The values were left empty.

## Warnings (13)

- `topping_calories_not_additive_verified` — The ordering site states topping calories apply to a one-topping pizza and may be lower on multi-topping pizzas. Summed builder totals are unverified.
- `salad_size_labels_unreconciled` — The national menu labels salad sizes MINI / MOD / MEGA while ordering uses Small / Regular / Large. National salad and signature-pizza calorie totals name no size, so they are not linked to any variant.
- `recipe_conflict` — Italian Chop: the national menu description omits chickpeas; the Hamburg ordering description includes them.
- `store_coverage_partial` — Catalog comes from two sampled stores (4080, 4168). It is not a national census; catering was not inspected.
- `reference_match_ambiguous` — Nutrition row "BBQ sauce" matches 2 records by name; none was linked. Add a crosswalk entry.
- `reference_match_ambiguous` — Nutrition row "olive oil" matches 2 records by name; none was linked. Add a crosswalk entry.
- `reference_match_ambiguous` — Nutrition row "pesto" matches 2 records by name; none was linked. Add a crosswalk entry.
- `reference_match_ambiguous` — Nutrition row "arugula" matches 2 records by name; none was linked. Add a crosswalk entry.
- `reference_match_ambiguous` — Nutrition row "basil" matches 2 records by name; none was linked. Add a crosswalk entry.
- `reference_match_ambiguous` — Nutrition row "cilantro" matches 2 records by name; none was linked. Add a crosswalk entry.
- `reference_match_ambiguous` — Nutrition row "crushed red pepper flakes" matches 2 records by name; none was linked. Add a crosswalk entry.
- `reference_match_ambiguous` — Nutrition row "oregano" matches 2 records by name; none was linked. Add a crosswalk entry.
- `reference_match_ambiguous` — Nutrition row "spinach" matches 2 records by name; none was linked. Add a crosswalk entry.

## Infos (37)

- `allergen_declarations_not_imported` — Component ingredient and allergen declarations (modpizza.com/allergen) are not imported in this version.
- `duplicate_item_merged` — "The MOD" appeared more than once in Pizza; the records were merged into mod:item:pizza:the-mod.
- `duplicate_item_merged` — "Spicy Thai" appeared more than once in Pizza; the records were merged into mod:item:pizza:spicy-thai.
- `duplicate_item_merged` — "Maddy's Favorite" appeared more than once in Pizza; the records were merged into mod:item:pizza:maddy-s-favorite.
- `duplicate_item_merged` — "The Honor Roll" appeared more than once in Pizza; the records were merged into mod:item:pizza:the-honor-roll.
- `duplicate_item_merged` — "One Topping" appeared more than once in Pizza; the records were merged into mod:item:pizza:one-topping.
- `duplicate_item_merged` — "OG Pepperoni Pizza" appeared more than once in Pizza; the records were merged into mod:item:pizza:og-pepperoni-pizza.
- `duplicate_item_merged` — "Carnivore" appeared more than once in Pizza; the records were merged into mod:item:pizza:carnivore.
- `duplicate_item_merged` — "Aloha" appeared more than once in Pizza; the records were merged into mod:item:pizza:aloha.
- `duplicate_item_merged` — "Firebird" appeared more than once in Pizza; the records were merged into mod:item:pizza:firebird.
- `duplicate_item_merged` — "MOD-gherita" appeared more than once in Pizza; the records were merged into mod:item:pizza:mod-gherita.
- `duplicate_item_merged` — "Perfect Pesto" appeared more than once in Pizza; the records were merged into mod:item:pizza:perfect-pesto.
- `duplicate_item_merged` — "Smoke Show" appeared more than once in Pizza; the records were merged into mod:item:pizza:smoke-show.
- `duplicate_item_merged` — "The MOD Salad" appeared more than once in Salads; the records were merged into mod:item:salads:the-mod-salad.
- `duplicate_item_merged` — "Caesar" appeared more than once in Salads; the records were merged into mod:item:salads:caesar.
- `duplicate_item_merged` — "Cheesy Garlic Bread" appeared more than once in Sides; the records were merged into mod:item:sides:cheesy-garlic-bread.
- `duplicate_item_merged` — "No Name Cake" appeared more than once in Desserts; the records were merged into mod:item:desserts:no-name-cake.
- `duplicate_item_merged` — "CinnaMOD" appeared more than once in Desserts; the records were merged into mod:item:desserts:cinnamod.
- `duplicate_item_merged` — "Kids Meal" appeared more than once in Kids Meal; the records were merged into mod:item:kids-meal:kids-meal.
- `duplicate_item_merged` — "Coca-Cola Zero Sugar (20 oz bottle)" appeared more than once in Beverages; the records were merged into mod:item:beverages:coca-cola-zero-sugar-20-oz-bottle.
- `duplicate_item_merged` — "Coke Classic (20 oz bottle)" appeared more than once in Beverages; the records were merged into mod:item:beverages:coke-classic-20-oz-bottle.
- `duplicate_item_merged` — "Diet Coke (20 oz bottle)" appeared more than once in Beverages; the records were merged into mod:item:beverages:diet-coke-20-oz-bottle.
- `duplicate_item_merged` — "Sprite (20 oz bottle)" appeared more than once in Beverages; the records were merged into mod:item:beverages:sprite-20-oz-bottle.
- `duplicate_item_merged` — "Barq's Root Beer (20 oz bottle)" appeared more than once in Beverages; the records were merged into mod:item:beverages:barq-s-root-beer-20-oz-bottle.
- `duplicate_item_merged` — "Boylans Black Cherry (12 oz bottle)" appeared more than once in Beverages; the records were merged into mod:item:beverages:boylans-black-cherry-12-oz-bottle.
- `duplicate_item_merged` — "San Pellegrino (16.9 oz bottle)" appeared more than once in Beverages; the records were merged into mod:item:beverages:san-pellegrino-16-9-oz-bottle.
- `duplicate_item_merged` — "San Pellegrino Blood Orange (11.15 oz can)" appeared more than once in Beverages; the records were merged into mod:item:beverages:san-pellegrino-blood-orange-11-15-oz-can.
- `duplicate_item_merged` — "San Pellegrino Limonata (11.15 oz can)" appeared more than once in Beverages; the records were merged into mod:item:beverages:san-pellegrino-limonata-11-15-oz-can.
- `duplicate_item_merged` — "Apple Juice (6 oz carton)" appeared more than once in Beverages; the records were merged into mod:item:beverages:apple-juice-6-oz-carton.
- `duplicate_item_merged` — "Milk (8 oz carton)" appeared more than once in Beverages; the records were merged into mod:item:beverages:milk-8-oz-carton.
- `duplicate_item_merged` — "Chocolate Milk (8 oz carton)" appeared more than once in Beverages; the records were merged into mod:item:beverages:chocolate-milk-8-oz-carton.
- `duplicate_item_merged` — "Water (16.9 oz bottle)" appeared more than once in Beverages; the records were merged into mod:item:beverages:water-16-9-oz-bottle.
- `duplicate_item_merged` — "Crushed Red Pepper Flake Packet" appeared more than once in Extras; the records were merged into mod:item:extras:crushed-red-pepper-flake-packet.
- `duplicate_item_merged` — "Parmesan Cheese Packet" appeared more than once in Extras; the records were merged into mod:item:extras:parmesan-cheese-packet.
- `duplicate_item_merged` — "Salt Packet" appeared more than once in Extras; the records were merged into mod:item:extras:salt-packet.
- `duplicate_item_merged` — "Pepper Packet" appeared more than once in Extras; the records were merged into mod:item:extras:pepper-packet.
- `duplicate_item_merged` — "Wrapped Fork & Knife Pack" appeared more than once in Extras; the records were merged into mod:item:extras:wrapped-fork-knife-pack.

## Official nutrition rows not linked to a catalog record (66)

- `mod:reference:pizza:veg-out`
- `mod:reference:pizza:smoke-show`
- `mod:reference:pizza:perfect-pesto`
- `mod:reference:pizza:mod-gherita`
- `mod:reference:pizza:loaded-legend`
- `mod:reference:pizza:firebird`
- `mod:reference:pizza:aloha`
- `mod:reference:pizza:carnivore`
- `mod:reference:pizza:og-pepperoni`
- `mod:reference:pizza:maddy-s-favorite`
- `mod:reference:sauce:bbq-sauce`
- `mod:reference:sauce:creamy-alfredo-sauce`
- `mod:reference:sauce:olive-oil`
- `mod:reference:sauce:pesto`
- `mod:reference:sauce:butter-flavored-spread`
- `mod:reference:meat:egg-scrambled-limited-locations`
- `mod:reference:veggies-good-stuff:arugula`
- `mod:reference:veggies-good-stuff:banana-peppers-limited-locations`
- `mod:reference:veggies-good-stuff:basil`
- `mod:reference:veggies-good-stuff:cilantro`
- `mod:reference:veggies-good-stuff:chopped-garlic`
- `mod:reference:veggies-good-stuff:crushed-red-pepper-flakes`
- `mod:reference:veggies-good-stuff:cucumbers`
- `mod:reference:veggies-good-stuff:oregano`
- `mod:reference:veggies-good-stuff:red-onion`
- `mod:reference:veggies-good-stuff:roasted-garlic`
- `mod:reference:veggies-good-stuff:rosemary-fresh-chopped`
- `mod:reference:veggies-good-stuff:sea-salt`
- `mod:reference:veggies-good-stuff:pepper`
- `mod:reference:veggies-good-stuff:serrano-peppers-limited-locations`
- `mod:reference:veggies-good-stuff:spinach`
- `mod:reference:veggies-good-stuff:tomatoes`
- `mod:reference:salad:mediterranean`
- `mod:reference:salad:italian-chop`
- `mod:reference:salad:garden`
- `mod:reference:salad:caesar`
- `mod:reference:salad-dressing:oil-and-vinegar`
- `mod:reference:beverage:caramelized-pear-ice-tea-16-fl-oz`
- `mod:reference:beverage:caramelized-pear-ice-tea-24-fl-oz`
- `mod:reference:beverage:vintage-lemonade-16-fl-oz`
- `mod:reference:beverage:vintage-lemonade-24-fl-oz`
- `mod:reference:beverage:marionberry-lemonade-16-fl-oz`
- `mod:reference:beverage:marionberry-lemonade-24-fl-oz`
- `mod:reference:beverage:coca-cola-16-fl-oz`
- `mod:reference:beverage:coca-cola-24-fl-oz`
- `mod:reference:beverage:diet-coke-16-fl-oz`
- `mod:reference:beverage:diet-coke-24-fl-oz`
- `mod:reference:beverage:sprite-16-fl-oz`
- `mod:reference:beverage:sprite-24-fl-oz`
- `mod:reference:beverage:barq-s-root-beer-16-fl-oz`
- `mod:reference:beverage:barq-s-root-beer-24-fl-oz`
- `mod:reference:beverage:fanta-orange-16-fl-oz`
- `mod:reference:beverage:fanta-orange-24-fl-oz`
- `mod:reference:beverage:powerade-mountain-blast-16-fl-oz`
- `mod:reference:beverage:powerade-mountain-blast-24-fl-oz`
- `mod:reference:beverage:coke-zero-16-fl-oz`
- `mod:reference:beverage:coke-zero-24-fl-oz`
- `mod:reference:beverage:dr-pepper-16-fl-oz`
- `mod:reference:beverage:dr-pepper-24-fl-oz`
- `mod:reference:desserts:strawberry-lemonade-no-name-cake-limited-edition`
- `mod:reference:desserts:cake-pop-pink-vanilla`
- `mod:reference:desserts:cake-pop-pumpkin-spice`
- `mod:reference:desserts:sea-salt-caramel-sauce`
- `mod:reference:desserts:cinnamon`
- `mod:reference:desserts:vanilla-icing`
- `mod:reference:desserts:sugar`
