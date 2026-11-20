import { lstat, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

export const isRestaurantId = (id: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);

export async function importStaging(restaurant: string, runId: string, create = false): Promise<string> {
  if (!isRestaurantId(restaurant) || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(runId)) {
    throw new Error("Invalid restaurant or import run ID");
  }

  let path = process.cwd();
  for (const part of ["data", "restaurants", "staging", restaurant, "imports", runId]) {
    path = resolve(path, part);
    if (create) {
      await mkdir(path, { mode: 0o700 }).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "EEXIST" || part === runId) throw error;
      });
    }
    if (!(await lstat(path)).isDirectory()) throw new Error(`Import staging must be a real directory: ${path}`);
  }
  return path;
}
