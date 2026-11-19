import { createHash } from "node:crypto";
import { normalizePortionCell } from "../lib/chipotle-portion";
import { normalizeName } from "../lib/normalize-name";
import type { Nutrition } from "../../types/nutrition";
import type { MenuItem, RestaurantMenu } from "../../types/menu";
import { ALL_NUTRIENTS, CORE_NUTRIENTS, OPTIONAL_NUTRIENTS, type RestaurantDraft } from "./contracts";
import type { RuntimeProjection } from "./project";
import type { DraftValidation } from "./validate";

export const PUBLICATION_TARGETS = {
  mod: { path: "data/restaurants/mod.json", mainCategories: ["Pizza"], live: false },
  chipotle: { path: "data/restaurants/chipotle/generated/restaurant.json", mainCategories: ["Burrito", "Bowl", "Tacos"], live: true },
} as const;
export type PublicationRestaurant = keyof typeof PUBLICATION_TARGETS;
export const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

type RecordReview = {
  draftId: string;
  runtimeId?: string;
  name: string;
  category: string;
  status: "ready_for_approval" | "blocked" | "unchanged";
  reasons: string[];
  sources: string[];
  missingNutrition?: Record<string, string[]>;
  conflicts?: Array<{ id: string; nutrient: string; observations: Array<{ sourceId: string; value: number }> }>;
  before?: Nutrition;
  proposed?: Nutrition;
  retainedOptionalNutrition?: Partial<Record<(typeof OPTIONAL_NUTRIENTS)[number], { value: number; provenance?: unknown }>>;
  panelSource?: { sourceId: string; extractionId: string; recordId?: string; serving: string };
  heldBack?: Array<{ id: string; kind: string; reasons: string[]; missingCore?: string[] }>;
};

export type PublicationReview = ReturnType<typeof buildPublicationReview>;

function samePanel(a: Nutrition, b: Nutrition) {
  return ALL_NUTRIENTS.every((nutrient) => a[nutrient] === b[nutrient]);
}

const validPanel = (panel: Nutrition | undefined): panel is Nutrition =>
  !!panel && CORE_NUTRIENTS.every((nutrient) => Number.isFinite(panel[nutrient]) && panel[nutrient] >= 0) &&
  ALL_NUTRIENTS.every((nutrient) => panel[nutrient] === undefined || (Number.isFinite(panel[nutrient]) && panel[nutrient]! >= 0));

export function buildPublicationReview(draft: RestaurantDraft, validation: DraftValidation, projection: RuntimeProjection, baselineText: string, now = draft.generatedAt) {
  const target = PUBLICATION_TARGETS[draft.restaurant.id as PublicationRestaurant];
  if (!target || !validation.quality) throw new Error("Publication review requires a supported extraction-backed draft with quality validation");
  const production = JSON.parse(baselineText) as RestaurantMenu;
  const sourcesById = new Map(draft.sources.map((source) => [source.id, source]));
  const at = Date.parse(now);
  if (!Number.isFinite(at)) throw new Error("Publication review requires a valid verification time");
  const productionById = new Map(production.items.map((item) => [item.id, item]));
  const projectedById = new Map(projection.menu.items.map((item) => [item.id, item]));
  const entries = Map.groupBy(validation.quality.records, (entry) => entry.id);
  const relatedChecks = Map.groupBy(validation.quality.records.filter((entry) => entry.id.includes("#")), (entry) => entry.id.split("#", 1)[0]);
  const excluded = Map.groupBy(projection.excluded, (entry) => entry.id);
  const categories = new Set(production.items.filter((item) => !item.sourceOnly).flatMap((item) => item.categories).map(normalizeName));
  const mainMenuCoverage = target.mainCategories.map((category) => ({ category, retained: target.live && categories.has(normalizeName(category)) }));
  const restaurantBlockers = [
    ...(!target.live ? ["runtime_launch_requires_separate_review"] : []),
    ...(!validation.valid ? ["draft_has_structural_errors"] : []),
    ...(projection.ids.conflicts.length ? ["runtime_id_conflicts"] : []),
    ...(projection.relationshipErrors.length ? ["projection_relationship_errors"] : []),
    ...(!mainMenuCoverage.some((entry) => entry.retained) ? ["main_menu_coverage_not_established"] : []),
  ];

  const records: RecordReview[] = draft.items.map((item) => {
    const runtimeId = projection.itemIds.get(item.id);
    const current = runtimeId ? productionById.get(runtimeId) : undefined;
    const proposed = runtimeId ? projectedById.get(runtimeId) : undefined;
    const groups = [...item.groups, ...item.variants.flatMap((variant) => variant.groups ?? [])];
    const nestedIds = [
      item.id, ...item.variants.map((variant) => variant.id),
      ...groups.flatMap((group) => [
        group.id, ...group.options.flatMap((option) => [
          option.id, ...(option.portions ?? []).map((portion) => portion.id),
        ]),
      ]),
    ];
    const heldBack = nestedIds.flatMap((id) => [...(entries.get(id) ?? []), ...(relatedChecks.get(id) ?? [])].filter((entry) =>
      entry.status !== "valid" && !entry.reasons.includes("no_standalone_nutrition_expected")).map(({ id, kind, reasons, missingCore }) =>
      ({ id, kind, reasons, missingCore })));
    const root = entries.get(item.id) ?? [];
    const reviewedConflict = [item, ...item.variants].flatMap((entry) => entry.nutrition.conflicts.filter((conflict) =>
      !conflict.resolvedBySourceId).map(({ nutrient, observations }) => ({ id: entry.id, nutrient, observations })));
    const reasons = [...restaurantBlockers];
    if (!item.isAvailable || item.sourceOnly || item.nonNutritionComponent) reasons.push("not_a_customer_facing_item");
    if (root.length !== 1 || root[0].status !== "valid") reasons.push("item_nutrition_not_fully_verified");
    if (heldBack.length) reasons.push("item_has_held_back_dependencies");
    if (!proposed || !validPanel(proposed.nutrition)) reasons.push("no_complete_runtime_nutrition");
    if (groups.length || item.model !== "standard" || item.variants.length || item.mealPreset || item.composition?.length ||
        item.nutrition.derivation || draft.orderingPlans?.[item.id] || draft.additionalOrderingPlans?.[item.id]?.length) {
      reasons.push("linked_or_configurable_item_requires_integration_review");
    }
    const historical = current?.source as { menu?: { itemIds?: string[]; role?: string }; nutrition?: { livePortion?: string } } | undefined;
    const historicalIds = current?.source?.generated?.menu.itemIds ?? historical?.menu?.itemIds ?? [];
    if (!current || !validPanel(current.nutrition)) {
      reasons.push("existing_runtime_panel_required");
    } else {
      const rawIds = new Set(item.sources.map((ref) => ref.recordId).filter(Boolean));
      if (normalizeName(current.name) !== normalizeName(item.name) || !historicalIds.some((id) => rawIds.has(id))) {
        reasons.push("production_identity_requires_manual_match");
      }
      if (historical?.menu?.role !== "standalone_product" || current.sourceOnly || current.variants?.length || current.customization || current.customizationByVariantId || current.ingredients?.length ||
          current.ingredientEligible || current.ingredientRef || current.orderingPlan || current.additionalOrderingPlans?.length ||
          current.mealPreset || current.entreeGroup || current.comboConfig || current.comboConfigByVariantId ||
          current.ingredientNutritionContexts || current.rankingNutrition) {
        reasons.push("production_item_has_linked_nutrition_or_customization");
      }
    }
    // A single-panel update requires a traceable publication candidate
    // rather than a total assembled from components or a retained comparison.
    const panel = item.nutrition.observations.find((observation) => {
      const source = sourcesById.get(observation.source.sourceId);
      if (!source?.sha256 || source.authority === "third_party" || !observation.source.extractionId ||
          !observation.source.locator || !observation.source.recordId || !historicalIds.includes(observation.source.recordId) ||
          observation.comparisonOnly || observation.source.flags?.includes("needs_verification")) return false;
      const dates = [source.retrievedAt, source.sourceUpdatedAt].filter((value): value is string => Boolean(value)).map(Date.parse);
      if (!dates.length || dates.some((date) => !Number.isFinite(date) || date > at || at - date > 90 * 86_400_000)) return false;
      const url = new URL(source.url);
      const comparable = url.protocol === "https:" && url.hostname === "services.chipotle.com" &&
        url.pathname === "/menu-metadata/v1/menu-metadata/nutrition" && url.searchParams.get("region") === "US" &&
        observation.source.flags?.includes("passive_capture");
      return comparable && proposed && validPanel(proposed.nutrition) &&
        ALL_NUTRIENTS.every((nutrient) => proposed.nutrition[nutrient] === undefined ||
          observation.values[nutrient] === proposed.nutrition[nutrient]);
    });
    if (!panel) reasons.push("no_single_traceable_complete_panel");
    const historicalServing = historical?.nutrition?.livePortion;
    const historicalBasis = normalizePortionCell(historicalServing ?? "");
    const basis = panel?.basis;
    if (!historicalBasis.amount || !historicalBasis.unit || historicalBasis.amount !== basis?.amount || historicalBasis.unit !== basis.unit) {
      reasons.push("production_serving_equivalence_unverified");
    }
    reasons.push(...(excluded.get(item.id) ?? []).map((entry) => `projection: ${entry.reason}`));

    const nextNutrition = proposed && validPanel(proposed.nutrition) ? { ...proposed.nutrition } : undefined;
    const priorTrace = historical?.nutrition as (Record<string, unknown> & {
      retainedOptionalNutrition?: Record<string, { provenance?: unknown }>;
    }) | undefined;
    const { retainedOptionalNutrition: priorRetention, ...priorPanelTrace } = priorTrace ?? {};
    const retainedOptionalNutrition: NonNullable<RecordReview["retainedOptionalNutrition"]> = {};
    if (current && nextNutrition && panel && !reasons.includes("production_serving_equivalence_unverified")) {
      for (const nutrient of OPTIONAL_NUTRIENTS) {
        const value = current.nutrition?.[nutrient];
        if (value === undefined || nextNutrition[nutrient] !== undefined) continue;
        nextNutrition[nutrient] = value;
        retainedOptionalNutrition[nutrient] = {
          value,
          provenance: priorRetention?.[nutrient] ? priorRetention[nutrient].provenance : priorTrace ? priorPanelTrace : undefined,
        };
      }
    }
    const missingNutrition = Object.fromEntries(heldBack.filter((entry) => entry.missingCore?.length)
      .map((entry) => [entry.id, entry.missingCore!]));
    return {
      draftId: item.id, runtimeId, name: item.name, category: item.category ?? item.sourceCategory,
      status: reasons.length ? "blocked" : samePanel(current!.nutrition, nextNutrition!) ? "unchanged" : "ready_for_approval",
      reasons: [...new Set(reasons)],
      sources: [...new Set([...item.sources, ...item.nutrition.observations.map((entry) => entry.source)].map((source) => source.sourceId))],
      ...(Object.keys(missingNutrition).length ? { missingNutrition } : {}),
      ...(heldBack.length ? { heldBack } : {}),
      ...(reviewedConflict.length ? { conflicts: reviewedConflict } : {}),
      ...(Object.keys(retainedOptionalNutrition).length ? { retainedOptionalNutrition } : {}),
      ...(current && validPanel(current.nutrition) ? { before: current.nutrition } : {}),
      ...(nextNutrition ? { proposed: nextNutrition } : {}),
      ...(panel && basis?.amount && basis.unit ? { panelSource: {
        sourceId: panel.source.sourceId, extractionId: panel.source.extractionId!,
        recordId: panel.source.recordId, serving: `${basis.amount} ${basis.unit}`,
      } } : {}),
    };
  });

  return {
    restaurant: draft.restaurant,
    draftGeneratedAt: draft.generatedAt,
    draftSha256: sha256(JSON.stringify(draft)),
    productionPath: target.path,
    productionSha256: sha256(baselineText),
    mainMenuCoverage,
    restaurantBlockers,
    counts: {
      readyForApproval: records.filter((record) => record.status === "ready_for_approval").length,
      blocked: records.filter((record) => record.status === "blocked").length,
      unchanged: records.filter((record) => record.status === "unchanged").length,
    },
    sources: draft.sources,
    ingredientRecords: draft.ingredients.map((ingredient) => ({
      id: ingredient.id, name: ingredient.name, category: ingredient.category ?? ingredient.sourceCategory,
      reasons: ["ingredient_updates_require_integration_review"],
      checks: entries.get(ingredient.id) ?? [],
      sources: ingredient.sources,
    })),
    records,
  };
}

export type OwnerApproval = {
  intent: "publish";
  approvedBy: "Tef";
  approvedAt: string;
  reviewSha256: string;
  confirmMainMenuCoverage: true;
  records: Array<{ draftId: string }>;
};

export function applyApprovedPanels(review: PublicationReview, reviewText: string, baselineText: string, approval: OwnerApproval, now: string) {
  if (!approval || !Number.isFinite(Date.parse(now))) throw new Error("Valid owner approval and publication time are required");
  const date = Date.parse(approval.approvedAt);
  if (approval.intent !== "publish" || approval.approvedBy !== "Tef" || !Number.isFinite(date) ||
      date < Date.parse(review.draftGeneratedAt) || date > Date.parse(now) ||
      approval.reviewSha256 !== sha256(reviewText) || approval.confirmMainMenuCoverage !== true) {
    throw new Error("Explicit project-owner approval of this exact review and main-menu coverage is required");
  }
  if (review.restaurantBlockers.length || !review.mainMenuCoverage.some((entry) => entry.retained)) throw new Error("Restaurant prerequisites are blocked");
  if (sha256(baselineText) !== review.productionSha256) throw new Error("Production changed after review");
  if (!Array.isArray(approval.records) || !approval.records.length ||
      !approval.records.every((entry) => entry && typeof entry.draftId === "string") ||
      new Set(approval.records.map((entry) => entry.draftId)).size !== approval.records.length) {
    throw new Error("Approval must select a nonempty list of unique draft IDs");
  }
  const records = new Map(review.records.map((record) => [record.draftId, record]));
  const replacements = new Map<string, { nutrition: Nutrition; source: NonNullable<RecordReview["panelSource"]>; retainedOptionalNutrition?: RecordReview["retainedOptionalNutrition"] }>();
  for (const { draftId } of approval.records) {
    const approved = records.get(draftId);
    if (approved?.status !== "ready_for_approval" || !approved.runtimeId || !validPanel(approved.proposed) || !approved.panelSource || replacements.has(approved.runtimeId)) {
      throw new Error(`Record is not eligible for this approval: ${draftId}`);
    }
    replacements.set(approved.runtimeId, { nutrition: approved.proposed, source: approved.panelSource,
      retainedOptionalNutrition: approved.retainedOptionalNutrition });
  }
  const production = JSON.parse(baselineText) as RestaurantMenu;
  let applied = 0;
  const items: MenuItem[] = production.items.map((item) => {
    const replacement = replacements.get(item.id);
    if (!replacement) return item;
    applied++;
    const { source, nutrition } = replacement;
    if (OPTIONAL_NUTRIENTS.some((nutrient) => item.nutrition[nutrient] !== undefined && nutrition[nutrient] === undefined)) {
      throw new Error(`Publication would delete previously recorded nutrition for ${item.id}`);
    }
    const trace = {
      method: "live_full_nutrition",
      liveItemId: source.recordId,
      livePortion: source.serving,
      liveValidation: "accepted",
      ...(replacement.retainedOptionalNutrition ? { retainedOptionalNutrition: replacement.retainedOptionalNutrition } : {}),
      note: `Approved extraction ${source.extractionId}; review ${approval.reviewSha256}`,
    };
    return { ...item, nutrition, source: { ...item.source!, nutrition: trace } };
  });
  if (applied !== replacements.size) throw new Error("Approved record IDs do not match the production menu exactly");
  return { ...production, items };
}

export function renderPublicationReview(review: PublicationReview, reviewHash: string) {
  const lines = [
    `# ${review.restaurant.name} · publication review`, "",
    `Draft generated ${review.draftGeneratedAt}. Review SHA-256 \`${reviewHash}\`.`, "",
    `- Ready for explicit approval: ${review.counts.readyForApproval}`,
    `- Blocked: ${review.counts.blocked}`,
    `- Verified panel matches production: ${review.counts.unchanged}`,
    `- Signature categories retained in production: ${review.mainMenuCoverage.filter((entry) => entry.retained).map((entry) => entry.category).join(", ") || "none"}`,
    ...review.restaurantBlockers.map((reason) => `- Restaurant blocker: ${reason}`), "",
    "The approval workflow updates only selected single-panel records in the current runtime menu. Existing items outside the approved selection stay in place.",
    "See review.md, validation.json, matches.json, and enrichment.md (when enabled) for source coverage, validation results, and supplemental evidence.", "",
    "## Candidate changes", "",
    ...(!review.counts.readyForApproval ? ["No candidate changes.", ""] : []),
    ...review.records.filter((record) => record.status === "ready_for_approval").flatMap((record) => [
      `- **${record.name}** (\`${record.draftId}\`)`,
      `  - Current: ${JSON.stringify(record.before)}`,
      `  - Proposed: ${JSON.stringify(record.proposed)}`,

      `  - Evidence: \`${record.panelSource?.extractionId}\`, serving ${record.panelSource?.serving}`,
    ]),
    "", "## Previously recorded optional nutrition retained", "",
    ...review.records.filter((record) => record.retainedOptionalNutrition).map((record) =>
      `- **${record.name}**: ${Object.entries(record.retainedOptionalNutrition!).map(([nutrient, evidence]) => `${nutrient} ${evidence.value}`).join(", ")}. See the JSON review for the prior provenance.`),
    "", "## Blocked records and manual decisions", "",
    ...review.records.filter((record) => record.status === "blocked").flatMap((record) => [
      `- **${record.name}** (\`${record.draftId}\`): ${record.reasons.join("; ")}`,
      ...(record.heldBack?.length ? [`  - ${record.heldBack.length} unresolved ${record.heldBack.length === 1 ? "check" : "checks"}. See publication-review.json for their IDs, missing values, and reasons.`] : []),
      ...(record.conflicts ?? []).map((conflict) =>
        `  - ${conflict.nutrient}: ${conflict.observations.map((observation) => `${observation.value} (${observation.sourceId})`).join(" vs ")}`),
    ]),
    "",
  ];
  return lines.join("\n");
}
