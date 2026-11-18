import { readFile } from "node:fs/promises";
import { MCDONALDS_GENERATED_RUNTIME_MENU } from "../../../lib/restaurantBuilders/mcdonalds/generatedRuntimeAdapter";
import { writeAtomically } from "../../lib/write-atomically";
import { mcdonaldsAdapter } from "../adapters/mcdonalds";
import { normalizeRestaurant } from "../engine";
import type { IdRegistry } from "../ids";
import { registryPath } from "../ids-seed";
import { projectToRestaurantMenu } from "../project";
import { compareMcDonalds } from "./mcdonalds";

async function main() {
  const [capture, registry] = await Promise.all([
    mcdonaldsAdapter.load(), readFile(registryPath(mcdonaldsAdapter.id), "utf8"),
  ]);
  const draft = normalizeRestaurant(mcdonaldsAdapter.translate(capture));
  const report = compareMcDonalds(MCDONALDS_GENERATED_RUNTIME_MENU, draft, projectToRestaurantMenu(draft, { registry: JSON.parse(registry) as IdRegistry }));
  await writeAtomically("data/restaurants/staging/mcdonalds/parity.json", `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ...report.runtime, differences: report.differences }, null, 2));
  if (report.differences.length || report.runtime.runtimeReferenceErrors.length) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
