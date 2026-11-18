// Human-readable discovery report (discovery.md next to discovery.json).
import { ALL_NUTRIENTS, CORE_NUTRIENTS } from "../pipeline/contracts";
import type { Candidate, DiscoveryReport } from "./contracts";
import { nutrientsWithValues } from "./analyze";

const cell = (text: string) => text.replace(/\|/g, "\\|").replace(/\n/g, " ");

function shortUrl(url: string): string {
  const parsed = new URL(url);
  const path = `${parsed.pathname}${parsed.search}`;
  return `${parsed.host}${path.length > 70 ? `${path.slice(0, 67)}…` : path}`;
}

function candidateRow(candidate: Candidate): string {
  const values = candidate.analysis ? nutrientsWithValues(candidate.analysis) : [];
  const menu = candidate.analysis?.menu;
  const shows = [
    values.length > 0 ? values.join(", ") : "",
    menu && menu.items > 0 ? `${menu.items} items` : "",
    menu && menu.optionGroups > 0 ? `${menu.optionGroups} option groups` : "",
    menu?.allergens ? "allergens" : "",
    menu?.ingredientDeclarations ? "ingredients" : "",
  ]
    .filter(Boolean)
    .join("; ");
  return `| [${cell(shortUrl(candidate.url))}](${candidate.url}) | ${candidate.channel} | ${candidate.authority} | ${candidate.outcome}${candidate.status ? ` (${candidate.status})` : ""} | ${cell(shows || "—")} | ${candidate.sourceUpdatedAt ?? "—"} |`;
}

export function renderDiscoveryReport(report: DiscoveryReport): string {
  const core = report.coverage.filter((entry) => (CORE_NUTRIENTS as readonly string[]).includes(entry.need));
  const lines = [
    `# ${report.restaurant.name} — source discovery`,
    "",
    `Run ${report.runAt} in **${report.mode}** mode. ${report.budget.requestsUsed} of ${report.budget.maxRequests} requests used. Stores sampled: ${report.storeIds.join(", ") || "none"}.`,
    "",
    "## Verdict",
    "",
    report.macrosReady
      ? "- **Core macros: found.** Every core macro (calories, protein, carbs, total fat) is published by at least one usable official or ordering-system source."
      : `- **Core macros: not ready.** Missing from every usable source: **${report.missingCore.join(", ")}**. These stay missing; they are never estimated (standards §1).`,
    ...report.coverage
      .filter((entry) => !(ALL_NUTRIENTS as readonly string[]).includes(entry.need))
      .map((entry) => `- ${entry.need[0].toUpperCase()}${entry.need.slice(1)}: ${entry.status === "found" ? `found (${entry.sources.length} source${entry.sources.length === 1 ? "" : "s"})` : "**missing**"}`),
    "",
    "## Nutrient coverage",
    "",
    "\"Found\" means at least one source publishes values for some records. It is not per-item coverage; the import's review report checks that.",
    "",
    "| Nutrient | Core | Status | Sources with values |",
    "|---|---|---|---|",
    ...report.coverage
      .filter((entry) => (ALL_NUTRIENTS as readonly string[]).includes(entry.need))
      .map((entry) => `| ${entry.need} | ${core.includes(entry) ? "yes" : ""} | ${entry.status === "found" ? "found" : `**${entry.status.replace("_", " ")}**`} | ${[...entry.sources.map((url) => cell(shortUrl(url))), ...(entry.verificationSources ?? []).map((url) => `${cell(shortUrl(url))} (older than ${report.freshnessDays} days: verify, compare)`)].join("<br>") || "—"} |`),
  ];

  lines.push("", "## Discovery levels", "");
  lines.push(...(report.levels ?? []).map((entry) => `- Level ${entry.level}${entry.level === 1 ? " (automatic)" : entry.level === 2 ? " (deeper investigation)" : " (escalation)"}: ${entry.reason} ${entry.requests} request(s).`));
  if (report.informationRequest) lines.push(`- Information request drafted in \`information-request.md\` (${report.informationRequest.status.replace(/_/g, " ")}). Never sent without approval.`);

  const coreGaps = report.gaps.filter((gap) => gap.core);
  if (coreGaps.length > 0) {
    lines.push("", "## Gaps in core macros", "");
    const seenMessages = new Set<string>();
    for (const gap of coreGaps) {
      const generic = gap.message.replace(gap.need, "<n>");
      if (seenMessages.has(generic)) continue;
      seenMessages.add(generic);
      const same = coreGaps.filter((other) => other.message.replace(other.need, "<n>") === generic).map((other) => other.need);
      lines.push(`- **${same.join(", ")}**: ${gap.message.replace(gap.need, same.join(", "))}`);
    }
    const leads = coreGaps[0].leads;
    if (leads.length > 0) {
      lines.push("", "Leads that could still hold these values but could not be inspected:", "");
      lines.push(...leads.map((lead) => `- ${lead.outcome}: [${cell(shortUrl(lead.url))}](${lead.url}) — ${lead.reason}`));
    } else {
      lines.push("", "No uninspected leads remain. The next step is to ask the restaurant for an official macro specification, or to wait for one.");
    }
  }

  if (report.platforms.length > 0) {
    lines.push("", "## Platforms detected", "");
    lines.push(...report.platforms.map((hit) => `- **${hit.name}** — \`${cell(hit.evidence)}\` in ${shortUrl(hit.foundIn)}`));
  }

  if (report.proposedSources.length > 0) {
    lines.push("", "## Proposed adapter sources", "", "Declarations an adapter can start from (`SourceDescriptor`). Ordering-system sources rank above official ones only under the standards §2.2 checks.", "");
    lines.push("| id | kind | authority | provides | retrieved | source updated | stale |", "|---|---|---|---|---|---|---|");
    lines.push(
      ...report.proposedSources.map(
        (source) =>
          `| \`${source.id}\` | ${source.kind} | ${source.authority} | ${source.provides.join(", ")} | ${source.retrievedAt.slice(0, 10)} | ${source.sourceUpdatedAt ?? "—"} | ${source.stale ? "**yes**" : "no"}${source.verificationRequired ? ` (content older than ${report.freshnessDays} days: verify${source.compareWith?.length ? `, compare with ${source.compareWith.map(shortUrl).join(", ")}` : ""})` : ""} |`,
      ),
    );
  }

  lines.push("", `## Candidates (${report.candidates.length})`, "");
  lines.push("| URL | Channel | Authority | Outcome | Publishes | Updated |", "|---|---|---|---|---|---|");
  lines.push(...report.candidates.map(candidateRow));

  const statements = [...new Set(report.candidates.flatMap((candidate) => candidate.analysis?.statements ?? []))];
  if (statements.length > 0) lines.push("", "## Statements found on official pages", "", ...statements.map((statement) => `- "${statement}"`));

  if (report.changes) {
    lines.push(
      "",
      "## Changes since the previous run",
      "",
      `${report.changes.added.length} added, ${report.changes.removed.length} removed, ${report.changes.changed.length} changed, ${report.changes.unchanged} unchanged.`,
      ...report.changes.changed.map((url) => `- changed: ${url}`),
      ...report.changes.added.map((url) => `- added: ${url}`),
      ...report.changes.removed.map((url) => `- removed: ${url}`),
    );
  }
  if (report.warnings.length > 0) lines.push("", "## Warnings", "", ...report.warnings.map((warning) => `- ${warning}`));
  return `${lines.join("\n")}\n`;
}
