# Chicken McNuggets and McCrispy Strips sauce-selection capture

Captured 2026-09-24 from live DoorDash McDonald's menus. The 4-, 6-, 10-, and 20-piece Nuggets and both Strips counts use San Francisco store `662234`, Lunch Menu `958481`. That menu did not offer a regular 40-piece, so the regular 40-piece was captured from Chicago store `653555`, Lunch Menu `927318`. Raw menu and item-page responses are in [`raw/`](raw/). This is research evidence only; no sauce-selection implementation was added.

## Ordering semantics

- Each sauce allowance is represented as its own `extra_option` group with `selectionNode: single_select`, `minNumOptions: 1`, `maxNumOptions: 1`, and `isOptional: false`.
- Aggregate and per-option quantity bounds are null. Every option has `defaultQuantity: 0` and null per-option bounds.
- Every slot contains an explicit `No Sauce` option. Thus the UI requires one selection per slot, but sauce itself is effectively optional: selecting `No Sauce` consumes that slot.
- No sauce is preselected in the payload.
- Counts with multiple allowances use multiple independent single-select groups. The same named sauce appears in every slot with a distinct option ID, so duplicate sauce selections are allowed across slots.
- All sauce options are free in these item groups (`unitAmount: 0`).
- Recommended beverages, desserts, and sides are cross-sells and are excluded.

## Sauce allowance summary

| Item | Ordering item | Store/menu | Sauce slots | Effective allowance |
| --- | ---: | --- | ---: | --- |
| 4 pc. Chicken McNuggets | `6600489915` | `662234` / `958481` | 1 | 0–1 sauces via required slot plus `No Sauce` |
| 6 pc. Chicken McNuggets | `6600489916` | `662234` / `958481` | 1 | 0–1 sauces via required slot plus `No Sauce` |
| 10 pc. Chicken McNuggets | `6600489918` | `662234` / `958481` | 2 | 0–2 sauce units; duplicates allowed |
| 20 pc. Chicken McNuggets | `6600489920` | `662234` / `958481` | 3 | 0–3 sauce units; duplicates allowed |
| 40 pc. Chicken McNuggets | `6599600707` | `653555` / `927318` | 6 | 0–6 sauce units; duplicates allowed |
| 3 Piece McCrispy Strips | `25266199124` | `662234` / `958481` | 2 | 0–2 sauce units; duplicates allowed |
| 4 Piece McCrispy Strips | `25266199126` | `662234` / `958481` | 2 | 0–2 sauce units; duplicates allowed |

All item headers have `quantityLimit: 0`. Nugget pages report `HAS_NESTED_OPTIONS`; Strips pages report `HAS_OPTIONS`. This distinction does not change the sauce-group cardinality fields.

## 4-piece Chicken McNuggets

- DNA item `200692`; ordering display 170 calories.
- Group `5831795165`, `Select Sauce`, required `1/1`:
  - Tangy BBQ `30154892024`; Sweet N Sour `30154946682`; Honey Packet `30154895968`; Hot Mustard `30154947249`; Creamy Ranch `30154946321`; Hot Picante Salsa `30154946527`; Ketchup Packet `30154948301`; Honey Mustard `30154946349`; Spicy Buffalo `30154948333`; No Sauce `30154947524`.

## 6-piece Chicken McNuggets

- DNA item `200574`; ordering display 250 calories.
- Group `5831795166`, `Select Sauce`, required `1/1`:
  - Tangy BBQ `23640083516`; Sweet N Sour `23640083517`; Honey Packet `23640083518`; Hot Mustard `23640083519`; Creamy Ranch `23640083520`; Hot Picante Salsa `23640083521`; Ketchup Packet `23640083523`; Honey Mustard `23640083524`; Spicy Buffalo `23640083525`; No Sauce `23640083526`.

## 10-piece Chicken McNuggets

- DNA item `200567`; ordering display 410 calories.
- Group `5831795174`, `Select Sauce 1/2`, required `1/1`:
  - Tangy BBQ `23640083575`; Sweet N Sour `23640083576`; Honey Packet `23640083577`; Hot Mustard `23640083578`; Creamy Ranch `23640083579`; Hot Picante Salsa `23640083580`; Ketchup Packet `23640083582`; Honey Mustard `23640083583`; Spicy Buffalo `23640083584`; No Sauce `23640083585`.
- Group `5831795175`, `Select Sauce 2/2`, required `1/1`:
  - Tangy BBQ `23640083586`; Sweet N Sour `23640083587`; Honey Packet `23640083588`; Hot Mustard `23640083589`; Creamy Ranch `23640083590`; Hot Picante Salsa `23640083591`; Ketchup Packet `23640083593`; Honey Mustard `23640083594`; Spicy Buffalo `23640083595`; No Sauce `23640083596`.

## 20-piece Chicken McNuggets

- DNA catalog external code `61`; ordering display 830 calories.
- Group `5831795184`, `Select Sauce 1/3`, required `1/1`:
  - Tangy BBQ `23640087656`; Sweet N Sour `23640087657`; Honey Packet `23640087658`; Hot Mustard `23640087659`; Creamy Ranch `23640087660`; Hot Picante Salsa `23640087661`; Ketchup Packet `23640087663`; Honey Mustard `23640087664`; Spicy Buffalo `23640087665`; No Sauce `23640087666`.
- Group `5831795185`, `Select Sauce 2/3`, required `1/1`:
  - Tangy BBQ `23640087667`; Sweet N Sour `23640087668`; Honey Packet `23640087669`; Hot Mustard `23640087670`; Creamy Ranch `23640087671`; Hot Picante Salsa `23640087672`; Ketchup Packet `23640087674`; Honey Mustard `23640087675`; Spicy Buffalo `23640087676`; No Sauce `23640087677`.
- Group `5831795186`, `Select Sauce 3/3`, required `1/1`:
  - Tangy BBQ `23640087678`; Sweet N Sour `23640087679`; Honey Packet `23640087680`; Hot Mustard `23640087681`; Creamy Ranch `23640087682`; Hot Picante Salsa `23640087683`; Ketchup Packet `23640087685`; Honey Mustard `23640087686`; Spicy Buffalo `23640087687`; No Sauce `23640087688`.

## 40-piece Chicken McNuggets

- DNA catalog external code `1332`; ordering display 1,650 calories.
- This location additionally offered Mighty Hot Sauce and Creamy Chili McCrispy Strip Dip, and did not offer Hot Mustard. This is a real location/menu difference and must not be normalized away.
- Group `5830831260`, `Select Sauce 1/6`, required `1/1`:
  - Mighty Hot `54126522592`; Creamy Chili Strip Dip `44094257551`; Tangy BBQ `23633650489`; Sweet N Sour `23633650490`; Honey Packet `23633650491`; Creamy Ranch `23633650492`; Hot Picante Salsa `23633650493`; Ketchup Packet `23633650494`; Honey Mustard `23633650495`; Spicy Buffalo `23633650496`; No Sauce `23633650497`.
- Group `5830831261`, `Select Sauce 2/6`, required `1/1`:
  - Mighty Hot `54126522593`; Creamy Chili Strip Dip `44094257552`; Tangy BBQ `23633650498`; Sweet N Sour `23633650499`; Honey Packet `23633650500`; Creamy Ranch `23633650501`; Hot Picante Salsa `23633650502`; Ketchup Packet `23633650503`; Honey Mustard `23633650504`; Spicy Buffalo `23633650505`; No Sauce `23633650506`.
- Group `5830831262`, `Select Sauce 3/6`, required `1/1`:
  - Mighty Hot `54126522594`; Creamy Chili Strip Dip `44094257553`; Tangy BBQ `23633650507`; Sweet N Sour `23633650508`; Honey Packet `23633650509`; Creamy Ranch `23633650510`; Hot Picante Salsa `23633650511`; Ketchup Packet `23633650512`; Honey Mustard `23633650513`; Spicy Buffalo `23633650514`; No Sauce `23633650515`.
- Group `5830831263`, `Select Sauce 4/6`, required `1/1`:
  - Mighty Hot `54126522595`; Creamy Chili Strip Dip `44094257554`; Tangy BBQ `23633650516`; Sweet N Sour `23633650517`; Honey Packet `23633650518`; Creamy Ranch `23633650519`; Hot Picante Salsa `23633650520`; Ketchup Packet `23633650521`; Honey Mustard `23633650522`; Spicy Buffalo `23633650523`; No Sauce `23633650524`.
- Group `5830831264`, `Select Sauce 5/6`, required `1/1`:
  - Mighty Hot `54126522596`; Creamy Chili Strip Dip `44094257555`; Tangy BBQ `23633650525`; Sweet N Sour `23633650526`; Honey Packet `23633650527`; Creamy Ranch `23633650528`; Hot Picante Salsa `23633650529`; Ketchup Packet `23633650530`; Honey Mustard `23633650531`; Spicy Buffalo `23633650532`; No Sauce `23633650533`.
- Group `5830831265`, `Select Sauce 6/6`, required `1/1`:
  - Mighty Hot `54126522597`; Creamy Chili Strip Dip `44094257556`; Tangy BBQ `23633650534`; Sweet N Sour `23633650535`; Honey Packet `23633650536`; Creamy Ranch `23633650537`; Hot Picante Salsa `23633650538`; Ketchup Packet `23633650539`; Honey Mustard `23633650540`; Spicy Buffalo `23633650541`; No Sauce `23633650542`.

## McCrispy Strips

Both current counts use two required single-select slots and allow duplicate sauces. Their option set matches the San Francisco Nuggets set.

### 3 Piece McCrispy Strips

- DNA item `204386`; ordering display 350 calories.
- Group `9631455505`, `Select Sauce 1/2`: Tangy BBQ `44104924109`; Sweet N Sour `44104924110`; Honey Packet `44104924111`; Hot Mustard `44104924112`; Creamy Ranch `44104924113`; Hot Picante Salsa `44104924114`; Ketchup Packet `44104924116`; Honey Mustard `44104924117`; Spicy Buffalo `44104924118`; No Sauce `44104924119`.
- Group `9631455506`, `Select Sauce 2/2`: Tangy BBQ `44104924122`; Sweet N Sour `44104924123`; Honey Packet `44104924124`; Hot Mustard `44104924125`; Creamy Ranch `44104924126`; Hot Picante Salsa `44104924127`; Ketchup Packet `44104924129`; Honey Mustard `44104924130`; Spicy Buffalo `44104924131`; No Sauce `44104924132`.

### 4 Piece McCrispy Strips

- DNA item `204385`; ordering display 460 calories.
- Group `9631455515`, `Select Sauce 1/2`: Tangy BBQ `44104924202`; Sweet N Sour `44104924203`; Honey Packet `44104924204`; Hot Mustard `44104924205`; Creamy Ranch `44104924206`; Hot Picante Salsa `44104924207`; Ketchup Packet `44104924209`; Honey Mustard `44104924210`; Spicy Buffalo `44104924211`; No Sauce `44104924212`.
- Group `9631455516`, `Select Sauce 2/2`: Tangy BBQ `44104924215`; Sweet N Sour `44104924216`; Honey Packet `44104924217`; Hot Mustard `44104924218`; Creamy Ranch `44104924219`; Hot Picante Salsa `44104924220`; Ketchup Packet `44104924222`; Honey Mustard `44104924223`; Spicy Buffalo `44104924224`; No Sauce `44104924225`.

## Sauce nutrition mapping

| Ordering sauce | Catalog item | Ordering calories | Status |
| --- | ---: | ---: | --- |
| Hot Mustard Dipping Sauce | `200169` | 45 | Fully safe; current full-nutrient catalog record agrees |
| Ketchup Packet | `200268` | 10 | Fully safe; current full-nutrient catalog record agrees |
| Creamy Ranch Sauce | `200293` | 110 | Fully safe; current full-nutrient catalog record agrees |
| Spicy Buffalo | `200295` | 30 | Fully safe; current full-nutrient catalog record agrees |
| Honey Mustard | `200411` | 60 | Fully safe; current full-nutrient catalog record agrees |
| Mighty Hot Sauce | `203834` | 25 | Fully safe for the Chicago 40-piece capture; catalog and ordering agree |
| Creamy Chili McCrispy Strip Dip | `204377` | 110 | Fully safe for the Chicago 40-piece capture; catalog and ordering agree |
| Tangy BBQ Dipping Sauce | none captured | 45 | Nutrition unresolved; ordering identity and calories captured, no current full-nutrient catalog record |
| Sweet N Sour Dipping Sauce | none captured | 50 | Nutrition unresolved |
| Honey Packet | none captured | 50 | Nutrition unresolved |
| Hot Picante Salsa | none captured | 0 | Nutrition unresolved; do not infer all nutrients are zero from the rounded calorie label |
| No Sauce | not applicable | 0 | Fully safe zero-delta sentinel, not a food component |

The sauce packets are not part of the base nugget/strip nutrition totals. Selecting a mapped sauce adds one packet's nutrients for each slot in which it is selected. Duplicate selections therefore apply the same packet delta repeatedly.

## Final assessment

- Nugget allowances are 1, 1, 2, 3, and 6 sauce slots for 4, 6, 10, 20, and 40 pieces respectively.
- Both 3- and 4-piece McCrispy Strips receive two sauce slots.
- Groups are structurally required, but `No Sauce` makes each slot effectively optional. There is no default selection.
- Duplicate sauces are allowed whenever an item has multiple slots.
- Nuggets and Strips can share one slot-based sauce-selection system. The system must retain item-specific group/option IDs, slot counts, and location-specific option availability.
- Hot Mustard, Ketchup, Creamy Ranch, Spicy Buffalo, Honey Mustard, Mighty Hot, Creamy Chili Dip, and No Sauce are fully mapped.
- Tangy BBQ, Sweet N Sour, Honey Packet, and Hot Picante Salsa remain nutrition-unresolved and should be hidden or treated as ordering-only until full-nutrient catalog records are captured.
- The 40-piece is cross-location evidence because the primary San Francisco menu did not offer it. Its six-slot behavior is real for store `653555`, but nationwide uniformity is not proven.
