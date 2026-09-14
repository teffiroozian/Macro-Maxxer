# Permanent US Starbucks drink samples

Captured 2026-09-09. All 12 requested product/form samples and all 43 returned sizes are preserved. One calculation was tested per drink on its default Grande size. No seasonal products, food, pricing, or importer work was investigated. The requested Coffee-or-Mocha Frappuccino sample is Coffee Frappuccino. Starbucks currently names the chai products “Chai Latte” and “Iced Chai Latte”.

## Sources and test method

Product source: `GET https://www.starbucks.com/apiproxy/v1/ordering/{product}/{form}`. Calculator: `POST` to the same URL plus `/nutrition/calculate`. Each exact URL, UTC retrieval time, HTTP status, hash and supplied headers is recorded in the corresponding source sidecar. No store parameter, cookies or credentials were used. These are US national responses, not proof of local availability.

Each request uses a base size SKU and the Vanilla Syrup add SKU from that product’s own response. It adds two pumps when vanilla is not included, or increases included vanilla by one pump. `replacedSku:null` follows the previously inspected client builder for the same modifier SKU. Only this one configuration per product was tested; a 500 is not proof that every configuration is unsupported.

| Product / form | Sizes | Options¹ | Calculator |
|---|---|---:|---|
| Caffè Latte (`407-hot`) | Short, Tall, Grande, Venti | 117 | 200: calories=230, fat=7, sugars=26, protein=12 |
| Caffè Mocha (`408-hot`) | Short, Tall, Grande, Venti | 120 | 200: calories=400, fat=15, sugars=44, protein=13 |
| Caramel Macchiato (`413-hot`) | Short, Tall, Grande, Venti | 120 | 200: calories=280, fat=7, sugars=39, protein=10 |
| Vanilla Sweet Cream Cold Brew (`2121859-iced`) | Tall, Grande, Venti, Trenta | 111 | 500 / 006-002-002 |
| Cold Brew (`2121255-iced`) | Tall, Grande, Venti, Trenta | 111 | 500 / 006-002-002 |
| Iced Caffè Latte (`407-iced`) | Tall, Grande, Venti | 116 | 500 / 006-002-002 |
| Iced Caramel Macchiato (`413-iced`) | Tall, Grande, Venti | 117 | 500 / 006-002-002 |
| Coffee Frappuccino® Blended Beverage (`483-iced`) | Tall, Grande, Venti | 114 | 500 / 006-002-002 |
| Chai Latte (`466-hot`) | Short, Tall, Grande, Venti | 118 | 500 / 006-002-017 |
| Iced Chai Latte (`466-iced`) | Tall, Grande, Venti | 116 | 500 / 006-002-002 |
| Matcha Latte (`468-hot`) | Short, Tall, Grande, Venti | 118 | 500 / 006-002-002 |
| Iced Matcha Latte (`468-iced`) | Tall, Grande, Venti | 116 | 500 / 006-002-002 |

¹ Option entries across recursive groups, not unique SKUs. Returned option catalogs can include seasonal/legacy options even on permanent drinks; these were preserved as part of the original response, not separately investigated.

## Recipes, groups and size differences

`productOptions` defines a shared product/form-level recursive catalog; it is not repeated per size. Each size has its own base `sku`, `recipe.default`, `defaultOptionValues`, and standard nutrition. The following lists all included recipe entries: numeric values are quantities only for `qty`; bracketed values are selected categorical size codes. A zero stored quantity for `one` or `modifier` does not mean the ingredient is absent. Full option names, category IDs, option IDs, choice SKUs and per-size defaults are in [inspection.json](interactive/permanent-drinks/inspection.json) and the unchanged product responses.

### Caffè Latte — 407-hot

Groups: Milk / Milk Foam (1); Milk / Milk Options (12); Milk / Milk Temperature (3); Flavors / Sauces (5); Flavors / Powders (3); Flavors / Syrups (14); Toppings / Powders (1); Toppings / Topping Options (7); Toppings / Drizzle (2); Toppings / Whipped Cream (1); Cold Foams / Protein Cold Foam (15g)* (16); Cold Foams / Cold Foam (16); Cold Foams / Nondairy Cold Foam (14); Tea / Chai Teas (1); Sweeteners / Liquid Sweeteners (2); Sweeteners / Sweetener Packets (5); Cup Options / Other (1); Cup Options / Cup Sizes (4); Espresso & Shot Options / Espresso Roast Options (6); Espresso & Shot Options / Ristretto or Long Shot (2); Espresso & Shot Options / Espresso Shots (1).

- **Short** (`Short`, SKU `40`): 2% Milk [add]; Shots ×1; Foam [regular]; Steamed Hot [add]; Signature Espresso [add].
- **Tall** (`Tall`, SKU `41`): 2% Milk [add]; Shots ×1; Foam [regular]; Steamed Hot [add]; Signature Espresso [add].
- **Grande** (`Grande`, SKU `42` — default): 2% Milk [add]; Shots ×2; Foam [regular]; Steamed Hot [add]; Signature Espresso [add].
- **Venti** (`Venti`, SKU `121966`): 2% Milk [add]; Shots ×2; Foam [regular]; Steamed Hot [add]; Signature Espresso [add].

Optional-add defaults vary by size for 39 option IDs. Vanilla Syrup initial add quantities by size: Short=2, Tall=3, Grande=4, Venti=5.

### Caffè Mocha — 408-hot

Groups: Milk / Milk Foam (1); Milk / Milk Options (12); Milk / Milk Temperature (3); Flavors / Sauces (5); Flavors / Powders (3); Flavors / Syrups (14); Toppings / Powders (1); Toppings / Topping Options (7); Toppings / Drizzle (2); Toppings / Whipped Cream (1); Cold Foams / Protein Cold Foam (15g)* (16); Cold Foams / Cold Foam (16); Cold Foams / Nondairy Cold Foam (14); Espresso & Shot Options / Espresso Roast Options (6); Espresso & Shot Options / Ristretto or Long Shot (2); Espresso & Shot Options / Shot Prep (1); Espresso & Shot Options / Espresso Shots (1); Add-ins / Line the Cup (2); Tea / Chai Teas (1); Sweeteners / Liquid Sweeteners (2); Sweeteners / Sweetener Packets (5); Cup Options / Other (1); Cup Options / Cup Sizes (4).

- **Short** (`Short`, SKU `45`): 2% Milk [add]; Whipped Cream [regular]; Shots ×1; Mocha Sauce ×2; Foam [regular]; Steamed Hot [add]; Signature Espresso [add].
- **Tall** (`Tall`, SKU `46`): 2% Milk [add]; Whipped Cream [regular]; Shots ×1; Mocha Sauce ×3; Foam [regular]; Steamed Hot [add]; Signature Espresso [add].
- **Grande** (`Grande`, SKU `47` — default): 2% Milk [add]; Whipped Cream [regular]; Shots ×2; Mocha Sauce ×4; Foam [regular]; Steamed Hot [add]; Signature Espresso [add].
- **Venti** (`Venti`, SKU `121967`): 2% Milk [add]; Whipped Cream [regular]; Shots ×2; Mocha Sauce ×5; Foam [regular]; Steamed Hot [add]; Signature Espresso [add].

Optional-add defaults vary by size for 39 option IDs. Vanilla Syrup initial add quantities by size: Short=2, Tall=3, Grande=4, Venti=5.

### Caramel Macchiato — 413-hot

Groups: Milk / Milk Foam (1); Milk / Milk Options (12); Milk / Milk Temperature (3); Flavors / Sauces (5); Flavors / Powders (3); Flavors / Syrups (14); Toppings / Powders (1); Toppings / Topping Options (7); Toppings / Drizzle (2); Toppings / Whipped Cream (1); Cold Foams / Protein Cold Foam (15g)* (16); Cold Foams / Cold Foam (16); Cold Foams / Nondairy Cold Foam (14); Espresso & Shot Options / Espresso Roast Options (6); Espresso & Shot Options / Ristretto or Long Shot (2); Espresso & Shot Options / Shot Prep (1); Espresso & Shot Options / Espresso Shots (1); Add-ins / Line the Cup (2); Tea / Chai Teas (1); Sweeteners / Liquid Sweeteners (2); Sweeteners / Sweetener Packets (5); Cup Options / Other (1); Cup Options / Cup Sizes (4).

- **Short** (`Short`, SKU `126196`): 2% Milk [add]; Shots ×1; Vanilla Syrup ×1; Caramel Drizzle [regular]; Foam [regular]; Steamed Hot [add]; Signature Espresso [add].
- **Tall** (`Tall`, SKU `126197`): 2% Milk [add]; Shots ×1; Vanilla Syrup ×2; Caramel Drizzle [regular]; Foam [regular]; Steamed Hot [add]; Signature Espresso [add].
- **Grande** (`Grande`, SKU `126198` — default): 2% Milk [add]; Shots ×2; Vanilla Syrup ×3; Caramel Drizzle [regular]; Foam [regular]; Steamed Hot [add]; Signature Espresso [add].
- **Venti** (`Venti`, SKU `126199`): 2% Milk [add]; Shots ×2; Vanilla Syrup ×4; Caramel Drizzle [regular]; Foam [regular]; Steamed Hot [add]; Signature Espresso [add].

Optional-add defaults vary by size for 39 option IDs. Vanilla Syrup initial add quantities by size: Short=1, Tall=2, Grande=3, Venti=4.

### Vanilla Sweet Cream Cold Brew — 2121859-iced

Groups: Flavors / Sauces (5); Flavors / Syrups (14); Toppings / Powders (1); Toppings / Topping Options (7); Toppings / Drizzle (2); Toppings / Whipped Cream (1); Cold Foams / Protein Cold Foam (15g)* (16); Cold Foams / Cold Foam (16); Cold Foams / Nondairy Cold Foam (14); Add-ins / Line the Cup (2); Add-ins / Ice (1); Add-ins / Room (1); Add-ins / Creamer (11); Add-ins / Flavored Pearls (1); Sweeteners / Liquid Sweeteners (2); Sweeteners / Sweetener Packets (5); Cup Options / Other (1); Cup Options / Cup Sizes (4); Espresso & Shot Options / Espresso Roast Options (6); Espresso & Shot Options / Espresso Shots (1).

- **Tall** (`Tall`, SKU `11064127`): Splash of Vanilla Sweet Cream [regular]; Vanilla Syrup ×1; Ice [regular].
- **Grande** (`Grande`, SKU `11064128` — default): Splash of Vanilla Sweet Cream [regular]; Vanilla Syrup ×2; Ice [regular].
- **Venti** (`Venti`, SKU `11064129`): Splash of Vanilla Sweet Cream [regular]; Vanilla Syrup ×3; Ice [regular].
- **Trenta** (`Trenta`, SKU `11064457`): Splash of Vanilla Sweet Cream [regular]; Vanilla Syrup ×4; Ice [regular].

Optional-add defaults vary by size for 32 option IDs. Vanilla Syrup initial add quantities by size: Tall=1, Grande=2, Venti=3, Trenta=4.

### Cold Brew — 2121255-iced

Groups: Flavors / Sauces (5); Flavors / Syrups (14); Toppings / Powders (1); Toppings / Topping Options (7); Toppings / Drizzle (2); Toppings / Whipped Cream (1); Cold Foams / Protein Cold Foam (15g)* (16); Cold Foams / Cold Foam (16); Cold Foams / Nondairy Cold Foam (14); Add-ins / Line the Cup (2); Add-ins / Ice (1); Add-ins / Room (1); Add-ins / Creamer (11); Add-ins / Flavored Pearls (1); Sweeteners / Liquid Sweeteners (2); Sweeteners / Sweetener Packets (5); Cup Options / Other (1); Cup Options / Cup Sizes (4); Espresso & Shot Options / Espresso Roast Options (6); Espresso & Shot Options / Espresso Shots (1).

- **Tall** (`Tall`, SKU `11044804`): Ice [regular].
- **Grande** (`Grande`, SKU `11044803` — default): Ice [regular].
- **Venti** (`Venti`, SKU `11044802`): Ice [regular].
- **Trenta** (`Trenta`, SKU `11044801`): Ice [regular].

Optional-add defaults vary by size for 32 option IDs. Vanilla Syrup initial add quantities by size: Tall=1, Grande=2, Venti=3, Trenta=4.

### Iced Caffè Latte — 407-iced

Groups: Milk / Milk Options (12); Flavors / Sauces (5); Flavors / Powders (3); Flavors / Syrups (14); Toppings / Powders (1); Toppings / Topping Options (7); Toppings / Drizzle (2); Toppings / Whipped Cream (1); Cold Foams / Protein Cold Foam (15g)* (16); Cold Foams / Cold Foam (16); Cold Foams / Nondairy Cold Foam (14); Add-ins / Line the Cup (2); Add-ins / Ice (1); Tea / Chai Teas (1); Sweeteners / Liquid Sweeteners (2); Sweeteners / Sweetener Packets (5); Cup Options / Other (1); Cup Options / Cup Sizes (4); Espresso & Shot Options / Espresso Roast Options (6); Espresso & Shot Options / Ristretto or Long Shot (2); Espresso & Shot Options / Espresso Shots (1).

- **Tall** (`Tall`, SKU `110569`): 2% Milk [add]; Shots ×1; Ice [regular]; Signature Espresso [add].
- **Grande** (`Grande`, SKU `110570` — default): 2% Milk [add]; Shots ×2; Ice [regular]; Signature Espresso [add].
- **Venti** (`Venti`, SKU `144648`): 2% Milk [add]; Shots ×3; Ice [regular]; Signature Espresso [add].

Optional-add defaults vary by size for 38 option IDs. Vanilla Syrup initial add quantities by size: Tall=3, Grande=4, Venti=6.

### Iced Caramel Macchiato — 413-iced

Groups: Milk / Milk Options (12); Flavors / Sauces (5); Flavors / Powders (3); Flavors / Syrups (14); Toppings / Powders (1); Toppings / Topping Options (7); Toppings / Drizzle (2); Toppings / Whipped Cream (1); Cold Foams / Protein Cold Foam (15g)* (16); Cold Foams / Cold Foam (16); Cold Foams / Nondairy Cold Foam (14); Espresso & Shot Options / Espresso Roast Options (6); Espresso & Shot Options / Ristretto or Long Shot (2); Espresso & Shot Options / Shot Prep (1); Espresso & Shot Options / Espresso Shots (1); Add-ins / Line the Cup (2); Add-ins / Ice (1); Tea / Chai Teas (1); Sweeteners / Liquid Sweeteners (2); Sweeteners / Sweetener Packets (5); Cup Options / Other (1); Cup Options / Cup Sizes (4).

- **Tall** (`Tall`, SKU `155349`): 2% Milk [add]; Shots ×1; Vanilla Syrup ×2; Caramel Drizzle [regular]; Ice [regular]; Signature Espresso [add].
- **Grande** (`Grande`, SKU `155347` — default): 2% Milk [add]; Shots ×2; Vanilla Syrup ×3; Caramel Drizzle [regular]; Ice [regular]; Signature Espresso [add].
- **Venti** (`Venti`, SKU `155364`): 2% Milk [add]; Shots ×3; Vanilla Syrup ×5; Caramel Drizzle [regular]; Ice [regular]; Signature Espresso [add].

Optional-add defaults vary by size for 38 option IDs. Vanilla Syrup initial add quantities by size: Tall=2, Grande=3, Venti=5.

### Coffee Frappuccino® Blended Beverage — 483-iced

Groups: Milk / Milk Options (12); Flavors / Sauces (5); Flavors / Powders (3); Flavors / Syrups (14); Toppings / Powders (1); Toppings / Topping Options (7); Toppings / Drizzle (2); Toppings / Whipped Cream (1); Cold Foams / Protein Cold Foam (15g)* (16); Cold Foams / Cold Foam (16); Cold Foams / Nondairy Cold Foam (14); Blended Options / Blended Prep (1); Blended Options / Frappuccino Roast (1); Blended Options / Blended Add-Ins (1); Espresso & Shot Options / Affogato-Style Shots (1); Espresso & Shot Options / Espresso Roast Options (6); Espresso & Shot Options / Espresso Shots (1); Add-ins / Line the Cup (2); Add-ins / Flavored Pearls (1); Tea / Chai Teas (1); Sweeteners / Liquid Sweeteners (2); Sweeteners / Sweetener Packets (5); Cup Options / Other (1).

- **Tall** (`Tall`, SKU `11002659`): Whole Milk [add]; Frappuccino® Roast ×2.
- **Grande** (`Grande`, SKU `11002660` — default): Whole Milk [add]; Frappuccino® Roast ×3.
- **Venti** (`Venti`, SKU `11002661`): Whole Milk [add]; Frappuccino® Roast ×4.

Optional-add defaults vary by size for 39 option IDs. Vanilla Syrup initial add quantities by size: Tall=2, Grande=3, Venti=4.

### Chai Latte — 466-hot

Groups: Milk / Milk Foam (1); Milk / Milk Options (12); Milk / Milk Temperature (3); Flavors / Sauces (5); Flavors / Powders (3); Flavors / Syrups (14); Toppings / Powders (1); Toppings / Topping Options (7); Toppings / Drizzle (2); Toppings / Whipped Cream (1); Cold Foams / Protein Cold Foam (15g)* (16); Cold Foams / Cold Foam (16); Cold Foams / Nondairy Cold Foam (14); Add-ins / Line the Cup (2); Tea / Chai Teas (1); Tea / Tea Powders (1); Sweeteners / Liquid Sweeteners (2); Sweeteners / Sweetener Packets (5); Cup Options / Other (1); Cup Options / Cup Sizes (4); Espresso & Shot Options / Espresso Roast Options (6); Espresso & Shot Options / Espresso Shots (1).

- **Short** (`Short`, SKU `11187074`): 2% Milk [add]; Chai ×2; Foam [regular]; Steamed Hot [add]; Classic Syrup ×2.
- **Tall** (`Tall`, SKU `11187075`): 2% Milk [add]; Chai ×3; Foam [regular]; Steamed Hot [add]; Classic Syrup ×3.
- **Grande** (`Grande`, SKU `11187076` — default): 2% Milk [add]; Chai ×4; Foam [regular]; Steamed Hot [add]; Classic Syrup ×4.
- **Venti** (`Venti`, SKU `11187077`): 2% Milk [add]; Chai ×5; Foam [regular]; Steamed Hot [add]; Classic Syrup ×5.

Optional-add defaults vary by size for 33 option IDs. Vanilla Syrup initial add quantities by size: Short=2, Tall=3, Grande=4, Venti=5.

### Iced Chai Latte — 466-iced

Groups: Milk / Milk Options (12); Flavors / Sauces (5); Flavors / Powders (3); Flavors / Syrups (14); Toppings / Powders (1); Toppings / Topping Options (7); Toppings / Drizzle (2); Toppings / Whipped Cream (1); Cold Foams / Protein Cold Foam (15g)* (16); Cold Foams / Cold Foam (16); Cold Foams / Nondairy Cold Foam (14); Add-ins / Line the Cup (2); Add-ins / Ice (1); Add-ins / Flavored Pearls (1); Tea / Chai Teas (1); Tea / Tea Powders (1); Sweeteners / Liquid Sweeteners (2); Sweeteners / Sweetener Packets (5); Cup Options / Other (1); Cup Options / Cup Sizes (4); Espresso & Shot Options / Espresso Roast Options (6); Espresso & Shot Options / Espresso Shots (1).

- **Tall** (`Tall`, SKU `11187071`): 2% Milk [add]; Chai ×3; Ice [regular]; Classic Syrup ×3.
- **Grande** (`Grande`, SKU `11187072` — default): 2% Milk [add]; Chai ×4; Ice [regular]; Classic Syrup ×4.
- **Venti** (`Venti`, SKU `11187073`): 2% Milk [add]; Chai ×6; Ice [regular]; Classic Syrup ×6.

Optional-add defaults vary by size for 32 option IDs. Vanilla Syrup initial add quantities by size: Tall=3, Grande=4, Venti=6.

### Matcha Latte — 468-hot

Groups: Milk / Milk Foam (1); Milk / Milk Options (12); Milk / Milk Temperature (3); Flavors / Sauces (5); Flavors / Powders (3); Flavors / Syrups (14); Toppings / Powders (1); Toppings / Topping Options (7); Toppings / Drizzle (2); Toppings / Whipped Cream (1); Cold Foams / Protein Cold Foam (15g)* (16); Cold Foams / Cold Foam (16); Cold Foams / Nondairy Cold Foam (14); Add-ins / Line the Cup (2); Tea / Chai Teas (1); Tea / Tea Powders (1); Sweeteners / Liquid Sweeteners (2); Sweeteners / Sweetener Packets (5); Cup Options / Other (1); Cup Options / Cup Sizes (4); Espresso & Shot Options / Espresso Roast Options (6); Espresso & Shot Options / Espresso Shots (1).

- **Short** (`Short`, SKU `195169`): 2% Milk [add]; Matcha Powder ×1; Foam [regular]; Steamed Hot [add]; Classic Syrup ×1.
- **Tall** (`Tall`, SKU `195170`): 2% Milk [add]; Matcha Powder ×2; Foam [regular]; Steamed Hot [add]; Classic Syrup ×2.
- **Grande** (`Grande`, SKU `195172` — default): 2% Milk [add]; Matcha Powder ×3; Foam [regular]; Steamed Hot [add]; Classic Syrup ×3.
- **Venti** (`Venti`, SKU `195174`): 2% Milk [add]; Matcha Powder ×4; Foam [regular]; Steamed Hot [add]; Classic Syrup ×4.

Optional-add defaults vary by size for 32 option IDs. Vanilla Syrup initial add quantities by size: Short=2, Tall=3, Grande=4, Venti=5.

### Iced Matcha Latte — 468-iced

Groups: Milk / Milk Options (12); Flavors / Sauces (5); Flavors / Powders (3); Flavors / Syrups (14); Toppings / Powders (1); Toppings / Topping Options (7); Toppings / Drizzle (2); Toppings / Whipped Cream (1); Cold Foams / Protein Cold Foam (15g)* (16); Cold Foams / Cold Foam (16); Cold Foams / Nondairy Cold Foam (14); Add-ins / Line the Cup (2); Add-ins / Ice (1); Add-ins / Flavored Pearls (1); Tea / Chai Teas (1); Tea / Tea Powders (1); Sweeteners / Liquid Sweeteners (2); Sweeteners / Sweetener Packets (5); Cup Options / Other (1); Cup Options / Cup Sizes (4); Espresso & Shot Options / Espresso Roast Options (6); Espresso & Shot Options / Espresso Shots (1).

- **Tall** (`Tall`, SKU `195171`): 2% Milk [add]; Matcha Powder ×2; Ice [regular]; Classic Syrup ×2.
- **Grande** (`Grande`, SKU `195173` — default): 2% Milk [add]; Matcha Powder ×3; Ice [regular]; Classic Syrup ×3.
- **Venti** (`Venti`, SKU `195175`): 2% Milk [add]; Matcha Powder ×4; Ice [regular]; Classic Syrup ×4.

Optional-add defaults vary by size for 32 option IDs. Vanilla Syrup initial add quantities by size: Tall=3, Grande=4, Venti=6.

## Hot versus iced catalog differences

- **407**: hot-only option definitions: Extra Hot; Foam; Steamed Hot; Warm. Iced-only option definitions: Ice; Line the Cup with Caramel Sauce; Line the Cup with Mocha Sauce.
- **413**: hot-only option definitions: Extra Hot; Foam; Steamed Hot; Warm. Iced-only option definitions: Ice.
- **466**: hot-only option definitions: Extra Hot; Foam; Steamed Hot; Warm. Iced-only option definitions: Ice; Mango-Pineapple Pearls.
- **468**: hot-only option definitions: Extra Hot; Foam; Steamed Hot; Warm. Iced-only option definitions: Ice; Mango-Pineapple Pearls.

## Rules and remaining gaps

The responses expose choice forms (`one`, `qty`, `modifier`, `yes-no`), categorical alternatives such as add/no/light/regular/extra, included recipes, and per-size initial optional-add quantities. `defaultOptionValues` is not the included recipe. Multiple alternative SKUs sometimes carry `default:true`; recipe `sizeCode` must be respected instead of choosing the first flagged SKU.

Previously captured client code/config supplies the numeric stepper maximum of 12, step 1, and conditional minimum 0 or 1 based on optional/included status and removability. These are shared UI rules, not per-drink server-validated bounds. See [customization report](customization-2123113-report.md). This pass did not test every min/max, cross-option dependency, exclusive replacement, or size transition. Product-level catalogs alone cannot prove those behaviors.

Hot espresso milk drinks, iced espresso milk drinks, plain/sweet-cream cold brew, coffee blended drinks, and hot/iced chai and matcha are represented with their complete returned size catalogs, standard nutrition, default recipes and modifier catalogs. That means source representation, not complete behavioral validation or coverage of all permanent menu products. Mocha Frappuccino and other blended recipes were not sampled because the request allowed Coffee or Mocha.

Calculator results: three successes and nine HTTP 500 errors. Hot Chai returned `006-002-017`; other failures returned `006-002-002`, both with generic internal-error messages. The reason for the distinct code is not established. Same-ID hot/iced comparisons show success for hot Latte/Macchiato and failure for iced forms. This is consistent with the earlier UI allowlist, but does not establish a deliberate backend allowlist: missing recipe support or a service defect remains possible.

All three successful complete bodies contain only `nutritionValues` with calories, fat, sugars and protein; each value is a string with displayName/unitOfMeasure. **Total carbohydrates are absent.** No full customized macro panel is available even for these successes. Nine samples lack a successful customized result; all samples lack proven comprehensive customization constraints. Keep standard nutrition separate from calculated fields, and never substitute sugars for total carbs.

## Saved files and validation

Directory: [interactive/permanent-drinks/](interactive/permanent-drinks/). For each product/form: `*-product.json`, `*-product-source.json`, `*-calculation-request.json`, `*-calculation.json`, `*-calculation-source.json` (60 files). [source.json](interactive/permanent-drinks/source.json) inventories all 24 official responses; [inspection.json](interactive/permanent-drinks/inspection.json) indexes recipes, groups, options, nutrition and results for offline review. Response bodies are unchanged; error bodies are preserved too.

Validation: all 24 response bodies parse as JSON and match their recorded SHA-256; all 12 submitted base and modifier SKUs occur in their corresponding saved product response. No browser/session secrets were captured. No importer was built.
