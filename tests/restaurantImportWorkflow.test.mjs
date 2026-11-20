import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const exec = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const staging = "data/restaurants/staging/mod";
const research = "docs/research/mod-pizza";
const baseline = "data/restaurants/mod.json";

async function fixture(t, empty = false) {
  const cwd = await mkdtemp(resolve(tmpdir(), "restaurant-import-"));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  for (const dir of ["scripts", "node_modules"]) await symlink(resolve(root, dir), resolve(cwd, dir), "dir");
  await mkdir(resolve(cwd, staging), { recursive: true });
  await mkdir(resolve(cwd, dirname(research)), { recursive: true });
  if (empty) {
    await mkdir(resolve(cwd, research));
    await writeFile(resolve(cwd, research, "evidence-manifest.json"), JSON.stringify({ files: [] }));
  } else {
    await symlink(resolve(root, research), resolve(cwd, research), "dir");
  }
  const original = await readFile(resolve(root, baseline), "utf8");
  await writeFile(resolve(cwd, baseline), original);
  await writeFile(resolve(cwd, staging, "discovery.json"), "prior independent run\n");
  const run = (...args) => exec(process.execPath, ["--import", "tsx", "scripts/pipeline/run.ts", "import", ...args], {
    cwd, env: { ...process.env, TSX_TSCONFIG_PATH: resolve(root, "tsconfig.json") },
  });
  const report = async () => {
    const base = resolve(cwd, staging, "imports");
    const [runId] = await readdir(base);
    const dir = resolve(base, runId);
    const json = async (file) => JSON.parse(await readFile(resolve(dir, file), "utf8"));
    return { dir, json, run: await json("import-run.json") };
  };
  return { cwd, original, run, report };
}

test("one command replays MOD into an isolated review and escalates gaps while retaining supported evidence", async (t) => {
  const f = await fixture(t);
  await f.run("mod-pizza", "--replay", "--enrich");
  const { dir, json, run } = await f.report();
  assert.equal(run.status, "review_ready");
  assert.equal(run.mode, "replay");
  assert.deepEqual(run.completedStages, ["discovery", "extraction", "normalization-and-review"]);
  assert.ok(run.manualReview.some(({ need, status }) => need === "protein" && status !== "extracted"));
  assert.equal((await json("extraction.json")).discovery.file, await realpath(resolve(dir, "discovery.json")));
  assert.equal((await json("normalization/validation.json")).valid, true);
  assert.ok((await json("normalization/draft.json")).items.length > 0);
  assert.ok(await json("normalization/enrichment.json"));
  assert.equal(run.publication.readyForApproval, 0);
  assert.equal(await readFile(resolve(f.cwd, staging, "discovery.json"), "utf8"), "prior independent run\n");
  assert.equal(await readFile(resolve(f.cwd, baseline), "utf8"), f.original);
  await assert.rejects(readFile(resolve(f.cwd, "data/restaurants/id-registry/mod.json")), { code: "ENOENT" });
});

test("missing adapters and publish flags fail before any collection", async (t) => {
  const f = await fixture(t);
  await assert.rejects(f.run("starbucks", "--live"), /Missing extraction adapter for "starbucks".*--research-only/);
  await assert.rejects(f.run("mod", "--apply"), /Unknown option/);
  await assert.rejects(f.run("chipotle", "--replay"), /No replay is configured/);
  await assert.rejects(readdir(resolve(f.cwd, staging, "imports")), { code: "ENOENT" });
});

test("exhausted discovery stops without using older artifacts", async (t) => {
  const f = await fixture(t, true);
  await assert.rejects(f.run("mod", "--replay"), /Discovery found no extractable sources/);
  const { dir, run } = await f.report();
  assert.equal(run.status, "stopped");
  assert.deepEqual(run.completedStages, ["discovery"]);
  assert.ok(run.manualReview.length);
  await assert.rejects(readFile(resolve(dir, "extraction.json")), { code: "ENOENT" });
  assert.equal(await readFile(resolve(f.cwd, staging, "discovery.json"), "utf8"), "prior independent run\n");
});

test("a staging symlink is rejected before an import can write to its target", async (t) => {
  const f = await fixture(t);
  const imports = resolve(f.cwd, staging, "imports");
  const outside = resolve(f.cwd, "outside-staging");
  await mkdir(outside);
  await symlink(outside, imports, "dir");
  await assert.rejects(f.run("mod"), /Import staging must be a real directory/);
  assert.deepEqual(await readdir(outside), []);
});
