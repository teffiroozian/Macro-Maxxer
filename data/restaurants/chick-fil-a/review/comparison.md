# Chick-fil-A Generated vs Production Review

Compared: 2026-08-25

> Production values in this report are historical evidence, not authority for resolving official-source ambiguity. No source or production data was modified.

## Summary

| Category | Count |
| --- | ---: |
| Safe/equivalent comparison units | 145 |
| Confident official nutrition changes automatically accepted | 28 |
| Official customization differences automatically accepted | 54 |
| Nutrition differences | 0 |
| Menu structure differences | 389 |
| Customization differences | 1 |
| Production enrichment cases to preserve | 149 |
| Generated-only official-data cases | 336 |
| Unresolved records with production evidence | 0 |

Safe/equivalent comprises 96 top-level records and 49 variants. Full safe alignment detail is intentionally kept in `comparison.json`.

## Highest Priority Review

### Frosted Coffee

- Action: `needs_source_verification`
- Difference: `ambiguous_alignment`
- Confidence: `review`
- Reason: Multiple generated records share the same conservatively normalized identity.
- Production: `{"id":"frosted_coffee","name":"Frosted Coffee","kind":"menu_item","categories":["Treats"],"servingType":"side"}`
- Generated: `["Frosted Coffee","Frosted Coffee","Frosted Coffee"]`

### Frosted Lemonade

- Action: `needs_source_verification`
- Difference: `ambiguous_alignment`
- Confidence: `review`
- Reason: Multiple generated records share the same conservatively normalized identity.
- Production: `{"id":"frosted_lemonade","name":"Frosted Lemonade","kind":"menu_item","categories":["Treats"],"servingType":"side"}`
- Generated: `["Frosted Lemonade","Frosted Lemonade"]`

### Iced Coffee

- Action: `needs_source_verification`
- Difference: `ambiguous_alignment`
- Confidence: `review`
- Reason: Multiple generated records share the same conservatively normalized identity.
- Production: `{"id":"iced_coffee","name":"Iced Coffee","kind":"menu_item","categories":["Drinks"],"servingType":"drink"}`
- Generated: `["Iced Coffee","Iced Coffee","Iced Coffee"]`

### Kale Crunch Side

- Action: `needs_source_verification`
- Difference: `ambiguous_alignment`
- Confidence: `review`
- Reason: Multiple generated records share the same conservatively normalized identity.
- Production: `{"id":"kale_crunch_side","name":"Kale Crunch Side","kind":"menu_item","categories":["Side"],"servingType":"side"}`
- Generated: `["Kale Crunch Side","Kale Crunch Side"]`

### 2 Ct Chick-n-Strips® Kid's Meal

- Action: `needs_source_verification`
- Difference: `generated_only_record`
- Confidence: `high`
- Reason: Official menu structure contains this record, but its nutrition remains unresolved.
- Production: unavailable
- Generated: `{"id":"cfa-group-100340","name":"2 Ct Chick-n-Strips® Kid's Meal","kind":"menu_item","categories":["Kid's Meals"],"servingType":"combo","sourceRecordId":"itemGroupId:100340","retailModifiedItemId":"1000351","itemGroupId":"100340","sellable":true,"sourceOnly":false,"unresolvedReason":"entree_only_nutrition_for_meal_container"}`

### 5 Ct Grilled Nuggets Kid's Meal

- Action: `needs_source_verification`
- Difference: `generated_only_record`
- Confidence: `high`
- Reason: Official menu structure contains this record, but its nutrition remains unresolved.
- Production: unavailable
- Generated: `{"id":"cfa-group-100341","name":"5 Ct Grilled Nuggets Kid's Meal","kind":"menu_item","categories":["Kid's Meals"],"servingType":"combo","sourceRecordId":"itemGroupId:100341","retailModifiedItemId":"1007120","itemGroupId":"100341","sellable":true,"sourceOnly":false,"unresolvedReason":"entree_only_nutrition_for_meal_container"}`

### 5 Ct Nuggets Kid's Meal

- Action: `needs_source_verification`
- Difference: `generated_only_record`
- Confidence: `high`
- Reason: Official menu structure contains this record, but its nutrition remains unresolved.
- Production: unavailable
- Generated: `{"id":"cfa-group-100336","name":"5 Ct Nuggets Kid's Meal","kind":"menu_item","categories":["Kid's Meals"],"servingType":"combo","sourceRecordId":"itemGroupId:100336","retailModifiedItemId":"1007118","itemGroupId":"100336","sellable":true,"sourceOnly":false,"unresolvedReason":"entree_only_nutrition_for_meal_container"}`

### Chick-fil-A Chick-n-Strips® Family Style Meal

- Action: `needs_source_verification`
- Difference: `generated_only_record`
- Confidence: `high`
- Reason: Official menu structure contains this record, but its nutrition remains unresolved.
- Production: unavailable
- Generated: `{"id":"cfa-group-100501","name":"Chick-fil-A Chick-n-Strips® Family Style Meal","kind":"menu_item","categories":["Family Style Meals"],"servingType":"combo","sourceRecordId":"itemGroupId:100501","retailModifiedItemId":"1009446","itemGroupId":"100501","sellable":true,"sourceOnly":false,"unresolvedReason":"no_nutrition_match"}`

### Chick-fil-A® Cool Wrap Meal

- Action: `needs_source_verification`
- Difference: `generated_only_record`
- Confidence: `high`
- Reason: Official menu structure contains this record, but its nutrition remains unresolved.
- Production: unavailable
- Generated: `{"id":"cfa-group-100289","name":"Chick-fil-A® Cool Wrap Meal","kind":"menu_item","categories":["Meals"],"servingType":"combo","sourceRecordId":"itemGroupId:100289","retailModifiedItemId":"1005723","itemGroupId":"100289","sellable":true,"sourceOnly":false,"unresolvedReason":"no_nutrition_match"}`

### Chick-fil-A® Nuggets Family Style Meal

- Action: `needs_source_verification`
- Difference: `generated_only_record`
- Confidence: `high`
- Reason: Official menu structure contains this record, but its nutrition remains unresolved.
- Production: unavailable
- Generated: `{"id":"cfa-group-100500","name":"Chick-fil-A® Nuggets Family Style Meal","kind":"menu_item","categories":["Family Style Meals"],"servingType":"combo","sourceRecordId":"itemGroupId:100500","retailModifiedItemId":"1009444","itemGroupId":"100500","sellable":true,"sourceOnly":false,"unresolvedReason":"no_nutrition_match"}`

_16 additional entries are available in comparison.json._

## Nutrition Differences

No nutrition differences were found.

## Unresolved Records With Production Evidence

No unresolved records have conservative same-identity production evidence.

## Customization Differences

### Combo and meal behavior

- Action: `schema_limitation`
- Difference: `legacy_combo_behavior_vs_official_meal_containers`
- Confidence: `high`
- Reason: Production derives combo eligibility from Chick-fil-A-specific category helpers, while generated data represents official meal containers and explicit side/drink relationships.
- Production: `{"implicitComboEligibleItems":26,"helper":"lib/comboMeals.ts"}`
- Generated: `{"explicitMealContainers":36,"mealContainersWithoutSingleRuntimeEntree":9}`

## Menu Structure Differences

### Frosted Coffee

- Action: `needs_source_verification`
- Difference: `ambiguous_alignment`
- Confidence: `review`
- Reason: Multiple generated records share the same conservatively normalized identity.
- Production: `{"id":"frosted_coffee","name":"Frosted Coffee","kind":"menu_item","categories":["Treats"],"servingType":"side"}`
- Generated: `["Frosted Coffee","Frosted Coffee","Frosted Coffee"]`

### Frosted Lemonade

- Action: `needs_source_verification`
- Difference: `ambiguous_alignment`
- Confidence: `review`
- Reason: Multiple generated records share the same conservatively normalized identity.
- Production: `{"id":"frosted_lemonade","name":"Frosted Lemonade","kind":"menu_item","categories":["Treats"],"servingType":"side"}`
- Generated: `["Frosted Lemonade","Frosted Lemonade"]`

### Iced Coffee

- Action: `needs_source_verification`
- Difference: `ambiguous_alignment`
- Confidence: `review`
- Reason: Multiple generated records share the same conservatively normalized identity.
- Production: `{"id":"iced_coffee","name":"Iced Coffee","kind":"menu_item","categories":["Drinks"],"servingType":"drink"}`
- Generated: `["Iced Coffee","Iced Coffee","Iced Coffee"]`

### Kale Crunch Side

- Action: `needs_source_verification`
- Difference: `ambiguous_alignment`
- Confidence: `review`
- Reason: Multiple generated records share the same conservatively normalized identity.
- Production: `{"id":"kale_crunch_side","name":"Kale Crunch Side","kind":"menu_item","categories":["Side"],"servingType":"side"}`
- Generated: `["Kale Crunch Side","Kale Crunch Side"]`

### 2 Ct Chick-n-Strips® Kid's Meal

- Action: `needs_source_verification`
- Difference: `generated_only_record`
- Confidence: `high`
- Reason: Official menu structure contains this record, but its nutrition remains unresolved.
- Production: unavailable
- Generated: `{"id":"cfa-group-100340","name":"2 Ct Chick-n-Strips® Kid's Meal","kind":"menu_item","categories":["Kid's Meals"],"servingType":"combo","sourceRecordId":"itemGroupId:100340","retailModifiedItemId":"1000351","itemGroupId":"100340","sellable":true,"sourceOnly":false,"unresolvedReason":"entree_only_nutrition_for_meal_container"}`

### 5 Ct Grilled Nuggets Kid's Meal

- Action: `needs_source_verification`
- Difference: `generated_only_record`
- Confidence: `high`
- Reason: Official menu structure contains this record, but its nutrition remains unresolved.
- Production: unavailable
- Generated: `{"id":"cfa-group-100341","name":"5 Ct Grilled Nuggets Kid's Meal","kind":"menu_item","categories":["Kid's Meals"],"servingType":"combo","sourceRecordId":"itemGroupId:100341","retailModifiedItemId":"1007120","itemGroupId":"100341","sellable":true,"sourceOnly":false,"unresolvedReason":"entree_only_nutrition_for_meal_container"}`

### 5 Ct Nuggets Kid's Meal

- Action: `needs_source_verification`
- Difference: `generated_only_record`
- Confidence: `high`
- Reason: Official menu structure contains this record, but its nutrition remains unresolved.
- Production: unavailable
- Generated: `{"id":"cfa-group-100336","name":"5 Ct Nuggets Kid's Meal","kind":"menu_item","categories":["Kid's Meals"],"servingType":"combo","sourceRecordId":"itemGroupId:100336","retailModifiedItemId":"1007118","itemGroupId":"100336","sellable":true,"sourceOnly":false,"unresolvedReason":"entree_only_nutrition_for_meal_container"}`

### Chick-fil-A Chick-n-Strips® Family Style Meal

- Action: `needs_source_verification`
- Difference: `generated_only_record`
- Confidence: `high`
- Reason: Official menu structure contains this record, but its nutrition remains unresolved.
- Production: unavailable
- Generated: `{"id":"cfa-group-100501","name":"Chick-fil-A Chick-n-Strips® Family Style Meal","kind":"menu_item","categories":["Family Style Meals"],"servingType":"combo","sourceRecordId":"itemGroupId:100501","retailModifiedItemId":"1009446","itemGroupId":"100501","sellable":true,"sourceOnly":false,"unresolvedReason":"no_nutrition_match"}`

### Chick-fil-A® Cool Wrap Meal

- Action: `needs_source_verification`
- Difference: `generated_only_record`
- Confidence: `high`
- Reason: Official menu structure contains this record, but its nutrition remains unresolved.
- Production: unavailable
- Generated: `{"id":"cfa-group-100289","name":"Chick-fil-A® Cool Wrap Meal","kind":"menu_item","categories":["Meals"],"servingType":"combo","sourceRecordId":"itemGroupId:100289","retailModifiedItemId":"1005723","itemGroupId":"100289","sellable":true,"sourceOnly":false,"unresolvedReason":"no_nutrition_match"}`

### Chick-fil-A® Nuggets Family Style Meal

- Action: `needs_source_verification`
- Difference: `generated_only_record`
- Confidence: `high`
- Reason: Official menu structure contains this record, but its nutrition remains unresolved.
- Production: unavailable
- Generated: `{"id":"cfa-group-100500","name":"Chick-fil-A® Nuggets Family Style Meal","kind":"menu_item","categories":["Family Style Meals"],"servingType":"combo","sourceRecordId":"itemGroupId:100500","retailModifiedItemId":"1009444","itemGroupId":"100500","sellable":true,"sourceOnly":false,"unresolvedReason":"no_nutrition_match"}`

### Chick-fil-A® Sandwich Meal

- Action: `needs_source_verification`
- Difference: `generated_only_record`
- Confidence: `high`
- Reason: Official menu structure contains this record, but its nutrition remains unresolved.
- Production: unavailable
- Generated: `{"id":"cfa-group-100234","name":"Chick-fil-A® Sandwich Meal","kind":"menu_item","categories":["Meals"],"servingType":"combo","sourceRecordId":"itemGroupId:100234","retailModifiedItemId":"1005727","itemGroupId":"100234","sellable":true,"sourceOnly":false,"unresolvedReason":"no_nutrition_match"}`

### Chick-fil-A® Spicy Chicken Sandwich Meal

- Action: `needs_source_verification`
- Difference: `generated_only_record`
- Confidence: `high`
- Reason: Official menu structure contains this record, but its nutrition remains unresolved.
- Production: unavailable
- Generated: `{"id":"cfa-group-100243","name":"Chick-fil-A® Spicy Chicken Sandwich Meal","kind":"menu_item","categories":["Meals"],"servingType":"combo","sourceRecordId":"itemGroupId:100243","retailModifiedItemId":"1005706","itemGroupId":"100243","sellable":true,"sourceOnly":false,"unresolvedReason":"no_nutrition_match"}`

### Chick-fil-A<sup>®</sup> Nuggets Meal

- Action: `no_action`
- Difference: `source_only_structural_record`
- Confidence: `high`
- Reason: This non-sellable official record is preserved for relationships and explicitly marked source-only, not as a user-facing card.
- Production: unavailable
- Generated: `{"id":"cfa-group-100273","name":"Chick-fil-A<sup>®</sup> Nuggets Meal","kind":"menu_item","categories":["Meals"],"servingType":"combo","sourceRecordId":"itemGroupId:100273","retailModifiedItemId":null,"itemGroupId":"100273","sellable":false,"sourceOnly":true,"unresolvedReason":"no_nutrition_match"}`

### Chick-n-Strips® Meal

- Action: `no_action`
- Difference: `source_only_structural_record`
- Confidence: `high`
- Reason: This non-sellable official record is preserved for relationships and explicitly marked source-only, not as a user-facing card.
- Production: unavailable
- Generated: `{"id":"cfa-group-100285","name":"Chick-n-Strips® Meal","kind":"menu_item","categories":["Meals"],"servingType":"combo","sourceRecordId":"itemGroupId:100285","retailModifiedItemId":null,"itemGroupId":"100285","sellable":false,"sourceOnly":true,"unresolvedReason":"no_nutrition_match"}`

### Chicken & Waffles Breakfast Sandwich w/ Chick-fil-A® Filet Meal

- Action: `needs_source_verification`
- Difference: `generated_only_record`
- Confidence: `high`
- Reason: Official menu structure contains this record, but its nutrition remains unresolved.
- Production: unavailable
- Generated: `{"id":"cfa-group-100100","name":"Chicken & Waffles Breakfast Sandwich w/ Chick-fil-A® Filet Meal","kind":"menu_item","categories":["Breakfast"],"servingType":"combo","sourceRecordId":"itemGroupId:100100","retailModifiedItemId":"1009750","itemGroupId":"100100","sellable":true,"sourceOnly":false,"unresolvedReason":"no_nutrition_match"}`

_374 additional entries are available in comparison.json._

## Production Enrichment to Preserve

- addon eligibility/group assignment: 10 production records
- authored display categories: 143 production records
- authored display order: 143 production records
- ingredient visibility override: 5 production records
- item customization override: 17 production records
- local curated image: 143 production records
- restaurant-index-metadata: data/restaurants/index.json
- local-brand-and-menu-assets: public/restaurants/chickfila/**
- legacy-combo-and-item-rules: lib/comboMeals.ts, lib/restaurantRules/chickfila.ts
- cart-static-menu-lookup: lib/cart/cartItemLookup.ts
- restaurant-brand-color: lib/theme/colors.ts
- homepage-chickfila-presentation: app/page.tsx, components/home/HeroSearchNav.tsx

## Generated-Only Official Information

- Source-traceable generated-only records: 328
- stable-source-identities: retailModifiedItemId/itemGroupId traceability and source-native aliases
- full-source-relationship-graph: official nested item and modifier group relationships
- contextual-source-constraints: official per-context minimum and maximum option metadata
- explicit-official-meal-containers: official entrée/side/drink meal relationships instead of category-derived eligibility
- official-image-urls: current official CDN image references
- nutrition-match-provenance: official nutrition source IDs, serving size, and match strategy
- contextual-modifier-nutrition: one visible modifier identity with official nutrition selected by parent relationship tag
- additional-official-nutrition-fields: official optional nutrient fields that are absent from the aligned production record or variant

## Production Files That Power Chick-fil-A

- `data/restaurants/chickfila.json` — Production menu, nutrition, variants, ingredients, customization, addons, and display order.
- `data/restaurants/index.json` — Restaurant identity, menu filename, brand assets, description, and nutrition freshness metadata.
- `lib/restaurants.ts` — Loads index metadata and dynamically imports chickfila.json.
- `lib/cart/cartItemLookup.ts` — Directly imports chickfila.json for cart item and customization resolution.
- `lib/comboMeals.ts` — Provides legacy category-derived Chick-fil-A combo side/drink behavior.
- `lib/restaurantRules/chickfila.ts` — Breakfast, waffle-fries, hash-browns, ordering, label, and icon rules.
- `lib/theme/colors.ts` — Defines the Chick-fil-A brand accent color.
- `components/item-route-modal/ItemRouteModal.tsx` — Consumes Chick-fil-A-specific item labeling and icon rules.
- `app/page.tsx` — Uses Chick-fil-A in the homepage walkthrough.
- `components/home/HeroSearchNav.tsx` — Contains Chick-fil-A-specific homepage examples and imagery.
- `public/restaurants/chickfila/**` — 133 local brand/menu/ingredient assets.

## Review Notes

- Name alignment is formatting-only. No fuzzy matching or meaningful-word removal is used.
- Variant alignment is restricted to an already aligned parent plus exact labels or explicit size/count/portion descriptors.
- Generated ambiguities remain unresolved even where production offers a plausible historical value.
- Production has 2 raw ID collisions across menu items and ingredients; the comparator scopes its internal production identity as `kind:id`.
- Relationship-tagged modifier nutrition is first-class; other nested official relationships and contextual constraints remain schema limitations until production modeling is deliberately designed.
- Full aligned identities and uncapped findings are in `comparison.json`.
