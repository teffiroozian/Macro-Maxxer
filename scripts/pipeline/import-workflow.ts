import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import type { DiscoveryReport } from "../discovery/contracts";
import { DISCOVERY_TARGETS } from "../discovery/targets";
import type { ExtractionReport } from "../extraction/contracts";
import { writeAtomically } from "../lib/write-atomically";
import { EXTRACTION_ADAPTERS } from "./extraction-adapters";
import { importStaging, isRestaurantId } from "./import-staging";
import type { PublicationReview } from "./publication";

const stageTimeoutMs = 5 * 60_000;
const HELP = `Usage: npm run pipeline -- import <restaurant> [--replay | --live] [--enrich]
  Live options: --browser --record --source <official-url> --max-requests <1–200>
  New restaurant: <id> --live --name "<name>" --domain <host> [--ordering-domain <host>] [--store <id>]
  Use --research-only to stop after extraction. A full run stops at the review for owner approval.
  Extraction adapters: ${[...EXTRACTION_ADAPTERS.keys()].join(", ")}`;

type Stage = "discovery" | "extraction" | "normalization-and-review";

async function runStage(script: string, args: string[]): Promise<void> {
  await new Promise<void>((complete, fail) => {
    const grouped = process.platform !== "win32";
    const child = spawn(process.execPath, ["--import", "tsx", script, ...args], {
      stdio: "inherit",
      detached: grouped,
    });
    const kill = (signal: NodeJS.Signals) => {
      if (child.pid === undefined) return;
      try {
        if (grouped) process.kill(-child.pid, signal);
        else child.kill(signal);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
      }
    };
    let stop: string | undefined;
    const cancel = () => {
      stop = "Interrupted";
      kill("SIGKILL");
    };
    process.once("SIGINT", cancel);
    process.once("SIGTERM", cancel);
    const timer = setTimeout(() => {
      stop = "Exceeded the five-minute stage limit";
      kill("SIGKILL");
    }, stageTimeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      process.removeListener("SIGINT", cancel);
      process.removeListener("SIGTERM", cancel);
    };
    child.once("error", (error) => { cleanup(); fail(error); });
    child.once("close", (code, signal) => {
      cleanup();
      if (stop || code !== 0) fail(new Error(stop ?? `Process exited with ${signal ?? code}`));
      else complete();
    });
  });
}

export async function runImport(args: string[]): Promise<number> {
  const { positionals, values } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      help: { type: "boolean" },
      live: { type: "boolean" },
      replay: { type: "boolean" },
      browser: { type: "boolean" },
      record: { type: "boolean" },
      enrich: { type: "boolean" },
      "research-only": { type: "boolean" },
      "max-requests": { type: "string" },
      name: { type: "string" },
      domain: { type: "string", multiple: true },
      "ordering-domain": { type: "string", multiple: true },
      store: { type: "string", multiple: true },
      source: { type: "string", multiple: true },
    },
  });
  if (values.help) { console.log(HELP); return 0; }
  if (positionals.length !== 1 || !isRestaurantId(positionals[0])) throw new Error(HELP);
  const [requested] = positionals;
  const target = Object.hasOwn(DISCOVERY_TARGETS, requested) ? DISCOVERY_TARGETS[requested] : undefined;
  const id = target?.id ?? requested;
  const adapter = EXTRACTION_ADAPTERS.get(id);
  const researchOnly = values["research-only"] === true;
  if (!adapter && !researchOnly) {
    throw new Error(`Missing extraction adapter for "${id}". Available: ${[...EXTRACTION_ADAPTERS.keys()].join(", ")}. Use --research-only to collect evidence or register an adapter (docs/phase-3/import-workflow.md).`);
  }
  if (researchOnly && values.enrich) throw new Error("--enrich requires normalization");
  const hasTargetOptions = values.name || values.domain || values["ordering-domain"] || values.store;
  if (target && hasTargetOptions) throw new Error("Target options apply only to unregistered restaurants");
  if (!target && (!values.name?.trim() || !values.domain?.length)) throw new Error("An unregistered restaurant needs --name and --domain");
  if (values.name?.startsWith("--") ||
      [...(values.domain ?? []), ...(values["ordering-domain"] ?? [])].some((host) =>
        !/^[a-z0-9]+(?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(host)) ||
      values.store?.some((store) => !/^[a-z0-9][a-z0-9_-]*$/i.test(store))) {
    throw new Error("Supply bare hostnames and valid name and store values");
  }
  if (values.source?.some((url) => !/^https?:\/\//i.test(url))) throw new Error("--source requires an HTTP(S) URL");
  if ((values.live && values.replay) || (!values.live && (values.browser || values.record || values.source))) {
    throw new Error("Choose one mode. Browser, recording and additional official sources require --live");
  }
  const mode = values.live ? "live" : "replay";
  if (mode === "replay" && !target?.replay) throw new Error(`No replay is configured for ${id}. Use --live when live collection is authorized.`);
  const maxRequests = values["max-requests"];
  if (maxRequests !== undefined && (!/^\d+$/.test(maxRequests) || Number(maxRequests) < 1 || Number(maxRequests) > 200)) {
    throw new Error("--max-requests must be an integer from 1 to 200");
  }

  const runId = randomUUID();
  const dir = await importStaging(id, runId, true);
  const runArgs = ["--run-id", runId];
  const modeArgs = [`--${mode}`, ...(values.browser ? ["--browser"] : []), ...(values.record ? ["--record"] : [])];
  const targetArgs = target ? [id] : [
    "--id", id, "--name", values.name!,
    ...values.domain!.flatMap((host) => ["--domain", host]),
    ...(values["ordering-domain"] ?? []).flatMap((host) => ["--ordering-domain", host]),
    ...(values.store ?? []).flatMap((store) => ["--store", store]),
  ];
  const report = {
    runId, restaurant: id, mode, directory: dir,
    status: "running", completedStages: [] as Stage[],
    manualReview: [] as unknown[],
    publication: null as PublicationReview["counts"] | null,
  };
  const save = () => writeAtomically(resolve(dir, "import-run.json"), `${JSON.stringify(report, null, 2)}\n`);
  const read = async <T>(path: string): Promise<T> => JSON.parse(await readFile(resolve(dir, path), "utf8"));
  let stage: Stage = "discovery";
  await save();
  console.log(`Import ${runId} (${mode}): ${dir}`);
  try {
    await runStage("scripts/discovery/run.ts", [
      ...targetArgs, ...modeArgs, ...runArgs, ...(maxRequests ? ["--max-requests", maxRequests] : []),
    ]);
    const discovery = await read<DiscoveryReport>("discovery.json");
    if (discovery.restaurant.id !== id || discovery.mode !== mode) throw new Error("Discovery target or mode mismatch");
    report.completedStages.push(stage);
    // Extraction status takes precedence for coverage. Discovery keeps the
    // detailed leads and explanations for any gaps in that status.
    await save();
    stage = "extraction";
    if (!discovery.proposedSources.length && !values.source?.length) {
      report.manualReview.push(...discovery.gaps);
      throw new Error("Discovery found no extractable sources. Inspect discovery.md and supply new official evidence.");
    }
    await runStage("scripts/extraction/run.ts", [
      id, ...modeArgs, ...runArgs, ...(values.source ?? []).flatMap((url) => ["--source", url]),
    ]);
    const extraction = await read<ExtractionReport>("extraction.json");
    if (extraction.restaurant.id !== id || extraction.mode !== mode ||
        extraction.discovery.runAt !== discovery.runAt || extraction.discovery.mode !== mode ||
        extraction.discovery.file !== resolve(dir, "discovery.json")) {
      throw new Error("Extraction does not reference this run’s discovery report");
    }
    report.completedStages.push(stage);
    report.manualReview.push(
      ...extraction.coverage.filter((entry) => entry.status !== "extracted"),
      ...extraction.sources.filter((entry) => entry.status !== "extracted" && entry.status !== "empty")
        .map(({ source, status, statusDetail }) => ({ url: source.url, status, detail: statusDetail })),
      ...extraction.skipped,
    );
    if (!extraction.sources.some((entry) => entry.status === "extracted")) {
      throw new Error("No records were extracted. Review the reported source gaps before collecting again.");
    }
    await save();
    if (!researchOnly) {
      stage = "normalization-and-review";
      await runStage("scripts/pipeline/run.ts", [
        adapter!.adapterId, "--from-extraction", ...runArgs, ...(values.enrich ? ["--enrich"] : []),
      ]);
      const review = await read<PublicationReview>("normalization/publication-review.json");
      report.publication = review.counts;
      report.completedStages.push(stage);
      console.log(`Owner review: ${resolve(dir, "normalization/publication-review.md")}`);
    } else if (!adapter) {
      report.manualReview.push({ status: "missing_extraction_adapter", restaurant: id });
    }
    report.status = researchOnly ? "research_complete" : "review_ready";
    await save();
    console.log(`Run status and manual review: ${resolve(dir, "import-run.json")}`);
    return 0;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    report.status = "stopped";
    report.manualReview.push({ stage, reason });
    await save();
    console.error(`${stage} stopped: ${reason}. See ${resolve(dir, "import-run.json")}`);
    return 1;
  }
}
