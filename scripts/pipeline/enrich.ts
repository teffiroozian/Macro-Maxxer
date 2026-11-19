import { normalizeName } from "../lib/normalize-name";
import type { ExtractedRecord } from "../extraction/contracts";
import type { NutritionRecord, RestaurantDraft, SourceRef } from "./contracts";
import type { ExtractionInput, extractionMatchReport } from "./extraction-input";
import type { DraftValidation } from "./validate";

type Area = "nutrition" | "ingredients" | "portions" | "customization";
type Status = "verified" | "manual_review" | "unavailable";
type Fact = string | number | boolean | { amount: number; unit: string };
type Candidate = { record: ExtractedRecord; value: Fact; issue?: string };
type Entry = {
  targetId: string;
  area: Area;
  field: string;
  status: Status;
  reason: string;
  value?: Fact;
  evidence?: Array<{ id: string; value: Fact; issue?: string }>;
};

const FRESHNESS_MS = 90 * 86_400_000;
const ADAPTER_HOSTS: Record<string, string> = { mod: "modpizza.com", chipotle: "chipotle.com" };

export function enrichDraft(
  draft: RestaurantDraft,
  input: ExtractionInput,
  matches: ReturnType<typeof extractionMatchReport>,
  quality: NonNullable<DraftValidation["quality"]>,
  now = draft.generatedAt,
) {
  if (draft.restaurant.id !== input.restaurant.id || matches.restaurant !== input.restaurant.id || matches.extractionRunAt !== input.runAt) {
    throw new Error("Enrichment input and match report must correspond to the normalized restaurant and extraction run");
  }
  const evidenceById = new Map(input.records.map((record) => [record.id, record]));
  const sourceById = new Map(draft.sources.map((source) => [source.id, source]));
  const links = new Map<string, ExtractedRecord[]>();
  const names = new Map<string, ExtractedRecord[]>();
  const unlinkedPanels = new Map<string, ExtractedRecord[]>();
  const entries: Entry[] = [];
  const usedEvidence = new Set<string>();
  const host = ADAPTER_HOSTS[draft.restaurant.id];
  const reviewTime = Date.parse(now);
  if (!host || !Number.isFinite(reviewTime)) throw new Error("Enrichment requires a supported restaurant and review date");

  function trustIssue(record: ExtractedRecord): string | undefined {
    const { url, retrievedAt, sha256, sourceId } = record.provenance;
    const origin = new URL(url);
    const source = sourceById.get(sourceId);
    if (origin.protocol !== "https:" || (origin.hostname !== host && !origin.hostname.endsWith(`.${host}`)) ||
        !source || source.authority === "third_party" || source.url !== url) return "source_authority_unverified";
    if (!sha256 || source.sha256 !== sha256 || !record.provenance.locator) return "source_capture_unverified";
    const timestamps = [retrievedAt, source.sourceUpdatedAt].filter((date): date is string => Boolean(date)).map(Date.parse);
    if (!timestamps.length || timestamps.some((time) => !Number.isFinite(time) || time > reviewTime)) return "source_date_unverified";
    if (record.flags.includes("needs_verification") || timestamps.some((time) => reviewTime - time > FRESHNESS_MS)) return "source_needs_verification";
    // Static documents without a publication date lack a freshness signal.
    if ((record.provenance.method === "official_document" || record.kind === "ingredient_declaration") && !source.sourceUpdatedAt) {
      return "publication_date_unknown";
    }
    return undefined;
  }

  for (const match of matches.records) {
    const record = evidenceById.get(match.id);
    if (!record || match.status.startsWith("duplicate_")) continue;
    // Container projections represent children. The container's fields are
    // evidence about the original scope rather than the projected children.
    if (match.status === "matched") {
      for (const target of match.targets) {
        const existing = links.get(target) ?? [];
        existing.push(record);
        links.set(target, existing);
      }
    }
    if (match.status !== "matched" && draft.restaurant.id === "chipotle" &&
        record.flags.includes("name_from_key") && /^CMG-\d+$/.test(record.name)) {
      const url = new URL(record.provenance.url);
      if (url.hostname === "services.chipotle.com" && url.pathname === "/menu-metadata/v1/menu-metadata/nutrition") {
        const candidates = unlinkedPanels.get(record.name) ?? [];
        candidates.push(record);
        unlinkedPanels.set(record.name, candidates);
      }
    }
    if (["ingredient_declaration", "nutrition_row"].includes(record.kind) && record.name) {
      const key = normalizeName(record.name);
      const existing = names.get(key) ?? [];
      existing.push(record);
      names.set(key, existing);
    }
  }

  function add(targetId: string, area: Area, field: string, candidates: Candidate[], unavailableReason: string, forceReview?: string) {
    const unique = new Map(candidates.map((candidate) => [JSON.stringify([candidate.record.id, candidate.value, candidate.issue]), candidate]));
    const evidence = [...unique.values()].map(({ record, value, issue }) => {
      usedEvidence.add(record.id);
      return { id: record.id, value, issue: issue ?? trustIssue(record) };
    });
    const confirmed = evidence.filter((item) => !item.issue);
    const values = new Set(confirmed.map((item) => JSON.stringify(item.value)));
    // A quantity without a unit is retained, but cannot contradict a
    // structured serving with an explicitly published quantity and unit.
    const disputes = evidence.some((item) => (field !== "serving" || typeof item.value === "object") &&
      !values.has(JSON.stringify(item.value)));
    if (!forceReview && confirmed.length && !disputes && values.size === 1) {
      entries.push({ targetId, area, field, status: "verified", reason: "linked_current_evidence", value: confirmed[0].value, evidence });
    } else if (evidence.length || forceReview) {
      entries.push({ targetId, area, field, status: "manual_review",
        reason: forceReview ?? (values.size > 1 || confirmed.length ? "source_values_disagree" : evidence[0].issue ?? "evidence_unconfirmed"),
        ...(evidence.length ? { evidence } : {}) });
    } else {
      entries.push({ targetId, area, field, status: "unavailable", reason: unavailableReason });
    }
  }

  const qualityById = new Map(quality.records.map((record) => [record.id, record]));
  function reviewPanels(refs: SourceRef[]) {
    const ids = new Set(refs.map((ref) => ref.recordId).filter((id): id is string => Boolean(id)));
    return [...ids].flatMap((id) => unlinkedPanels.get(id) ?? []);
  }

  function auditNutrition(targetId: string, panel: NutritionRecord, refs: SourceRef[] = [], name?: string) {
    const check = qualityById.get(targetId);
    if (!check || check.reasons.includes("no_standalone_nutrition_expected")) return;
    for (const nutrient of check.missingCore ?? []) {
      const rejected = reviewPanels(refs);
      const candidates = [...(links.get(targetId) ?? []), ...rejected].flatMap((record): Candidate[] => {
        const key = nutrient as keyof NonNullable<ExtractedRecord["nutrition"]>["values"];
        const value = record.nutrition?.values[key] ?? record.nutrition?.raw[key];
        return value === undefined ? [] : [{ record, value, ...(rejected.includes(record) ? { issue: "panel_withheld_by_normalization" } : {}) }];
      });
      if (!candidates.length && name) for (const record of names.get(normalizeName(name)) ?? []) {
        if (record.kind !== "nutrition_row") continue;
        const key = nutrient as keyof NonNullable<ExtractedRecord["nutrition"]>["values"];
        const value = record.nutrition?.values[key] ?? record.nutrition?.raw[key];
        if (value !== undefined) candidates.push({ record, value, issue: "name_only_match" });
      }
      const conflicts = panel.conflicts.some((entry) => entry.nutrient === nutrient && !entry.resolvedBySourceId);
      add(targetId, "nutrition", nutrient, candidates, "value_not_found_in_linked_sources",
        conflicts ? "unresolved_source_conflict" : candidates.length ? "nutrition_requires_validated_serving_and_panel" : undefined);
    }
    if (check.status === "unsupported" && !(check.missingCore?.length) && check.reasons.length) {
      add(targetId, "nutrition", "panel", [], "usable_panel_not_found", check.reasons.join(", "));
    }
  }

  function serving(targetId: string, panel: NutritionRecord, portion = false, refs: SourceRef[] = []) {
    const candidates = panel.observations.flatMap((observation): Candidate[] => {
      const sourceRecord = observation.source.extractionId && evidenceById.get(observation.source.extractionId);
      if (!sourceRecord) return [];
      const raw = sourceRecord.servingText;
      const { amount, unit } = observation.basis ?? {};
      if (amount !== undefined && Number.isFinite(amount) && amount > 0 && unit && raw) {
        return [{ record: sourceRecord, value: { amount, unit }, ...(observation.comparisonOnly ? { issue: "serving_equivalence_unverified" } : {}) }];
      }
      return raw ? [{ record: sourceRecord, value: raw, issue: "serving_amount_or_unit_unconfirmed" }] : [];
    });
    if (!candidates.length) for (const record of reviewPanels(refs)) {
      if (record.servingText) candidates.push({ record, value: record.servingText, issue: "portion_panel_withheld_by_normalization" });
    }
    if (candidates.length || portion) add(targetId, "portions", "serving", candidates, "measured_portion_not_found");
  }

  for (const ingredient of draft.ingredients) {
    auditNutrition(ingredient.id, ingredient.nutrition, ingredient.sources, ingredient.name);
    serving(ingredient.id, ingredient.nutrition, false, ingredient.sources);
    const linked = (links.get(ingredient.id) ?? []).filter((record) => record.kind === "ingredient_declaration" && record.ingredientsText);
    const candidates = (linked.length ? linked : (names.get(normalizeName(ingredient.name)) ?? []))
      .filter((record) => record.kind === "ingredient_declaration" && record.ingredientsText)
      .map((record) => ({ record, value: record.ingredientsText!, ...(linked.length ? {} : { issue: "name_only_match" }) }));
    add(ingredient.id, "ingredients", "ingredientDeclaration", candidates, "ingredient_declaration_not_found");
  }
  for (const item of draft.items) {
    const itemRefs = item.model === "standard" ? item.sources : [];
    auditNutrition(item.id, item.nutrition, itemRefs, item.name);
    serving(item.id, item.nutrition, false, itemRefs);
    for (const variant of item.variants) {
      auditNutrition(variant.id, variant.nutrition);
      serving(variant.id, variant.nutrition);
    }
    if (qualityById.has(`${item.id}#variant-default`)) {
      add(item.id, "customization", "defaultVariant", [], "unique_default_variant_not_found");
    }
    const groups = [...item.groups, ...item.variants.flatMap((variant) => variant.groups ?? [])];
    for (const group of groups) {
      const sources = (links.get(group.id) ?? []).filter((record) => record.kind === "option_group");
      for (const field of ["requiresUserSelection", "supportsQuantitySelection", "minSelections", "maxSelections"] as const) {
        if ((field === "minSelections" || field === "maxSelections") && group[field] !== null) continue;
        const candidates = sources.flatMap((record): Candidate[] => {
          const value = record.customization?.[field];
          return value === null || value === undefined ? [] : [{ record, value }];
        });
        if (candidates.length || field === "minSelections" || field === "maxSelections") {
          const dispute = qualityById.get(group.id)?.reasons.includes("selection_rule_conflict");
          add(group.id, "customization", field, candidates, "source_does_not_state_limit", dispute ? "selection_rule_conflict" : undefined);
        }
      }
      for (const option of group.options) {
        const optionRefs = option.source ? [option.source] : [];
        auditNutrition(option.id, option.nutrition, optionRefs);
        serving(option.id, option.nutrition, false, optionRefs);
        for (const portion of option.portions ?? []) {
          const portionRefs = portion.source ? [portion.source] : [];
          auditNutrition(portion.id, portion.nutrition, portionRefs);
          serving(portion.id, portion.nutrition, item.isAvailable && group.role !== "preparation" && option.isAvailable && !option.isExclusive, portionRefs);
        }
      }
    }
  }

  const summary = Object.fromEntries((["nutrition", "ingredients", "portions", "customization"] as const)
    .map((area) => [area, { verified: 0, manual_review: 0, unavailable: 0 }])) as Record<Area, Record<Status, number>>;
  for (const entry of entries) summary[entry.area][entry.status]++;
  const evidence = [...usedEvidence].map((id) => {
    const record = evidenceById.get(id)!;
    const source = sourceById.get(record.provenance.sourceId);
    return { id, name: record.name, category: record.category, servingText: record.servingText,
      provenance: record.provenance, flags: record.flags, authority: source?.authority, sourceUpdatedAt: source?.sourceUpdatedAt };
  });
  return { restaurant: draft.restaurant.id, extractionRunAt: input.runAt, extractionFile: input.file, mode: input.mode,
    reviewedAt: now, summary, entries, evidence };
}

export function renderEnrichmentReport(report: ReturnType<typeof enrichDraft>): string {
  return [
    "# Optional enrichment review", "",
    `Reviewed ${report.restaurant} against the ${report.mode} extraction from ${report.extractionRunAt}.`, "",
    "| Area | Verified evidence | Manual review | Unavailable |",
    "|---|---:|---:|---:|",
    ...Object.entries(report.summary).map(([area, counts]) =>
      `| ${area} | ${counts.verified} | ${counts.manual_review} | ${counts.unavailable} |`),
    "", "Verified findings are scoped to their source captures. See enrichment.json for proposed metadata, provenance, and individual gaps.",
    "Nutrition values and approval status are unchanged.", "",
  ].join("\n");
}
