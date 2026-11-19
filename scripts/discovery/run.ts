// Usage:
//   npm run discover -- <target> [--replay | --live] [--browser] [--record] [--max-requests N]
//   npm run discover -- --diagnose <target>      (network check only)
//   npm run discover -- --id <id> --name "<Name>" --domain <domain> [--ordering-domain <host>] [--seed <url>] [--store <id>] [--live]
//
// Writes data/restaurants/staging/<id>/discovery.json and discovery.md. Never
// touches the live restaurant index or any menu file. Defaults to --live for
// ad-hoc targets and to --replay for targets that have saved evidence.
// --record (live only) saves every response under
// data/restaurants/staging/<id>/discovery-evidence/ with a manifest, so the run
// can be replayed with --replay-from.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { writeAtomically } from "../lib/write-atomically";
import type { DiscoveryReport, DiscoveryTarget } from "./contracts";
import { discoverSources } from "./discover";
import { spawnSync } from "node:child_process";
import { withBrowser } from "./browser";
import { liveFetcher, replayFetcher } from "./fetchers";
import { diagnoseHosts, formatDiagnoses, proxyUrl } from "./network";
import { renderDiscoveryReport } from "./report";
import { DISCOVERY_TARGETS } from "./targets";

function parseArgs(argv: string[]) {
  const flags = new Map<string, string[]>();
  const positional: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const name = arg.slice(2);
    const next = argv[index + 1];
    const value = next && !next.startsWith("--") ? (index += 1, next) : "true";
    flags.set(name, [...(flags.get(name) ?? []), value]);
  }
  return { positional, flag: (name: string) => flags.get(name)?.at(-1), flags: (name: string) => flags.get(name) ?? [] };
}

export function targetHosts(target: DiscoveryTarget): string[] {
  const hosts = new Set<string>();
  for (const seed of target.seeds ?? []) hosts.add(new URL(seed).hostname);
  for (const domain of [...target.officialDomains, ...(target.orderingDomains ?? [])]) hosts.add(domain);
  return [...hosts];
}

async function main(): Promise<void> {
  // Node's fetch only uses HTTPS_PROXY when NODE_USE_ENV_PROXY is set.
  if (proxyUrl() && !process.env.NODE_USE_ENV_PROXY) {
    const child = spawnSync(process.execPath, [...process.execArgv, ...process.argv.slice(1)], { stdio: "inherit", env: { ...process.env, NODE_USE_ENV_PROXY: "1" } });
    process.exitCode = child.status ?? 1;
    return;
  }
  const args = parseArgs(process.argv.slice(2));
  let target: DiscoveryTarget | undefined = args.positional[0] ? DISCOVERY_TARGETS[args.positional[0]] : undefined;
  if (!target && args.flag("domain")) {
    const domain = args.flag("domain")!;
    target = {
      id: args.flag("id") ?? domain.split(".")[0],
      name: args.flag("name") ?? domain,
      officialDomains: args.flags("domain"),
      orderingDomains: args.flags("ordering-domain"),
      seeds: [`https://${domain}/`, ...args.flags("seed")],
      storeIds: args.flags("store"),
    };
  }
  if (!target) {
    console.error(`Usage: npm run discover -- <target> [--replay|--live] [--record]\n       npm run discover -- --domain <domain> --name "<Name>" [--id <id>] [--ordering-domain <host>] [--store <id>]\nKnown targets: ${Object.keys(DISCOVERY_TARGETS).join(", ")}`);
    process.exitCode = 1;
    return;
  }

  const diagnoseOnly = args.flag("diagnose") === "true";
  const outputDir = resolve(process.cwd(), "data/restaurants/staging", target.id);
  const replayFrom = args.flag("replay-from");
  const replay = replayFrom ? { manifest: replayFrom } : target.replay;
  const live = args.flag("live") === "true" || (!args.flag("replay") && !replayFrom && !target.replay);
  if (live || diagnoseOnly) {
    const diagnoses = await diagnoseHosts(targetHosts(target));
    console.log(`Network check (${proxyUrl() ? "through egress proxy" : "direct"}):\n${formatDiagnoses(diagnoses)}`);
    if (diagnoseOnly) {
      process.exitCode = diagnoses.every((entry) => entry.status === "ok") ? 0 : 2;
      return;
    }
    if (diagnoses.every((entry) => entry.status !== "ok")) {
      console.error(`\nNOT RUN: no host of ${target.name} is reachable from this machine. Nothing was written; a report would only describe the network. Fix the network (see above) or run where the hosts are reachable.`);
      process.exitCode = 2;
      return;
    }
  }
  if (!live && !replay) throw new Error(`Target ${target.id} has no saved evidence to replay. Use --live.`);
  const recorder = live
    ? liveFetcher({ recordDir: args.flag("record") === "true" ? resolve(outputDir, "discovery-evidence") : undefined, userAgent: args.flag("user-agent") })
    : undefined;
  const base = recorder ?? (await replayFetcher(replay!));
  const browser = live && args.flag("browser") === "true" ? withBrowser(base) : undefined;
  const fetcher = browser ?? base;

  const previous = await readFile(resolve(outputDir, "discovery.json"), "utf8").then(
    (text) => JSON.parse(text) as DiscoveryReport,
    () => undefined,
  );
  const maxRequests = Number(args.flag("max-requests") ?? 0) || undefined;
  const report = await discoverSources(target, fetcher, { previous, budget: maxRequests ? { maxRequests } : undefined });
  await recorder?.flush();
  await browser?.close();

  const tracking = await readFile(resolve(outputDir, "information-request.status.json"), "utf8").then(
    (text) => JSON.parse(text) as DiscoveryReport["informationRequestTracking"],
    (error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return undefined; throw error; },
  );
  if (tracking) {
    if (tracking.status !== "sent" || tracking.reportedBy !== "owner") throw new Error("Invalid information request tracking");
    report.informationRequestTracking = tracking;
    delete report.informationRequest;
  }
  await writeAtomically(resolve(outputDir, "discovery.json"), `${JSON.stringify(report, null, 2)}\n`);
  await writeAtomically(resolve(outputDir, "discovery.md"), renderDiscoveryReport(report));
  if (report.informationRequest) await writeAtomically(resolve(outputDir, "information-request.md"), report.informationRequest.markdown);

  console.log(`${target.name}: discovery (${report.mode}) written to ${outputDir}/discovery.{json,md}`);
  console.log(
    JSON.stringify(
      {
        requests: report.budget.requestsUsed,
        candidates: report.candidates.length,
        inspected: report.candidates.filter((candidate) => candidate.outcome === "inspected").length,
        platforms: report.platforms.map((hit) => hit.id),
        macrosReady: report.macrosReady,
        levels: report.levels.map((entry) => entry.level),
        missingCore: report.missingCore,
        verifyCore: report.verifyCore,
        coverage: Object.fromEntries(report.coverage.filter((entry) => ["calories", "protein", "carbs", "totalFat"].includes(entry.need)).map((entry) => [entry.need, entry.status])),
        found: report.coverage.filter((entry) => entry.status === "found").map((entry) => entry.need),
      },
      null,
      2,
    ),
  );
  for (const warning of report.warnings) console.warn(`warning: ${warning}`);
}

if (process.argv[1] && /run\.ts$/.test(process.argv[1])) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
