import type { MealPreset } from "../../types/menu";
// Universal restaurant import contracts.
//
// Adapters translate one restaurant's sources into AdapterOutput; the
// normalization engine turns that into a RestaurantDraft. A draft is a
// staging artifact: it may hold incomplete or conflicting nutrition, which the
// runtime schema (types/menu.ts) cannot. Only projectToRestaurantMenu produces
// runtime records, and only for entities whose four core macros are known.
import type { MenuSourceIdentity, ServingType, SourceProvenanceValue } from "../../types/menu";
import type { OrderingGraph, RuntimeRelationships } from "./runtime-relationships";
import type { OrderingPlan } from "../../types/ordering";
import type { Nutrition } from "../../types/nutrition";

export const CONTRACT_VERSION = 1;

export type NutrientKey = keyof Nutrition;
export const CORE_NUTRIENTS = ["calories", "protein", "carbs", "totalFat"] as const;
export type CoreNutrient = (typeof CORE_NUTRIENTS)[number];
export const OPTIONAL_NUTRIENTS = ["satFat", "transFat", "cholesterol", "sodium", "fiber", "sugars"] as const;
export const ALL_NUTRIENTS: readonly NutrientKey[] = [...CORE_NUTRIENTS, ...OPTIONAL_NUTRIENTS];

// An absent key means "not published by the source". It is never zero.
export type PartialNutrition = Partial<Nutrition>;

// ── Sources and freshness ────────────────────────────────────────────────

export type SourceKind =
  | "ordering_structured_data"
  | "public_api"
  | "official_html"
  | "official_document"
  | "browser_observation"
  | "manual_entry";

export type SourceDescriptor = {
  id: string;
  kind: SourceKind;
  authority: "official" | "ordering_system" | "third_party";
  url: string;
  // ISO 8601. When this pipeline (or the research it relies on) fetched it.
  retrievedAt: string;
  // ISO 8601. When the source says it was last updated, if it says so.
  sourceUpdatedAt?: string;
  // Narrower-than-national scope, e.g. a single store.
  scope?: string;
  sha256?: string;
  notes?: string;
};

export type SourceRef = {
  sourceId: string;
  // Identifier inside that source (product id, option id, row name).
  recordId?: string;
  // Parent chain inside the source, outermost first.
  path?: string[];
};

// ── Nutrition ────────────────────────────────────────────────────────────

// What a published value is measured against. Two values are only comparable
// when their bases describe the same serving.
export type ServingBasis = {
  kind: "whole_item" | "per_serving_unit" | "selected_portion";
  // "tbsp", "quarter-cup", "fl oz", or a portion label.
  unit?: string;
  amount?: number;
  description?: string;
};

export type NutritionObservation = {
  source: SourceRef;
  values: PartialNutrition;
  basis?: ServingBasis;
};

// What adapters emit: every value seen, per source, unreconciled.
export type NutritionInput = NutritionObservation[];

export type NutritionConflict = {
  nutrient: NutrientKey;
  observations: Array<{ sourceId: string; value: number; basis?: ServingBasis }>;
  // Set only when the adapter's declared source precedence settled it.
  resolvedBySourceId?: string;
};

export type NutritionCompleteness = "complete" | "partial" | "none";

// How a record's values were calculated when they were not read directly
// from a source. Absent on records that are purely published values.
export type NutritionDerivation =
  | {
      method: "scaled";
      // Record the values were scaled from, and the factor applied.
      baseId: string;
      factor: number;
      // Where the factor comes from, in the adapter's words.
      evidence?: string;
    }
  | {
      method: "composed";
      components: Array<{ label: string; quantity: number; role: CompositionRole; refId?: string; evidence?: string }>;
      // Nutrients taken from the item's own published observations instead of
      // the component sum, because they agree with it.
      publishedNutrients: NutrientKey[];
    };

// What the engine produces. `values` holds a nutrient only when the sources
// agree or precedence resolved it; a conflicting or unpublished nutrient is
// left out rather than guessed.
export type NutritionRecord = {
  values: PartialNutrition;
  completeness: NutritionCompleteness;
  missingCore: CoreNutrient[];
  conflicts: NutritionConflict[];
  // Published observations for this record itself. A calculated record keeps
  // its own (possibly partial) observations here; the records it was
  // calculated from are named in `derivation`.
  observations: NutritionObservation[];
  derivation?: NutritionDerivation;
};

// ── Portions, selections, rules ──────────────────────────────────────────

// "alternative": each portion carries its own published amount; portions are
//   never summed or scaled from one another.
// "multiplier": the portion may be calculated from the default portion by a
//   factor the source supports.
// Whatever the policy, a portion that publishes a complete panel of its own
// uses that panel; a factor only fills in for a portion that does not.
export type PortionPolicy = "alternative" | "multiplier";

export type PortionOption<N> = {
  id: string;
  label: string;
  isDefault: boolean;
  nutrition: N;
  // Overrides the option's portionPolicy for this portion.
  policy?: PortionPolicy;
  // Only for the "multiplier" policy, and only when the source supports it.
  multiplier?: number;
  multiplierEvidence?: string;
  // Totals this portion from other records (see CompositionComponent).
  composition?: CompositionComponent<N>[];
  order?: number;
  source?: SourceRef;
};

export type SelectionOption<N> = {
  id: string;
  label: string;
  // Links to the restaurant-level ingredient this option places on the item.
  ingredientId?: string;
  isDefault: boolean;
  isAvailable: boolean;
  // Selecting this option clears the rest of its group ("No Sauce").
  isExclusive?: boolean;
  // Nutrition when the option has no portion choice.
  nutrition: N;
  composition?: CompositionComponent<N>[];
  portionPolicy?: PortionPolicy;
  portions?: PortionOption<N>[];
  // Position the source itself assigns for display. Absent when the source
  // states none; nothing is invented.
  order?: number;
  source?: SourceRef;
};

export type SelectionGroupRole =
  // add-ons and swaps on a predefined item
  | "modification"
  // a required pick that completes a predefined item (kids meal drink)
  | "required_choice"
  // an ingredient group of a build-your-own item
  | "ingredient_group"
  // preparation that carries no nutrition (bake level)
  | "preparation";

export type SelectionGroup<N> = {
  id: string;
  label: string;
  role: SelectionGroupRole;
  // null = the source publishes no bound. Never replaced with a made-up cap.
  minSelections: number | null;
  maxSelections: number | null;
  options: SelectionOption<N>[];
  source?: SourceRef;
};

export type MenuModel = "standard" | "build-your-own";

// ── Composition ──────────────────────────────────────────────────────────

export type CompositionRole =
  // always part of the item, never a customer choice (a burrito's tortilla)
  | "implicit"
  // a selection the default build includes
  | "default_selection"
  // a part of a combined product (chips + dip)
  | "component"
  // the record this one is a different-sized serving of; quantity is the
  // ratio between the two published serving sizes
  | "scaled_source";

export type CompositionRef =
  | { kind: "item"; id: string; variantId?: string }
  | { kind: "ingredient"; id: string }
  // an option of the composed item itself, at a portion (default when omitted)
  | { kind: "option"; id: string; portionId?: string };

// One part of an item whose nutrition is the sum of its parts. A component
// either points at a record or carries its own nutrition when no record
// exists for it.
export type CompositionComponent<N> = {
  label: string;
  quantity: number;
  role: CompositionRole;
  ref?: CompositionRef;
  nutrition?: N;
  // Where the quantity comes from, in the adapter's words.
  evidence?: string;
  source?: SourceRef;
};

export type ItemVariant<N> = {
  id: string;
  label: string;
  // Some sizes or packs belong to a different menu section or serving type.
  category?: string;
  servingType?: ServingType;
  sourceVariantId?: string;
  canonicalItemId?: string;
  orderingIdentity?: MenuSourceIdentity["menu"];
  generatedSource?: NonNullable<MenuSourceIdentity["generated"]>;
  tags?: string[];
  image?: string;
  isDefault: boolean;
  nutrition: N;
  composition?: CompositionComponent<N>[];
  order?: number;
  // Groups that apply only when this variant is selected. A variant with its
  // own groups replaces the item-level groups (sizes can change the rules).
  groups?: SelectionGroup<N>[];
  source?: SourceRef;
};

export type UniversalItem<N> = {
  id: string;
  name: string;
  description?: string;
  // Per item, so one restaurant can mix both models.
  model: MenuModel;
  // Category as the source names it; the engine fills `category`.
  sourceCategory: string;
  category?: string;
  servingType: ServingType;
  isAvailable: boolean;
  sourceOnly?: boolean;
  nonNutritionComponent?: boolean;
  mealPreset?: MealPreset;
  orderingIdentity?: MenuSourceIdentity["menu"];
  generatedSource?: NonNullable<MenuSourceIdentity["generated"]>;
  tags?: string[];
  // Whole-item nutrition. For a build-your-own item this is usually empty and
  // the total comes from the selected variant plus selections.
  nutrition: N;
  // When present, the engine totals these components. Published nutrition on
  // the item still wins wherever it exists and agrees with the total.
  composition?: CompositionComponent<N>[];
  variants: ItemVariant<N>[];
  requirePublishedDefaultVariant?: boolean;
  groups: SelectionGroup<N>[];
  image?: string;
  // Position the source itself assigns for display, when it states one.
  order?: number;
  sources: SourceRef[];
};

export type UniversalIngredient<N> = {
  id: string;
  name: string;
  sourceCategory: string;
  category?: string;
  nutrition: N;
  // The ingredient has no single serving independent of its parent option.
  contextualNutritionOnly?: boolean;
  // Explicit preparation identity with no standalone nutrition panel.
  preparationOnly?: boolean;
  sources: SourceRef[];
};

// A published nutrition row that is not tied to a catalog record yet (a
// national nutrition table). The engine joins these to items, variants and
// ingredients by explicit crosswalk first, then by exact normalized name.
export type ReferenceNutritionRow = {
  id: string;
  name: string;
  category?: string;
  observation: NutritionObservation;
};

// ── Adapter and draft ────────────────────────────────────────────────────

export type RestaurantIdentity = {
  id: string;
  name: string;
};

export type AdapterItem = UniversalItem<NutritionInput>;
export type AdapterIngredient = UniversalIngredient<NutritionInput>;

export type AdapterOutput = {
  restaurant: RestaurantIdentity;
  sources: SourceDescriptor[];
  // Use stable source identities when equal names can describe distinct products.
  deduplicateBy?: "identity" | "name";
  items: AdapterItem[];
  ingredients: AdapterIngredient[];
  referenceNutrition?: ReferenceNutritionRow[];
  // normalized source category → Macro Maxxer category
  categoryMap?: Record<string, string>;
  // entity id (item, variant or ingredient) → ReferenceNutritionRow.id
  nutritionCrosswalk?: Record<string, string>;
  // Reference rows restricted to these normalized categories may be matched
  // by name against ingredients in the mapped source categories.
  referenceCategoryMap?: Record<string, string[]>;
  // Source ids, most trusted first. Omit to leave every conflict unresolved.
  nutritionPrecedence?: string[];
  // A published calorie figure is kept on a composed item when it is within
  // this many calories of the component sum. Defaults to 10.
  compositionCalorieTolerance?: number;
  // Known gaps the adapter author wants on the record.
  knownIssues?: DataIssue[];
  runtimeRelationships?: RuntimeRelationships;
  orderingGraph?: OrderingGraph;
  // Adapter evidence with no verified executable nutrition model.
  configurationEvidence?: Record<string, SourceProvenanceValue>;
  orderingPlans?: Record<string, OrderingPlan>;
  additionalOrderingPlans?: Record<string, OrderingPlan[]>;
};

export interface RestaurantAdapter<Raw> {
  id: string;
  name: string;
  load(): Promise<Raw>;
  translate(raw: Raw): AdapterOutput;
}

export type IssueSeverity = "blocker" | "warning" | "info";

export type DataIssue = {
  severity: IssueSeverity;
  code: string;
  message: string;
  // Total affected records; entityIds may hold only a sample of them.
  affectedCount?: number;
  entityIds?: string[];
  sourceIds?: string[];
};

export type DraftItem = UniversalItem<NutritionRecord>;
export type DraftIngredient = UniversalIngredient<NutritionRecord>;

export type RestaurantDraft = {
  contractVersion: typeof CONTRACT_VERSION;
  // The engine only ever emits "draft". Promotion is a separate, manual stage.
  status: "draft";
  restaurant: RestaurantIdentity;
  generatedAt: string;
  sources: SourceDescriptor[];
  menuModels: MenuModel[];
  items: DraftItem[];
  ingredients: DraftIngredient[];
  runtimeRelationships?: RuntimeRelationships;
  orderingGraph?: OrderingGraph;
  // Adapter evidence with no verified executable nutrition model.
  configurationEvidence?: Record<string, SourceProvenanceValue>;
  orderingPlans?: Record<string, OrderingPlan>;
  additionalOrderingPlans?: Record<string, OrderingPlan[]>;
  unmatchedReferenceRows: string[];
  issues: DataIssue[];
  summary: {
    items: number;
    standardItems: number;
    buildYourOwnItems: number;
    ingredients: number;
    nutritionRecords: number;
    completeNutritionRecords: number;
    recordsMissingCoreMacros: number;
    nutritionConflicts: number;
    blockers: number;
  };
};
