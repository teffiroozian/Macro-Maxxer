export type VerifiedNutritionMapping = {
  nutritionSourceId: string;
  rule:
    | "explicit_product_alias"
    | "explicit_standard_portion_alias"
    | "kids_meal_entree_only_alias"
    | "tea_sweetness_word_order"
    | "verified_variant_source_identity";
  note: string;
};

/**
 * Source-ID-keyed exceptions verified in data/raw/chick-fil-a/match-analysis.json.
 *
 * These are deliberately not generic name rewrites. A newly published menu item
 * must be reviewed and added by source ID rather than inheriting one of these
 * decisions through fuzzy or word-removal matching.
 */
export const VERIFIED_NUTRITION_MAPPINGS: Readonly<
  Record<string, VerifiedNutritionMapping>
> = {
  "1009678": {
    nutritionSourceId: "51476",
    rule: "verified_variant_source_identity",
    note: "The ICED_COFFEE_UNSWT ordering record is the plain 110-calorie child of the Iced Coffee family; sibling flavors have distinct retail IDs and nutrition rows.",
  },
  "1009781": {
    nutritionSourceId: "51469",
    rule: "verified_variant_source_identity",
    note: "The CREAM_COLD_BREW ordering record is the plain 370-calorie child of the Cream Cold Brew family; sibling flavors have distinct retail IDs and nutrition rows.",
  },
  "1000049": {
    nutritionSourceId: "10137",
    rule: "explicit_standard_portion_alias",
    note: "Extra Sausage is the published standard Sausage portion.",
  },
  "1008145": {
    nutritionSourceId: "10137",
    rule: "explicit_product_alias",
    note: "Sausage Patty is published as Sausage in the nutrition source.",
  },
  "1000343": {
    nutritionSourceId: "10364",
    rule: "tea_sweetness_word_order",
    note: "The sources place 'Unsweetened' on opposite sides of 'Iced Tea'.",
  },
  "1000338": {
    nutritionSourceId: "10356",
    rule: "tea_sweetness_word_order",
    note: "The sources place 'Sweetened' on opposite sides of 'Iced Tea'.",
  },
  "1007115": {
    nutritionSourceId: "10546",
    rule: "kids_meal_entree_only_alias",
    note: "Nutrition is explicitly scoped to the 5-count nugget entree only.",
  },
  "1007116": {
    nutritionSourceId: "10558",
    rule: "kids_meal_entree_only_alias",
    note: "Nutrition is explicitly scoped to the 5-count grilled nugget entree only.",
  },
  "1008149": {
    nutritionSourceId: "616",
    rule: "explicit_standard_portion_alias",
    note: "Extra Chick-fil-A Nuggets uses the published standard nuggets portion.",
  },
  "1008151": {
    nutritionSourceId: "10322",
    rule: "explicit_standard_portion_alias",
    note: "Extra Grilled Nuggets uses the published standard grilled nuggets portion.",
  },
  "1008152": {
    nutritionSourceId: "613",
    rule: "explicit_standard_portion_alias",
    note: "Extra Chick-n-Strips uses the published standard strips portion.",
  },
  "1008153": {
    nutritionSourceId: "10610",
    rule: "explicit_standard_portion_alias",
    note: "Cold extra grilled filet uses the published Grilled Filet portion.",
  },
  "1008154": {
    nutritionSourceId: "10613",
    rule: "explicit_standard_portion_alias",
    note: "Extra Chick-fil-A Filet uses the published standard filet portion.",
  },
  "1008155": {
    nutritionSourceId: "10611",
    rule: "explicit_standard_portion_alias",
    note: "Extra Spicy Filet uses the published standard spicy filet portion.",
  },
  "1008156": {
    nutritionSourceId: "10610",
    rule: "explicit_standard_portion_alias",
    note: "Warm extra grilled filet uses the published Grilled Filet portion.",
  },
};
