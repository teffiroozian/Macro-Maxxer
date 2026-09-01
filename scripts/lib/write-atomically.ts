import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

// Shared write-then-rename helper so a crash mid-write never leaves a
// partially-written generated/report file behind. Used by every
// importer/validate/review script that produces a JSON artifact.
export async function writeAtomically(path: string, contents: string): Promise<void> {
  const temporaryPath = `${path}.${process.pid}.tmp`;
  await mkdir(dirname(path), { recursive: true });
  try {
    await writeFile(temporaryPath, contents, "utf8");
    await rename(temporaryPath, path);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}
