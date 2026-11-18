import { compileChickFilASourceOrdering } from "../adapters/chick-fil-a-source-ordering";
import { readFile } from "node:fs/promises";
import { writeAtomically } from "../../lib/write-atomically";
import { chickFilAAdapter } from "../adapters/chick-fil-a";
import { normalizeRestaurant } from "../engine";
import type { IdRegistry } from "../ids";
import { registryPath } from "../ids-seed";
import { projectToRestaurantMenu } from "../project";
import { compareChickFilA } from "./chick-fil-a";

async function main() {
  const [captures, baseline, registry] = await Promise.all([
    chickFilAAdapter.load(),
    readFile("data/restaurants/chick-fil-a/generated/restaurant.json", "utf8").then(JSON.parse),
    readFile(registryPath(chickFilAAdapter.id), "utf8").then((content) => JSON.parse(content) as IdRegistry),
  ]);
  const draft = normalizeRestaurant(chickFilAAdapter.translate(captures));
  const report = compareChickFilA(baseline, draft, projectToRestaurantMenu(draft, { registry }));
  await writeAtomically("data/restaurants/staging/chickfila/parity.json", `${JSON.stringify(report, null, 2)}\n`);
  const { audit } = compileChickFilASourceOrdering(captures.menu);
  await writeAtomically("data/restaurants/staging/chickfila/ordering-coverage.json", `${JSON.stringify(audit, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
