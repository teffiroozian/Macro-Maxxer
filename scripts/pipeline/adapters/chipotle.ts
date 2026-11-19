import { macroEnergyCalories } from "../nutrition";
import { normalizePortionCell } from "../../lib/chipotle-portion";
import type { ExtractedRecord } from "../../extraction/contracts";
import { extractionObservation, extractionRef, extractionSources, type ExtractionDisposition, type ExtractionInput } from "../extraction-input";
// Chipotle adapter: reads the existing raw captures under
// data/restaurants/chipotle/raw/ and translates them into the universal
// contracts. It does not read the generated menu and does not replace
// scripts/importers/chipotle.ts.
//
// Nutrition values always come from the raw sources. Two kinds of documented
// knowledge from data/restaurants/chipotle/review/import-decisions.md are
// declared here as structure only (which components, how many), never as
// numbers: the implicit bases of each builder and its default build. The
// engine does the arithmetic. Curated meals reuse the existing source resolver
// for verified portion relationships before entering the shared pipeline.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  CHIPOTLE_ADULT_QUESADILLA_IMPLICIT_BASE,
  CHIPOTLE_ADULT_TORTILLA_IMPLICIT_BASE,
  CHIPOTLE_KIDS_QUESADILLA_IMPLICIT_BASE,
  CHIPOTLE_PDF_KNOWN_UNMATCHED_NAMES,
  CHIPOTLE_PDF_NAME_ALIASES,
  CHIPOTLE_SALAD_IMPLICIT_BASE,
} from "../../importers/chipotle-nutrition-mappings";
import { buildChipotleFromCaptures } from "../../importers/chipotle";
import { parseIncludedIngredientEntry } from "../../../lib/itemIngredients";
import { normalizeName } from "../../lib/normalize-name";
import type {
  AdapterIngredient,
  AdapterItem,
  AdapterOutput,
  CompositionComponent,
  DataIssue,
  ItemVariant,
  NutritionInput,
  NutritionObservation,
  PartialNutrition,
  PortionOption,
  RestaurantAdapter,
  SelectionGroup,
  SelectionOption,
  SourceDescriptor,
} from "../contracts";

// ── Raw source shapes (only the fields this adapter reads) ───────────────

export type ChipotleContent = {
  itemType: string;
  itemId: string;
  itemName: string;
  pricingReferenceItemId?: string | null;
  contentGroupName: string;
  defaultContent: boolean;
  isItemAvailable: boolean;
  customizations: Array<{ id: number; name: string }>;
};

export type ChipotleEntree = {
  itemType: string;
  itemId: string;
  itemName: string;
  primaryFillingName: string;
  isItemAvailable: boolean;
  contentGroups: Array<{ contentGroupName: string; minQuantity: number; maxQuantity: number }>;
  contents: ChipotleContent[];
};

export type ChipotleProduct = {
  itemCategory: string;
  itemType: string;
  itemId: string;
  itemName: string;
  isItemAvailable: boolean;
};

export type ChipotleLiveItem = {
  extraction?: ExtractedRecord;
  groupName?: string;
  nutrition?: Partial<Record<"tcal" | "prot" | "carb" | "tfat" | "satu" | "tran" | "sodi" | "fibe" | "suga", number>>;
  portion?: { unit: string; value: number };
};

type PdfField = { value: number | null };
export type ChipotlePdfRow = {
  extraction?: ExtractedRecord;
  name: string;
  section: "adult" | "kids";
  portion: { raw: string; amount: number | null; unit: string | null };
  calories: PdfField;
  totalFat: PdfField;
  saturatedFat: PdfField;
  transFat: PdfField;
  cholesterol: PdfField;
  sodium: PdfField;
  carbohydrates: PdfField;
  dietaryFiber: PdfField;
  sugar: PdfField;
  protein: PdfField;
};

export type ChipotleRaw = {
  publishedPortionsOnly?: boolean;
  calculatorMenu: {
    url: string;
    retrievedAt: string;
    restaurantId: number;
    entrees: ChipotleEntree[];
    sides: ChipotleProduct[];
    drinks: ChipotleProduct[];
    nonFoodItems: ChipotleProduct[];
  };
  liveNutrition: { url: string; retrievedAt: string; items: Record<string, ChipotleLiveItem> };
  pdf: { url: string; retrievedAt: string; records: ChipotlePdfRow[] };
  // Chipotle's own display order: entree ids within their meal type, and
  // content ids within each content section.
  displayOrder?: { entrees: Record<string, number>; sections: Record<string, Record<string, number>> };
  onlineMealCount: number;
  onlineMealSource?: { url: string; retrievedAt: string };
  curated?: Awaited<ReturnType<typeof buildChipotleFromCaptures>>;
};

// ── Restaurant knowledge ─────────────────────────────────────────────────

const MENU_SOURCE = "chipotle:calculator-menu";
const LIVE_SOURCE = "chipotle:live-nutrition";
const PDF_SOURCE = "chipotle:nutrition-pdf";
const MEAL_SOURCE = "chipotle:online-meals";

// Entree itemType → Macro Maxxer category. Unlisted types keep their name.
const CATEGORY_MAP: Record<string, string> = {
  KidsBYO: "Kids",
  KidsQuesadilla: "Kids",
  Side: "Sides",
  NonFood: "Non-Food",
  Drink: "Beverages",
};

// Catering builders (serve 4–6); the existing importer skips them too.
const CATERING_ENTREE_TYPES = new Set(["BYOProtein", "BYOChips"]);

// The single Taco and Tacos (3) reuse the same tortilla records, whose panels
// describe three tortillas. The single Taco takes Chipotle's official
// one-tortilla panels instead: the live taco-size record where one exists,
// otherwise the PDF's "1 ea" row.
const SINGLE_TACO_TORTILLA_PANELS: Record<string, { liveItemId?: string; pdfName: string }> = {
  "CMG-5501": { liveItemId: "CMG-5401", pdfName: "Flour Tortilla (taco)" },
  "CMG-5503": { pdfName: "Crispy Corn Tortilla" },
};
const isSingleTaco = (entree: ChipotleEntree) => entree.itemType === "Tacos" && !/\(3\)$/.test(entree.itemName);

// Chipotle's content-group identifiers → customer-facing group names.
const GROUP_LABELS: Record<string, string> = {
  RiceContentGroup: "Rice",
  BeansContentGroup: "Beans",
  ToppingsContentGroup: "Toppings",
  OptionContentGroup: "Toppings",
  PremiumContentGroup: "Addons",
  AddonContentGroup: "Addons",
  TortillaContentGroup: "Tortillas",
  DipContentGroup: "Dips",
  FillingsContentGroup: "Fillings",
  SideContentGroup: "Kids Side",
  DrinkContentGroup: "Kids Drink",
};

// Ungrouped contents are grouped by their own itemType.
const UNGROUPED_LABELS: Record<string, string> = { Toppings: "Toppings", Option: "Options" };
const PROTEIN_PORTION_TYPES = new Set(["HalfPortion", "ExtraPortion"]);

// Manually verified structure from import-decisions.md. Counts and row names
// are the importer's own decision constants; no nutrition value is taken
// from them.
const DECISIONS_SOURCE = "chipotle:import-decisions";
type ImplicitComponent = { label: string; quantity: number; decision: string } & ({ pdfName: string } | { contentItemId: string });
const IMPLICIT_COMPONENTS: Record<string, ImplicitComponent[]> = {
  Burrito: [{ label: "Tortilla", quantity: 1, decision: "§6", pdfName: CHIPOTLE_ADULT_TORTILLA_IMPLICIT_BASE.pdfName }],
  Salad: [{ label: CHIPOTLE_SALAD_IMPLICIT_BASE.label, quantity: 1, decision: "§3", pdfName: CHIPOTLE_SALAD_IMPLICIT_BASE.pdfName }],
  Quesadilla: [
    {
      label: "Tortilla",
      quantity: CHIPOTLE_ADULT_QUESADILLA_IMPLICIT_BASE.tortillaCount,
      decision: "§4",
      pdfName: CHIPOTLE_ADULT_QUESADILLA_IMPLICIT_BASE.tortillaPdfName,
    },
    {
      label: "Cheese",
      quantity: CHIPOTLE_ADULT_QUESADILLA_IMPLICIT_BASE.cheesePortionCount,
      decision: "§4",
      contentItemId: CHIPOTLE_ADULT_QUESADILLA_IMPLICIT_BASE.cheesePerUnitSourceItemId,
    },
  ],
  // The kids tortilla is a default content in the source itself.
  "Kids Quesadilla": [
    {
      label: "Cheese",
      quantity: CHIPOTLE_KIDS_QUESADILLA_IMPLICIT_BASE.cheesePortionCount,
      decision: "§7",
      contentItemId: CHIPOTLE_KIDS_QUESADILLA_IMPLICIT_BASE.cheesePerUnitSourceItemId,
    },
  ],
};
// The default build the existing importer shows for every builder: chicken,
// plus a soft flour tortilla on tacos. The source marks neither as a default.
const DEFAULT_PROTEIN = "Chicken";
const DEFAULT_SELECTIONS: Record<string, Array<{ group: string; option: string }>> = {
  Taco: [{ group: "Tortillas", option: "Soft Flour Tortilla" }],
  "Tacos (3)": [{ group: "Tortillas", option: "Soft Flour Tortilla" }],
};
const FOUNTAIN_GROUP = "FountainSoda";

// ── Nutrition ────────────────────────────────────────────────────────────

const LIVE_FIELDS = ["tcal", "prot", "carb", "tfat", "satu", "tran", "sodi", "fibe", "suga"] as const;

type LiveAssessment = { values?: PartialNutrition; calories?: number; portion?: number; rejection?: string };

// Same screening the existing importer applies, minus its one record-specific
// exception: a live panel is only used when it is complete and plausible.
export function assessLiveNutrition(item: ChipotleLiveItem | undefined): LiveAssessment {
  if (item?.extraction?.flags.includes("needs_verification")) return { rejection: "published panel needs verification" };
  if (!item?.nutrition) return { rejection: "no live nutrition record" };
  const n = item.nutrition;
  const calories = n.tcal;
  const portion = item.portion?.value;
  if (LIVE_FIELDS.some((field) => !Number.isFinite(n[field]))) return { calories, portion, rejection: "live panel is incomplete" };
  const { tcal, prot, carb, tfat, satu, tran, sodi, fibe, suga } = n as Required<typeof n>;
  if (!Number.isFinite(portion)) return { calories, rejection: "live panel has no portion" };
  if (portion === 0) return { calories, portion, rejection: "live panel has a placeholder 0 portion" };
  if (tcal > 0 && prot === 0 && carb === 0 && tfat === 0 && sodi === 0) {
    return { calories, portion, rejection: "live panel has calories but zeroed macros" };
  }
  const macroCalories = macroEnergyCalories(prot, carb, tfat);
  if (tcal > 0 && Math.abs(tcal - macroCalories) > Math.max(50, tcal * 0.35)) {
    return { calories, portion, rejection: `live calories (${tcal}) are implausible for the macro panel (~${macroCalories})` };
  }
  return {
    calories,
    portion,
    values: { calories: tcal, protein: prot, carbs: carb, totalFat: tfat, satFat: satu, transFat: tran, sodium: sodi, fiber: fibe, sugars: suga },
  };
}

function pdfValues(row: ChipotlePdfRow): PartialNutrition {
  const values: PartialNutrition = {};
  const set = (key: keyof PartialNutrition, field: PdfField) => {
    // A blank PDF cell stays unknown.
    if (field.value !== null) values[key] = field.value;
  };
  set("calories", row.calories);
  set("protein", row.protein);
  set("carbs", row.carbohydrates);
  set("totalFat", row.totalFat);
  set("satFat", row.saturatedFat);
  set("transFat", row.transFat);
  set("cholesterol", row.cholesterol);
  set("sodium", row.sodium);
  set("fiber", row.dietaryFiber);
  set("sugars", row.sugar);
  return values;
}

type PdfIndex = Map<string, ChipotlePdfRow[]>;

function buildPdfIndex(rows: readonly ChipotlePdfRow[]): PdfIndex {
  const seen = new Set<string>();
  const index: PdfIndex = new Map();
  for (const row of rows) {
    // The PDF's two pages repeat most rows verbatim.
    const signature = JSON.stringify([row.name, row.section, row.portion.raw, row.extraction ? pdfValues(row) : row.calories.value]);
    if (seen.has(signature)) continue;
    seen.add(signature);
    const key = `${row.section}|${normalizeName(row.name)}`;
    index.set(key, [...(index.get(key) ?? []), row]);
  }
  return index;
}

// Exact or aliased name within one section. A single row must agree on
// calories when a calorie hint exists; several rows are told apart by portion.
// Failing that, a row whose name is this name plus a qualifier ("Guacamole
// (large)") is accepted only when both its portion and its calories agree.
function matchPdfRow(
  index: PdfIndex,
  name: string,
  section: "adult" | "kids",
  portion: number | undefined,
  calories: number | undefined,
  unit?: string,
): ChipotlePdfRow | undefined {
  if (CHIPOTLE_PDF_KNOWN_UNMATCHED_NAMES.has(name)) return undefined;
  const sameServing = (row: ChipotlePdfRow) => !row.extraction || !unit || row.portion.unit === unit;
  for (const candidate of [name, CHIPOTLE_PDF_NAME_ALIASES[name]]) {
    if (!candidate) continue;
    const rows = index.get(`${section}|${normalizeName(candidate)}`) ?? [];
    if (rows.length === 1) {
      if ((calories === undefined || rows[0].calories.value === calories) &&
        (!rows[0].extraction || portion === undefined || rows[0].portion.amount === portion) && sameServing(rows[0])) return rows[0];
    } else if (rows.length > 1 && portion !== undefined) {
      const sized = rows.filter((row) => row.portion.amount === portion && sameServing(row) && (!row.extraction || calories === undefined || row.calories.value === calories));
      if (sized.length === 1) return sized[0];
    }
  }
  if (portion === undefined || calories === undefined) return undefined;
  const prefix = `${section}|${normalizeName(name)} `;
  const qualified = [...index.entries()]
    .filter(([key]) => key.startsWith(prefix))
    .flatMap(([, rows]) => rows)
    .filter((row) => row.portion.amount === portion && sameServing(row) && row.calories.value === calories);
  return qualified.length === 1 ? qualified[0] : undefined;
}

type NutritionContext = {
  publishedPortionsOnly?: boolean;
  live: ChipotleRaw["liveNutrition"]["items"];
  pdfIndex: PdfIndex;
  rejected: Map<string, string>;
  // Serving sizes published for a record: its live portion and, when a PDF
  // row was matched, that row's portion.
  servings: Map<string, Array<{ amount: number; unit: string }>>;
  displayOrder: NonNullable<ChipotleRaw["displayOrder"]>;
};

function pdfRef(row: ChipotlePdfRow) {
  return row.extraction ? extractionRef(row.extraction) : { sourceId: PDF_SOURCE, recordId: row.name, path: [row.section, row.portion.raw] };
}

function liveRef(context: NutritionContext, itemId: string) {
  const record = context.live[itemId]?.extraction;
  return record ? { ...extractionRef(record), recordId: itemId } : { sourceId: LIVE_SOURCE, recordId: itemId };
}

function singleTacoTortilla(context: NutritionContext, itemId: string): NutritionInput | undefined {
  const panel = SINGLE_TACO_TORTILLA_PANELS[itemId];
  if (!panel) return undefined;
  if (panel.liveItemId) return observe(context, panel.liveItemId, panel.pdfName, "adult");
  const row = matchPdfRow(context.pdfIndex, panel.pdfName, "adult", 1, undefined, "ea");
  return row
    ? [{
        source: pdfRef(row),
        values: pdfValues(row),
        basis: { kind: "selected_portion", unit: row.portion.unit ?? undefined, amount: row.portion.amount ?? undefined },
      }]
    : [];
}

function observe(context: NutritionContext, itemId: string, name: string, section: "adult" | "kids"): NutritionInput {
  const assessment = assessLiveNutrition(context.live[itemId]);
  const observations: NutritionObservation[] = [];
  const servings: Array<{ amount: number; unit: string }> = [];
  if (assessment.values && assessment.portion && context.live[itemId]?.portion?.unit) {
    servings.push({ amount: assessment.portion, unit: context.live[itemId]!.portion!.unit });
  }
  if (assessment.values) {
    observations.push({
      source: liveRef(context, itemId),
      values: assessment.values,
      basis: { kind: "selected_portion", unit: context.live[itemId]?.portion?.unit, amount: assessment.portion },
    });
  } else if (assessment.rejection) {
    context.rejected.set(itemId, `${name}: ${assessment.rejection}`);
  }
  // A rejected panel's calorie figure is not trusted as a matching hint. The
  // other section is consulted only when a trusted calorie figure can confirm
  // the row.
  const hint = assessment.values?.calories;
  const portion = assessment.portion || undefined;
  const otherSection = section === "adult" ? "kids" : "adult";
  const unit = context.live[itemId]?.portion?.unit;
  const row =
    matchPdfRow(context.pdfIndex, name, section, portion, hint, unit) ??
    (hint !== undefined && (!context.publishedPortionsOnly || (portion !== undefined && unit))
      ? matchPdfRow(context.pdfIndex, name, otherSection, portion, hint, unit)
      : undefined);
  if (row) {
    observations.push({
      source: pdfRef(row),
      values: pdfValues(row),
      basis: { kind: "selected_portion", unit: row.portion.unit ?? undefined, amount: row.portion.amount ?? undefined },
    });
    if (!row.extraction?.flags.includes("needs_verification") && row.portion.amount && row.portion.unit) servings.push({ amount: row.portion.amount, unit: row.portion.unit });
  }
  if (servings.length > 0) context.servings.set(itemId, servings);
  return observations;
}

// ── Translation ──────────────────────────────────────────────────────────

const slug = (value: string) => normalizeName(value).replace(/ /g, "-");
const isNoneOption = (name: string) => /^no\s/i.test(name);

function containerName(entree: ChipotleEntree): string {
  const prefix = `${entree.primaryFillingName} `;
  return entree.itemName.startsWith(prefix) ? entree.itemName.slice(prefix.length) : entree.itemType;
}

function proteinOption(
  entree: ChipotleEntree,
  ownerId: string,
  section: "adult" | "kids",
  context: NutritionContext,
  portionRecords: ReadonlyMap<string, ChipotleContent[]>,
): SelectionOption<NutritionInput> {
  const label = entree.primaryFillingName;
  const id = `${ownerId}:protein:${slug(label)}`;
  const order = context.displayOrder.entrees[entree.itemId];
  const ordered = order === undefined ? {} : { order };
  // "Cheese Only" is the quesadilla with no added protein; its cheese is the
  // already-included base, so selecting it adds nothing.
  if (label === "Cheese Only") {
    return { id, label, isExclusive: true, isDefault: false, isAvailable: entree.isItemAvailable, nutrition: [], ...ordered, source: { sourceId: MENU_SOURCE, recordId: entree.itemId } };
  }
  const normal = observe(context, entree.itemId, label, section);
  const linked = portionRecords.get(normalizeName(label)) ?? [];
  if (linked.length === 0) {
    return {
      id,
      label,
      ingredientId: `chipotle:ingredient:proteins:${slug(label)}`,
      isDefault: false,
      isAvailable: entree.isItemAvailable,
      nutrition: normal,
      ...ordered,
      source: { sourceId: MENU_SOURCE, recordId: entree.itemId },
    };
  }

  const portions: PortionOption<NutritionInput>[] = [
    { id: `${id}:normal`, label: "Normal", isDefault: true, ...(context.publishedPortionsOnly ? {} : { multiplier: 1 }), nutrition: normal, source: { sourceId: MENU_SOURCE, recordId: entree.itemId } },
    ...linked.map((content): PortionOption<NutritionInput> => {
      const portionLabel = content.itemType === "HalfPortion" ? "Half" : "Extra";
      const portionCalories = context.live[content.itemId]?.nutrition?.tcal;
      const normalCalories = context.live[content.pricingReferenceItemId ?? ""]?.nutrition?.tcal;
      // Most of these records publish a calorie figure but no macro panel.
      // The factor is the ratio of that figure to the calories of the entree
      // record it points at; it is
      // left out when either value is absent. A record that does publish a
      // sane panel keeps it as an observation.
      const multiplier =
        !context.publishedPortionsOnly && Number.isFinite(portionCalories) && Number.isFinite(normalCalories) && normalCalories
          ? (portionCalories as number) / normalCalories
          : undefined;
      return {
        id: `${id}:${slug(portionLabel)}`,
        label: portionLabel,
        isDefault: false,
        ...(multiplier !== undefined
          ? {
              multiplier,
              multiplierEvidence: `${content.itemName} (${content.itemId}) publishes ${portionCalories} calories against ${normalCalories} for ${content.pricingReferenceItemId}`,
            }
          : {}),
        nutrition: observe(context, content.itemId, content.itemName, section),
        source: { sourceId: MENU_SOURCE, recordId: content.itemId },
      };
    }),
  ];
  return {
    id,
    label,
    ingredientId: `chipotle:ingredient:proteins:${slug(label)}`,
    isDefault: false,
    isAvailable: entree.isItemAvailable,
    nutrition: [],
    portionPolicy: context.publishedPortionsOnly ? "alternative" : "multiplier",
    portions,
    ...ordered,
    source: { sourceId: MENU_SOURCE, recordId: entree.itemId },
  };
}

function contentGroups(
  entree: ChipotleEntree,
  ownerId: string,
  section: "adult" | "kids",
  context: NutritionContext,
  fountainCups: readonly FountainCup[],
): SelectionGroup<NutritionInput>[] {
  const groups = new Map<string, SelectionGroup<NutritionInput>>();
  for (const content of entree.contents) {
    if (PROTEIN_PORTION_TYPES.has(content.itemType)) continue;
    const declared = entree.contentGroups.find((group) => group.contentGroupName === content.contentGroupName);
    const label = content.contentGroupName
      ? (GROUP_LABELS[content.contentGroupName] ?? content.contentGroupName)
      : (UNGROUPED_LABELS[content.itemType] ?? content.itemType);
    const group: SelectionGroup<NutritionInput> = groups.get(label) ?? {
      id: `${ownerId}:${slug(label)}`,
      label,
      role: "ingredient_group",
      // Ungrouped contents carry no selection limits in the source.
      minSelections: declared ? declared.minQuantity : null,
      maxSelections: declared ? declared.maxQuantity : null,
      options: [],
      source: { sourceId: MENU_SOURCE, recordId: content.contentGroupName || content.itemType },
    };
    groups.set(label, group);
    const none = isNoneOption(content.itemName);
    const optionId = `${group.id}:${slug(content.itemName)}`;
    const nutrition = none
      ? []
      : ((isSingleTaco(entree) ? singleTacoTortilla(context, content.itemId) : undefined) ?? observe(context, content.itemId, content.itemName, section));
    const order = context.displayOrder.sections[content.contentGroupName || content.itemType]?.[content.itemId];
    group.options.push({
      id: optionId,
      label: content.itemName,
      ...(none ? { isExclusive: true } : { ingredientId: `chipotle:ingredient:${slug(label)}:${slug(content.itemName)}` }),
      isDefault: content.defaultContent,
      isAvailable: content.isItemAvailable,
      nutrition,
      ...(nutrition.length === 0 && !none ? fountainFlavors(content, optionId, context, fountainCups) : {}),
      ...(order === undefined ? {} : { order }),
      source: { sourceId: MENU_SOURCE, recordId: content.itemId },
    });
  }
  return [...groups.values()];
}

type FountainCup = { itemId: string; name: string; size: number; variants: ItemVariant<NutritionInput>[] };
const cupName = (name: string) => normalizeName(name.replace(/^\d+(\.\d+)? fl oz /i, ""));

// A fountain cup offered inside a builder (the kids drink) has only a
// placeholder panel. Its flavors are the flavors of the nearest published cup
// size, each scaled by the ratio of the two published volumes.
function fountainFlavors(
  content: ChipotleContent,
  optionId: string,
  context: NutritionContext,
  cups: readonly FountainCup[],
): Pick<SelectionOption<NutritionInput>, "portionPolicy" | "portions"> {
  const portion = context.live[content.itemId]?.portion;
  const sameDrink = cups.filter((cup) => cupName(cup.name) === cupName(content.itemName) && cup.variants.length > 0);
  if (!portion || portion.unit !== "fl oz" || !(portion.value > 0) || sameDrink.length === 0) return {};
  const cup = [...sameDrink].sort((a, b) => Math.abs(a.size - portion.value) - Math.abs(b.size - portion.value))[0];
  return {
    portionPolicy: "alternative",
    portions: cup.variants.map((variant, index) => ({
      id: `${optionId}:${slug(variant.label)}`,
      label: variant.label,
      isDefault: index === 0,
      nutrition: [],
      composition: [
        {
          label: `${variant.label} (${cup.size} fl oz)`,
          quantity: portion.value / cup.size,
          role: "scaled_source" as const,
          ref: { kind: "item" as const, id: cup.itemId, variantId: variant.id },
          evidence: `${portion.value} fl oz cup against the ${cup.size} fl oz serving the PDF publishes`,
          source: { sourceId: MENU_SOURCE, recordId: content.itemId },
        },
      ],
      source: { sourceId: MENU_SOURCE, recordId: content.itemId },
    })),
  };
}

// The default build of a builder: its implicit base, the default protein, the
// contents the source marks as default, and any declared default selection.
function builderComposition(
  entree: ChipotleEntree,
  name: string,
  itemId: string,
  fillings: ReadonlySet<string>,
  groups: readonly SelectionGroup<NutritionInput>[],
  context: NutritionContext,
): CompositionComponent<NutritionInput>[] | undefined {
  if (!fillings.has(normalizeName(DEFAULT_PROTEIN))) return undefined;
  const components: CompositionComponent<NutritionInput>[] = [];
  for (const implicit of IMPLICIT_COMPONENTS[name] ?? []) {
    let nutrition: NutritionInput;
    if ("pdfName" in implicit) {
      const rows = context.pdfIndex.get(`adult|${normalizeName(implicit.pdfName)}`) ?? [];
      nutrition =
        rows.length === 1
          ? [{ source: pdfRef(rows[0]), values: pdfValues(rows[0]) }]
          : [];
    } else {
      nutrition = observe(context, implicit.contentItemId, implicit.label, "adult");
    }
    components.push({
      label: implicit.label,
      quantity: implicit.quantity,
      role: "implicit",
      nutrition,
      source: { sourceId: DECISIONS_SOURCE, recordId: implicit.decision },
    });
  }
  components.push({
    label: DEFAULT_PROTEIN,
    quantity: 1,
    role: "default_selection",
    ref: { kind: "option", id: `${itemId}:protein:${slug(DEFAULT_PROTEIN)}` },
    source: { sourceId: DECISIONS_SOURCE, recordId: "default build" },
  });
  const declared = DEFAULT_SELECTIONS[name] ?? [];
  for (const group of groups) {
    for (const option of group.options) {
      const isDeclared = declared.some((entry) => entry.group === group.label && entry.option === option.label);
      if (!option.isDefault && !isDeclared) continue;
      components.push({
        label: option.label,
        quantity: 1,
        role: "default_selection",
        ref: { kind: "option", id: option.id },
        source: option.isDefault ? { sourceId: MENU_SOURCE, recordId: option.source?.recordId } : { sourceId: DECISIONS_SOURCE, recordId: "default build" },
      });
    }
  }
  return components;
}

type ComponentCandidate = {
  label: string;
  calories: number;
  ref: NonNullable<CompositionComponent<NutritionInput>["ref"]>;
  // Serving sizes published for this record.
  servings: Array<{ amount: number; unit: string }>;
};

// A product whose own panel is unusable but which publishes a calorie figure
// and a serving size, and whose name ends with another record's name ("Large
// X", "Side of X"), is that record at a different serving. The factor is the
// ratio of the two published serving sizes. It is accepted only when it
// reproduces the product's published calories within the tolerance; among
// several fits the closest wins, then the factor nearest 1.
function scaledSource(
  name: string,
  published: { calories: number; amount: number; unit: string },
  candidatesByName: ReadonlyMap<string, ComponentCandidate[]>,
  tolerance: number,
): CompositionComponent<NutritionInput> | undefined {
  const key = normalizeName(name);
  const fits = [...candidatesByName.entries()]
    .filter(([candidate]) => key === candidate || key.endsWith(` ${candidate}`))
    .flatMap(([, entries]) => entries)
    .flatMap((candidate) =>
      candidate.servings
        .filter((serving) => serving.unit === published.unit && serving.amount > 0)
        .map((serving) => {
          const factor = published.amount / serving.amount;
          return { candidate, serving, factor, error: Math.abs(candidate.calories * factor - published.calories) };
        }),
    )
    .filter((fit) => fit.error <= tolerance)
    .sort((a, b) => a.error - b.error || Math.abs(a.factor - 1) - Math.abs(b.factor - 1));
  if (fits.length === 0) return undefined;
  const [{ candidate, serving, factor }] = fits;
  return {
    label: candidate.label,
    quantity: factor,
    role: "scaled_source",
    ref: candidate.ref,
    evidence: `${published.amount} ${published.unit} against the ${serving.amount} ${serving.unit} serving published for ${candidate.label}`,
    source: { sourceId: MENU_SOURCE, recordId: candidate.ref.id },
  };
}

// A product named "A & B" whose own panel is unusable is composed from the
// records named A and B. Several records can carry a part's name ("Large A",
// "Side of A"); the pairing is accepted only when exactly one combination's
// calories come within the tolerance of the product's published calories.
function combinationComponents(
  name: string,
  publishedCalories: number,
  candidatesByName: ReadonlyMap<string, ComponentCandidate[]>,
  tolerance: number,
): CompositionComponent<NutritionInput>[] | undefined {
  const parts = name.split(" & ");
  if (parts.length !== 2) return undefined;
  const [first, second] = parts.map((part) => {
    const key = normalizeName(part);
    return [...candidatesByName.entries()].filter(([candidate]) => candidate === key || candidate.endsWith(` ${key}`)).flatMap(([, entries]) => entries);
  });
  const fits = first.flatMap((a) => second.filter((b) => Math.abs(a.calories + b.calories - publishedCalories) <= tolerance).map((b) => [a, b]));
  // Records that differ only in id but agree on calories are the same serving.
  const distinct = new Map(fits.map((pair) => [pair.map((entry) => entry.calories).join("+"), pair]));
  if (distinct.size !== 1) return undefined;
  return [...distinct.values()][0].map((entry) => ({
    label: entry.label,
    quantity: 1,
    role: "component" as const,
    ref: entry.ref,
    source: { sourceId: MENU_SOURCE, recordId: entry.ref.id },
  }));
}

const COMBINATION_CALORIE_TOLERANCE = 10;

function fountainVariants(
  product: ChipotleProduct,
  itemId: string,
  context: NutritionContext,
  pdfRows: readonly ChipotlePdfRow[],
  bottledNames: ReadonlySet<string>,
): ItemVariant<NutritionInput>[] {
  const size = context.live[product.itemId]?.portion?.value;
  const seen = new Set<string>();
  const variants: ItemVariant<NutritionInput>[] = [];
  const matchingRows = pdfRows.filter((row) => row.section === "adult" && row.portion.unit === "fl oz" && row.portion.amount === size);
  const byName = Map.groupBy(matchingRows, (row) => normalizeName(row.name));
  for (const row of matchingRows) {
    const key = normalizeName(row.name);
    // A fountain flavor is a PDF row at this cup size that is not sold as its
    // own bottled product.
    if (row.extraction && new Set(byName.get(key)?.map((entry) => JSON.stringify(pdfValues(entry)))).size > 1) continue;
    if (seen.has(key) || bottledNames.has(key)) continue;
    seen.add(key);
    variants.push({
      id: `${itemId}:${slug(row.name)}`,
      label: row.name,
      isDefault: variants.length === 0,
      nutrition: [
        {
          source: pdfRef(row),
          values: pdfValues(row),
          basis: { kind: "whole_item", unit: "fl oz", amount: row.portion.amount ?? undefined },
        },
      ],
      source: { sourceId: MENU_SOURCE, recordId: product.itemId },
    });
  }
  return variants;
}

export function translateChipotle(raw: ChipotleRaw): AdapterOutput {
  const context: NutritionContext = {
    publishedPortionsOnly: raw.publishedPortionsOnly,
    live: raw.liveNutrition.items,
    pdfIndex: buildPdfIndex(raw.pdf.records),
    rejected: new Map(),
    servings: new Map(),
    displayOrder: raw.displayOrder ?? { entrees: {}, sections: {} },
  };
  const items: AdapterItem[] = [];
  const ingredients = new Map<string, AdapterIngredient>();
  const candidatesByName = new Map<string, ComponentCandidate[]>();
  let unpublishedPortionChoices = 0;
  let singleTacoTortillaOptions = 0;
  const entrees = raw.calculatorMenu.entrees.filter((entree) => !CATERING_ENTREE_TYPES.has(entree.itemType));
  const cateringEntreeCount = raw.calculatorMenu.entrees.length - entrees.length;

  // Half/Extra records name their protein by pointing at one of its entree
  // ids. A protein's own entree does not list its Half record (that record is
  // the second half of a different entree), so they are gathered per container.
  const fillingByEntreeId = new Map(raw.calculatorMenu.entrees.map((entree) => [entree.itemId, entree.primaryFillingName]));
  const portionRecordsByContainer = new Map<string, Map<string, ChipotleContent[]>>();
  const fillingsByContainer = new Map<string, Set<string>>();
  for (const entree of entrees) {
    const key = `${entree.itemType}|${containerName(entree)}`;
    fillingsByContainer.set(key, (fillingsByContainer.get(key) ?? new Set()).add(normalizeName(entree.primaryFillingName)));
    const byFilling = portionRecordsByContainer.get(key) ?? new Map<string, ChipotleContent[]>();
    portionRecordsByContainer.set(key, byFilling);
    for (const content of entree.contents) {
      const filling = fillingByEntreeId.get(content.pricingReferenceItemId ?? "");
      if (!PROTEIN_PORTION_TYPES.has(content.itemType) || !filling) continue;
      const records = byFilling.get(normalizeName(filling)) ?? [];
      if (!records.some((record) => record.itemId === content.itemId)) records.push(content);
      byFilling.set(normalizeName(filling), records);
    }
  }

  const products = [...raw.calculatorMenu.sides, ...raw.calculatorMenu.drinks];
  const bottledNames = new Set(products.map((product) => normalizeName(product.itemName.replace(/^\d+ fl oz /i, ""))));
  const productId = (product: ChipotleProduct) => `chipotle:item:${slug(product.itemCategory)}:${slug(product.itemName)}`;
  const fountainCups: FountainCup[] = products
    .filter((product) => context.live[product.itemId]?.groupName === FOUNTAIN_GROUP)
    .map((product) => ({
      itemId: productId(product),
      name: product.itemName,
      size: context.live[product.itemId]?.portion?.value ?? 0,
      variants: fountainVariants(product, productId(product), context, raw.pdf.records, bottledNames),
    }));

  // One calculator entree is one container × one protein. Emitting each as
  // the same container item lets the engine merge them into one builder.
  for (const entree of entrees) {
    const name = containerName(entree);
    const id = `chipotle:item:${slug(entree.itemType)}:${slug(name)}`;
    const section = /^kids/i.test(entree.itemType) ? "kids" : "adult";
    const protein = proteinOption(
      entree,
      id,
      section,
      context,
      portionRecordsByContainer.get(`${entree.itemType}|${name}`) ?? new Map(),
    );
    const groups: SelectionGroup<NutritionInput>[] = [
      {
        id: `${id}:protein`,
        label: "Protein",
        role: "ingredient_group",
        minSelections: 1,
        maxSelections: 1,
        options: [protein],
        source: { sourceId: MENU_SOURCE, recordId: "primaryFillingName" },
      },
      ...contentGroups(entree, id, section, context, fountainCups),
    ];
    unpublishedPortionChoices += entree.contents.reduce((total, content) => total + content.customizations.length, 0);
    const singleTortilla = (option: SelectionOption<NutritionInput>) => isSingleTaco(entree) && Boolean(SINGLE_TACO_TORTILLA_PANELS[option.source?.recordId ?? ""]);
    singleTacoTortillaOptions += groups.flatMap((group) => group.options).filter(singleTortilla).length;

    for (const group of groups) {
      for (const option of group.options) {
        // The ingredient list keeps the shared record's own (three-tortilla) serving.
        if (!option.ingredientId || ingredients.has(option.ingredientId) || singleTortilla(option)) continue;
        // The ingredient list keeps one record per name, using the first
        // serving seen. Other containers' servings stay on their own options.
        ingredients.set(option.ingredientId, {
          id: option.ingredientId,
          name: option.label,
          sourceCategory: group.label === "Protein" ? "Proteins" : group.label,
          nutrition: option.portions?.find((portion) => portion.isDefault)?.nutrition ?? option.nutrition,
          sources: [{ sourceId: MENU_SOURCE, recordId: option.source?.recordId }],
        });
      }
    }

    items.push({
      id,
      name,
      model: "build-your-own",
      sourceCategory: entree.itemType,
      servingType: section === "kids" ? "kids" : "entree",
      isAvailable: entree.isItemAvailable,
      nutrition: [],
      composition: builderComposition(entree, name, id, fillingsByContainer.get(`${entree.itemType}|${name}`) ?? new Set(), groups, context),
      variants: [],
      groups,
      sources: [{ sourceId: MENU_SOURCE, recordId: entree.itemId }],
    });
    for (const content of entree.contents) {
      const calories = assessLiveNutrition(context.live[content.itemId]).values?.calories;
      const group = content.contentGroupName ? (GROUP_LABELS[content.contentGroupName] ?? content.contentGroupName) : (UNGROUPED_LABELS[content.itemType] ?? content.itemType);
      const ingredientId = `chipotle:ingredient:${slug(group)}:${slug(content.itemName)}`;
      if (calories === undefined || !ingredients.has(ingredientId) || PROTEIN_PORTION_TYPES.has(content.itemType)) continue;
      const key = normalizeName(content.itemName);
      const entries = candidatesByName.get(key) ?? [];
      // The ingredient list holds the first serving seen under this name.
      if (!entries.some((entry) => entry.ref.id === ingredientId) && ingredients.get(ingredientId)?.sources[0]?.recordId === content.itemId) {
        entries.push({ label: content.itemName, calories, ref: { kind: "ingredient", id: ingredientId }, servings: context.servings.get(content.itemId) ?? [] });
      }
      candidatesByName.set(key, entries);
    }
  }

  // Standard products, in three passes: records with a usable panel, then
  // records that are another record at a different serving, then
  // combinations of the first two.
  type Product = { product: ChipotleProduct; id: string; nutrition: NutritionInput; variants: ItemVariant<NutritionInput>[]; composition?: CompositionComponent<NutritionInput>[] };
  const calorieOnly = (itemId: string, calories: number): NutritionInput => [
    {
      // The record's own calorie figure is published even though the rest of
      // its panel is a placeholder. It is kept as a calories-only observation
      // so the engine can check the calculated value against it.
      source: liveRef(context, itemId),
      values: { calories },
      basis: { kind: "whole_item", description: "Calorie figure of a live panel whose macro fields are placeholders" },
    },
  ];
  const addCandidate = (name: string, candidate: ComponentCandidate) => {
    const key = normalizeName(name);
    candidatesByName.set(key, [...(candidatesByName.get(key) ?? []), candidate]);
  };
  const entries: Product[] = products.map((product) => {
    const id = productId(product);
    const variants = fountainCups.find((cup) => cup.itemId === id && cup.name === product.itemName)?.variants ?? [];
    const nutrition = variants.length > 0 ? [] : observe(context, product.itemId, product.itemName, "adult");
    const calories = assessLiveNutrition(context.live[product.itemId]).values?.calories;
    if (calories !== undefined) addCandidate(product.itemName, { label: product.itemName, calories, ref: { kind: "item", id }, servings: context.servings.get(product.itemId) ?? [] });
    return { product, id, nutrition, variants };
  });
  const unresolved = (entry: Product) => !raw.publishedPortionsOnly &&
    entry.variants.length === 0 && entry.nutrition.length === 0 && !entry.composition;
  for (const entry of entries.filter(unresolved)) {
    const live = context.live[entry.product.itemId];
    const calories = live?.nutrition?.tcal;
    if (!Number.isFinite(calories) || !live?.portion || !(live.portion.value > 0) || entry.product.itemName.includes(" & ")) continue;
    const published = { calories: calories as number, amount: live.portion.value, unit: live.portion.unit };
    const source = scaledSource(entry.product.itemName, published, candidatesByName, COMBINATION_CALORIE_TOLERANCE);
    if (!source) continue;
    entry.composition = [source];
    entry.nutrition = calorieOnly(entry.product.itemId, published.calories);
    addCandidate(entry.product.itemName, { label: entry.product.itemName, calories: published.calories, ref: { kind: "item", id: entry.id }, servings: [{ amount: published.amount, unit: published.unit }] });
  }
  for (const entry of entries.filter(unresolved)) {
    const calories = context.live[entry.product.itemId]?.nutrition?.tcal;
    if (!Number.isFinite(calories)) continue;
    const composition = combinationComponents(entry.product.itemName, calories as number, candidatesByName, COMBINATION_CALORIE_TOLERANCE);
    if (!composition) continue;
    entry.composition = composition;
    entry.nutrition = calorieOnly(entry.product.itemId, calories as number);
  }
  for (const { product, id, nutrition, variants, composition } of entries) {
    items.push({
      id,
      name: product.itemName,
      model: "standard",
      sourceCategory: product.itemCategory,
      servingType: product.itemCategory === "Drink" ? "drink" : "side",
      isAvailable: product.isItemAvailable,
      nutrition,
      ...(composition ? { composition } : {}),
      variants,
      groups: [],
      sources: [{ sourceId: MENU_SOURCE, recordId: product.itemId }],
    });
  }

  for (const product of raw.calculatorMenu.nonFoodItems) {
    items.push({
      id: productId(product),
      name: product.itemName.trim(),
      model: "standard",
      sourceCategory: "NonFood",
      servingType: "side",
      isAvailable: false,
      sourceOnly: true,
      nonNutritionComponent: true,
      nutrition: [],
      variants: [],
      groups: [],
      sources: [{ sourceId: MENU_SOURCE, recordId: product.itemId }],
    });
  }

  const curated = raw.curated;
  if (curated) {
    for (const recipe of curated.restaurantOutput.items) {
      const identity = recipe.source.menu;
      if (identity.role !== "preconfigured_meal" || !identity.buildBaseItemId) continue;
      const resolved = curated.presetComponents.get(recipe.id);
      if (!resolved?.length) continue;
      const defaults = resolved.map((component) => {
        const { ingredientId, defaultCount } = parseIncludedIngredientEntry(component.entry)!;
        return { itemId: ingredientId, quantity: defaultCount * (component.orderedQuantity ?? 1), nutrition: component.nutrition };
      });
      items.push({
        id: recipe.id,
        name: recipe.name,
        model: "standard",
        sourceCategory: recipe.categories[0],
        servingType: "combo",
        isAvailable: true,
        nutrition: [],
        mealPreset: {
          builderItemId: identity.buildBaseItemId,
          selections: defaults,
        },
        generatedSource: {
          ...recipe.source,
          menu: { ...identity, itemType: identity.itemType ?? undefined, itemCategory: identity.itemCategory ?? undefined },
        },
        variants: [],
        groups: [],
        sources: identity.itemIds.map((recordId) => ({ sourceId: MEAL_SOURCE, recordId })),
      });
    }
  }

  const sources: SourceDescriptor[] = [
    ...(raw.onlineMealSource ? [{
      id: MEAL_SOURCE, kind: "public_api" as const, authority: "official" as const,
      ...raw.onlineMealSource,
      notes: "Curated recipe identities, selected components and portions. Component panels are resolved by the reviewed importer from ordering and nutrition captures.",
    }] : []),
    {
      id: MENU_SOURCE,
      kind: "ordering_structured_data",
      authority: "ordering_system",
      url: raw.calculatorMenu.url,
      retrievedAt: raw.calculatorMenu.retrievedAt,
      scope: `Restaurant ${raw.calculatorMenu.restaurantId}`,
    },
    { id: LIVE_SOURCE, kind: "public_api", authority: "official", url: raw.liveNutrition.url, retrievedAt: raw.liveNutrition.retrievedAt },
    { id: PDF_SOURCE, kind: "official_document", authority: "official", url: raw.pdf.url, retrievedAt: raw.pdf.retrievedAt },
    {
      id: DECISIONS_SOURCE,
      kind: "manual_entry",
      authority: "official",
      url: "data/restaurants/chipotle/review/import-decisions.md",
      retrievedAt: raw.calculatorMenu.retrievedAt,
      notes: "Which components a builder implicitly includes and its default build, manually verified against Chipotle's official nutrition calculator. Supplies structure only; no nutrition values.",
    },
  ];

  const knownIssues: DataIssue[] = [];
  if (context.rejected.size > 0) {
    knownIssues.push({
      severity: "info",
      code: "live_panel_rejected",
      message: `${context.rejected.size} live nutrition panel(s) were not used because they are placeholders or implausible: ${[...context.rejected.values()].slice(0, 8).join("; ")}${context.rejected.size > 8 ? "; …" : ""}`,
      affectedCount: context.rejected.size,
      entityIds: [...context.rejected.keys()],
      sourceIds: [LIVE_SOURCE],
    });
  }
  if (unpublishedPortionChoices > 0) {
    knownIssues.push({
      severity: "info",
      code: "portion_choices_without_amounts",
      message: `The ordering source offers ${unpublishedPortionChoices} Light / Extra / Side / Half choices on contents but publishes no amounts for them; they are not imported.`,
      affectedCount: unpublishedPortionChoices,
      sourceIds: [MENU_SOURCE],
    });
  }
  if (cateringEntreeCount > 0) {
    knownIssues.push({
      severity: "info",
      code: "catering_not_imported",
      message: `${cateringEntreeCount} catering entree records (${[...CATERING_ENTREE_TYPES].join(", ")}; serve 4–6) are not imported.`,
      affectedCount: cateringEntreeCount,
      sourceIds: [MENU_SOURCE],
    });
  }
  if (singleTacoTortillaOptions > 0) {
    knownIssues.push({
      severity: "info",
      code: "single_taco_tortilla_panels",
      message: "The single Taco and Tacos (3) share tortilla records whose panels describe three tortillas. The single Taco uses Chipotle's official one-tortilla panels instead: live CMG-5401 (Flour Tortilla, taco size) and the PDF's 1 ea Crispy Corn Tortilla row.",
      affectedCount: singleTacoTortillaOptions,
      sourceIds: [MENU_SOURCE, LIVE_SOURCE, PDF_SOURCE],
    });
  }
  if (!curated && raw.onlineMealCount > 0) {
    knownIssues.push({
      severity: "info",
      code: "preconfigured_meals_not_imported",
      message: `${raw.onlineMealCount} preconfigured online meals are not imported; no resolved preset input was supplied.`,
      affectedCount: raw.onlineMealCount,
    });
  }

  if (curated) {
    const unsupported = curated.unresolvedOutput.records.filter((entry) => entry.recordType === "preconfigured_meal");
    for (const entry of unsupported) knownIssues.push({
      severity: "info",
      code: "preset_source_unresolved",
      message: entry.details ?? entry.reason,
      entityIds: [entry.standardizedRecordId],
      sourceIds: [MEAL_SOURCE],
    });
  }

  return {
    restaurant: { id: "chipotle", name: "Chipotle" },
    sources,
    items,
    ingredients: [...ingredients.values()],
    categoryMap: {
      ...Object.fromEntries(raw.calculatorMenu.entrees.map((entree) => [entree.itemType, CATEGORY_MAP[entree.itemType] ?? entree.itemType])),
      ...CATEGORY_MAP,
    },
    // The existing import policy: a sane live panel outranks the PDF.
    nutritionPrecedence: [LIVE_SOURCE, PDF_SOURCE],
    compositionCalorieTolerance: COMBINATION_CALORIE_TOLERANCE,
    knownIssues,
  };
}

// ── Loading the existing raw captures ────────────────────────────────────

const RAW_DIR = resolve(process.cwd(), "data/restaurants/chipotle/raw");

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(resolve(RAW_DIR, file), "utf8")) as T;
}

async function loadChipotle(): Promise<ChipotleRaw> {
  type SourceFile = { source: string; retrieved: string };
  type OrderedItems = { items?: Array<{ menuItemId: string; sortOrder: number }> };
  const orderOf = (entry: OrderedItems) => Object.fromEntries((entry.items ?? []).map((item) => [item.menuItemId, item.sortOrder]));
  const [menu, menuSource, live, liveSource, pdf, pdfSource, meals, mealsSource, metadata, curated] = await Promise.all([
    readJson<Omit<ChipotleRaw["calculatorMenu"], "url" | "retrievedAt">>("calculator-menu.json"),
    readJson<SourceFile>("calculator-menu-source.json"),
    readJson<{ items: Record<string, ChipotleLiveItem> }>("menu-metadata-nutrition.json"),
    readJson<SourceFile>("menu-metadata-nutrition-source.json"),
    readJson<{ records: ChipotlePdfRow[] }>("nutrition.json"),
    readJson<SourceFile>("nutrition-source.json"),
    readJson<unknown[]>("online-meals.json"),
    readJson<SourceFile>("online-meals-source.json"),
    readJson<{ groups?: OrderedItems[]; itemSections?: Record<string, OrderedItems> }>("menu-metadata.json"),
    buildChipotleFromCaptures(),
  ]);
  return {
    calculatorMenu: { ...menu, url: menuSource.source, retrievedAt: menuSource.retrieved },
    liveNutrition: { url: liveSource.source, retrievedAt: liveSource.retrieved, items: live.items },
    pdf: { url: pdfSource.source, retrievedAt: pdfSource.retrieved, records: pdf.records },
    displayOrder: {
      entrees: Object.assign({}, ...(metadata.groups ?? []).map(orderOf)),
      sections: Object.fromEntries(Object.entries(metadata.itemSections ?? {}).map(([key, section]) => [key, orderOf(section)])),
    },
    onlineMealCount: meals.length,
    onlineMealSource: { url: mealsSource.source, retrievedAt: mealsSource.retrieved },
    curated,
  };
}

export const chipotleAdapter: RestaurantAdapter<ChipotleRaw> = {
  id: "chipotle",
  name: "Chipotle",
  load: loadChipotle,
  translate: translateChipotle,
};

const LIVE_NUTRIENTS = {
  tcal: "calories", prot: "protein", carb: "carbs", tfat: "totalFat", satu: "satFat",
  tran: "transFat", sodi: "sodium", fibe: "fiber", suga: "sugars",
} as const;

export async function translateChipotleExtraction(input: ExtractionInput, dispositions: ExtractionDisposition): Promise<AdapterOutput> {
  type SourceFile = { source: string; retrieved: string };
  type OrderedItems = { items?: Array<{ menuItemId: string; sortOrder: number }> };
  const [menu, menuSource, nutritionMetadata, displayMetadata] = await Promise.all([
    readJson<Omit<ChipotleRaw["calculatorMenu"], "url" | "retrievedAt">>("calculator-menu.json"),
    readJson<SourceFile>("calculator-menu-source.json"),
    readJson<{ items: Record<string, Pick<ChipotleLiveItem, "groupName">> }>("menu-metadata-nutrition.json"),
    readJson<{ groups?: OrderedItems[]; itemSections?: Record<string, OrderedItems> }>("menu-metadata.json"),
  ]);
  const catalogIds = new Set([
    ...menu.entrees.flatMap((entree) => [entree.itemId, ...entree.contents.map((content) => content.itemId)]),
    ...[...menu.sides, ...menu.drinks, ...menu.nonFoodItems].map((item) => item.itemId),
  ]);
  const unique: ExtractedRecord[] = [];
  const seen = new Set<string>();
  for (const record of input.records) {
    const provenance = record.provenance;
    const key = provenance.sha256 ? JSON.stringify([provenance.url, provenance.sha256, provenance.locator]) : record.id;
    if (seen.has(key)) dispositions.set(record.id, "duplicate_capture");
    else unique.push(record);
    seen.add(key);
  }
  const endpoint = (record: ExtractedRecord, path: string) => {
    const url = new URL(record.provenance.url);
    return url.hostname === "services.chipotle.com" && url.pathname === path && record.provenance.method === "browser_rendered";
  };
  const panels = unique.filter((record) => record.flags.includes("name_from_key") &&
    endpoint(record, "/menu-metadata/v1/menu-metadata/nutrition"));
  const live: Record<string, ChipotleLiveItem> = Object.create(null);
  for (const [id, candidates] of Map.groupBy(panels, (record) => record.name)) {
    if (!catalogIds.has(id)) {
      for (const record of candidates) dispositions.set(record.id, "unknown_calculator_id");
      continue;
    }
    if (candidates.length !== 1) {
      for (const record of candidates) dispositions.set(record.id, "ambiguous_panel");
      continue;
    }
    const [record] = candidates;
    const portion = normalizePortionCell(record.servingText ?? "");
    const values = record.nutrition?.values ?? {};
    live[id] = {
      extraction: record,
      groupName: nutritionMetadata.items[id]?.groupName,
      nutrition: Object.fromEntries(Object.entries(LIVE_NUTRIENTS).flatMap(([key, nutrient]) =>
        values[nutrient] === undefined ? [] : [[key, values[nutrient]]])),
      ...(portion.amount !== null && portion.unit ? { portion: { value: portion.amount, unit: portion.unit } } : {}),
    };
    dispositions.set(record.id, assessLiveNutrition(live[id]).values ? "calculator_id_only" : "panel_withheld");
  }
  const seenPdfRows = new Set<string>();
  const pdfRecords = unique.filter((record) => {
    if (record.kind !== "nutrition_row" || record.provenance.method !== "official_document") return false;
    const key = JSON.stringify([record.provenance.url, record.provenance.sha256, record.category, record.name,
      record.servingText, record.nutrition?.raw, record.flags]);
    if (seenPdfRows.has(key)) {
      dispositions.set(record.id, "duplicate_pdf_row");
      return false;
    }
    seenPdfRows.add(key);
    return true;
  });
  if (!Object.keys(live).length || !pdfRecords.length) throw new Error("Chipotle extraction needs calculator nutrition panels and official PDF rows");
  const pdfFields = {
    calories: "calories", totalFat: "totalFat", saturatedFat: "satFat", transFat: "transFat",
    cholesterol: "cholesterol", sodium: "sodium", carbohydrates: "carbs", dietaryFiber: "fiber",
    sugar: "sugars", protein: "protein",
  } as const;
  const pdf = pdfRecords.map((record): ChipotlePdfRow => ({
    extraction: record,
    name: record.name,
    section: /^kids\b/i.test(record.category ?? "") ? "kids" : "adult",
    portion: normalizePortionCell(record.servingText ?? ""),
    ...Object.fromEntries(Object.entries(pdfFields).map(([key, nutrient]) =>
      [key, { value: record.nutrition?.values[nutrient] ?? null }])) as Pick<ChipotlePdfRow, keyof typeof pdfFields>,
  }));
  const orderOf = (entry: OrderedItems) => Object.fromEntries((entry.items ?? []).map((item) => [item.menuItemId, item.sortOrder]));
  const output = translateChipotle({
    publishedPortionsOnly: true,
    calculatorMenu: { ...menu, url: menuSource.source, retrievedAt: menuSource.retrieved },
    liveNutrition: { url: panels[0].provenance.url, retrievedAt: panels[0].provenance.retrievedAt, items: live },
    pdf: { url: pdfRecords[0].provenance.url, retrievedAt: pdfRecords[0].provenance.retrievedAt, records: pdf },
    displayOrder: {
      entrees: Object.assign({}, ...(displayMetadata.groups ?? []).map(orderOf)),
      sections: Object.fromEntries(Object.entries(displayMetadata.itemSections ?? {}).map(([key, section]) => [key, orderOf(section)])),
    },
    onlineMealCount: unique.filter((record) => endpoint(record, "/menuinnovation/v1/universalmeals/online")).length,
  });
  output.sources = [...output.sources.filter((source) => source.id !== LIVE_SOURCE && source.id !== PDF_SOURCE), ...extractionSources(input)];
  output.nutritionPrecedence = undefined;
  const extractedPdfIds = [...new Set(pdfRecords.map((record) => record.provenance.sourceId))];
  const extractedPanelIds = [...new Set(panels.map((record) => record.provenance.sourceId))];
  for (const issue of output.knownIssues ?? []) {
    if (issue.sourceIds) issue.sourceIds = [...new Set(issue.sourceIds.flatMap((id) =>
      id === LIVE_SOURCE ? extractedPanelIds : id === PDF_SOURCE ? extractedPdfIds : [id]))];
  }
  if (pdfRecords.some((record) => record.flags.includes("needs_verification"))) {
    output.knownIssues?.push({ severity: "blocker", code: "chipotle_pdf_needs_verification", message: "The extracted official PDF is retained as unverified comparison evidence. Confirm the affected servings and nutrition before approval." });
  }
  // The menu metadata can repeat calories without a verified serving unit.
  // Use the same ID to retain that evidence alongside the detailed panel.
  const metadataById = Map.groupBy(unique.filter((record) => record.flags.includes("name_from_key") &&
    endpoint(record, "/menu-metadata/v1/menu-metadata")), (record) => record.name);
  const attachMetadata = (entity: { nutrition: NutritionInput }, refs: AdapterItem["sources"]) => {
    for (const id of new Set(refs.filter((ref) => ref.sourceId === MENU_SOURCE).map((ref) => ref.recordId))) {
      const records = id ? metadataById.get(id) : undefined;
      if (records?.length === 1) entity.nutrition.push({ ...extractionObservation(records[0]), comparisonOnly: true });
    }
  };
  for (const ingredient of output.ingredients) attachMetadata(ingredient, ingredient.sources);
  for (const item of output.items) {
    if (item.model === "standard" && item.variants.length === 0) attachMetadata(item, item.sources);
    for (const group of item.groups) for (const option of group.options) {
      if (option.source && !option.portions?.length) attachMetadata(option, [option.source]);
      for (const portion of option.portions ?? []) if (portion.source) attachMetadata(portion, [portion.source]);
    }
  }
  const structural = unique.filter((record) => endpoint(record, "/menuinnovation/v1/universalmenus/menurules"));
  const extractedItems = new Map<string, ExtractedRecord[]>();
  for (const record of structural) {
    const id = record.provenance.sourceRecordId;
    if (record.kind !== "menu_item" || !id) continue;
    const records = extractedItems.get(id) ?? [];
    records.push(record);
    extractedItems.set(id, records);
  }
  const extractedGroups = Map.groupBy(structural.filter((record) => record.kind === "option_group" && record.parentId), (record) => record.parentId!);
  for (const item of output.items) {
    const id = item.sources.find((source) => source.sourceId === MENU_SOURCE)?.recordId;
    if (!id) continue;
    const records = extractedItems.get(id) ?? [];
    if (records.length !== 1) continue;
    const [record] = records;
    item.sources.push(extractionRef(record));
    for (const extracted of extractedGroups.get(record.id) ?? []) {
      const groups = item.groups.filter((group) => group.source?.recordId === extracted.name &&
        group.minSelections === extracted.customization?.minSelections && group.maxSelections === extracted.customization?.maxSelections);
      if (groups.length === 1) (groups[0].additionalSources ??= []).push(extractionRef(extracted));
    }
  }
  return output;
}
