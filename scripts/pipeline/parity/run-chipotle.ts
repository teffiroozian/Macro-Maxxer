// Usage: npm run pipeline:parity:chipotle
//
// Builds the Chipotle draft from raw captures and compares it with the
// existing generated menu. Writes only under data/restaurants/staging/.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { writeAtomically } from "../../lib/write-atomically";
import { chipotleAdapter } from "../adapters/chipotle";
import { normalizeRestaurant } from "../engine";
import type { IdRegistry } from "../ids";
import { registryPath } from "../ids-seed";
import { compareChipotleParity, renderParityReport, type GeneratedChipotleMenu } from "./chipotle";

async function main(): Promise<void> {
  const draft = normalizeRestaurant(chipotleAdapter.translate(await chipotleAdapter.load()));
  const generated = JSON.parse(
    await readFile(resolve(process.cwd(), "data/restaurants/chipotle/generated/restaurant.json"), "utf8"),
  ) as GeneratedChipotleMenu;
  const registry = await readFile(registryPath(draft.restaurant.id), "utf8").then(
    (text) => JSON.parse(text) as IdRegistry,
    () => undefined,
  );
  if (!registry) console.warn("No id registry found; run `npm run pipeline:ids:seed -- chipotle data/restaurants/chipotle/generated/restaurant.json` first.");
  const report = compareChipotleParity(draft, generated, registry);

  const outputDir = resolve(process.cwd(), "data/restaurants/staging/chipotle");
  await writeAtomically(resolve(outputDir, "parity.json"), `${JSON.stringify(report, null, 2)}\n`);
  await writeAtomically(resolve(outputDir, "parity-report.md"), renderParityReport(report, draft));

  console.log(`Chipotle parity report written to ${outputDir}`);
  console.table(report.sections.map((entry) => ({ ...entry, differ: entry.compared - entry.matched })));
  console.log(report.byClass);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
