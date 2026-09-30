import { renameSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const routesToDisable = [
  {
    source: path.join(root, "app/restaurant/[id]/@modal/(.)[itemSlug]"),
    disabled: path.join(root, "app/restaurant/[id]/@modal/_capacitor-item-route"),
  },
  {
    source: path.join(root, "app/restaurant/[id]/[itemSlug]"),
    disabled: path.join(root, "app/restaurant/[id]/_capacitor-item-page"),
  },
];
const disabledRoutes = [];

try {
  // The native bundle opens items through the existing client-side preview
  // modal, so its export needs neither hosted item endpoint. Prefixing their
  // directories with `_` hides them from Next's file-system route discovery.
  for (const route of routesToDisable) {
    renameSync(route.source, route.disabled);
    disabledRoutes.push(route);
  }

  const result = spawnSync(
    process.execPath,
    [path.join(root, "node_modules/next/dist/bin/next"), "build"],
    {
      cwd: root,
      env: { ...process.env, CAPACITOR_BUILD: "1" },
      stdio: "inherit",
    },
  );

  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  for (const route of disabledRoutes.reverse()) {
    renameSync(route.disabled, route.source);
  }
}
