import { validateOrderingPlan } from "../../lib/ordering/evaluate";
import {
  addFinding,
  createValidationContext,
  setCheckDetails,
  type ValidationContext,
} from "../validate/shared";
import {
  ALL_NUTRIENTS,
  type DraftItem,
  type NutritionRecord,
  type RestaurantDraft,
  type SelectionGroup,
  type SourceRef,
} from "./contracts";

export const DRAFT_CHECKS = ["structure", "sources", "freshness", "nutrition", "readiness"] as const;
export type DraftCheck = (typeof DRAFT_CHECKS)[number];

export type DraftValidation = {
  // No structural errors: the draft is internally consistent.
  valid: boolean;
  // Valid and free of blockers: eligible to be put in front of a reviewer for
  // publishing. Publishing itself is always a manual decision.
  readyForApproval: boolean;
  context: ValidationContext<DraftCheck>;
};

export type ValidateDraftOptions = {
  now?: string;
  maxSourceAgeDays?: number;
};

function draftGroups(item: DraftItem): SelectionGroup<NutritionRecord>[] {
  return [...item.groups, ...item.variants.flatMap((variant) => variant.groups ?? [])];
}

export function validateDraft(draft: RestaurantDraft, options: ValidateDraftOptions = {}): DraftValidation {
  const context = createValidationContext(DRAFT_CHECKS);
  const sourceIds = new Set(draft.sources.map((source) => source.id));

  const checkRef = (ref: SourceRef | undefined, ownerId: string) => {
    if (ref && !sourceIds.has(ref.sourceId)) {
      addFinding(context, "error", "sources", "unknown_source", `${ownerId} cites source "${ref.sourceId}", which is not declared.`, {
        recordIds: [ownerId],
      });
    }
  };
  const checkNutrition = (record: NutritionRecord, ownerId: string) => {
    for (const observation of record.observations) {
      checkRef(observation.source, ownerId);
      for (const nutrient of ALL_NUTRIENTS) {
        const value = observation.values[nutrient];
        if (value === undefined) continue;
        if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
          addFinding(context, "error", "nutrition", "nutrition_value_invalid", `${ownerId}: ${nutrient} from ${observation.source.sourceId} must be a finite, non-negative number.`, {
            recordIds: [ownerId],
          });
        }
      }
    }
  };

  if (draft.status !== "draft") {
    addFinding(context, "error", "structure", "status_not_draft", "Pipeline output must stay in draft status.");
  }
  if (draft.sources.length === 0) {
    addFinding(context, "error", "sources", "no_sources", "The draft declares no sources.");
  }

  const seenIds = new Set<string>();
  const claimId = (id: string, kind: string) => {
    if (!id.trim()) {
      addFinding(context, "error", "structure", "empty_id", `A ${kind} has an empty id.`);
    } else if (seenIds.has(id)) {
      addFinding(context, "error", "structure", "duplicate_id", `${kind} id "${id}" is not unique.`, { recordIds: [id] });
    }
    seenIds.add(id);
  };

  for (const item of draft.items) {
    claimId(item.id, "item");
    if (!item.name.trim()) {
      addFinding(context, "error", "structure", "empty_name", `Item ${item.id} has no name.`, { recordIds: [item.id] });
    }
    if (item.sources.length === 0) {
      addFinding(context, "error", "sources", "untraceable_record", `Item ${item.id} cites no source.`, { recordIds: [item.id] });
    }
    item.sources.forEach((ref) => checkRef(ref, item.id));
    checkNutrition(item.nutrition, item.id);
    for (const component of item.composition ?? []) {
      checkRef(component.source, item.id);
      if (component.nutrition) checkNutrition(component.nutrition, item.id);
    }
    for (const variant of item.variants) {
      claimId(variant.id, "variant");
      checkNutrition(variant.nutrition, variant.id);
    }
    if (item.model === "build-your-own" && draftGroups(item).every((group) => group.role !== "ingredient_group")) {
      addFinding(context, "error", "structure", "builder_without_ingredient_groups", `Build-your-own item ${item.id} has no ingredient groups.`, {
        recordIds: [item.id],
      });
    }
    for (const group of draftGroups(item)) {
      for (const option of group.options) {
        checkNutrition(option.nutrition, option.id);
        option.portions?.forEach((portion) => checkNutrition(portion.nutrition, portion.id));
      }
    }
  }
  for (const ingredient of draft.ingredients) {
    claimId(ingredient.id, "ingredient");
    ingredient.sources.forEach((ref) => checkRef(ref, ingredient.id));
    checkNutrition(ingredient.nutrition, ingredient.id);
  }

  const itemIds = new Set(draft.items.map((item) => item.id));
  const allPlans = [
    ...Object.entries(draft.orderingPlans ?? {}),
    ...Object.entries(draft.additionalOrderingPlans ?? {}).flatMap(([owner, plans]) => plans.map((plan) => [owner, plan] as const)),
  ];
  for (const [owner, plan] of allPlans) {
    if (!itemIds.has(owner)) addFinding(context, "error", "structure", "ordering_plan_owner_missing", `Ordering plan owner "${owner}" does not exist.`);
    for (const error of validateOrderingPlan(plan)) {
      addFinding(context, "error", "structure", "ordering_plan_invalid", `${owner}: ${error}`, { recordIds: [owner] });
    }
  }

  const graph = draft.orderingGraph;
  if (graph) {
    checkRef(graph.source, "ordering graph");
    const groupIds = new Set(graph.groups.map((group) => group.id));
    if (groupIds.size !== graph.groups.length || groupIds.has("")) {
      addFinding(context, "error", "structure", "invalid_ordering_group_id", "Ordering graph group IDs must be nonempty and unique.");
    }
    for (const group of graph.groups) {
      for (const option of group.options) {
        const child = option.referencedItemGroupId;
        if (child && !groupIds.has(child)) {
          addFinding(context, "error", "structure", "ordering_group_missing", `Ordering group "${group.id}" references missing group "${child}".`, {
            recordIds: [group.id, child],
          });
        }
      }
    }
  }

  const now = Date.parse(options.now ?? draft.generatedAt);
  const maxAgeDays = options.maxSourceAgeDays ?? 90;
  for (const source of draft.sources) {
    const retrieved = Date.parse(source.retrievedAt);
    if (Number.isNaN(retrieved)) {
      addFinding(context, "error", "freshness", "retrieved_at_invalid", `Source ${source.id} has no valid retrieval date.`, {
        recordIds: [source.id],
      });
      continue;
    }
    const ageDays = Math.floor((now - retrieved) / 86_400_000);
    if (ageDays > maxAgeDays) {
      addFinding(context, "warning", "freshness", "source_stale", `Source ${source.id} was retrieved ${ageDays} days ago (limit ${maxAgeDays}); re-collect before publishing.`, {
        recordIds: [source.id],
      });
    }
  }

  const blockers = draft.issues.filter((issue) => issue.severity === "blocker");
  for (const issue of blockers) {
    addFinding(context, "warning", "readiness", issue.code, issue.message, {
      affectedCount: issue.entityIds?.length,
    });
  }
  setCheckDetails(context, "readiness", { blockers: blockers.length, summary: draft.summary });

  const valid = context.errors.length === 0;
  return { valid, readyForApproval: valid && blockers.length === 0, context };
}
