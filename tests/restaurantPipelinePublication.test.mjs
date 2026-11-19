import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { test } from "node:test";
import { normalizeRestaurant } from "../scripts/pipeline/engine.ts";
import { projectToRestaurantMenu } from "../scripts/pipeline/project.ts";
import { applyApprovedPanels, buildPublicationReview, sha256 } from "../scripts/pipeline/publication.ts";
import { validateDraft } from "../scripts/pipeline/validate.ts";

const run = promisify(execFile);
const cli = resolve("scripts/pipeline/publish.ts");
const loader = resolve("node_modules/tsx/dist/loader.mjs");
const tsconfig = resolve("tsconfig.json");
const productionFile = "data/restaurants/chipotle/generated/restaurant.json";
const staging = "data/restaurants/staging/chipotle/normalization";

function fixture() {
  const now = new Date().toISOString();
  const captured = new Date(Date.parse(now) - 86_400_000).toISOString();
  const macros = { calories: 100, protein: 10, carbs: 15, totalFat: 0 };
  const restaurant = { id: "chipotle", name: "Chipotle" };
  const items = ["first", "second", "incomplete"].map((name, index) => ({
    id: name, name, model: "standard", sourceCategory: "Beverages", servingType: "drink", isAvailable: true, variants: [], groups: [],
    sources: [{ sourceId: "calculator", recordId: `CMG-${index}` }],
    nutrition: [{
      source: { sourceId: "calculator", recordId: `CMG-${index}`, extractionId: `extracted#${index}`, locator: String(index), flags: ["passive_capture"] },
      basis: { kind: "selected_portion", amount: 4, unit: "oz" },
      values: name === "incomplete" ? { calories: 100 } : { ...macros, sodium: 2 },
    }],
  }));
  const draft = normalizeRestaurant({ restaurant, items, ingredients: [], categoryMap: { Beverages: "Beverages" },
    sources: [{ id: "calculator", authority: "official", kind: "browser_observation", retrievedAt: captured, sha256: "fixture",
      url: "https://services.chipotle.com/menu-metadata/v1/menu-metadata/nutrition?region=US" }] }, { now: captured });
  const projection = projectToRestaurantMenu(draft);
  const existing = items.map((item, index) => ({
    id: projection.itemIds.get(item.id), name: item.name, categories: ["Beverages"], servingType: "drink", image: "keep.jpg",
    nutrition: { ...macros, cholesterol: 5 }, defaultOrder: index,
    source: { menu: { itemIds: [`CMG-${index}`], role: "standalone_product" }, nutrition: { livePortion: "4oz", pdfName: "Historic panel" } },
  }));
  existing.push({ id: "existing-main", name: "Burrito", categories: ["Burrito"], image: "main.jpg", servingType: "entree", nutrition: macros });
  const baseline = JSON.stringify({ hasBuildYourOwn: false, items: existing, metadata: { keep: true } });
  const review = buildPublicationReview(draft, validateDraft(draft, { auditQuality: true }), projection, baseline);
  const reviewText = `${JSON.stringify(review)}\n`;
  const approval = { intent: "publish", approvedBy: "Tef", reviewSha256: sha256(reviewText),
    approvedAt: now, confirmMainMenuCoverage: true, records: [{ draftId: "first" }] };
  return { now, draft, baseline, review, reviewText, approval };
}

test("publication selects only verified panels and retains unpublished optional nutrition and its provenance", () => {
  const { now, review, reviewText, baseline, approval } = fixture();
  assert.deepEqual(review.counts, { readyForApproval: 2, blocked: 1, unchanged: 0 });
  assert.throws(() => applyApprovedPanels(review, reviewText, baseline, { ...approval, reviewSha256: "wrong" }, now), /exact review/);
  assert.throws(() => applyApprovedPanels(review, reviewText, baseline, { ...approval, records: [{ draftId: "incomplete" }] }, now), /not eligible/);
  assert.throws(() => applyApprovedPanels(review, reviewText, baseline + "\n", approval, now), /Production changed/);
  assert.throws(() => applyApprovedPanels(review, reviewText, baseline, { ...approval, records: [...approval.records, ...approval.records] }, now), /unique draft IDs/);
  assert.throws(() => applyApprovedPanels(review, reviewText, baseline, { ...approval, confirmMainMenuCoverage: false }, now), /main-menu coverage/);
  const next = applyApprovedPanels(review, reviewText, baseline, approval, now);
  assert.equal(next.items[0].nutrition.sodium, 2);
  assert.equal(next.items[0].nutrition.cholesterol, 5);
  assert.equal(next.items[0].source.nutrition.retainedOptionalNutrition.cholesterol.provenance.pdfName, "Historic panel");
  assert.equal(next.items[0].image, "keep.jpg");
  assert.deepEqual(next.items.slice(1), JSON.parse(baseline).items.slice(1));
  assert.deepEqual(next.metadata, { keep: true });
});

test("omission alone produces no change for approval", () => {
  const { draft, baseline } = fixture();
  const current = JSON.parse(baseline);
  current.items[0].nutrition.sodium = 2;
  const review = buildPublicationReview(draft, validateDraft(draft, { auditQuality: true }),
    projectToRestaurantMenu(draft), JSON.stringify(current));
  assert.equal(review.records[0].status, "unchanged");
  assert.equal(review.records[0].retainedOptionalNutrition.cholesterol.value, 5);
  assert.equal(review.records[0].retainedOptionalNutrition.cholesterol.provenance.pdfName, "Historic panel");
});

test("publication review rejects a stale source and mismatched production serving", () => {
  const { draft, baseline, now } = fixture();
  const projection = projectToRestaurantMenu(draft);
  const validation = validateDraft(draft, { auditQuality: true, now });
  const changed = JSON.parse(baseline);
  changed.items[0].source.nutrition.livePortion = "6 oz";
  const review = buildPublicationReview(draft, validation, projection, JSON.stringify(changed), now);
  assert.ok(review.records[0].reasons.includes("production_serving_equivalence_unverified"));
  const future = new Date(Date.parse(now) + 91 * 86_400_000).toISOString();
  const stale = buildPublicationReview(draft, validateDraft(draft, { auditQuality: true, now: future }), projection, baseline, future);
  assert.equal(stale.counts.readyForApproval, 0);
});

test("publication CLI archives the exact production baseline and refuses replay after production changes", async () => {
  const { draft, baseline, reviewText, approval } = fixture();
  const dir = await mkdtemp(resolve(tmpdir(), "macro-publication-test-"));
  try {
    for (const [name, text] of [
      [productionFile, baseline], [`${staging}/draft.json`, JSON.stringify(draft)],
      [`${staging}/publication-review.json`, reviewText], ["approval.json", JSON.stringify(approval)],
    ]) {
      await mkdir(dirname(resolve(dir, name)), { recursive: true });
      await writeFile(resolve(dir, name), text);
    }
    const apply = () => run(process.execPath, ["--import", loader, cli, "chipotle", "--apply", "approval.json"], { cwd: dir, env: { ...process.env, TSX_TSCONFIG_PATH: tsconfig } });
    await assert.rejects(run(process.execPath, ["--import", loader, cli, "chipotle"], {
      cwd: dir, env: { ...process.env, TSX_TSCONFIG_PATH: tsconfig },
    }), /explicit-owner-approval/);
    assert.equal(await readFile(resolve(dir, productionFile), "utf8"), baseline);
    await apply();
    const archive = resolve(dir, "data/restaurants/chipotle/history", approval.reviewSha256);
    assert.equal(await readFile(resolve(archive, "previous-menu.json"), "utf8"), baseline);
    assert.deepEqual(JSON.parse(await readFile(resolve(archive, "approval.json"), "utf8")), approval);
    const replacement = await readFile(resolve(dir, productionFile), "utf8");
    assert.equal((await readFile(resolve(archive, "replacement-sha256.txt"), "utf8")).trim(), sha256(replacement));
    await assert.rejects(apply(), /changed/);
    assert.equal(await readFile(resolve(dir, productionFile), "utf8"), replacement);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
