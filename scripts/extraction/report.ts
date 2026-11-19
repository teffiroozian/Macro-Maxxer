// Markdown review report for an extraction run.
import type { ExtractionReport } from "./contracts";

const STATUS_LABEL: Record<string, string> = {
  extracted: "extracted",
  needs_verification: "**needs verification** (stale source only)",
  not_extracted: "**not extracted** (discovery found it)",
  unavailable: "unavailable",
};

export function renderExtractionReport(report: ExtractionReport): string {
  const lines = [
    `# ${report.restaurant.name}: extraction (${report.mode})`,
    "",
    `Run ${report.runAt} from discovery run ${report.discovery.runAt} (${report.discovery.mode}). Freshness window ${report.freshnessDays} days.`,
    "Extraction only reads and structures sources. Nothing is joined, reconciled, estimated or published, and the live restaurant data is untouched.",
    "",
    "## Coverage",
    "",
    "| Need | Status | Records | Sources | Discovery said |",
    "|---|---|---:|---|---|",
    ...report.coverage.map((entry) => `| ${entry.need} | ${STATUS_LABEL[entry.status] ?? entry.status} | ${entry.records} | ${entry.sources.map((id) => `\`${id}\``).join(", ") || "none"} | ${entry.discoveryStatus ?? ""} |`),
    "",
    "## Sources",
    "",
    "| Source | Method | Status | Freshness | Extractors | Items | Groups | Options | Portions | Rows | Declarations |",
    "|---|---|---|---|---|---:|---:|---:|---:|---:|---:|",
    ...report.sources.map((source) => {
      const fresh = source.freshness === "current" ? `current (${source.ageDays} d)` : source.freshness === "needs_verification" ? `**needs verification** (${source.ageDays} d old)` : "no date";
      return `| ${source.source.url} | ${source.method} | ${source.status} | ${fresh} | ${source.extractors.join(", ") || "none"} | ${source.counts.menu_item} | ${source.counts.option_group} | ${source.counts.option} | ${source.counts.portion} | ${source.counts.nutrition_row} | ${source.counts.ingredient_declaration} |`;
    }),
    "",
    "### Nutrients per source (records with a clean published value)",
    "",
    ...report.sources.map((source) => {
      const counts = Object.entries(source.nutrientCounts).map(([nutrient, count]) => `${nutrient} ${count}`);
      const unclean = source.records.filter((record) => record.flags.includes("unclean_value")).length;
      return `- \`${source.source.id}\`: ${counts.join(", ") || "none"}${unclean ? `; ${unclean} records keep an unclean printed value as raw text` : ""}${source.warnings.length ? `. ${source.warnings.join(" ")}` : ""}`;
    }),
    "",
  ];
  if (report.skipped.length) {
    lines.push("## Not read", "", ...report.skipped.map((entry) => `- ${entry.url}: ${entry.reason}`), "");
  }
  lines.push("## Limitations", "", ...(report.limitations.length ? report.limitations.map((entry) => `- ${entry}`) : ["- None recorded."]), "");
  return `${lines.join("\n")}\n`;
}
