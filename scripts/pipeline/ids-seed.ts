// Usage: npm run pipeline:ids:seed -- <restaurant-id> <path-to-live-menu.json>
//
// One-time bootstrap for a restaurant the app already serves: records its
// live ids in data/restaurants/id-registry/<restaurant-id>.json. Refuses to
// run when a registry already exists, because the registry is append-only.
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { writeAtomically } from "../lib/write-atomically";
import { seedRegistryFromRuntimeMenu, type SeedMenu } from "./ids";

export const registryPath = (restaurantId: string) => resolve(process.cwd(), "data/restaurants/id-registry", `${restaurantId}.json`);

async function main(): Promise<void> {
  const [restaurantId, menuPath] = process.argv.slice(2);
  if (!restaurantId || !menuPath) {
    console.error("Usage: npm run pipeline:ids:seed -- <restaurant-id> <path-to-live-menu.json>");
    process.exitCode = 1;
    return;
  }
  const target = registryPath(restaurantId);
  if (await access(target).then(() => true, () => false)) {
    console.error(`${target} already exists. The id registry is append-only; it is not re-seeded.`);
    process.exitCode = 1;
    return;
  }
  const menu = JSON.parse(await readFile(resolve(process.cwd(), menuPath), "utf8")) as SeedMenu;
  const registry = seedRegistryFromRuntimeMenu(restaurantId, menu);
  await writeAtomically(target, `${JSON.stringify(registry, null, 2)}\n`);
  const byKind = registry.entries.reduce<Record<string, number>>((counts, entry) => ({ ...counts, [entry.kind]: (counts[entry.kind] ?? 0) + 1 }), {});
  console.log(`Seeded ${registry.entries.length} ids for ${restaurantId} at ${target}`);
  console.log(byKind);
}

if (process.argv[1]?.endsWith("ids-seed.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
