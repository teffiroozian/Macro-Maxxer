// Usage:
//   npm run extract -- <target> [--replay | --live] [--browser] [--record] [--source <url>]…
//
// Reads data/restaurants/staging/<id>/discovery.json (run `npm run discover`
// first), extracts every proposed source, and writes:
//   staging/<id>/extraction.json          summary, coverage, limitations
//   staging/<id>/extraction-records.json  every record with provenance
//   staging/<id>/extraction.md            review report
// It never touches data/restaurants/index.json or any live menu file.
//
// Replay (default when the target has saved evidence) re-reads the evidence
// discovery replayed. --live fetches politely (robots.txt, per-host delay)
// and must run where restaurant hosts are reachable (Tef's Mac or the
// "restaurant discovery" cloud environment). --source adds an official URL
// discovery did not propose; it must be on a host discovery saw as official.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { importStaging } from "../pipeline/import-staging";
import { writeAtomically } from "../lib/write-atomically";
import { liveFetcher, replayFetcher } from "../discovery/fetchers";
import { withBrowser } from "../discovery/browser";
import { DISCOVERY_TARGETS } from "../discovery/targets";
import type { DiscoveryReport } from "../discovery/contracts";
import { extractFromDiscovery } from "./extract";
import { renderExtractionReport } from "./report";

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  const flags = new Map<string, string[]>();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const next = argv[index + 1];
    const value = next && !next.startsWith("--") ? (index += 1, next) : "true";
    flags.set(arg.slice(2), [...(flags.get(arg.slice(2)) ?? []), value]);
  }
  return { positional, flag: (name: string) => flags.get(name)?.[0], all: (name: string) => flags.get(name) ?? [] };
}

async function main() {
  // Node's fetch honors HTTPS_PROXY only with NODE_USE_ENV_PROXY.
  if (process.env.HTTPS_PROXY && !process.env.NODE_USE_ENV_PROXY) {
    const child = spawnSync(process.execPath, [...process.execArgv, ...process.argv.slice(1)], { stdio: "inherit", env: { ...process.env, NODE_USE_ENV_PROXY: "1" } });
    process.exit(child.status ?? 1);
  }
  const args = parseArgs(process.argv.slice(2));
  const name = args.positional[0];
  if (!name) {
    console.error(`Usage: npm run extract -- <target> [--replay|--live] [--browser] [--record] [--source <url>]\nKnown targets: ${Object.keys(DISCOVERY_TARGETS).join(", ")}, or any id with a staging/<id>/discovery.json`);
    process.exitCode = 1;
    return;
  }
  const target = DISCOVERY_TARGETS[name];
  const id = target?.id ?? name;
  const runId = args.flag("run-id");
  const staging = resolve(process.cwd(), "data/restaurants/staging", id);
  const outputDir = runId ? await importStaging(id, runId) : staging;
  const discoveryPath = resolve(outputDir, "discovery.json");
  const discovery = JSON.parse(await readFile(discoveryPath, "utf8").catch(() => {
    throw new Error(`No discovery report at ${discoveryPath}. Run npm run discover -- ${name} first.`);
  })) as DiscoveryReport;

  const live = args.flag("live") === "true" || (args.flag("replay") !== "true" && !target?.replay);
  if (!live && !target?.replay) throw new Error(`${id} has no saved evidence to replay. Use --live.`);
  if (live && discovery.mode === "replay") console.warn("warning: the discovery report is from a replay run; run `npm run discover -- <target> --live` first for a complete live source list.");
  const recorder = live ? liveFetcher({ recordDir: args.flag("record") === "true" ? resolve(outputDir, "extraction-evidence") : undefined }) : undefined;
  const base = recorder ?? (await replayFetcher(target!.replay!));
  const browser = live && args.flag("browser") === "true" ? withBrowser(base) : undefined;

  const report = await extractFromDiscovery(discovery, browser ?? base, {
    discoveryFile: runId ? discoveryPath : `data/restaurants/staging/${id}/discovery.json`,
    extraSources: args.all("source").map((url) => ({ url, note: "Added by hand with --source." })),
  });
  await recorder?.flush();
  await browser?.close();

  const records = report.sources.flatMap((source) => source.records);
  const summary = { ...report, sources: report.sources.map(({ records: _records, ...source }) => source) };
  await writeAtomically(resolve(outputDir, "extraction.json"), `${JSON.stringify(summary, null, 2)}\n`);
  await writeAtomically(resolve(outputDir, "extraction-records.json"), `${JSON.stringify({ restaurant: report.restaurant, runAt: report.runAt, mode: report.mode, records }, null, 1)}\n`);
  await writeAtomically(resolve(outputDir, "extraction.md"), renderExtractionReport(report));

  console.log(`${report.restaurant.name}: extraction (${report.mode}) written to ${outputDir}/extraction.{json,md} and extraction-records.json`);
  console.log(JSON.stringify({ records: records.length, sources: report.sources.map((source) => ({ url: source.source.url, status: source.status, freshness: source.freshness, counts: source.counts, nutrients: source.nutrientCounts })), coverage: Object.fromEntries(report.coverage.map((entry) => [entry.need, entry.status])) }, null, 2));
  for (const limitation of report.limitations) console.warn(`limitation: ${limitation}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
