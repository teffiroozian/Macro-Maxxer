// This command changes the active menu only with an explicit owner approval
// of an exact review against the current production baseline.
import { mkdir, open, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { writeAtomically } from "../lib/write-atomically";
import type { RestaurantDraft } from "./contracts";
import { emptyRegistry, type IdRegistry } from "./ids";
import { registryPath } from "./ids-seed";
import { checkRuntimeMenu, projectToRestaurantMenu } from "./project";
import { applyApprovedPanels, buildPublicationReview, PUBLICATION_TARGETS, sha256, type OwnerApproval, type PublicationRestaurant } from "./publication";
import { validateDraft } from "./validate";

async function immutableFile(path: string, text: string) {
  try {
    await writeFile(path, text, { flag: "wx" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST" || await readFile(path, "utf8") !== text) throw error;
  }
}

async function main() {
  const [restaurant, flag, approvalFile, ...extra] = process.argv.slice(2);
  if (!restaurant || !Object.hasOwn(PUBLICATION_TARGETS, restaurant) || flag !== "--apply" || !approvalFile || extra.length) {
    throw new Error("Usage: npm run pipeline:publish -- <mod|chipotle> --apply <explicit-owner-approval.json>");
  }
  const target = PUBLICATION_TARGETS[restaurant as PublicationRestaurant];
  if (!target.live) throw new Error("Runtime launch needs separate integration review");
  const [approvalText, draftText, reviewText, registry] = await Promise.all([
    readFile(resolve(approvalFile), "utf8"),
    readFile(resolve("data/restaurants/staging", restaurant, "normalization/draft.json"), "utf8"),
    readFile(resolve("data/restaurants/staging", restaurant, "normalization/publication-review.json"), "utf8"),
    readFile(registryPath(restaurant), "utf8").then(
      (data) => JSON.parse(data) as IdRegistry,
      (error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return emptyRegistry(restaurant); throw error; },
    ),
  ]);
  const approval = JSON.parse(approvalText) as OwnerApproval;
  const draft = JSON.parse(draftText) as RestaurantDraft;
  if (draft.restaurant.id !== restaurant) throw new Error("Draft restaurant does not match the publication target");
  const path = resolve(target.path);
  const lock = `${path}.publish.lock`;
  const handle = await open(lock, "wx");
  try {
    const baseline = await readFile(path, "utf8");
    const now = new Date().toISOString();
    const validation = validateDraft(draft, { auditQuality: true, now });
    const projection = projectToRestaurantMenu(draft, { registry });
    const review = buildPublicationReview(draft, validation, projection, baseline, now);
    if (`${JSON.stringify(review)}\n` !== reviewText) {
      throw new Error("Draft, production baseline, registry, or verification status changed. Regenerate the review and get approval again.");
    }
    const next = applyApprovedPanels(review, reviewText, baseline, approval, now);
    const baselineErrors = new Set(checkRuntimeMenu(JSON.parse(baseline)));
    if (checkRuntimeMenu(next).some((error) => !baselineErrors.has(error))) throw new Error("Publication creates a runtime relationship error");
    const nextText = `${JSON.stringify(next, null, 2)}\n`;
    // Archive the complete prior menu and the exact decision before committing
    // a single atomic file change. A retry cannot overwrite the archive.
    const history = resolve("data/restaurants", restaurant, "history", sha256(reviewText));
    await mkdir(history, { recursive: true });
    await immutableFile(resolve(history, "previous-menu.json"), baseline);
    await immutableFile(resolve(history, "review.json"), reviewText);
    await immutableFile(resolve(history, "draft.json"), draftText);
    await immutableFile(resolve(history, "approval.json"), approvalText);
    await immutableFile(resolve(history, "replacement-sha256.txt"), `${sha256(nextText)}\n`);
    if (await readFile(path, "utf8") !== baseline) throw new Error("Production changed during publication");
    await writeAtomically(path, nextText);
    console.log(`Applied ${approval.records.length} explicitly approved updates. Previous menu archived at ${history}.`);
  } finally {
    await handle.close();
    await unlink(lock);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
