import type { Nutrition } from "../../types/nutrition";

/**
 * Curated exceptions verified in data/review/chipotle/source-analysis.md,
 * data/review/chipotle/build-gaps-analysis.md, and
 * data/review/chipotle/import-decisions.md.
 *
 * These are deliberately not generic name rewrites the importer could derive
 * on its own — each entry documents a specific, human-verified conclusion
 * about how Chipotle's live ordering names/ids relate to the official
 * nutrition-PDF names. A newly captured menu item must be reviewed and added
 * here rather than inheriting one of these decisions through fuzzy matching.
 */

// Live ordering-system name -> official nutrition-PDF name, for the small
// set of confirmed name-drift pairs identified in source-analysis.md §6.
// Both sides must still agree on section (adult/kids) and portion at match
// time; this table only bridges the name difference.
export const CHIPOTLE_PDF_NAME_ALIASES: Readonly<Record<string, string>> = {
  "Beef Barbacoa": "Barbacoa",
  "White Rice": "Cilantro-Lime White Rice",
  "Brown Rice": "Cilantro-Lime Brown Rice",
  "Fajita Veggies": "Fajita Vegetables",
  "Romaine Lettuce": "Romaine Lettuce (tacos)",
  Chips: "Chips (regular)",
  "Large Chips": "Chips (large)",
  "Side of Chicken": "Chicken",
  "Side of Steak": "Steak",
  "22 fl oz Tractor Organic Mandarin Agua Fresca": "Tractor Mandarin Agua Fresca",
  "32 fl oz Tractor Organic Mandarin Agua Fresca": "Tractor Mandarin Agua Fresca",
  "22 fl oz Tractor Organic Berry Agua Fresca": "Tractor Berry Agua Fresca",
  "32 fl oz Tractor Organic Berry Agua Fresca": "Tractor Berry Agua Fresca",
};

// Live items with a confirmed official PDF match despite carrying NO PDF row
// of their own — see source-analysis.md §6, "Live items with no PDF match".
// Listed explicitly so the importer never attempts (and never silently
// succeeds at) a coincidental-calorie match for these.
export const CHIPOTLE_PDF_KNOWN_UNMATCHED_NAMES: ReadonlySet<string> = new Set([
  "Chipotle Honey Chicken",
]);

// --- import-decisions.md §3: Salad's implicit Supergreens base ---
// No CMG id exists for the salad greens/base anywhere in the four structured
// sources (build-gaps-analysis.md Part A, exhaustively confirmed absent).
// Decision: treat it as an implicit required base component of every Salad
// entree, sourced from the official PDF row directly (no invented CMG id).
export const CHIPOTLE_SALAD_IMPLICIT_BASE: {
  label: string;
  pdfName: string;
  nutrition: Nutrition;
  note: string;
} = {
  label: "Supergreens Salad Mix",
  pdfName: "Supergreens Salad Mix",
  nutrition: { calories: 15, protein: 1, carbs: 3, totalFat: 0, satFat: 0, sodium: 15, fiber: 2, sugars: 1 },
  note:
    "No CMG id exists for the Salad greens/base in any captured source (calculator-menu.json, menu-rules.json, menu-metadata.json, online-meals.json) — confirmed absent, not merely unfound. Sourced directly from the official PDF row (3oz/15cal) per import-decisions.md §3.",
};

// --- import-decisions.md §6: adult Burrito/Quesadilla tortilla ---
// The official PDF provides the adult "Flour Tortilla (burrito)" nutrition,
// while manual verification against Chipotle's official live calculator UI
// confirms that the included adult Burrito tortilla and adult Quesadilla
// tortilla use this same adult portion. No included-base CMG id exists, so
// none is invented here.
export const CHIPOTLE_ADULT_TORTILLA_IMPLICIT_BASE: {
  label: string;
  pdfName: string;
  nutrition: Nutrition;
  manuallyVerified: true;
  note: string;
} = {
  label: "Adult Flour Tortilla",
  pdfName: "Flour Tortilla (burrito)",
  nutrition: { calories: 320, protein: 8, carbs: 50, totalFat: 9, satFat: 0.5, cholesterol: 0, sodium: 600, fiber: 3, sugars: 0 },
  manuallyVerified: true,
  note:
    "The numeric nutrition is sourced from the official PDF's adult Flour Tortilla (burrito) row (320cal/1ea). Its required inclusion in adult Burritos and use as the adult Quesadilla tortilla were manually verified against Chipotle's official live nutrition calculator UI; no included-base CMG id exists or is invented (import-decisions.md §6).",
};

const CHIPOTLE_STANDARD_CHEESE_PORTION_NUTRITION: Nutrition = {
  calories: 110,
  protein: 6,
  carbs: 1,
  totalFat: 8,
  satFat: 5,
  cholesterol: 30,
  sodium: 190,
  fiber: 0,
  sugars: 0,
};

// --- import-decisions.md §4: adult Quesadilla's implicit tortilla+cheese base ---
// None of the 7 adult Quesadilla entrees expose a separate CMG record for the
// tortilla or the base cheese (build-gaps-analysis.md Part B, confirmed
// absent in both calculator-menu.json and menu-rules.json). Manual
// verification against Chipotle's official live nutrition calculator UI
// confirmed the composition below. The adult tortilla nutrition is the same
// official-PDF-backed 320cal portion used by Burritos; CMG-5401 is kids-only
// and must not be used here.
export const CHIPOTLE_ADULT_QUESADILLA_IMPLICIT_BASE: {
  tortillaCount: number;
  tortillaPerUnitNutrition: Nutrition;
  tortillaPdfName: string;
  cheesePortionCount: number;
  cheesePerUnitNutrition: Nutrition;
  cheesePerUnitSourceItemId: string;
  manuallyVerified: true;
  note: string;
} = {
  tortillaCount: 1,
  tortillaPerUnitNutrition: CHIPOTLE_ADULT_TORTILLA_IMPLICIT_BASE.nutrition,
  tortillaPdfName: CHIPOTLE_ADULT_TORTILLA_IMPLICIT_BASE.pdfName,
  cheesePortionCount: 3,
  cheesePerUnitNutrition: CHIPOTLE_STANDARD_CHEESE_PORTION_NUTRITION,
  cheesePerUnitSourceItemId: "CMG-5252",
  manuallyVerified: true,
  note:
    "Manual verification against Chipotle's official live nutrition calculator UI confirmed the adult Quesadilla base is 1 adult tortilla (320cal; official PDF adult-tortilla nutrition, no CMG id) + 3 standard cheese (CMG-5252) portions = 650cal, 33g fat, 26g protein, 53g carbs, applied before selected protein/sides/addons (import-decisions.md §4 and §6). This relationship is manual-UI verification, not a separate CMG child relationship in a captured structured source; kids tortilla CMG-5401 is not used.",
};

// --- import-decisions.md §7: Kids Quesadilla tortilla+cheese base ---
// Unlike the adult tortilla, the kids tortilla has an explicit source identity
// (CMG-5401). The included one-cheese relationship was manually verified in
// the official live calculator; the ingredient nutrition values themselves
// are backed by their official captured records/PDF rows.
export const CHIPOTLE_KIDS_QUESADILLA_IMPLICIT_BASE: {
  tortillaCount: number;
  tortillaPerUnitNutrition: Nutrition;
  tortillaPerUnitSourceItemId: string;
  cheesePortionCount: number;
  cheesePerUnitNutrition: Nutrition;
  cheesePerUnitSourceItemId: string;
  manuallyVerified: true;
  note: string;
} = {
  tortillaCount: 1,
  tortillaPerUnitNutrition: { calories: 80, protein: 2, carbs: 13, totalFat: 2.5, satFat: 0, cholesterol: 0, sodium: 160, sugars: 0 },
  tortillaPerUnitSourceItemId: "CMG-5401",
  cheesePortionCount: 1,
  cheesePerUnitNutrition: CHIPOTLE_STANDARD_CHEESE_PORTION_NUTRITION,
  cheesePerUnitSourceItemId: "CMG-5252",
  manuallyVerified: true,
  note:
    "Manual verification against Chipotle's official live nutrition calculator UI confirmed the Kids Quesadilla included base is 1 kids soft flour tortilla (CMG-5401, 80cal) + exactly 1 standard cheese portion (CMG-5252, 110cal) = 190cal, 11g fat, 8g protein, 14g carbs. Selected filling/sides/drink are added separately; the adult 3x-cheese rule does not apply (import-decisions.md §7).",
};

// Taco tortilla records are authoritative per build context. In particular,
// the official 3-tortilla panels are not exact multiples of the official
// single-tortilla panels, so neither context may be calculated from the
// rounded values of the other.
export const CHIPOTLE_TACO_TORTILLA_NUTRITION_BY_CONTEXT: Readonly<
  Record<
    string,
    {
      label: string;
      sourceItemId: string;
      single: Nutrition;
      trio: Nutrition;
      trioPortion: string;
    }
  >
> = {
  soft_flour: {
    label: "Soft Flour Tortilla",
    sourceItemId: "CMG-5501",
    single: { calories: 83, protein: 2, carbs: 13, totalFat: 3, satFat: 0, transFat: 0, cholesterol: 0, sodium: 160, fiber: 0, sugars: 0 },
    trio: { calories: 250, protein: 7, carbs: 40, totalFat: 8, satFat: 0.5, transFat: 0, sodium: 480, fiber: 2, sugars: 0 },
    trioPortion: "3oz",
  },
  crispy_corn: {
    label: "Crispy Corn Tortilla",
    sourceItemId: "CMG-5503",
    single: { calories: 67, protein: 1, carbs: 10, totalFat: 3, satFat: 0, transFat: 0, cholesterol: 0, sodium: 0, fiber: 1, sugars: 0 },
    trio: { calories: 200, protein: 3, carbs: 29, totalFat: 9, satFat: 1, transFat: 0, sodium: 0, fiber: 3, sugars: 0 },
    trioPortion: "1.5oz",
  },
};

// Each Kids BYO record is one selectable serving that already contains two
// tortillas. These direct official kids panels must not be doubled again at
// runtime.
export const CHIPOTLE_KIDS_BYO_TORTILLA_NUTRITION_BY_ITEM_ID: Readonly<
  Record<string, { pdfName: string; nutrition: Nutrition }>
> = {
  "CMG-5403": {
    pdfName: "Crispy Corn Tortilla",
    nutrition: { calories: 130, protein: 2, carbs: 19, totalFat: 6, satFat: 1, transFat: 0, cholesterol: 0, sodium: 0, fiber: 2, sugars: 0 },
  },
  "CMG-5404": {
    pdfName: "Flour Tortilla (taco)",
    nutrition: { calories: 170, protein: 5, carbs: 27, totalFat: 5, satFat: 0, transFat: 0, cholesterol: 0, sodium: 320, fiber: 1, sugars: 0 },
  },
};
