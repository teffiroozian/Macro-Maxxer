// Chipotle's generated data intentionally stores one ingredient record per
// builder *context* (Bowl/Burrito/Salad vs 1-Taco vs 3-Tacos vs Kids Build-
// Your-Own vs Kids Quesadilla, etc.) so the per-entree builder
// (buildChipotleIngredientMenuItems) can pick the nutrition-correct record
// for whatever entree/portion is currently selected. A handful of other
// records are simply the same official product generated twice under
// different ids because two different entrees' customization lists each
// reference their own context id for it, with identical nutrition.
//
// Every context/duplicate record making up the same real ingredient needs to
// resolve to one shared canonical id so entree-agnostic surfaces (View All
// Ingredients, global search) can present it once instead of once per
// generated record. This module is the single source of truth for that
// id -> canonical-id mapping. Nothing here is derived from a record's `name`
// string — every entry is a specific, curated generated-id relationship, the
// same one the "View All Ingredients" comparison page already relied on.
export type ContextVariantFamilyMember = { id: string; label: string };
export type ContextVariantFamily = { primaryId: string; variants: ContextVariantFamilyMember[] };

export const CHIPOTLE_TORTILLA_FAMILIES: ContextVariantFamily[] = [
  {
    primaryId: "chipotle-tortilla-crispy-corn-taco",
    variants: [
      { id: "chipotle-tortilla-crispy-corn-taco", label: "1 Taco" },
      // chipotle-cmg-5403 is the official 2-tortilla Kids serving, which is
      // nutritionally the "2 tacos" quantity — labeled consistently with
      // its 1/3-taco siblings rather than as a separate "Kids" concept.
      { id: "chipotle-cmg-5403", label: "2 Tacos" },
      { id: "chipotle-tortilla-crispy-corn-tacos-3", label: "3 Tacos" },
    ],
  },
  {
    primaryId: "chipotle-tortilla-soft-flour-taco",
    variants: [
      { id: "chipotle-tortilla-soft-flour-taco", label: "1 Taco" },
      { id: "chipotle-cmg-5404", label: "2 Tacos" },
      { id: "chipotle-tortilla-soft-flour-tacos-3", label: "3 Tacos" },
      // No separate "Kids Quesadilla" variant: Kids Quesadilla's included
      // tortilla now uses this same 1-Taco record's exact macros (see
      // kidsQuesadillaIncludedIngredientIds in generatedRuntimeAdapter.ts),
      // so chipotle-cmg-5401 (the old, less accurate 80-cal record) is
      // retired — see CHIPOTLE_HIDDEN_DUPLICATE_CANONICAL_ID_BY_ID below.
    ],
  },
];

export const CHIPOTLE_TOPPING_FAMILIES: ContextVariantFamily[] = [
  {
    // Queso Blanco: Bowl/Burrito/Salad/Tacos all use the same 120cal
    // standard addon; Quesadilla's own Addons list uses a distinct 240cal
    // record instead.
    primaryId: "chipotle-cmg-1029",
    variants: [
      { id: "chipotle-cmg-1029", label: "Standard" },
      { id: "chipotle-cmg-4134", label: "Quesadilla" },
    ],
  },
  {
    // Cilantro Lime Sauce: Bowl/Burrito/Salad use an 80cal topping;
    // Quesadilla and Tacos/Tacos(3) both use a distinct 160cal addon.
    primaryId: "chipotle-cmg-5412",
    variants: [
      { id: "chipotle-cmg-5412", label: "Standard" },
      { id: "chipotle-cmg-5414", label: "Quesadilla & Tacos" },
    ],
  },
];

// Every real protein's generated primary record already carries its own
// Normal/Half/Extra portion variants, and the per-entree builder also
// generates separate Taco/Kids *context* records so it can pick the right
// one for the current build — none of that is a logically distinct
// ingredient, just the same protein at a different serving context.
export type ProteinFamily = { primaryId: string; contextDuplicateIds: string[] };

export const CHIPOTLE_PROTEIN_SLUGS = [
  "steak",
  "chicken",
  "carnitas",
  "veggie",
  "beef-barbacoa",
  "sofritas",
  "pollo-asado",
];
export const CHIPOTLE_PROTEIN_FAMILIES: ProteinFamily[] = CHIPOTLE_PROTEIN_SLUGS.map((slug) => ({
  primaryId: `chipotle-protein-${slug}`,
  contextDuplicateIds: [
    `chipotle-protein-${slug}-taco`,
    `chipotle-protein-${slug}-tacos-3`,
    `chipotle-protein-${slug}-kids-byo`,
    `chipotle-protein-${slug}-kids-quesadilla`,
  ],
}));

// Kids meal "protein slot" alternatives — a kid can pick Guacamole or Queso
// Blanco instead of a real protein, so the generated data tags them with the
// Proteins category for selection purposes, but they're the same product as
// the standalone Toppings record, not a distinct protein.
export const CHIPOTLE_NON_PROTEIN_CANONICAL_ID_BY_ID = new Map<string, string>([
  ["chipotle-protein-guacamole-kids-byo", "chipotle-cmg-1001"],
  ["chipotle-protein-guacamole-kids-quesadilla", "chipotle-cmg-1001"],
  ["chipotle-protein-queso-blanco-kids-byo", "chipotle-cmg-1029"],
]);

// Records that are the exact same official product as another record,
// generated under a second id purely because a different entree's
// customization list references its own context id for it — identical
// nutrition, no meaningful "variant" relationship to expose.
export const CHIPOTLE_HIDDEN_DUPLICATE_CANONICAL_ID_BY_ID = new Map<string, string>([
  // chipotle-cmg-4026 ("Double Wrap with Tortilla") and
  // chipotle-cmg-4026-burrito-base ("Tortilla") are the identical official
  // tortilla under two generated ids (Burrito's optional extra vs. the
  // Burrito/Quesadilla included base).
  ["chipotle-cmg-4026", "chipotle-cmg-4026-burrito-base"],
  // Superseded by chipotle-tortilla-soft-flour-taco's exact 1-Taco panel
  // (83 cal/3g fat/2g protein/13g carbs) — no longer referenced anywhere.
  ["chipotle-cmg-5401", "chipotle-tortilla-soft-flour-taco"],
  ["chipotle-cmg-5301", "chipotle-cmg-1001"], // Guacamole — identical to chipotle-cmg-1001
  ["chipotle-cmg-1207", "chipotle-cmg-1001"], // Guacamole (single-Taco context) — identical to chipotle-cmg-1001
  ["chipotle-cmg-1034", "chipotle-cmg-1029"], // Queso Blanco (single-Taco context) — identical to chipotle-cmg-1029
  ["chipotle-cmg-5354", "chipotle-cmg-5353"], // Chipotle-Honey Vinaigrette (Quesadilla context) — identical to chipotle-cmg-5353
]);

function buildContextVariantCanonicalMap(families: ContextVariantFamily[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const family of families) {
    for (const variant of family.variants) {
      if (variant.id !== family.primaryId) {
        map.set(variant.id, family.primaryId);
      }
    }
  }
  return map;
}

function buildProteinFamilyCanonicalMap(families: ProteinFamily[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const family of families) {
    for (const duplicateId of family.contextDuplicateIds) {
      map.set(duplicateId, family.primaryId);
    }
  }
  return map;
}

const CHIPOTLE_CANONICAL_ID_BY_ID = new Map<string, string>([
  ...buildContextVariantCanonicalMap(CHIPOTLE_TORTILLA_FAMILIES),
  ...buildContextVariantCanonicalMap(CHIPOTLE_TOPPING_FAMILIES),
  ...buildProteinFamilyCanonicalMap(CHIPOTLE_PROTEIN_FAMILIES),
  ...CHIPOTLE_NON_PROTEIN_CANONICAL_ID_BY_ID,
  ...CHIPOTLE_HIDDEN_DUPLICATE_CANONICAL_ID_BY_ID,
]);

// Resolves any generated Chipotle ingredient id to the id of the logical
// ingredient it represents. Ids with no duplicate-family entry are already
// canonical and resolve to themselves.
export function getChipotleCanonicalIngredientId(id: string): string {
  return CHIPOTLE_CANONICAL_ID_BY_ID.get(id) ?? id;
}
