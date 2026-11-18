// Universal normalization engine v1: AdapterOutput → RestaurantDraft.
//
// Restaurant knowledge lives in adapters. This file only knows the universal
// contracts, so the same steps run for standard and build-your-own menus.
import { normalizeName } from "../lib/normalize-name";
import {
  CONTRACT_VERSION,
  type AdapterIngredient,
  type AdapterItem,
  type AdapterOutput,
  type CompositionComponent,
  type DataIssue,
  type DraftIngredient,
  type DraftItem,
  type ItemVariant,
  type MenuModel,
  type NutritionInput,
  type NutritionRecord,
  type PortionOption,
  type RestaurantDraft,
  type SelectionGroup,
  type SelectionOption,
  type SourceRef,
} from "./contracts";
import {
  calculatePortionNutrition,
  composeNutrition,
  reconcileNutrition,
  resolveSelectionNutrition,
  unresolvedConflicts,
  type CompositionPart,
} from "./nutrition";

export type NormalizeOptions = {
  // Injected so drafts are reproducible in tests.
  now?: string;
};

type Issues = DataIssue[];

function mergeRefs(target: SourceRef[], incoming: readonly SourceRef[]): void {
  const seen = new Set(target.map((ref) => JSON.stringify(ref)));
  for (const ref of incoming) {
    const key = JSON.stringify(ref);
    if (!seen.has(key)) {
      seen.add(key);
      target.push(ref);
    }
  }
}

function mergeNutrition(target: NutritionInput, incoming: NutritionInput): void {
  const seen = new Set(target.map((observation) => JSON.stringify(observation)));
  for (const observation of incoming) {
    const key = JSON.stringify(observation);
    if (!seen.has(key)) {
      seen.add(key);
      target.push(observation);
    }
  }
}

function mergeByLabel<T extends { label: string }>(
  target: T[],
  incoming: readonly T[],
  merge: (existing: T, duplicate: T) => void,
): void {
  const byLabel = new Map(target.map((entry) => [normalizeName(entry.label), entry]));
  for (const entry of incoming) {
    const key = normalizeName(entry.label);
    const existing = byLabel.get(key);
    if (existing) {
      merge(existing, entry);
    } else {
      byLabel.set(key, entry);
      target.push(entry);
    }
  }
}

function mergeGroups(
  target: SelectionGroup<NutritionInput>[],
  incoming: readonly SelectionGroup<NutritionInput>[],
  ownerId: string,
  issues: Issues,
): void {
  mergeByLabel(target, incoming, (existing, duplicate) => {
    if (
      existing.minSelections !== duplicate.minSelections ||
      existing.maxSelections !== duplicate.maxSelections
    ) {
      issues.push({
        severity: "warning",
        code: "selection_rule_conflict",
        message: `"${existing.label}" on ${ownerId} has different selection limits across sources (${existing.minSelections}–${existing.maxSelections} vs ${duplicate.minSelections}–${duplicate.maxSelections}); the first source's limits were kept.`,
        entityIds: [ownerId, existing.id, duplicate.id],
      });
    }
    mergeByLabel(existing.options, duplicate.options, (option, other) => {
      mergeNutrition(option.nutrition, other.nutrition);
      option.isAvailable = option.isAvailable || other.isAvailable;
      if (other.portions) {
        option.portions ??= [];
        mergeByLabel(option.portions, other.portions, (portion, otherPortion) => {
          mergeNutrition(portion.nutrition, otherPortion.nutrition);
        });
      }
    });
  });
}

// Source names often carry stray whitespace, which would otherwise reach the
// menu and split otherwise identical labels.
function trimLabels(item: AdapterItem): AdapterItem {
  item.name = item.name.trim();
  const trimGroups = (groups: SelectionGroup<NutritionInput>[] | undefined) => {
    for (const group of groups ?? []) {
      group.label = group.label.trim();
      for (const option of group.options) {
        option.label = option.label.trim();
        for (const portion of option.portions ?? []) portion.label = portion.label.trim();
      }
    }
  };
  for (const variant of item.variants) {
    variant.label = variant.label.trim();
    trimGroups(variant.groups);
  }
  trimGroups(item.groups);
  return item;
}

function dedupeItems(items: readonly AdapterItem[], issues: Issues, byIdentity: boolean): AdapterItem[] {
  const byKey = new Map<string, AdapterItem>();
  const byId = new Map<string, AdapterItem>();
  const result: AdapterItem[] = [];

  for (const source of items) {
    const item = trimLabels(structuredClone(source));
    const key = byIdentity ? item.id : `${normalizeName(item.sourceCategory)}|${normalizeName(item.name)}`;
    const existing = byKey.get(key);
    if (!existing) {
      const sameId = byId.get(item.id);
      if (sameId) {
        issues.push({
          severity: "blocker",
          code: "duplicate_item_id",
          message: `Item id "${item.id}" is used by both "${sameId.name}" and "${item.name}".`,
          entityIds: [item.id],
        });
        continue;
      }
      byKey.set(key, item);
      byId.set(item.id, item);
      result.push(item);
      continue;
    }

    if (byIdentity && (normalizeName(item.name) !== normalizeName(existing.name) ||
        normalizeName(item.sourceCategory) !== normalizeName(existing.sourceCategory))) {
      issues.push({
        severity: "blocker",
        code: "duplicate_item_id",
        message: `Item id "${item.id}" identifies both "${existing.name}" and "${item.name}" in different source records.`,
        entityIds: [item.id],
      });
      continue;
    }

    if (item.model === "build-your-own") existing.model = "build-your-own";
    existing.description ??= item.description;
    existing.composition ??= item.composition;
    existing.image ??= item.image;
    existing.isAvailable = existing.isAvailable || item.isAvailable;
    mergeRefs(existing.sources, item.sources);
    mergeNutrition(existing.nutrition, item.nutrition);
    mergeByLabel(existing.variants, item.variants, (variant, other) => {
      mergeNutrition(variant.nutrition, other.nutrition);
      if (other.groups) {
        variant.groups ??= [];
        mergeGroups(variant.groups, other.groups, variant.id, issues);
      }
    });
    mergeGroups(existing.groups, item.groups, existing.id, issues);
    issues.push({
      severity: "info",
      code: "duplicate_item_merged",
      message: `"${item.name}" appeared more than once in ${item.sourceCategory}; the records were merged into ${existing.id}.`,
      entityIds: [existing.id, item.id],
    });
  }
  return result;
}

function dedupeIngredients(
  ingredients: readonly AdapterIngredient[],
  issues: Issues,
  byIdentity: boolean,
): { ingredients: AdapterIngredient[]; replacedIds: Map<string, string> } {
  const byKey = new Map<string, AdapterIngredient>();
  const byId = new Map<string, AdapterIngredient>();
  const replacedIds = new Map<string, string>();
  const result: AdapterIngredient[] = [];

  for (const source of ingredients) {
    const ingredient = structuredClone(source);
    ingredient.name = ingredient.name.trim();
    const key = byIdentity ? ingredient.id : `${normalizeName(ingredient.sourceCategory)}|${normalizeName(ingredient.name)}`;
    const existing = byId.get(ingredient.id) ?? byKey.get(key);
    if (!existing) {
      byKey.set(key, ingredient);
      byId.set(ingredient.id, ingredient);
      result.push(ingredient);
      continue;
    }
    mergeRefs(existing.sources, ingredient.sources);
    mergeNutrition(existing.nutrition, ingredient.nutrition);
    if (existing.id !== ingredient.id) {
      replacedIds.set(ingredient.id, existing.id);
      issues.push({
        severity: "info",
        code: "duplicate_ingredient_merged",
        message: `Ingredient "${ingredient.name}" (${ingredient.id}) duplicates ${existing.id} and was merged into it.`,
        entityIds: [existing.id, ingredient.id],
      });
    }
  }
  return { ingredients: result, replacedIds };
}

function allGroups(item: AdapterItem): SelectionGroup<NutritionInput>[] {
  return [...item.groups, ...item.variants.flatMap((variant) => variant.groups ?? [])];
}

function mapCategories(output: AdapterOutput, items: AdapterItem[], ingredients: AdapterIngredient[], issues: Issues): void {
  const map = new Map(
    Object.entries(output.categoryMap ?? {}).map(([source, target]) => [normalizeName(source), target]),
  );
  const unmapped = new Map<string, string[]>();
  for (const item of items) {
    const mapped = map.get(normalizeName(item.sourceCategory));
    item.category = mapped ?? item.sourceCategory.trim();
    if (!mapped) unmapped.set(item.category, [...(unmapped.get(item.category) ?? []), item.id]);
  }
  for (const ingredient of ingredients) {
    ingredient.category = map.get(normalizeName(ingredient.sourceCategory)) ?? ingredient.sourceCategory.trim();
  }
  for (const [category, entityIds] of unmapped) {
    issues.push({
      severity: "warning",
      code: "unmapped_category",
      message: `Source category "${category}" has no Macro Maxxer category mapping; the source name was kept.`,
      entityIds,
    });
  }
}

type MatchTarget = { id: string; name: string; sourceCategory: string; nutrition: NutritionInput; byName: boolean };

function matchReferenceNutrition(
  output: AdapterOutput,
  items: AdapterItem[],
  ingredients: AdapterIngredient[],
  issues: Issues,
): string[] {
  const rows = output.referenceNutrition ?? [];
  if (rows.length === 0) return [];

  const targets: MatchTarget[] = [
    ...items.map((item) => ({ ...item, byName: true })),
    ...items.flatMap((item) =>
      item.variants.map((variant) => ({
        id: variant.id,
        name: variant.label,
        sourceCategory: item.sourceCategory,
        nutrition: variant.nutrition,
        byName: false,
      })),
    ),
    ...ingredients.map((ingredient) => ({ ...ingredient, byName: true })),
  ];
  const targetById = new Map(targets.map((target) => [target.id, target]));
  const rowById = new Map(rows.map((row) => [row.id, row]));
  const usedRowIds = new Set<string>();
  const crosswalkedTargetIds = new Set<string>();

  for (const [targetId, rowId] of Object.entries(output.nutritionCrosswalk ?? {})) {
    const target = targetById.get(targetId);
    const row = rowById.get(rowId);
    if (!target || !row) {
      issues.push({
        severity: "warning",
        code: "crosswalk_target_missing",
        message: `Nutrition crosswalk ${targetId} → ${rowId} points at a record that does not exist.`,
        entityIds: [targetId],
      });
      continue;
    }
    mergeNutrition(target.nutrition, [row.observation]);
    usedRowIds.add(row.id);
    crosswalkedTargetIds.add(target.id);
  }

  const categoryMap = output.referenceCategoryMap
    ? new Map(
        Object.entries(output.referenceCategoryMap).map(([category, allowed]) => [
          normalizeName(category),
          new Set(allowed.map(normalizeName)),
        ]),
      )
    : null;

  for (const row of rows) {
    if (usedRowIds.has(row.id)) continue;
    // With a reference category map, a row is only joined by name inside the
    // source categories the adapter vouched for. No fuzzy matching.
    const allowed = categoryMap ? categoryMap.get(normalizeName(row.category ?? "")) : undefined;
    if (categoryMap && !allowed) continue;
    const rowName = normalizeName(row.name);
    const candidates = targets.filter(
      (target) =>
        target.byName &&
        !crosswalkedTargetIds.has(target.id) &&
        normalizeName(target.name) === rowName &&
        (!allowed || allowed.has(normalizeName(target.sourceCategory))),
    );
    if (candidates.length === 1) {
      mergeNutrition(candidates[0].nutrition, [row.observation]);
      usedRowIds.add(row.id);
    } else if (candidates.length > 1) {
      issues.push({
        severity: "warning",
        code: "reference_match_ambiguous",
        message: `Nutrition row "${row.name}" matches ${candidates.length} records by name; none was linked. Add a crosswalk entry.`,
        entityIds: candidates.map((candidate) => candidate.id),
        sourceIds: [row.observation.source.sourceId],
      });
    }
  }
  return rows.filter((row) => !usedRowIds.has(row.id)).map((row) => row.id);
}

function checkGroupRules(group: SelectionGroup<NutritionInput>, ownerId: string, issues: Issues): void {
  const { minSelections: min, maxSelections: max } = group;
  const entityIds = [ownerId, group.id];
  if ((min !== null && min < 0) || (max !== null && max < 0) || (min !== null && max !== null && min > max)) {
    issues.push({
      severity: "blocker",
      code: "selection_rule_invalid",
      message: `"${group.label}" on ${ownerId} has impossible selection limits (min ${min}, max ${max}).`,
      entityIds,
    });
  }
  const ids = group.options.map((option) => option.id);
  if (new Set(ids).size !== ids.length) {
    issues.push({
      severity: "blocker",
      code: "duplicate_option_id",
      message: `"${group.label}" on ${ownerId} repeats an option id.`,
      entityIds,
    });
  }
  const available = group.options.filter((option) => option.isAvailable);
  if (min !== null && min > 0 && available.length < min) {
    issues.push({
      severity: "warning",
      code: "required_group_unsatisfiable",
      message: `"${group.label}" on ${ownerId} requires ${min} selection(s) but only ${available.length} option(s) are available.`,
      entityIds,
    });
  }
  const defaults = group.options.filter((option) => option.isDefault).length;
  if (max !== null && defaults > max) {
    issues.push({
      severity: "warning",
      code: "defaults_exceed_max",
      message: `"${group.label}" on ${ownerId} has ${defaults} default options but allows at most ${max}.`,
      entityIds,
    });
  }
  for (const option of group.options) {
    if (!option.portions || option.portions.length === 0) continue;
    const portionDefaults = option.portions.filter((portion) => portion.isDefault).length;
    if (portionDefaults !== 1) {
      issues.push({
        severity: "warning",
        code: "portion_default_invalid",
        message: `"${option.label}" in "${group.label}" on ${ownerId} has ${portionDefaults} default portions; exactly one is expected.`,
        entityIds: [ownerId, option.id],
      });
    }
  }
}

type RecordCollector = (id: string, label: string, record: NutritionRecord, expected: boolean) => void;

type ReconcileSettings = {
  precedence: readonly string[];
  calorieTolerance: number;
  issues: Issues;
  collect: RecordCollector;
};

// A record whose nutrition may be totalled from components.
type ComposableNode = {
  id: string;
  label: string;
  owner: DraftItem;
  target: { nutrition: NutritionRecord; composition?: CompositionComponent<NutritionRecord>[] };
};

function reconcileTree(
  items: AdapterItem[],
  ingredients: AdapterIngredient[],
  settings: ReconcileSettings,
): { items: DraftItem[]; ingredients: DraftIngredient[] } {
  const { issues, collect } = settings;
  const reconcile = (input: NutritionInput) => reconcileNutrition(input, settings.precedence);
  const convertComposition = (composition: CompositionComponent<NutritionInput>[] | undefined) =>
    composition?.map((component) => ({ ...component, nutrition: component.nutrition ? reconcile(component.nutrition) : undefined }));

  // Records are counted only after compositions are final.
  const pending: Array<{ id: string; label: string; target: { nutrition: NutritionRecord }; expected: boolean }> = [];
  const nodes: Array<Omit<ComposableNode, "owner"> & { ownerId: string }> = [];
  const track = <T extends ComposableNode["target"]>(id: string, label: string, ownerId: string, target: T, expected: boolean): T => {
    pending.push({ id, label, target, expected });
    nodes.push({ id, label, ownerId, target });
    return target;
  };

  const convertGroup = (group: SelectionGroup<NutritionInput>, ownerId: string, ownerName: string): SelectionGroup<NutritionRecord> => ({
    ...group,
    options: group.options.map((option): SelectionOption<NutritionRecord> => {
      const hasPortions = (option.portions?.length ?? 0) > 0;
      const carriesNutrition = group.role !== "preparation" && !option.isExclusive;
      const optionName = `${ownerName} › ${group.label} › ${option.label}`;
      const nutrition = reconcile(option.nutrition);

      const published = (option.portions ?? []).map((portion) => reconcile(portion.nutrition));
      const defaultIndex = (option.portions ?? []).findIndex((portion) => portion.isDefault);
      const base =
        defaultIndex >= 0
          ? { id: option.portions![defaultIndex].id, record: published[defaultIndex] }
          : hasPortions
            ? { id: option.id, record: nutrition }
            : undefined;

      return track(
        option.id,
        optionName,
        ownerId,
        {
          ...option,
          nutrition,
          composition: convertComposition(option.composition),
          portions: option.portions?.map((portion, index): PortionOption<NutritionRecord> => {
            const policy = portion.policy ?? option.portionPolicy ?? "alternative";
            const portionNutrition = calculatePortionNutrition({
              published: published[index],
              policy,
              isDefault: portion.isDefault,
              multiplier: portion.multiplier,
              evidence: portion.multiplierEvidence,
              base,
            });
            if (carriesNutrition && policy === "multiplier" && !portion.isDefault && portion.multiplier === undefined && portionNutrition.completeness !== "complete") {
              issues.push({
                severity: "warning",
                code: "portion_multiplier_missing",
                message: `${optionName} › ${portion.label} has no complete published nutrition and the source supports no factor for it; its nutrition stays unknown.`,
                entityIds: [ownerId, portion.id],
              });
            }
            return track(
              portion.id,
              `${optionName} › ${portion.label}`,
              ownerId,
              { ...portion, nutrition: portionNutrition, composition: convertComposition(portion.composition) },
              carriesNutrition,
            );
          }),
        },
        carriesNutrition && !hasPortions,
      );
    }),
  });

  const draftItems = items.map((item): DraftItem => {
    const source = item.sources[0];
    const composition: typeof item.composition = item.mealPreset && source
      ? item.mealPreset.selections.map(({ itemId, nutrition, quantity }) => ({
        label: itemId,
        quantity: 1, // The resolved panel already represents the selected portion.
        role: "default_selection",
        nutrition: [{ source, values: nutrition, basis: { kind: "selected_portion", amount: quantity } }],
        source,
      }))
      : item.composition;
    const expected = Boolean(composition) || (item.model === "standard" && !item.sourceOnly && item.variants.length === 0);
    return track(
      item.id,
      item.name,
      item.id,
      {
        ...item,
        nutrition: reconcile(item.nutrition),
        composition: convertComposition(composition),
        variants: item.variants.map((variant): ItemVariant<NutritionRecord> => {
          const variantName = `${item.name} › ${variant.label}`;
          return track(
            variant.id,
            variantName,
            item.id,
            {
              ...variant,
              nutrition: reconcile(variant.nutrition),
              composition: convertComposition(variant.composition),
              groups: variant.groups?.map((group) => convertGroup(group, item.id, variantName)),
            },
            true,
          );
        }),
        groups: item.groups.map((group) => convertGroup(group, item.id, item.name)),
      },
      expected,
    );
  });

  const draftIngredients = ingredients.map((ingredient): DraftIngredient => {
    const record = { ...ingredient, nutrition: reconcile(ingredient.nutrition) };
    pending.push({ id: ingredient.id, label: `${ingredient.sourceCategory} › ${ingredient.name}`, target: record, expected: !ingredient.contextualNutritionOnly && !ingredient.preparationOnly });
    return record;
  });

  const itemById = new Map(draftItems.map((item) => [item.id, item]));
  applyCompositions(
    nodes.map(({ ownerId, ...node }) => ({ ...node, owner: itemById.get(ownerId)! })),
    draftItems,
    draftIngredients,
    settings,
  );
  for (const entry of pending) collect(entry.id, entry.label, entry.target.nutrition, entry.expected);
  return { items: draftItems, ingredients: draftIngredients };
}

// Totals every record that declares a composition, after all published
// values are reconciled. A composed record may build on other composed
// records, in any order.
function applyCompositions(nodes: ComposableNode[], items: DraftItem[], ingredients: DraftIngredient[], settings: ReconcileSettings): void {
  const { issues } = settings;
  const itemById = new Map(items.map((item) => [item.id, item]));
  const ingredientById = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const nodeOf = new Map<object, ComposableNode>(nodes.map((node) => [node.target, node]));
  const state = new Map<ComposableNode, "composing" | "done">();
  const ensure = (target: object | undefined) => {
    const node = target ? nodeOf.get(target) : undefined;
    if (node) compose(node);
  };

  const resolve = (owner: DraftItem, component: CompositionComponent<NutritionRecord>): NutritionRecord | null => {
    const { ref } = component;
    if (!ref) return component.nutrition ?? null;
    if (ref.kind === "ingredient") return ingredientById.get(ref.id)?.nutrition ?? null;
    if (ref.kind === "item") {
      const target = itemById.get(ref.id);
      if (!target) return null;
      if (!ref.variantId) {
        ensure(target);
        return target.nutrition;
      }
      const variant = target.variants.find((entry) => entry.id === ref.variantId);
      ensure(variant);
      return variant?.nutrition ?? null;
    }
    const option = [...owner.groups, ...owner.variants.flatMap((variant) => variant.groups ?? [])]
      .flatMap((group) => group.options)
      .find((entry) => entry.id === ref.id);
    if (!option) return null;
    ensure(option);
    for (const portion of option.portions ?? []) ensure(portion);
    return resolveSelectionNutrition(option, ref.portionId);
  };

  function compose(node: ComposableNode): void {
    const { target } = node;
    if (!target.composition || state.get(node) === "done") return;
    if (state.get(node) === "composing") {
      issues.push({
        severity: "blocker",
        code: "composition_cycle",
        message: `${node.label} is composed, directly or indirectly, from itself.`,
        entityIds: [node.id],
      });
      return;
    }
    state.set(node, "composing");

    const parts: CompositionPart[] = target.composition.map((component) => ({
      label: component.label,
      quantity: component.quantity,
      role: component.role,
      refId: component.ref?.id,
      evidence: component.evidence,
      record: resolve(node.owner, component),
    }));
    const unresolved = parts.filter((part) => part.record === null);
    if (unresolved.length > 0) {
      issues.push({
        severity: "blocker",
        code: "composition_reference_missing",
        message: `${node.label} is composed from record(s) that do not exist or have no nutrition: ${unresolved.map((part) => part.label).join(", ")}.`,
        entityIds: [node.id, ...unresolved.flatMap((part) => (part.refId ? [part.refId] : []))],
      });
    }

    const published = target.nutrition;
    const composed = composeNutrition(parts, published, settings.calorieTolerance);
    const publishedIsFinal = published.completeness === "complete" && unresolvedConflicts(published).length === 0;
    for (const mismatch of composed.mismatches) {
      issues.push({
        severity: "warning",
        code: "composition_mismatch",
        message: `${node.label}: published ${mismatch.nutrient} ${mismatch.published} differs from the component sum ${mismatch.composed}; ${publishedIsFinal ? "the published panel was kept" : "the component sum was used"}.`,
        entityIds: [node.id],
      });
    }
    // A complete published panel is never replaced by a calculation.
    if (!publishedIsFinal) {
      if (composed.incompleteParts.length > 0) {
        issues.push({
          severity: "warning",
          code: "composition_incomplete",
          message: `${node.label} cannot be fully totalled: ${composed.incompleteParts.join(", ")} lack(s) core nutrition. Nothing was filled in.`,
          entityIds: [node.id],
        });
      }
      // With no usable total, the record keeps exactly what it published.
      if (Object.keys(composed.total).length > 0) target.nutrition = composed.record;
    }
    state.set(node, "done");
  }

  for (const node of nodes) compose(node);
}

export function normalizeRestaurant(output: AdapterOutput, options: NormalizeOptions = {}): RestaurantDraft {
  const issues: Issues = [...(output.knownIssues ?? [])];

  const items = dedupeItems(output.items, issues, output.deduplicateBy === "identity");
  const { ingredients, replacedIds } = dedupeIngredients(output.ingredients, issues, output.deduplicateBy === "identity");
  const ingredientIds = new Set(ingredients.map((ingredient) => ingredient.id));

  for (const item of items) {
    for (const group of allGroups(item)) {
      for (const option of group.options) {
        if (!option.ingredientId) continue;
        option.ingredientId = replacedIds.get(option.ingredientId) ?? option.ingredientId;
        if (!ingredientIds.has(option.ingredientId)) {
          issues.push({
            severity: "blocker",
            code: "ingredient_reference_missing",
            message: `"${option.label}" on ${item.id} references ingredient ${option.ingredientId}, which is not in the ingredient list.`,
            entityIds: [item.id, option.id],
          });
        }
      }
      checkGroupRules(group, item.id, issues);
    }
    const compositions = [
      item.composition,
      ...item.variants.map((variant) => variant.composition),
      ...allGroups(item).flatMap((group) => group.options.flatMap((option) => [option.composition, ...(option.portions ?? []).map((portion) => portion.composition)])),
    ];
    for (const component of compositions.flatMap((composition) => composition ?? [])) {
      if (component.ref?.kind === "ingredient") component.ref.id = replacedIds.get(component.ref.id) ?? component.ref.id;
    }
  }

  mapCategories(output, items, ingredients, issues);
  const unmatchedReferenceRows = matchReferenceNutrition(output, items, ingredients, issues);

  let nutritionRecords = 0;
  let completeNutritionRecords = 0;
  let nutritionConflicts = 0;
  const missingByNutrients = new Map<string, string[]>();
  const collect: RecordCollector = (id, label, record, expected) => {
    for (const conflict of record.conflicts) {
      const described = conflict.observations.map((entry) => `${entry.value} (${entry.sourceId})`).join(" vs ");
      if (conflict.resolvedBySourceId) {
        issues.push({
          severity: "info",
          code: "nutrition_conflict_resolved",
          message: `${label}: ${conflict.nutrient} differs across sources — ${described}; ${conflict.resolvedBySourceId} was used by declared precedence.`,
          entityIds: [id],
          sourceIds: conflict.observations.map((entry) => entry.sourceId),
        });
      } else {
        nutritionConflicts += 1;
        issues.push({
          severity: "blocker",
          code: "nutrition_conflict",
          message: `${label}: ${conflict.nutrient} differs across sources — ${described}. No value was chosen.`,
          entityIds: [id],
          sourceIds: conflict.observations.map((entry) => entry.sourceId),
        });
      }
    }
    if (!expected) return;
    nutritionRecords += 1;
    if (record.completeness === "complete" && unresolvedConflicts(record).length === 0) {
      completeNutritionRecords += 1;
    }
    if (record.missingCore.length > 0) {
      const key = record.missingCore.join(", ");
      missingByNutrients.set(key, [...(missingByNutrients.get(key) ?? []), id]);
    }
  };
  const draft = reconcileTree(items, ingredients, {
    precedence: output.nutritionPrecedence ?? [],
    calorieTolerance: output.compositionCalorieTolerance ?? 10,
    issues,
    collect,
  });

  let recordsMissingCoreMacros = 0;
  for (const [nutrients, entityIds] of missingByNutrients) {
    recordsMissingCoreMacros += entityIds.length;
    issues.push({
      severity: "blocker",
      code: "core_nutrition_missing",
      message: `${entityIds.length} record(s) have no published or agreed value for: ${nutrients}. The values were left empty.`,
      affectedCount: entityIds.length,
      entityIds: entityIds.slice(0, 25),
    });
  }

  const menuModels = (["standard", "build-your-own"] as MenuModel[]).filter((model) =>
    draft.items.some((item) => item.model === model),
  );

  return {
    contractVersion: CONTRACT_VERSION,
    status: "draft",
    restaurant: output.restaurant,
    generatedAt: options.now ?? new Date().toISOString(),
    sources: output.sources,
    menuModels,
    items: draft.items,
    ingredients: draft.ingredients,
    runtimeRelationships: output.runtimeRelationships,
    orderingGraph: output.orderingGraph,
    configurationEvidence: output.configurationEvidence,
    orderingPlans: output.orderingPlans,
    additionalOrderingPlans: output.additionalOrderingPlans,
    unmatchedReferenceRows,
    issues,
    summary: {
      items: draft.items.length,
      standardItems: draft.items.filter((item) => item.model === "standard").length,
      buildYourOwnItems: draft.items.filter((item) => item.model === "build-your-own").length,
      ingredients: draft.ingredients.length,
      nutritionRecords,
      completeNutritionRecords,
      recordsMissingCoreMacros,
      nutritionConflicts,
      blockers: issues.filter((issue) => issue.severity === "blocker").length,
    },
  };
}
