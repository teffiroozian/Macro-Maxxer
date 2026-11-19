import { mcdonaldsAdapter } from "./adapters/mcdonalds";
import { starbucksAdapter } from "./adapters/starbucks";
// Usage: npm run pipeline -- <adapter-id> [--from-extraction [file] [--enrich] | --write-ids]
//
// Runs load → translate → normalize → validate → project for one restaurant
// and writes a draft, a projected runtime menu and a review report under
// data/restaurants/staging/<restaurant-id>/. It never touches
// data/restaurants/index.json or any live menu file.
//
// Ids are resolved through data/restaurants/id-registry/<restaurant-id>.json.
// Newly minted ids are only reported, in id-assignments.json; they are added
// to the registry when --write-ids is passed, which is a step for approval
// time, not for every draft.
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { writeAtomically } from "../lib/write-atomically";
import { findingTypeCounts } from "../validate/shared";
import { chickFilAAdapter } from "./adapters/chick-fil-a";
import { chipotleAdapter, translateChipotleExtraction } from "./adapters/chipotle";
import { modPizzaAdapter, translateModExtraction } from "./adapters/mod-pizza";
import type { RestaurantAdapter, RestaurantDraft } from "./contracts";
import { collectExtractionLinks, extractionMatchReport, loadExtractionInput, type ExtractionDisposition } from "./extraction-input";
import { enrichDraft, renderEnrichmentReport } from "./enrich";
import { normalizeRestaurant } from "./engine";
import { emptyRegistry, type IdRegistry } from "./ids";
import { registryPath } from "./ids-seed";
import { checkRuntimeMenu, projectToRestaurantMenu, type RuntimeProjection } from "./project";
import { validateDraft, type DraftValidation } from "./validate";

const ADAPTERS: Record<string, RestaurantAdapter<never>> = {
  [mcdonaldsAdapter.id]: mcdonaldsAdapter as RestaurantAdapter<never>,
  [starbucksAdapter.id]: starbucksAdapter as RestaurantAdapter<never>,
  [chickFilAAdapter.id]: chickFilAAdapter as RestaurantAdapter<never>,
  [modPizzaAdapter.id]: modPizzaAdapter as RestaurantAdapter<never>,
  [chipotleAdapter.id]: chipotleAdapter as RestaurantAdapter<never>,
};

function reviewReport(draft: RestaurantDraft, validation: DraftValidation, projection: RuntimeProjection, runtimeErrors: string[]): string {
  const { summary } = draft;
  const lines = [
    `# ${draft.restaurant.name} — import review (draft)`,
    "",
    `Generated ${draft.generatedAt}. Status: **${draft.status}**. Not published; the live restaurant index is untouched.`,
    "",
    `- Structurally valid: **${validation.valid ? "yes" : "no"}**`,
    `- Ready for approval: **${validation.readyForApproval ? "yes" : "no"}**`,
    `- Menu models: ${draft.menuModels.join(", ")}`,
    `- Items: ${summary.items} (${summary.standardItems} standard, ${summary.buildYourOwnItems} build-your-own)`,
    `- Ingredients: ${summary.ingredients}`,
    `- Nutrition records: ${summary.nutritionRecords}, of which ${summary.completeNutritionRecords} have all four core macros`,
    `- Records missing core macros: ${summary.recordsMissingCoreMacros}`,
    `- Unresolved nutrition conflicts: ${summary.nutritionConflicts}`,
    `- Projected into the runtime schema: ${projection.menu.items.length} items, ${projection.menu.ingredients?.length ?? 0} ingredients (${projection.excluded.length} excluded)`,
    `- Ids: ${projection.ids.registry.entries.length - projection.ids.additions.length} in the registry, ${projection.ids.additions.length} new, ${projection.ids.conflicts.length} conflicts`,
    "",
    "## Sources",
    "",
    ...draft.sources.map(
      (source) =>
        `- \`${source.id}\` — ${source.url} (${source.authority}; retrieved ${source.retrievedAt}${source.sourceUpdatedAt ? `; source updated ${source.sourceUpdatedAt}` : ""})`,
    ),
  ];
  if (validation.quality) {
    lines.push("", "## Automated validation", "",
      ...Object.entries(validation.quality.counts).map(([status, count]) => `- ${status}: ${count}`));
    if (Object.keys(validation.quality.blockers).length) {
      lines.push("", "### Review blockers", "",
        ...Object.entries(validation.quality.blockers).sort(([, a], [, b]) => b - a)
          .map(([code, count]) => `- \`${code}\`: ${count}`));
    }
  }
  for (const severity of ["blocker", "warning", "info"] as const) {
    const issues = draft.issues.filter((issue) => issue.severity === severity);
    if (issues.length === 0) continue;
    lines.push("", `## ${severity[0].toUpperCase()}${severity.slice(1)}s (${issues.length})`, "");
    lines.push(...issues.map((issue) => `- \`${issue.code}\` — ${issue.message}`));
  }
  if (runtimeErrors.length > 0) {
    lines.push("", "## Runtime relationship errors", "", ...runtimeErrors.map((error) => `- ${error}`));
  }
  if (draft.unmatchedReferenceRows.length > 0) {
    lines.push("", `## Official nutrition rows not linked to a catalog record (${draft.unmatchedReferenceRows.length})`, "");
    lines.push(...draft.unmatchedReferenceRows.map((id) => `- \`${id}\``));
  }
  return `${lines.join("\n")}\n`;
}

async function main(): Promise<void> {
  const adapterId = process.argv[2];
  const adapter = adapterId ? ADAPTERS[adapterId] : undefined;
  if (!adapter) {
    console.error(`Usage: npm run pipeline -- <adapter-id>\nAvailable adapters: ${Object.keys(ADAPTERS).join(", ")}`);
    process.exitCode = 1;
    return;
  }

  const fromExtraction = process.argv.indexOf("--from-extraction");
  const useExtraction = fromExtraction !== -1;
  const useEnrichment = process.argv.includes("--enrich");
  if (useEnrichment && !useExtraction) throw new Error("--enrich requires --from-extraction");
  const restaurantId = adapterId === "mod-pizza" ? "mod" : adapterId;
  const staging = resolve(process.cwd(), "data/restaurants/staging", restaurantId!);
  if (useExtraction && (restaurantId !== "mod" && restaurantId !== "chipotle")) {
    throw new Error("--from-extraction is supported by the MOD Pizza and Chipotle adapters");
  }
  if (useExtraction && process.argv.includes("--write-ids")) {
    throw new Error("Extraction-backed normalization writes staging drafts only");
  }
  const dispositions: ExtractionDisposition = new Map();
  let extraction;
  if (useExtraction) {
    const pathArg = process.argv[fromExtraction + 1];
    const file = resolve(pathArg && !pathArg.startsWith("--") ? pathArg : resolve(staging, "extraction-records.json"));
    const summary = resolve(dirname(file), "extraction.json");
    extraction = await loadExtractionInput(file, summary);
    if (extraction.restaurant.id !== restaurantId) throw new Error(`Expected ${restaurantId} extraction input, got ${extraction.restaurant.id}`);
  }
  const input = extraction
    ? restaurantId === "mod" ? translateModExtraction(extraction) : await translateChipotleExtraction(extraction, dispositions)
    : adapter.translate(await adapter.load());
  const adapterLinks = extraction ? collectExtractionLinks(input) : undefined;
  const draft = normalizeRestaurant(input);
  const validation = validateDraft(draft, { auditQuality: useExtraction });
  const registryFile = registryPath(draft.restaurant.id);
  const registry = await readFile(registryFile, "utf8").then(
    (text) => JSON.parse(text) as IdRegistry,
    () => emptyRegistry(draft.restaurant.id),
  );
  const projection = projectToRestaurantMenu(draft, { registry });
  const runtimeErrors = [...projection.relationshipErrors, ...checkRuntimeMenu(projection.menu)];
  validation.readyForApproval &&= runtimeErrors.length === 0 && projection.ids.conflicts.length === 0;

  const outputDir = useExtraction ? resolve(staging, "normalization") : staging;
  const matches = extraction && adapterLinks ? extractionMatchReport(extraction, adapterLinks, draft, dispositions) : undefined;
  if (matches) await writeAtomically(resolve(outputDir, "matches.json"), `${JSON.stringify(matches)}\n`);
  if (useEnrichment && extraction && matches && validation.quality) {
    const enrichment = enrichDraft(draft, extraction, matches, validation.quality);
    await writeAtomically(resolve(outputDir, "enrichment.json"), `${JSON.stringify(enrichment)}\n`);
    await writeAtomically(resolve(outputDir, "enrichment.md"), renderEnrichmentReport(enrichment));
  }
  await writeAtomically(resolve(outputDir, "draft.json"), `${JSON.stringify(draft)}\n`);
  await writeAtomically(
    resolve(outputDir, "validation.json"),
    `${JSON.stringify(
      {
        valid: validation.valid,
        readyForApproval: validation.readyForApproval,
        checks: validation.context.checks,
        errorCounts: findingTypeCounts(validation.context.errors),
        warningCounts: findingTypeCounts(validation.context.warnings),
        errors: validation.context.errors,
        summary: draft.summary,
        ...(validation.quality ? { quality: validation.quality } : {}),
        ...(matches ? { sourceRecordDispositions: matches.counts } : {}),
        ...(useExtraction ? { warnings: validation.context.warnings } : {}),
        runtimeProjection: {
          items: projection.menu.items.length,
          ingredients: projection.menu.ingredients?.length ?? 0,
          excluded: projection.excluded.length,
          referenceErrors: runtimeErrors,
          ids: {
            fromRegistry: registry.entries.length,
            minted: projection.ids.additions.length,
            conflicts: projection.ids.conflicts.length,
          },
        },
      },
      null,
      2,
    )}\n`,
  );
  await writeAtomically(resolve(outputDir, "review.md"), reviewReport(draft, validation, projection, runtimeErrors));
  await writeAtomically(resolve(outputDir, "runtime-menu.json"), `${JSON.stringify(projection.menu)}\n`);
  await writeAtomically(
    resolve(outputDir, "id-assignments.json"),
    `${JSON.stringify({ registry: registryFile, additions: projection.ids.additions, conflicts: projection.ids.conflicts, excluded: projection.excluded }, null, 2)}\n`,
  );
  if (process.argv.includes("--write-ids") && projection.ids.additions.length > 0) {
    await writeAtomically(registryFile, `${JSON.stringify(projection.ids.registry, null, 2)}\n`);
    console.log(`Added ${projection.ids.additions.length} id(s) to ${registryFile}`);
  }

  console.log(`${draft.restaurant.name}: draft written to ${outputDir}`);
  console.log(JSON.stringify({ ...draft.summary, valid: validation.valid, readyForApproval: validation.readyForApproval }, null, 2));
  if (runtimeErrors.length > 0) console.error(`Projected menu has ${runtimeErrors.length} broken reference(s):\n${runtimeErrors.slice(0, 10).join("\n")}`);
  if (!validation.valid || runtimeErrors.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
