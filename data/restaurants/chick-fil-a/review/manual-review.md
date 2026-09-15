# Chick-fil-A — Decisions I Actually Need to Make

Remaining decisions: 2

## Quick Summary

- Conflicting nutrition: 0
- Important missing nutrition: 0
- Low-priority missing nutrition: 0
- New menu-type decisions: 0 groups
- Recorded deferred meal groups: 3
- Newly integrated current sellable non-meal items: 21
- Schema/customization decisions: 2

Confident official nutrition, contextual defaults, explicitly linked add-ons, preserved production enrichment, identical duplicate nutrition rows, non-sellable structural records, and informational source metadata are intentionally excluded.

## Section B — Current Official Source Has No Nutrition Match

### High Priority

None.

### Lower Priority

None.

## Section C — Recorded Product Decisions and Runtime Preparation

Only currently sellable records directly present in an official category are included. Internal groups and non-sellable graph records are excluded.

### Implemented Current Sellable Non-Meal Items

21 generated-only current sellable non-meal items are present in runtime preparation. The previous Seasonal / Other decision bucket is resolved.

- 1% Chocolate Milk — visible menu item
- 1% Milk — visible menu item
- 8oz Barbeque Sauce — visible menu item
- 8oz Garden Herb Ranch Sauce — visible menu item
- 8oz Honey Mustard Sauce — visible menu item
- 8oz Polynesian Sauce — visible menu item
- Breakfast Waffle — visible menu item
- Chicken & Waffles Breakfast Sandwich w/ Chick-fil-A® Filet — visible menu item
- Chicken & Waffles Breakfast Sandwich w/ Grilled Filet — visible menu item
- Chicken & Waffles Breakfast Sandwich w/ Spicy Filet — visible menu item
- Chicken & Waffles Sandwich w/ Chick-fil-A® Filet — visible menu item
- Chicken & Waffles Sandwich w/ Grilled Filet — visible menu item
- Chicken & Waffles Sandwich w/ Spicy Filet — visible menu item
- Gluten Free Bun — customization only
- Honest Kids® Apple Juice — visible menu item
- Original Flavor Waffle Potato Chips — visible menu item
- Pineapple Dragonfruit & Sprite® — visible menu item
- S’mores Frosted Coffee — visible menu item
- S’mores Milkshake — visible menu item
- Toasted Marshmallow Hot Coffee — visible menu item
- Waffle — visible menu item

### Kid's Meals — Deferred

- 2 Ct Chick-n-Strips® Kid's Meal
- 5 Ct Grilled Nuggets Kid's Meal
- 5 Ct Nuggets Kid's Meal
- Mac & Cheese Kid’s Meal

Status: Deferred; not included in runtime-prep visibility.
Static meal nutrition is not required; it should eventually be calculated from the selected entrée, side, drink, and other selections.

### Standard Meals — Deferred

- Bacon, Egg, & Cheese Biscuit Meal
- Bacon, Egg, & Cheese Muffin Meal
- Chick-fil-A® Chicken Biscuit Meal
- Chick-fil-A® Cool Wrap Meal
- Chick-fil-A® Sandwich Meal
- Chick-fil-A® Spicy Chicken Sandwich Meal
- Chicken & Waffles Breakfast Sandwich w/ Chick-fil-A® Filet Meal
- Chicken & Waffles Breakfast Sandwich w/ Grilled Filet Meal
- Chicken & Waffles Breakfast Sandwich w/ Spicy Filet Meal
- Chicken & Waffles Sandwich w/ Chick-fil-A® Filet Meal
- Chicken & Waffles Sandwich w/ Grilled Filet Meal
- Chicken & Waffles Sandwich w/ Spicy Filet Meal
- Chicken, Egg & Cheese Biscuit Meal
- Chicken, Egg, & Cheese Muffin Meal
- Egg White Grill Meal
- Grilled Chicken Sandwich Meal
- Sausage, Egg, & Cheese Biscuit Meal
- Sausage, Egg, & Cheese Muffin Meal
- Southwest Veggie Wrap Meal
- Spicy Chicken Biscuit Meal

Status: Deferred; not included in runtime-prep visibility.
Static meal nutrition is not required; it should eventually be calculated from the selected entrée, side, drink, and other selections.

### Family Style Meals — Deferred

- Chick-fil-A Chick-n-Strips® Family Style Meal
- Chick-fil-A® Nuggets Family Style Meal
- Grilled Nuggets Family Style Meal

Status: Deferred; not included in runtime-prep visibility.
Static meal nutrition is not required; it should eventually be calculated from the selected entrée, side, drink, and other selections.

No product decisions remain in this section.

## Section D — Remaining Customization / Schema Decisions

### Nested and contextual customization

- What Chick-fil-A allows: The official graph retains 474 groups and 433 contextual min/max constraints, including per-item defaults and alternatives.
- What Macro Maxxer currently supports: The runtime now resolves relationship-tagged modifier nutrition and flattens representable ingredient categories/add-on groups, but it cannot enforce every remaining nested/context-specific selection rule.
- What decision I need to make: Whether to extend the runtime schema with nested, context-aware option groups before migration.
- Recommended option: Keep the full source graph now and add a typed nested-selection model before exposing workflows that depend on those constraints.

### Meal entrée-choice modeling

- What Chick-fil-A allows: 9 official meal containers do not reduce to the runtime's single fixed entrée reference.
- What Macro Maxxer currently supports: ComboMealConfig supports one entrée ID plus side and drink option arrays.
- What decision I need to make: Whether meal containers need multiple or nested entrée choices when meal support is enabled.
- Recommended option: Decide meal exposure first; if enabled, extend ComboMealConfig instead of discarding official choices.

