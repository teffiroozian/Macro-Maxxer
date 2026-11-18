// Live verification of source discovery, reproducible on any machine.
//
//   npm run discover:verify-live [-- --no-browser] [--out <dir>]
//
// 1. Checks the network to every target host. If a host is unreachable it
//    prints NOT VERIFIED with the cause and the fix, and exits 2. A replay is
//    never used as a substitute.
// 2. Runs live discovery for MOD Pizza (the pilot) and Chipotle (an existing
//    restaurant), with browser rendering unless --no-browser.
// 3. Checks source coverage, missing-data classification and reliability
//    (no network-blocked requests, no third-party source used), and prints
//    PASS / FAIL per check. Exit 0 only when every check passes.
//
// Reports go to --out (default: a temporary folder), never to production data.
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { CORE_NUTRIENTS } from "../pipeline/contracts";
import { withBrowser } from "./browser";
import type { DiscoveryReport, DiscoveryTarget } from "./contracts";
import { discoverSources } from "./discover";
import { liveFetcher } from "./fetchers";
import { diagnoseHosts, formatDiagnoses, proxyUrl } from "./network";
import { renderDiscoveryReport } from "./report";
import { targetHosts } from "./run";
import { chipotleTarget, modPizzaTarget } from "./targets";

type Check = { name: string; pass: boolean; detail: string };

const inspected = (report: DiscoveryReport, pattern: RegExp) => report.candidates.some((candidate) => candidate.outcome === "inspected" && pattern.test(candidate.url));
const status = (report: DiscoveryReport, need: string) => report.coverage.find((entry) => entry.need === need)?.status;

export function checkReport(report: DiscoveryReport, expectations: Array<[string, (report: DiscoveryReport) => boolean | string]>): Check[] {
  const blocked = report.candidates.filter((candidate) => candidate.outcome === "network_blocked");
  const thirdParty = report.proposedSources.filter((source) => source.authority === "third_party");
  const checks: Check[] = [
    { name: "mode is live", pass: report.mode === "live", detail: report.mode },
    { name: "no request refused by the network", pass: blocked.length === 0, detail: blocked.length === 0 ? "0" : blocked.slice(0, 3).map((c) => `${c.url} (${c.notes[0]})`).join("; ") },
    { name: "no third-party source proposed", pass: thirdParty.length === 0, detail: String(thirdParty.length) },
    { name: "every core nutrient classified", pass: CORE_NUTRIENTS.every((n) => status(report, n) !== undefined), detail: CORE_NUTRIENTS.map((n) => `${n}=${status(report, n)}`).join(" ") },
    { name: "no core nutrient left unverified", pass: CORE_NUTRIENTS.every((n) => status(report, n) !== "unverified"), detail: "unverified means a blocked lead could hold it" },
  ];
  for (const [name, test] of expectations) {
    const result = test(report);
    checks.push({ name, pass: result === true, detail: typeof result === "string" ? result : "" });
  }
  return checks;
}

const EXPECT: Record<string, Array<[string, (report: DiscoveryReport) => boolean | string]>> = {
  mod: [
    ["nutrition page inspected", (r) => inspected(r, /modpizza\.com\/nutrition\/?$/) || "modpizza.com/nutrition not inspected"],
    ["ordering system reached", (r) => r.candidates.some((c) => c.authority === "ordering_system" && c.outcome === "inspected") || "no ordering-system response"],
    ["calories found from a current source", (r) => status(r, "calories") === "found" || `calories=${status(r, "calories")}`],
    ["2023 macros page kept as candidate, not approved", (r) => {
      const page = r.candidates.find((c) => /mod-fresh-nutrition/.test(c.url));
      if (!page) return "mod-fresh-nutrition not discovered";
      const proposed = r.proposedSources.find((s) => s.url === page.url);
      return (proposed?.verificationRequired === true && status(r, "protein") === "needs_verification") || `protein=${status(r, "protein")}`;
    }],
    ["deeper investigation ran", (r) => r.levels.some((l) => l.level === 2) || "no level 2"],
    ["information request drafted, not sent", (r) => r.informationRequest?.status === "draft_not_sent" || "no draft"],
  ],
  chipotle: [
    ["sitemap read", (r) => r.candidates.some((c) => c.channel === "site_index" && /sitemap/.test(c.url) && c.outcome === "inspected") || "sitemap not inspected"],
    ["nutrition calculator inspected", (r) => inspected(r, /nutrition-calculator/) || "not inspected"],
    ["official nutrition PDF found through the rendered page's data", (r) => inspected(r, /chipotle\.com\/content\/dam\/.*nutrition.*\.pdf/i) || "not found (needs --browser)"],
    ["protein classified from an official source", (r) => ["found", "needs_verification"].includes(status(r, "protein") ?? "") || `protein=${status(r, "protein")}`],
    ["calories classified without guessing", (r) => ["found", "missing", "needs_verification"].includes(status(r, "calories") ?? "") || `calories=${status(r, "calories")}`],
  ],
};

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const outIndex = argv.indexOf("--out");
  const out = outIndex >= 0 ? resolve(argv[outIndex + 1]) : await mkdtemp(join(tmpdir(), "discovery-verify-"));
  const useBrowser = !argv.includes("--no-browser");
  const targets: DiscoveryTarget[] = [modPizzaTarget, chipotleTarget].map((target) => ({ ...target, replay: undefined }));

  const diagnoses = await diagnoseHosts(targets.flatMap(targetHosts));
  console.log(`Network check (${proxyUrl() ? `egress proxy, NODE_USE_ENV_PROXY=${process.env.NODE_USE_ENV_PROXY ?? "unset"}` : "direct"}):\n${formatDiagnoses(diagnoses)}\n`);
  const down = diagnoses.filter((entry) => entry.status !== "ok");
  if (down.length > 0) {
    console.log(`NOT VERIFIED: ${down.length} host(s) unreachable from this machine (${[...new Set(down.map((d) => d.status))].join(", ")}). Live discovery was not run, and no replay stands in for it.`);
    process.exitCode = 2;
    return;
  }

  let failed = 0;
  for (const target of targets) {
    const base = liveFetcher();
    const fetcher = useBrowser ? withBrowser(base) : base;
    const report = await discoverSources(target, fetcher);
    if ("close" in fetcher) await (fetcher as { close(): Promise<void> }).close();
    const dir = join(out, target.id);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "discovery.json"), `${JSON.stringify(report, null, 2)}\n`);
    await writeFile(join(dir, "discovery.md"), renderDiscoveryReport(report));
    if (report.informationRequest) await writeFile(join(dir, "information-request.md"), report.informationRequest.markdown);
    console.log(`── ${target.name} (${report.budget.requestsUsed} requests, levels ${report.levels.map((l) => l.level).join(",")}) → ${dir}`);
    for (const check of checkReport(report, EXPECT[target.id] ?? [])) {
      if (!check.pass) failed += 1;
      console.log(`  ${check.pass ? "PASS" : "FAIL"}  ${check.name}${check.detail ? `  (${check.detail})` : ""}`);
    }
  }
  console.log(failed === 0 ? "\nVERIFIED LIVE: every check passed." : `\n${failed} check(s) failed. See the reports above.`);
  process.exitCode = failed === 0 ? 0 : 1;
}

if (process.argv[1] && /verify-live\.ts$/.test(process.argv[1])) {
  if (proxyUrl() && !process.env.NODE_USE_ENV_PROXY) {
    const child = spawnSync(process.execPath, [...process.execArgv, ...process.argv.slice(1)], { stdio: "inherit", env: { ...process.env, NODE_USE_ENV_PROXY: "1" } });
    process.exitCode = child.status ?? 1;
  } else {
    main().catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
  }
}
