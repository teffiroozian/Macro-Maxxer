// Parity comparison: universal-engine Chipotle draft vs the existing generated
// menu (data/restaurants/chipotle/generated/restaurant.json).
//
// Nothing here special-cases an item. Records are paired by Chipotle's own
// item ids, compared field by field, and each difference is classified from
// evidence on the record: the generated record's own provenance method, or
// which side is missing.
import { CHIPOTLE_KIDS_BYO_TORTILLA_NUTRITION_BY_ITEM_ID } from "../../importers/chipotle-nutrition-mappings";
import { normalizeName } from "../../lib/normalize-name";
import {
  ALL_NUTRIENTS,
  type DraftItem,
  type NutritionRecord,
  type PartialNutrition,
  type RestaurantDraft,
  type SelectionGroup,
  type SelectionOption,
} from "../contracts";
import { resolveSelectionNutrition } from "../nutrition";
import type { IdRegistry } from "../ids";
import { checkRuntimeMenu, projectToRestaurantMenu } from "../project";

// ── Generated menu shape (only what is compared) ─────────────────────────

type GeneratedSource = {
  menu: { itemIds?: string[]; role?: string };
  nutrition?: { method?: string; pdfName?: string | null };
};
type GeneratedVariant = { id: string; label: string; nutrition: PartialNutrition; source?: GeneratedSource };
type GeneratedCategory = { name: string; id?: string; ingredients: string[]; allowNone: boolean };
type GeneratedItem = {
  id: string;
  name: string;
  categories: string[];
  servingType: string;
  nutrition: PartialNutrition;
  ingredients?: string[];
  defaultVariantId?: string;
  variants?: GeneratedVariant[];
  customization?: { ingredientCategories?: GeneratedCategory[] };
  source: GeneratedSource;
};
type GeneratedIngredient = {
  id: string;
  name: string;
  nutrition?: PartialNutrition;
  variants?: GeneratedVariant[];
  source: GeneratedSource;
};
export type GeneratedChipotleMenu = {
  hasBuildYourOwn?: boolean;
  items: GeneratedItem[];
  ingredients: GeneratedIngredient[];
  customizationRules?: { ingredientCategories?: Record<string, { minQuantity?: number; maxQuantity?: number; allowNone?: boolean }> };
  builderConfig?: {
    entreeOptions?: Record<string, { id: string; includedIngredientIds?: string[] }>;
    categoryMaxSelections?: Record<string, number>;
  };
};

// ── Report shape ─────────────────────────────────────────────────────────

export type ParityClass =
  // Missing universal functionality: the contracts or engine cannot express it.
  | "engine_gap"
  // Legitimate Chipotle-specific behavior: a documented manual decision.
  | "restaurant_decision"
  // The draft follows the raw source; the generated menu departs from it.
  | "generated_departs_from_source"
  // The record is withheld from the runtime menu because its nutrition is
  // incomplete; the cause is one of the nutrition findings.
  | "withheld_incomplete"
  // Naming/presentation only; the underlying record agrees.
  | "presentation"
  // Should be mechanically reproducible and is not. Needs investigation.
  | "unexplained";

export const ENGINE_GAPS = {
  composed_nutrition: "No composed nutrition: an item's total cannot be built from component records (builder defaults, implicit bases, chips-and-dip combinations).",
  derived_nutrition: "No derived observation: a panel scaled from a trusted record by a stated portion ratio has nowhere to live, with its provenance.",
  preset_compositions: "No preset composition: a preconfigured meal (a named set of builder selections) is not representable.",
  structural_records: "No structural / source-only record: non-food ordering records cannot be kept without nutrition.",
  multiplier_portions_counted_missing: "Multiplier portions are counted as missing nutrition even when the factor is known, which blocks approval.",
  mixed_portion_policy: "Portion policy is set per option: one option cannot mix a portion with its own published panel and a portion scaled by a factor.",
  context_ingredients: "No per-container ingredient record: one ingredient list entry per name cannot hold a different serving per container.",
  default_selections: "No default-selection or implicit-base model: included components with quantities cannot be declared on a build-your-own item.",
  runtime_projection: "Runtime projection does not emit this field of the existing runtime schema.",
  stable_ids: "No stable id registry: draft ids do not match the ids already persisted by the app.",
  ordering: "No display order: the source's own ordering is not carried.",
} as const;
export type EngineGap = keyof typeof ENGINE_GAPS;

export type ParityFinding = {
  section: string;
  subject: string;
  field: string;
  generated: string;
  draft: string;
  classification: ParityClass;
  gap?: EngineGap;
  reason: string;
};

export type ParitySection = { name: string; compared: number; matched: number };

export type ParityReport = {
  sections: ParitySection[];
  findings: ParityFinding[];
  byClass: Record<ParityClass, number>;
  gapCounts: Partial<Record<EngineGap, number>>;
};

// ── Helpers ──────────────────────────────────────────────────────────────

// Generated provenance methods that read a published panel directly. A
// difference on one of these is not explained by any manual decision.
const DIRECT_METHODS = new Set(["live_full_nutrition", "pdf_exact_name", "pdf_alias_name", "pdf_portion_disambiguated"]);

function classifyByMethod(method: string | undefined, draftItem?: DraftItem): Pick<ParityFinding, "classification" | "gap" | "reason"> {
  if (method === "composed_from_components") {
    // The engine composes from declared components. Where the draft declares
    // none, the adapter found no pairing of named records whose calories
    // confirm the published total, and the importer's pairing is its own.
    return draftItem && !draftItem.composition
      ? {
          classification: "restaurant_decision",
          reason:
            "Generated value sums an importer-approved pairing of component records. The draft found no pairing of the named records whose calories confirm this product's published calories, so it composed nothing.",
        }
      : { classification: "engine_gap", gap: "composed_nutrition", reason: "Generated value is composed from component records." };
  }
  if (method === "approved_portion_scaling") {
    return { classification: "engine_gap", gap: "derived_nutrition", reason: "Generated value is scaled from another record by an approved portion ratio." };
  }
  if (method && !DIRECT_METHODS.has(method)) {
    return { classification: "restaurant_decision", reason: `Generated value comes from a documented manual decision (${method}).` };
  }
  return { classification: "unexplained", reason: `Generated value is read directly from a published panel (${method ?? "no method recorded"}).` };
}

const plural = (value: string) => normalizeName(value).replace(/s$/, "");
const show = (values: PartialNutrition | undefined) =>
  values && Object.keys(values).length > 0
    ? ALL_NUTRIENTS.filter((key) => values[key] !== undefined).map((key) => `${key} ${values[key]}`).join(", ")
    : "none";

// Nutrients on which the draft disagrees with, or lacks, a generated value.
function nutritionDifferences(generated: PartialNutrition | undefined, draft: PartialNutrition | undefined): string[] {
  const differences: string[] = [];
  for (const nutrient of ALL_NUTRIENTS) {
    const expected = generated?.[nutrient];
    const actual = draft?.[nutrient];
    if (expected === undefined && actual === undefined) continue;
    if (expected === undefined) differences.push(`${nutrient}: draft ${actual}, generated has none`);
    else if (actual === undefined) differences.push(`${nutrient}: generated ${expected}, draft has none`);
    // The generated file rounds to three decimals.
    else if (Math.abs(expected - actual) > 0.0006) differences.push(`${nutrient}: generated ${expected}, draft ${actual}`);
  }
  return differences;
}

function sourceIds(item: DraftItem): Set<string> {
  return new Set(item.sources.flatMap((ref) => (ref.recordId ? [ref.recordId] : [])));
}

function findDraftItem(draft: RestaurantDraft, generated: GeneratedItem, model: DraftItem["model"]): DraftItem | undefined {
  const ids = generated.source.menu.itemIds ?? [];
  return draft.items.find((item) => item.model === model && ids.some((id) => sourceIds(item).has(id)));
}

// ── Comparison ───────────────────────────────────────────────────────────

export function compareChipotleParity(draft: RestaurantDraft, generated: GeneratedChipotleMenu, registry?: IdRegistry): ParityReport {
  const findings: ParityFinding[] = [];
  const sections: ParitySection[] = [];
  const generatedIngredients = new Map(generated.ingredients.map((ingredient) => [ingredient.id, ingredient]));

  const section = (name: string) => {
    const entry: ParitySection = { name, compared: 0, matched: 0 };
    sections.push(entry);
    return {
      // One comparison; it matches when the callback reports no finding.
      compare(run: (report: (finding: Omit<ParityFinding, "section">) => void) => void) {
        let failed = false;
        entry.compared += 1;
        run((finding) => {
          failed = true;
          findings.push({ section: name, ...finding });
        });
        if (!failed) entry.matched += 1;
      },
    };
  };

  const compareNutrition = (
    report: (finding: Omit<ParityFinding, "section">) => void,
    subject: string,
    generatedValues: PartialNutrition | undefined,
    draftRecord: NutritionRecord | null | undefined,
    source: GeneratedSource | undefined,
    name: string,
    draftItem?: DraftItem,
  ) => {
    const differences = nutritionDifferences(generatedValues, draftRecord?.values);
    if (differences.length === 0) return;
    const method = source?.nutrition?.method;
    const pdfName = source?.nutrition?.pdfName;
    const tableEntry = (source?.menu.itemIds ?? []).find((id) => id in CHIPOTLE_KIDS_BYO_TORTILLA_NUTRITION_BY_ITEM_ID);

    let explanation: Pick<ParityFinding, "classification" | "gap" | "reason">;
    if (differences.every((entry) => entry.includes("generated has none"))) {
      explanation = {
        classification: "generated_departs_from_source",
        reason: "The draft carries published values the generated record omits (a calorie-confirmed official PDF row).",
      };
    } else if (method?.startsWith("pdf_") && differences.every((entry) => /generated 0, draft has none/.test(entry)) && draftRecord?.completeness !== "none") {
      explanation = {
        classification: "generated_departs_from_source",
        reason: "The official PDF cell is blank for this nutrient; the importer's PDF reader substitutes 0, the draft leaves it unknown.",
      };
    } else if (tableEntry) {
      explanation = {
        classification: "restaurant_decision",
        reason: `Generated values come from the importer's hand-maintained per-item table (CHIPOTLE_KIDS_BYO_TORTILLA_NUTRITION_BY_ITEM_ID["${tableEntry}"]), not from a mechanical match.`,
      };
    } else if (method && DIRECT_METHODS.has(method) && pdfName && normalizeName(pdfName) !== normalizeName(name) && differences.every((entry) => entry.startsWith("cholesterol"))) {
      explanation = {
        classification: "restaurant_decision",
        reason: `The generated record takes cholesterol from the PDF row "${pdfName}", linked through the importer's hand-written size-suffix table; no mechanical name match exists.`,
      };
    } else {
      explanation = classifyByMethod(method, draftItem);
    }
    report({
      subject,
      field: "nutrition",
      generated: show(generatedValues),
      draft: show(draftRecord?.values),
      ...explanation,
      reason: `${explanation.reason} ${differences.join("; ")}.`,
    });
  };

  // 1. Standard items: presence, name, category, serving type.
  const items = section("Menu items and categories");
  const standalone = generated.items.filter((item) => item.source.menu.role === "standalone_product");
  const containers = generated.items.filter((item) => item.source.menu.role === "build_container");
  const pairedDraftIds = new Set<string>();

  for (const item of [...standalone, ...containers]) {
    const model = item.source.menu.role === "build_container" ? "build-your-own" : "standard";
    const match = findDraftItem(draft, item, model);
    if (match) pairedDraftIds.add(match.id);
    items.compare((report) => {
      if (!match) {
        report({ subject: item.name, field: "presence", generated: item.id, draft: "absent", classification: "unexplained", reason: "Generated item has no draft item sharing a Chipotle item id." });
        return;
      }
      if (normalizeName(item.name) !== normalizeName(match.name)) {
        report({ subject: item.name, field: "name", generated: item.name, draft: match.name, classification: "presentation", reason: "The importer renames this record for display; the source name is kept in the draft." });
      }
      if (item.categories[0] !== match.category) {
        report({ subject: item.name, field: "category", generated: item.categories[0], draft: match.category ?? "none", classification: "unexplained", reason: "Category mapping differs." });
      }
      if (item.servingType !== match.servingType) {
        report({ subject: item.name, field: "servingType", generated: item.servingType, draft: match.servingType, classification: "unexplained", reason: "Serving type differs." });
      }
      const expectedIds = [...(item.source.menu.itemIds ?? [])].sort().join(", ");
      const actualIds = [...sourceIds(match)].sort().join(", ");
      if (expectedIds !== actualIds) {
        report({ subject: item.name, field: "sourceItemIds", generated: expectedIds, draft: actualIds, classification: "unexplained", reason: "The two pipelines merged a different set of source records into this item." });
      }
    });
  }
  for (const item of generated.items) {
    const role = item.source.menu.role;
    if (role === "standalone_product" || role === "build_container") continue;
    items.compare((report) =>
      report({
        subject: item.name,
        field: "presence",
        generated: `${item.id} (${role})`,
        draft: "absent",
        classification: "engine_gap",
        gap: role === "preconfigured_meal" ? "preset_compositions" : "structural_records",
        reason: role === "preconfigured_meal" ? "Preconfigured meal built from builder selections." : "Non-food ordering record kept as source-only.",
      }),
    );
  }
  for (const item of draft.items) {
    if (pairedDraftIds.has(item.id)) continue;
    items.compare((report) =>
      report({
        subject: item.name,
        field: "presence",
        generated: "absent",
        draft: `${item.id} (${[...sourceIds(item)].join(", ")})`,
        classification: "restaurant_decision",
        reason: "Present in the raw ordering menu; the existing importer does not import it as a menu item.",
      }),
    );
  }

  // 2. Standard item nutrition, including flavor variants.
  const nutrition = section("Nutrition values (standard items)");
  for (const item of standalone) {
    const match = findDraftItem(draft, item, "standard");
    if (!match) continue;
    if (!item.variants?.length) {
      nutrition.compare((report) => compareNutrition(report, item.name, item.nutrition, match.nutrition, item.source, item.name, match));
      continue;
    }
    const draftVariants = new Map(match.variants.map((variant) => [normalizeName(variant.label), variant]));
    for (const variant of item.variants) {
      const draftVariant = draftVariants.get(normalizeName(variant.label));
      draftVariants.delete(normalizeName(variant.label));
      nutrition.compare((report) => {
        if (!draftVariant) {
          report({ subject: `${item.name} › ${variant.label}`, field: "variant", generated: variant.id, draft: "absent", classification: "unexplained", reason: "Generated variant has no draft variant with the same label." });
          return;
        }
        compareNutrition(report, `${item.name} › ${variant.label}`, variant.nutrition, draftVariant.nutrition, variant.source, variant.label);
      });
    }
    for (const extra of draftVariants.values()) {
      nutrition.compare((report) =>
        report({
          subject: `${item.name} › ${extra.label}`,
          field: "variant",
          generated: "absent",
          draft: `${extra.id} (${show(extra.nutrition.values)})`,
          classification: "restaurant_decision",
          reason: "The official PDF lists this drink at this cup size; the existing importer does not treat it as a flavor of this fountain cup.",
        }),
      );
    }
  }

  // 3–5. Builders: container record, groups and rules, ingredient portions.
  const builders = section("Build-your-own containers");
  const groups = section("Selection groups and rules");
  const portions = section("Ingredients and portion sizes");
  const rules = generated.customizationRules?.ingredientCategories ?? {};

  for (const container of containers) {
    const match = findDraftItem(draft, container, "build-your-own");
    if (!match) continue;

    builders.compare((report) => {
      const differences = nutritionDifferences(container.nutrition, match.nutrition.values);
      const derivation = match.nutrition.derivation;
      if (differences.length > 0) {
        const base = { subject: container.name, field: "nutrition", generated: show(container.nutrition), draft: show(match.nutrition.values) };
        const defaultMethods = (container.ingredients ?? [])
          .map((id) => generatedIngredients.get(id))
          .filter((ingredient) => ingredient && !DIRECT_METHODS.has(ingredient.source.nutrition?.method ?? ""))
          .map((ingredient) => `${ingredient!.name} (${ingredient!.source.nutrition?.method})`);
        if (derivation?.method !== "composed" && match.composition && match.nutrition.completeness !== "complete") {
          report({ ...base, classification: "withheld_incomplete", reason: "The draft declares the default build, but a component lacks core nutrition, so no total is composed and the container is withheld." });
        } else if (derivation?.method !== "composed") {
          report({ ...base, classification: "engine_gap", gap: "composed_nutrition", reason: "The generated container carries the total of its default build; the draft has no composed total." });
        } else if (differences.every((entry) => entry.includes("generated has none"))) {
          report({
            ...base,
            classification: "generated_departs_from_source",
            reason: `Every nutrient the generated total carries matches. The draft total also carries nutrients every component publishes, which the generated total omits: ${differences.join("; ")}.`,
          });
        } else if (differences.every((entry) => /generated has none|draft has none/.test(entry))) {
          report({
            ...base,
            classification: "generated_departs_from_source",
            reason: `Shared nutrients match. A nutrient is totalled in the draft only when every component publishes it; the generated total includes a nutrient that a component record does not publish: ${differences.join("; ")}.`,
          });
        } else if (defaultMethods.length > 0) {
          report({
            ...base,
            classification: "restaurant_decision",
            reason: `The default build includes ${defaultMethods.join(", ")}, whose generated values come from a manual decision rather than the source record the draft totals. ${differences.join("; ")}.`,
          });
        } else {
          report({ ...base, classification: "unexplained", reason: `Composed totals differ: ${differences.join("; ")}.` });
        }
      }
      const composedDefaults = derivation?.method === "composed"
        ? derivation.components.filter((component) => component.role === "default_selection").map((component) => component.label)
        : (match.composition ?? []).filter((component) => component.role === "default_selection").map((component) => component.label);
      const defaults = composedDefaults.length > 0 ? composedDefaults : match.groups.flatMap((group) => group.options.filter((option) => option.isDefault).map((option) => option.label));
      const expectedDefaults = (container.ingredients ?? []).map((id) => generatedIngredients.get(id)?.name ?? id);
      const key = (labels: string[]) => labels.map(normalizeName).sort().join("|");
      if (key(expectedDefaults) !== key(defaults)) {
        report({
          subject: container.name,
          field: "defaultSelection",
          generated: expectedDefaults.join(", ") || "none",
          draft: defaults.join(", ") || "none",
          classification: "engine_gap",
          gap: "default_selections",
          reason: "The generated container lists a default build the draft does not declare.",
        });
      }
    });

    const draftGroups = new Map(match.groups.map((group) => [plural(group.label), group]));
    for (const category of container.customization?.ingredientCategories ?? []) {
      const group = draftGroups.get(plural(category.name));
      draftGroups.delete(plural(category.name));
      const subject = `${container.name} › ${category.name}`;

      groups.compare((report) => {
        if (!group) {
          report({ subject, field: "group", generated: category.id ?? category.name, draft: "absent", classification: "unexplained", reason: "Generated ingredient category has no draft group with the same name." });
          return;
        }
        const expected = category.ingredients.map((id) => normalizeName(generatedIngredients.get(id)?.name ?? id)).sort();
        const selectable = group.options.filter((option) => !option.isExclusive);
        const actual = selectable.map((option) => normalizeName(option.label)).sort();
        const missing = expected.filter((name) => !actual.includes(name));
        const extra = actual.filter((name) => !expected.includes(name));
        if (missing.length > 0 || extra.length > 0) {
          report({
            subject,
            field: "members",
            generated: `${expected.length} ingredients`,
            draft: `${actual.length} options`,
            classification: "generated_departs_from_source",
            reason: `Draft options are the raw source's own list for this container. ${missing.length > 0 ? `Generated only: ${missing.join(", ")}. ` : ""}${extra.length > 0 ? `Source only: ${extra.join(", ")}.` : ""}`.trim(),
          });
        }
        const rule = category.id ? rules[category.id] : undefined;
        if (rule) {
          if ((rule.minQuantity ?? null) !== group.minSelections || (rule.maxQuantity ?? null) !== group.maxSelections) {
            report({
              subject,
              field: "selectionLimits",
              generated: `${rule.minQuantity ?? "none"}–${rule.maxQuantity ?? "none"}`,
              draft: `${group.minSelections ?? "none"}–${group.maxSelections ?? "none"}`,
              classification: "unexplained",
              reason: "Minimum/maximum selections differ.",
            });
          }
        }
        // A group may be left empty when the source offers an explicit none
        // option or sets no minimum.
        const explicitNone = group.options.some((option) => option.isExclusive);
        const mayBeEmpty = explicitNone || !group.minSelections;
        if (category.allowNone !== mayBeEmpty) {
          report({
            subject,
            field: "allowNone",
            generated: String(category.allowNone),
            draft: `${mayBeEmpty} (minimum ${group.minSelections ?? "none"}, ${explicitNone ? "explicit none option" : "no none option"})`,
            classification: "generated_departs_from_source",
            reason: "The generated flag disagrees with the source's minimum and none option for this group.",
          });
        }
      });

      if (!group) continue;
      const options = new Map<string, SelectionOption<NutritionRecord>>(group.options.map((option) => [normalizeName(option.label), option]));
      for (const ingredientId of category.ingredients) {
        const ingredient = generatedIngredients.get(ingredientId);
        const option = ingredient ? options.get(normalizeName(ingredient.name)) : undefined;
        if (!ingredient || !option) continue;
        const ingredientSubject = `${subject} › ${ingredient.name}`;

        if (!ingredient.variants?.length) {
          portions.compare((report) =>
            compareNutrition(report, ingredientSubject, ingredient.nutrition, resolveSelectionNutrition(option), ingredient.source, ingredient.name),
          );
          continue;
        }
        const draftPortions = new Map((option.portions ?? []).map((portion) => [normalizeName(portion.label), portion]));
        for (const variant of ingredient.variants) {
          const portion = draftPortions.get(normalizeName(variant.label));
          portions.compare((report) => {
            const portionSubject = `${ingredientSubject} › ${variant.label}`;
            if (!portion) {
              const offered = (option.portions ?? []).map((entry) => entry.label);
              report({
                subject: portionSubject,
                field: "portion",
                generated: `${variant.id} (${show(variant.nutrition)})`,
                draft: offered.length > 0 ? `not offered (source offers ${offered.join(", ")})` : "option has no portions",
                ...(offered.length > 0
                  ? {
                      // The generated menu shares one protein record, with
                      // all of its portions, across containers.
                      classification: "generated_departs_from_source" as const,
                      reason: "The ordering source does not offer this portion of this protein on this container.",
                    }
                  : normalizeName(variant.label) === "normal"
                    ? { classification: "presentation" as const, reason: "The source offers a single portion here; the draft keeps it on the option instead of a one-entry portion list." }
                    : classifyByMethod(variant.source?.nutrition?.method)),
              });
              return;
            }
            const resolved = resolveSelectionNutrition(option, portion.id);
            if (option.portionPolicy === "multiplier" && portion.multiplier === undefined) {
              report({
                subject: portionSubject,
                field: "nutrition",
                generated: show(variant.nutrition),
                draft: "none (source publishes no calorie figure for this portion, so no factor)",
                classification: "restaurant_decision",
                reason: `The source lists this portion without any nutrition record; the generated value applies a record-specific approved factor (${variant.source?.nutrition?.method ?? "no method"}).`,
              });
              return;
            }
            const publishedAgrees =
              portion.nutrition.completeness === "complete" && nutritionDifferences(variant.nutrition, portion.nutrition.values).every((entry) => entry.includes("cholesterol"));
            if (option.portionPolicy === "multiplier" && publishedAgrees && nutritionDifferences(variant.nutrition, resolved?.values).length > 0) {
              report({
                subject: portionSubject,
                field: "nutrition",
                generated: show(variant.nutrition),
                draft: `${show(resolved?.values)} (scaled); published panel: ${show(portion.nutrition.values)}`,
                classification: "engine_gap",
                gap: "mixed_portion_policy",
                reason: "This portion publishes its own panel, which matches the generated value, but its option is scaled because a sibling portion has no panel.",
              });
              return;
            }
            compareNutrition(report, portionSubject, variant.nutrition, resolved, variant.source, ingredient.name);
          });
        }
      }
    }
    for (const group of draftGroups.values() as IterableIterator<SelectionGroup<NutritionRecord>>) {
      groups.compare((report) =>
        report({
          subject: `${container.name} › ${group.label}`,
          field: "group",
          generated: "absent",
          draft: `${group.id} (${group.options.map((option) => option.label).join(", ")})`,
          classification: "restaurant_decision",
          reason: "The ordering source offers this group; the existing importer does not expose it on this container.",
        }),
      );
    }
  }

  // 6. Stable ids: does the projected menu reuse the ids the app persists?
  const projection = projectToRestaurantMenu(draft, registry ? { registry } : {});
  const projected = projection.menu;
  const ids = section("Stable ids");
  const projectedItems = new Map(projected.items.map((item) => [item.id, item]));
  const projectedIngredients = new Map((projected.ingredients ?? []).map((ingredient) => [ingredient.id, ingredient]));
  const projectedVariantIds = new Set([...projected.items, ...(projected.ingredients ?? [])].flatMap((record) => (record.variants ?? []).map((variant) => variant.id)));
  // An exclusion is named "Owner › Record"; it matches a label only as a whole name or whole trailing segments.
  const withheld = (label: string) =>
    projection.excluded.find((entry) => normalizeName(entry.name) === normalizeName(label) || entry.name.endsWith(` › ${label}`));
  // The draft-side name of a generated record, for looking up why it was withheld.
  const draftNameFor = (item: GeneratedItem) => findDraftItem(draft, item, item.source.menu.role === "build_container" ? "build-your-own" : "standard")?.name ?? item.name;

  const missingId = (subject: string, kind: string, id: string, label: string, report: (finding: Omit<ParityFinding, "section">) => void) => {
    const exclusion = withheld(label);
    report({
      subject,
      field: `${kind} id`,
      generated: id,
      draft: exclusion ? `withheld: ${exclusion.reason}` : "not emitted",
      ...(exclusion
        ? { classification: "withheld_incomplete" as const, reason: `The draft record exists but is not projected: ${exclusion.reason}.` }
        : { classification: "unexplained" as const, reason: "The live id is not produced by the projection and no draft record was withheld under this name." }),
    });
  };

  for (const item of generated.items) {
    const role = item.source.menu.role;
    ids.compare((report) => {
      if (projectedItems.has(item.id)) return;
      if (role === "preconfigured_meal" || role === "structural") {
        report({
          subject: item.name,
          field: "item id",
          generated: item.id,
          draft: "not represented",
          classification: "engine_gap",
          gap: role === "preconfigured_meal" ? "preset_compositions" : "structural_records",
          reason: "The draft has no record of this kind, so there is nothing to give the id to.",
        });
        return;
      }
      missingId(item.name, "item", item.id, draftNameFor(item), report);
    });
    for (const variant of item.variants ?? []) {
      ids.compare((report) => {
        if (projectedVariantIds.has(variant.id)) return;
        missingId(`${item.name} › ${variant.label}`, "variant", variant.id, `${draftNameFor(item)} › ${variant.label}`, report);
      });
    }
  }
  for (const ingredient of generated.ingredients) {
    ids.compare((report) => {
      if (projectedIngredients.has(ingredient.id)) return;
      const exclusion = withheld(ingredient.name);
      const method = ingredient.source.nutrition?.method;
      report({
        subject: ingredient.name,
        field: "ingredient id",
        generated: ingredient.id,
        draft: exclusion ? `withheld: ${exclusion.reason}` : "not emitted",
        ...(exclusion
          ? { classification: "withheld_incomplete" as const, reason: `The draft option exists but is not projected: ${exclusion.reason}.` }
          : {
              classification: "generated_departs_from_source" as const,
              reason: `No builder option in the raw ordering menu resolves to this live record through its source keys (${(ingredient.source.menu.itemIds ?? []).join(", ")}; ${method ?? "no method"}).`,
            }),
      });
    });
    for (const variant of ingredient.variants ?? []) {
      ids.compare((report) => {
        if (projectedVariantIds.has(variant.id) || !projectedIngredients.has(ingredient.id)) return;
        const exclusion = withheld(`${ingredient.name} › ${variant.label}`);
        report({
          subject: `${ingredient.name} › ${variant.label}`,
          field: "portion id",
          generated: variant.id,
          draft: exclusion ? `withheld: ${exclusion.reason}` : "not emitted",
          ...(exclusion
            ? { classification: "withheld_incomplete" as const, reason: `The draft portion exists but is not projected: ${exclusion.reason}.` }
            : classifyByMethod(variant.source?.nutrition?.method)),
        });
      });
    }
  }
  ids.compare((report) => {
    if (projection.ids.conflicts.length === 0) return;
    report({
      subject: "id conflicts",
      field: "registry",
      generated: "0",
      draft: String(projection.ids.conflicts.length),
      classification: "unexplained",
      reason: projection.ids.conflicts.slice(0, 5).join(" "),
    });
  });
  const mintedByKind = new Map<string, string[]>();
  for (const addition of projection.ids.additions) mintedByKind.set(addition.kind, [...(mintedByKind.get(addition.kind) ?? []), addition.id]);
  for (const [kind, minted] of mintedByKind) {
    ids.compare((report) =>
      report({
        subject: `new ${kind} ids`,
        field: "minted",
        generated: "none",
        draft: `${minted.length}: ${minted.slice(0, 8).join(", ")}${minted.length > 8 ? ", …" : ""}`,
        classification: "restaurant_decision",
        reason: "The draft carries records the live menu has no id for (catering builds, extra fountain flavors, groups and options the importer does not expose). They are given new ids and never reuse an existing one.",
      }),
    );
  }

  // 7. Runtime structure of the projected menu.
  const runtime = section("Customizations and runtime compatibility");
  runtime.compare((report) => {
    const errors = checkRuntimeMenu(projected);
    if (errors.length === 0) return;
    report({ subject: "projected menu", field: "references", generated: "0 broken", draft: `${errors.length} broken`, classification: "unexplained", reason: errors.slice(0, 5).join(" ") });
  });

  const fieldUse = (records: readonly object[]) => {
    const counts = new Map<string, number>();
    for (const record of records) for (const key of Object.keys(record)) counts.set(key, (counts.get(key) ?? 0) + 1);
    return counts;
  };
  // Fields the pipeline has no source for; everything else missing is a gap.
  const NOT_CARRIED: Record<string, string> = {
    sourceOnly: "Marks non-food ordering records, which the draft does not hold.",
    hideFromIngredientView: "A display flag set by an import decision (hide the structural Veggie choice).",
    importMetadata: "Bookkeeping of the existing importer; the draft's own sources and issues play this role.",
    runtimeIntegration: "A status note written by the existing importer.",
  };
  const compareFields = (label: string, expected: Map<string, number>, actual: Map<string, number>) => {
    for (const [field, count] of expected) {
      runtime.compare((report) => {
        if (actual.has(field)) return;
        report({
          subject: `${label}.${field}`,
          field: "runtimeField",
          generated: `on ${count} record(s)`,
          draft: "never emitted",
          ...(NOT_CARRIED[field]
            ? { classification: "restaurant_decision" as const, reason: NOT_CARRIED[field] }
            : { classification: "engine_gap" as const, gap: "runtime_projection" as const, reason: `The existing runtime reads ${label}.${field}; the projection does not produce it.` }),
        });
      });
    }
  };
  compareFields("items", fieldUse(generated.items), fieldUse(projected.items));
  compareFields("ingredients", fieldUse(generated.ingredients), fieldUse(projected.ingredients ?? []));
  compareFields("menu", fieldUse([generated]), fieldUse([projected]));

  // Display order of every record that shares a live id.
  const liveOrder = new Map([...generated.items, ...generated.ingredients].map((record) => [record.id, (record as { defaultOrder?: number }).defaultOrder]));
  for (const record of [...projected.items, ...(projected.ingredients ?? [])]) {
    if (!liveOrder.has(record.id)) continue;
    runtime.compare((report) => {
      if (liveOrder.get(record.id) === record.defaultOrder) return;
      report({
        subject: `${record.name} (${record.id})`,
        field: "display order",
        generated: String(liveOrder.get(record.id)),
        draft: String(record.defaultOrder),
        classification: "restaurant_decision",
        reason:
          "The projection carries the position Chipotle's own section order gives this record. The importer replaces the source order for a hand-verified list of toppings (VERIFIED_TOPPING_ORDER_BY_ITEM_ID in scripts/importers/chipotle.ts).",
      });
    });
  }

  const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");
  // Why a live ingredient id is absent from a projected list.
  const absent = (id: string) => {
    if (!projectedIngredients.has(id)) {
      const name = generatedIngredients.get(id)?.name ?? id;
      const exclusion = withheld(name);
      return exclusion ? `${id} (withheld: ${exclusion.reason})` : `${id} (no draft record)`;
    }
    return `${id} (not in this list in the source)`;
  };
  const projectedRules = projected.customizationRules?.ingredientCategories ?? {};
  const projectedMax = projected.builderConfig?.categoryMaxSelections ?? {};

  for (const container of containers) {
    const item = projectedItems.get(container.id);
    if (!item) continue;
    runtime.compare((report) => {
      const expected = container.ingredients ?? [];
      const actual = item.ingredients ?? [];
      if (sameSet(expected, actual)) return;
      const manual = expected.filter((id) => !actual.includes(id)).map((id) => generatedIngredients.get(id)).filter((entry) => entry && !DIRECT_METHODS.has(entry.source.nutrition?.method ?? ""));
      report({
        subject: container.name,
        field: "default ingredients",
        generated: expected.join(", ") || "none",
        draft: actual.join(", ") || "none",
        ...(manual.length > 0
          ? { classification: "restaurant_decision" as const, reason: `The live default uses ${manual.map((entry) => `${entry!.id} (${entry!.source.nutrition?.method})`).join(", ")}, a record created by a manual decision.` }
          : { classification: "unexplained" as const, reason: "Default build ingredient ids differ." }),
      });
    });

    const projectedCategories = new Map((item.customization?.ingredientCategories ?? []).map((category) => [category.id, category]));
    for (const category of container.customization?.ingredientCategories ?? []) {
      if (!category.id) continue;
      const match = projectedCategories.get(category.id);
      const subject = `${container.name} › ${category.name}`;
      runtime.compare((report) => {
        if (!match) {
          report({ subject, field: "category id", generated: category.id!, draft: "absent", classification: "unexplained", reason: "The projected item has no category with this id." });
          return;
        }
        const missing = category.ingredients.filter((id) => !match.ingredients.includes(id));
        const extra = match.ingredients.filter((id) => !category.ingredients.includes(id));
        if (missing.length > 0 || extra.length > 0) {
          const onlyWithheld = extra.length === 0 && missing.every((id) => !projectedIngredients.has(id) && withheld(generatedIngredients.get(id)?.name ?? id));
          const manual = missing.map((id) => generatedIngredients.get(id)).filter((entry) => entry && !DIRECT_METHODS.has(entry.source.nutrition?.method ?? ""));
          report({
            subject,
            field: "category members",
            generated: `${category.ingredients.length} ids`,
            draft: `${match.ingredients.length} ids`,
            classification: onlyWithheld ? "withheld_incomplete" : manual.length > 0 ? "restaurant_decision" : "generated_departs_from_source",
            reason: `${missing.length > 0 ? `Live only: ${missing.map(absent).join(", ")}. ` : ""}${extra.length > 0 ? `Source only: ${extra.join(", ")}.` : ""}`.trim(),
          });
        }
        const rule = rules[category.id!];
        const projectedRule = projectedRules[category.id!];
        if (rule && (rule.minQuantity !== projectedRule?.minQuantity || rule.maxQuantity !== projectedRule?.maxQuantity)) {
          report({
            subject,
            field: "selection rule",
            generated: `${rule.minQuantity ?? "none"}–${rule.maxQuantity ?? "none"}`,
            draft: `${projectedRule?.minQuantity ?? "none"}–${projectedRule?.maxQuantity ?? "none"}`,
            classification: "unexplained",
            reason: "Projected selection limits differ from the live rule.",
          });
        }
        const liveMax = generated.builderConfig?.categoryMaxSelections?.[category.id!];
        if (liveMax !== undefined && liveMax !== projectedMax[category.id!]) {
          report({ subject, field: "categoryMaxSelections", generated: String(liveMax), draft: String(projectedMax[category.id!] ?? "none"), classification: "unexplained", reason: "Projected maximum differs from the live builder configuration." });
        }
      });
    }
  }
  for (const [key, option] of Object.entries(generated.builderConfig?.entreeOptions ?? {})) {
    runtime.compare((report) => {
      const match = projected.builderConfig?.entreeOptions?.[key];
      if (!match || match.id !== option.id) {
        const container = generated.items.find((item) => item.id === option.id);
        const exclusion = !match && container ? withheld(draftNameFor(container)) : undefined;
        report({
          subject: `entree option ${key}`,
          field: "entreeOption",
          generated: option.id,
          draft: exclusion ? `withheld: ${exclusion.reason}` : (match?.id ?? "absent"),
          ...(exclusion
            ? { classification: "withheld_incomplete" as const, reason: `The container is not projected, so it has no entree option: ${exclusion.reason}.` }
            : { classification: "unexplained" as const, reason: "The projected builder configuration has no matching entree option." }),
        });
        return;
      }
      if (!sameSet(option.includedIngredientIds ?? [], match.includedIngredientIds ?? [])) {
        report({
          subject: `entree option ${key}`,
          field: "includedIngredientIds",
          generated: (option.includedIngredientIds ?? []).join(", ") || "none",
          draft: (match.includedIngredientIds ?? []).join(", ") || "none",
          classification: "unexplained",
          reason: "Pre-selected ingredients differ.",
        });
      }
    });
  }

  const byClass: Record<ParityClass, number> = {
    engine_gap: 0,
    restaurant_decision: 0,
    generated_departs_from_source: 0,
    withheld_incomplete: 0,
    presentation: 0,
    unexplained: 0,
  };
  const gapCounts: Partial<Record<EngineGap, number>> = {};
  for (const finding of findings) {
    byClass[finding.classification] += 1;
    if (finding.gap) gapCounts[finding.gap] = (gapCounts[finding.gap] ?? 0) + 1;
  }
  return { sections, findings, byClass, gapCounts };
}

// ── Rendering ────────────────────────────────────────────────────────────

const CLASS_TITLES: Record<ParityClass, string> = {
  engine_gap: "Missing universal functionality",
  restaurant_decision: "Legitimate Chipotle-specific behavior",
  generated_departs_from_source: "Generated menu departs from the raw source",
  withheld_incomplete: "Withheld from the runtime menu: nutrition incomplete (cause listed under nutrition)",
  presentation: "Presentation only",
  unexplained: "Unexplained — needs investigation",
};

const cell = (value: string) => value.replace(/\|/g, "\\|").replace(/\s+/g, " ");

export function renderParityReport(report: ParityReport, draft: RestaurantDraft): string {
  const compared = report.sections.reduce((total, entry) => total + entry.compared, 0);
  const matched = report.sections.reduce((total, entry) => total + entry.matched, 0);
  const lines = [
    "# Chipotle parity report — universal engine vs existing generated menu",
    "",
    `Draft generated ${draft.generatedAt} from the raw captures in \`data/restaurants/chipotle/raw/\`. Compared against \`data/restaurants/chipotle/generated/restaurant.json\`, which was not read by the adapter.`,
    "",
    `**${matched} of ${compared} comparisons match.** ${compared - matched} comparisons differ, producing ${report.findings.length} findings.`,
    "",
    "| Section | Compared | Match | Differ |",
    "|---|---:|---:|---:|",
    ...report.sections.map((entry) => `| ${entry.name} | ${entry.compared} | ${entry.matched} | ${entry.compared - entry.matched} |`),
    "",
    "| Classification | Findings |",
    "|---|---:|",
    ...(Object.keys(CLASS_TITLES) as ParityClass[]).map((key) => `| ${CLASS_TITLES[key]} | ${report.byClass[key]} |`),
    "",
    "## Engine and runtime capabilities the comparison shows are missing",
    "",
    "| Capability | Findings |",
    "|---|---:|",
    ...Object.entries(report.gapCounts)
      .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
      .map(([gap, total]) => `| ${ENGINE_GAPS[gap as EngineGap]} | ${total} |`),
  ];

  for (const classification of Object.keys(CLASS_TITLES) as ParityClass[]) {
    const findings = report.findings.filter((finding) => finding.classification === classification);
    if (findings.length === 0) continue;
    lines.push("", `## ${CLASS_TITLES[classification]} (${findings.length})`);
    for (const sectionName of new Set(findings.map((finding) => finding.section))) {
      const rows = findings.filter((finding) => finding.section === sectionName);
      lines.push("", `### ${sectionName} (${rows.length})`, "", "| Record | Field | Generated | Draft | Why |", "|---|---|---|---|---|");
      lines.push(...rows.map((row) => `| ${cell(row.subject)} | ${row.field} | ${cell(row.generated)} | ${cell(row.draft)} | ${cell(row.reason)} |`));
    }
  }
  return `${lines.join("\n")}\n`;
}
