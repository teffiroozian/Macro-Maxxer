# Starbucks default-recipe component review

Scope: components marked `appearsInDefaultRecipe: true` in the current generated Starbucks component inventory. Classifications are review triage only; no nutrition values were estimated, and no old research outputs were used.

Total reviewed: **79**

## nutrition-relevant (29)

| Name | Component ID | Category | Classification | Reason |
|---|---:|---|---|---|
| 2% Milk | 63 | milk | nutrition-relevant | Milk is a direct recipe ingredient with calories and macronutrients. |
| Banana Syrup | 28582 | syrup | nutrition-relevant | Syrup is a pumped sweetener that can contribute carbohydrates. |
| Blonde Espresso | 2122222 | espresso | nutrition-relevant | Espresso contributes a small but nonzero amount and varies by shot count. |
| Brown Sugar Syrup | 2123422 | syrup | nutrition-relevant | Syrup is a pumped sweetener that can contribute carbohydrates. |
| Caramel Drizzle | 126 | drizzle | nutrition-relevant | Sweet drizzle is a direct recipe ingredient that can contribute macros. |
| Caramel Syrup | 91 | syrup | nutrition-relevant | Syrup is a pumped sweetener that can contribute carbohydrates. |
| Cinnamon Dolce Syrup | 93 | syrup | nutrition-relevant | Syrup is a pumped sweetener that can contribute carbohydrates. |
| Classic Syrup | 94 | sweetener | nutrition-relevant | Liquid sweetener is a pumped ingredient with carbohydrate contribution. |
| Coconutmilk | 1306 | milk | nutrition-relevant | Plant milk is a direct recipe ingredient with calories and macronutrients. |
| Dark Caramel Sauce | 2122694 | sauce | nutrition-relevant | Sauce is a pumped recipe ingredient that can contribute substantial macros. |
| Hazelnut Syrup | 96 | syrup | nutrition-relevant | Syrup is a pumped sweetener that can contribute carbohydrates. |
| Honey Blend Syrup | 2123154 | sweetener | nutrition-relevant | Honey-based sweetener is a pumped ingredient with carbohydrate contribution. |
| Horchata Syrup | 27524 | syrup | nutrition-relevant | Syrup is a pumped sweetener that can contribute carbohydrates. |
| Lemonade | 2122378 | lemonade | nutrition-relevant | Lemonade is a direct liquid ingredient with carbohydrate contribution. |
| Mango Syrup | 2121333 | syrup | nutrition-relevant | Syrup is a pumped sweetener that can contribute carbohydrates. |
| Mocha Drizzle | 127 | drizzle | nutrition-relevant | Chocolate drizzle is a direct recipe ingredient that can contribute macros. |
| Mocha Sauce | 650 | sauce | nutrition-relevant | Sauce is a pumped recipe ingredient that can contribute substantial macros. |
| Oatmilk | 2122556 | milk | nutrition-relevant | Plant milk is a direct recipe ingredient with calories and macronutrients. |
| Peach Juice Blend | 2123075 | juice | nutrition-relevant | Juice blend is a direct liquid ingredient with carbohydrate contribution. |
| Pecan Syrup | 2123907 | syrup | nutrition-relevant | Syrup is a pumped sweetener that can contribute carbohydrates. |
| Pistachio Sauce | 2123373 | sauce | nutrition-relevant | Sauce is a pumped recipe ingredient that can contribute substantial macros. |
| Pumpkin Sauce | 101 | sauce | nutrition-relevant | Sauce is a pumped recipe ingredient that can contribute substantial macros. |
| Shots | 82 | espresso | nutrition-relevant | Espresso shots contribute a small but nonzero amount and vary by count. |
| Signature Espresso | 2123273 | espresso | nutrition-relevant | Espresso contributes a small but nonzero amount and varies by shot count. |
| Toasted Coconut Syrup | 2122191 | syrup | nutrition-relevant | Syrup is a pumped sweetener that can contribute carbohydrates. |
| Vanilla Syrup | 111 | syrup | nutrition-relevant | Syrup is a pumped sweetener that can contribute carbohydrates. |
| Whipped Cream | 125 | topping | nutrition-relevant | Whipped cream is a direct topping with calories and macronutrients. |
| White Chocolate Mocha Sauce | 112 | sauce | nutrition-relevant | Sauce is a pumped recipe ingredient that can contribute substantial macros. |
| Whole Milk | 67 | milk | nutrition-relevant | Milk is a direct recipe ingredient with calories and macronutrients. |

## non-nutrition / preparation-only (7)

| Name | Component ID | Category | Classification | Reason |
|---|---:|---|---|---|
| Foam | 73 | milk preparation | non-nutrition / preparation-only | Controls milk foaming rather than identifying an additional ingredient. |
| Ice | 41 | ice | non-nutrition / preparation-only | Controls ice preparation and does not add a nutritive ingredient. |
| Light Caffeine | 27773 | caffeine option | non-nutrition / preparation-only | Changes caffeine preparation rather than adding a macro-bearing ingredient. |
| Not Warmed | 1193 | preparation | non-nutrition / preparation-only | Controls food warming only. |
| Ristretto | 2123218 | espresso preparation | non-nutrition / preparation-only | Specifies espresso extraction style rather than an added ingredient. |
| Steamed Hot | 71 | milk preparation | non-nutrition / preparation-only | Controls milk temperature rather than identifying an additional ingredient. |
| Warmed | 1179 | preparation | non-nutrition / preparation-only | Controls food warming only. |

## obvious zero-calorie / negligible (3)

| Name | Component ID | Category | Classification | Reason |
|---|---:|---|---|---|
| Cinnamon Powder | 130 | powder | obvious zero-calorie / negligible | Cinnamon dusting is ordinarily nutritionally negligible at recipe scale. |
| Tea Bag(s) | 114 | tea | obvious zero-calorie / negligible | Brewed tea leaves primarily flavor water and contribute negligible macros. |
| Water | 42 | water | obvious zero-calorie / negligible | Water contributes no calories or macronutrients. |

## needs reverse-engineering (40)

| Name | Component ID | Category | Classification | Reason |
|---|---:|---|---|---|
| Banana Protein Cold Foam | 28234 | foam | needs reverse-engineering | Composite flavored protein foam with no component nutrition in the inventory. |
| Brown Sugar Cream Cold Foam | 2124008 | foam | needs reverse-engineering | Composite flavored cold foam with no component nutrition in the inventory. |
| Caramel Crunch Topping | 2123051 | topping | needs reverse-engineering | Proprietary composite topping; its serving contribution is not in the inventory. |
| Chai | 92 | tea base | needs reverse-engineering | Proprietary chai concentrate; contribution per pump is not in the inventory. |
| Chocolate Cream Cold Foam | 2123643 | foam | needs reverse-engineering | Composite flavored cold foam with no component nutrition in the inventory. |
| Cinnamon Dolce Sprinkles | 137 | topping | needs reverse-engineering | Proprietary sweet topping; its serving contribution is not in the inventory. |
| Cookie Crumble Topping | 207 | topping | needs reverse-engineering | Proprietary composite topping; its serving contribution is not in the inventory. |
| Dragonfruit Fruit Inclusions | 2122719 | inclusion | needs reverse-engineering | Proprietary fruit inclusion; contribution per scoop is not in the inventory. |
| Frappuccino® Chips | 46 | inclusion | needs reverse-engineering | Proprietary blended inclusion; contribution per scoop is not in the inventory. |
| Frappuccino® Roast | 184 | coffee base | needs reverse-engineering | Proprietary concentrated coffee base with pump-based dosing. |
| Lavender Cream Cold Foam | 2123814 | foam | needs reverse-engineering | Composite flavored cold foam with no component nutrition in the inventory. |
| Lavender Powder | 2123815 | powder | needs reverse-engineering | Proprietary flavored powder; contribution per scoop is not in the inventory. |
| Mango Cream Cold Foam | 37086 | foam | needs reverse-engineering | Composite flavored cold foam with no component nutrition in the inventory. |
| Mango Dragonfruit Refresher Base | 2123308 | base | needs reverse-engineering | Proprietary Refresher base; its per-serving contribution is not in the inventory. |
| Mango-Pineapple Pearls | 40664 | inclusion | needs reverse-engineering | Proprietary flavored pearls; contribution per scoop is not in the inventory. |
| Matcha Powder | 47 | powder | needs reverse-engineering | Proprietary matcha blend; contribution per scoop is not in the inventory. |
| Nondairy Chocolate Cream Cold Foam | 2123868 | foam | needs reverse-engineering | Composite nondairy flavored foam with no component nutrition in the inventory. |
| Nondairy Salted Caramel Cream Cold Foam | 2123865 | foam | needs reverse-engineering | Composite nondairy flavored foam with no component nutrition in the inventory. |
| Nondairy Vanilla Sweet Cream Cold Foam | 2123870 | foam | needs reverse-engineering | Composite nondairy sweet-cream foam with no component nutrition in the inventory. |
| Orange Cream Cold Foam | 40729 | foam | needs reverse-engineering | Composite flavored cold foam with no component nutrition in the inventory. |
| Orange Vanilla Powder | 40666 | powder | needs reverse-engineering | Proprietary flavored powder; contribution per scoop is not in the inventory. |
| Pecan Crunch Topping | 2123909 | topping | needs reverse-engineering | Proprietary composite topping; its serving contribution is not in the inventory. |
| Pistachio Cream Cold Foam | 2123703 | foam | needs reverse-engineering | Composite flavored cold foam with no component nutrition in the inventory. |
| Pumpkin Cream Cold Foam | 2123369 | foam | needs reverse-engineering | Composite flavored cold foam with no component nutrition in the inventory. |
| Pumpkin Spice Topping | 135 | topping | needs reverse-engineering | Proprietary sweet topping; its serving contribution is not in the inventory. |
| Raspberry Cream Cold Foam | 27516 | foam | needs reverse-engineering | Composite flavored cold foam with no component nutrition in the inventory. |
| Salted Brown-Buttery Topping | 2123372 | topping | needs reverse-engineering | Proprietary composite topping; its serving contribution is not in the inventory. |
| Salted Caramel Cream Cold Foam | 2123557 | foam | needs reverse-engineering | Composite flavored cold foam with no component nutrition in the inventory. |
| Splash of Nondairy Vanilla Sweet Cream | 2123906 | creamer | needs reverse-engineering | Composite nondairy sweet-cream splash with unspecified serving amount. |
| Splash of Vanilla Sweet Cream | 2121866 | creamer | needs reverse-engineering | Composite sweet-cream splash with unspecified serving amount. |
| Strawberry Açaí Refresher Base | 2123309 | base | needs reverse-engineering | Proprietary Refresher base; its per-serving contribution is not in the inventory. |
| Strawberry Fruit Inclusions | 2121344 | inclusion | needs reverse-engineering | Proprietary fruit inclusion; contribution per scoop is not in the inventory. |
| Strawberry Puree | 2121850 | inclusion | needs reverse-engineering | Proprietary fruit puree; contribution per scoop is not in the inventory. |
| Sugar-Free Caramel Syrup | 1211 | syrup | needs reverse-engineering | Sugar-free labeling alone is insufficient to assume zero contribution. |
| Sugar-Free Vanilla Syrup | 109 | syrup | needs reverse-engineering | Sugar-free labeling alone is insufficient to assume zero contribution. |
| Toasted Coconut Cream Cold Foam | 34849 | foam | needs reverse-engineering | Composite flavored cold foam with no component nutrition in the inventory. |
| Toasted Coconut Flakes | 191 | topping | needs reverse-engineering | Packaged topping amount and formulation require verification. |
| Vanilla Bean Powder | 48 | powder | needs reverse-engineering | Proprietary flavored powder; contribution per scoop is not in the inventory. |
| Vanilla Protein Cold Foam | 28493 | foam | needs reverse-engineering | Composite flavored protein foam with no component nutrition in the inventory. |
| Vanilla Sweet Cream Cold Foam | 2123166 | foam | needs reverse-engineering | Composite sweet-cream foam with no component nutrition in the inventory. |

