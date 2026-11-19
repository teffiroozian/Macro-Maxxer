import { readFile } from "node:fs/promises";
import type { ExtractedRecord, ExtractionReport } from "../extraction/contracts";
import type { AdapterOutput, NutritionObservation, RestaurantDraft, SourceDescriptor, SourceRef } from "./contracts";

export type ExtractionInput = {
  restaurant: { id: string; name: string };
  runAt: string;
  mode: "replay" | "live";
  records: ExtractedRecord[];
  file?: string;
  sources?: Array<Omit<ExtractionReport["sources"][number], "records">>;
};

export async function loadExtractionInput(file: string, summaryFile?: string): Promise<ExtractionInput> {
  const input = JSON.parse(await readFile(file, "utf8")) as ExtractionInput;
  if (!input.restaurant?.id || !Array.isArray(input.records) || input.records.length === 0) {
    throw new Error(`Invalid or empty extraction input: ${file}`);
  }
  if (new Set(input.records.map((record) => record.id)).size !== input.records.length) {
    throw new Error(`Extraction records have duplicate IDs: ${file}`);
  }
  input.file = file;
  if (summaryFile) {
    const summary = JSON.parse(await readFile(summaryFile, "utf8")) as ExtractionReport;
    if (summary.restaurant.id !== input.restaurant.id || summary.runAt !== input.runAt || summary.mode !== input.mode) {
      throw new Error("Extraction summary and records come from different runs");
    }
    input.sources = summary.sources;
  }
  for (const record of input.records) {
    // Early extraction bundles predate this flag, but the XHR locator and method still identify passive captures.
    if (record.provenance.method === "browser_rendered" && /~xhr\d+$/.test(record.provenance.sourceId) && !record.flags.includes("passive_capture")) {
      record.flags.push("passive_capture");
    }
  }
  return input;
}

export function extractionRef(record: ExtractedRecord): SourceRef {
  return {
    sourceId: record.provenance.sourceId,
    recordId: record.provenance.sourceRecordId ?? record.id,
    extractionId: record.id,
    locator: record.provenance.locator,
    sourceGlobalId: record.provenance.sourceGlobalId,
    flags: record.flags,
  };
}

export function extractionObservation(record: ExtractedRecord): NutritionObservation {
  return {
    source: extractionRef(record),
    values: record.nutrition?.values ?? {},
    basis: record.nutrition?.basis,
  };
}

export function extractionSources(input: ExtractionInput): SourceDescriptor[] {
  const descriptors = new Map(input.sources?.map(({ source }) => [source.id, source]));
  const sources = new Map<string, SourceDescriptor>();
  for (const record of input.records) {
    const { sourceId, url, retrievedAt, sha256, method } = record.provenance;
    if (sources.has(sourceId)) continue;
    const descriptor = descriptors.get(sourceId) ?? descriptors.get(sourceId.replace(/~(?:next_data|json_ld|json_script|xhr)\d*$/, ""));
    sources.set(sourceId, {
      id: sourceId,
      url,
      retrievedAt,
      sha256,
      sourceUpdatedAt: /~xhr\d+$/.test(sourceId) ? undefined : descriptor?.sourceUpdatedAt,
      authority: descriptor?.authority ?? (method === "embedded_json" ? "ordering_system" : "official"),
      kind: method === "embedded_json" ? "ordering_structured_data" : method === "browser_rendered" ? "browser_observation" : method === "api_json" ? "public_api" : method,
    });
  }
  return [...sources.values()];
}

// Capture adapter links before the engine folds equivalent store branches.
export function collectExtractionLinks(output: Pick<AdapterOutput, "items" | "ingredients"> | Pick<RestaurantDraft, "items" | "ingredients">) {
  const links = new Map<string, Set<string>>();
  function visit(value: unknown, owner?: string) {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      for (const child of value) visit(child, owner);
      return;
    }
    const entity = value as Record<string, unknown>;
    const target = typeof entity.id === "string" ? entity.id : owner;
    if (target && typeof entity.extractionId === "string") {
      const targets = links.get(entity.extractionId) ?? new Set();
      targets.add(target);
      links.set(entity.extractionId, targets);
    }
    for (const child of Object.values(entity)) visit(child, target);
  }
  visit(output.items);
  visit(output.ingredients);
  return links;
}

export type ExtractionDisposition = Map<string, string>;

export function extractionMatchReport(input: ExtractionInput, adapterLinks: ReturnType<typeof collectExtractionLinks>, draft: RestaurantDraft, disposition: ExtractionDisposition) {
  const draftLinks = collectExtractionLinks(draft);
  const sources: Record<string, Record<string, number>> = {};
  const counts: Record<string, number> = {};
  const children = Map.groupBy(input.records.filter((record) => record.parentId), (record) => record.parentId!);
  const linkedTargets = (id: string) => [...new Set([...(draftLinks.get(id) ?? []), ...(adapterLinks.get(id) ?? [])])].sort();
  function descendantTargets(id: string): string[] {
    return (children.get(id) ?? []).flatMap((child) => {
      const targets = linkedTargets(child.id);
      return targets.length ? targets : descendantTargets(child.id);
    });
  }
  const records = input.records.map((record) => {
    let targets = linkedTargets(record.id);
    let status = targets.length ? "matched" : disposition.get(record.id) ?? "unmatched";
    // Ordering adapters can hoist descendants out of UI-only containers.
    if (status === "unmatched" && (record.kind === "option_group" || record.kind === "option")) {
      targets = [...new Set(descendantTargets(record.id))].sort();
      if (targets.length) status = "represented_by_children";
    }
    const sourceCounts = sources[record.provenance.sourceId] ??= {};
    sourceCounts[status] = (sourceCounts[status] ?? 0) + 1;
    counts[status] = (counts[status] ?? 0) + 1;
    return { id: record.id, kind: record.kind, name: record.name, status, targets, flags: record.flags, provenance: record.provenance };
  });
  return { restaurant: input.restaurant.id, extractionFile: input.file, extractionRunAt: input.runAt, mode: input.mode, counts, sources, records };
}
