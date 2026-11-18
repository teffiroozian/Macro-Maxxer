// Fetchers for source discovery.
//
// - liveFetcher: polite anonymous GETs (robots.txt honored, one request per
//   host at a time with a delay, size cap, timeout). Optionally records every
//   response as replayable evidence.
// - replayFetcher: answers from saved responses listed in an evidence
//   manifest (the format docs/research/<restaurant>/evidence-manifest.json
//   uses). URLs that were never saved come back as "not_captured", so a replay
//   never pretends a source is missing.
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { writeAtomically } from "../lib/write-atomically";
import type { FetchResult, Fetcher, ReplayConfig } from "./contracts";
import { parseRobots, robotsAllows, type Robots } from "./analyze";
import { diagnoseHost, isBotChallenge, type HostDiagnosis } from "./network";

export const USER_AGENT = "MacroMaxxer-SourceDiscovery/1.0 (nutrition source research; read-only)";
const MAX_BYTES = 15 * 1024 * 1024;

export const sha256 = (body: Buffer) => createHash("sha256").update(body).digest("hex");

function noResponse(url: string, failure: FetchResult["failure"], detail?: string): FetchResult {
  return { url, finalUrl: url, status: 0, headers: {}, body: Buffer.alloc(0), retrievedAt: new Date().toISOString(), failure, failureDetail: detail };
}

// ── Raw header files ("HTTP/2 200\nname: value\n…") ──────────────────────

export function parseHeaderFile(text: string): { status: number; headers: Record<string, string> } {
  const lines = text.split(/\r?\n/);
  const status = Number(/^HTTP\/[\d.]+\s+(\d{3})/.exec(lines[0] ?? "")?.[1] ?? 200);
  const headers: Record<string, string> = {};
  for (const line of lines.slice(1)) {
    const index = line.indexOf(":");
    if (index <= 0) continue;
    const name = line.slice(0, index).trim().toLowerCase();
    const value = line.slice(index + 1).trim();
    headers[name] = headers[name] ? `${headers[name]}, ${value}` : value;
  }
  return { status, headers };
}

const formatHeaderFile = (status: number, headers: Record<string, string>) =>
  `HTTP/1.1 ${status}\n${Object.entries(headers)
    .filter(([name]) => name !== "set-cookie")
    .map(([name, value]) => `${name}: ${value}`)
    .join("\n")}\n`;

// ── Replay ───────────────────────────────────────────────────────────────

type ManifestFile = { path: string; source_url: string; sha256?: string; bytes?: number };

const urlKeys = (url: string) => {
  const trimmed = url.replace(/#.*$/, "");
  return [trimmed, trimmed.endsWith("/") ? trimmed.slice(0, -1) : `${trimmed}/`];
};

export async function replayFetcher(config: ReplayConfig, root = process.cwd()): Promise<Fetcher> {
  const manifestPath = resolve(root, config.manifest);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as { files: ManifestFile[]; research_date_local?: string };
  const evidenceDir = resolve(dirname(manifestPath), "evidence");
  const exclude = new Set(config.exclude ?? []);
  const entries = new Map<string, { body?: ManifestFile; headers?: ManifestFile }>();
  for (const file of manifest.files) {
    if (exclude.has(file.path)) continue;
    const entry = entries.get(file.source_url) ?? {};
    if (file.path.endsWith(".headers")) entry.headers = file;
    else entry.body ??= file;
    entries.set(file.source_url, entry);
  }
  const fallbackTime = config.capturedAt ?? (manifest.research_date_local ? new Date(`${manifest.research_date_local}T12:00:00Z`).toISOString() : new Date().toISOString());
  const locate = async (file: ManifestFile) => {
    for (const candidate of [resolve(evidenceDir, file.path), resolve(dirname(manifestPath), file.path)]) {
      try {
        return await readFile(candidate);
      } catch {
        // try the next location
      }
    }
    throw new Error(`Replay file ${file.path} listed in ${config.manifest} was not found`);
  };

  return {
    mode: "replay",
    async fetch(url) {
      const entry = urlKeys(url).map((key) => entries.get(key)).find(Boolean);
      if (!entry?.body && !entry?.headers) return noResponse(url, "not_captured", "no saved response for this URL");
      const head = entry.headers ? parseHeaderFile((await locate(entry.headers)).toString("utf8")) : { status: 200, headers: {} as Record<string, string> };
      let body = entry.body ? await locate(entry.body) : Buffer.alloc(0);
      if (entry.body?.path.endsWith(".gz")) body = gunzipSync(body);
      const date = head.headers.date ? Date.parse(head.headers.date) : Number.NaN;
      if (!head.headers["content-type"] && entry.body) {
        const name = entry.body.path.replace(/\.gz$/, "");
        head.headers["content-type"] = name.endsWith(".json") ? "application/json" : name.endsWith(".js") ? "application/javascript" : name.endsWith(".pdf") ? "application/pdf" : "text/html";
      }
      return {
        url,
        finalUrl: url,
        status: head.status,
        headers: head.headers,
        body,
        retrievedAt: Number.isNaN(date) ? fallbackTime : new Date(date).toISOString(),
      };
    },
  };
}

// ── Live ─────────────────────────────────────────────────────────────────

export type LiveOptions = {
  userAgent?: string;
  delayMs?: number;
  timeoutMs?: number;
  // Injected in tests; defaults to network.ts diagnoseHost.
  diagnose?: (host: string) => Promise<HostDiagnosis>;
  // Save every response here, with an evidence-manifest.json, so the run can
  // be replayed and audited later.
  recordDir?: string;
};

export function liveFetcher(options: LiveOptions = {}): Fetcher & { flush(): Promise<void> } {
  const userAgent = options.userAgent ?? USER_AGENT;
  const delayMs = options.delayMs ?? 750;
  const robotsByOrigin = new Map<string, Promise<Robots | undefined>>();
  const lastRequestAt = new Map<string, number>();
  const recorded: ManifestFile[] = [];
  // One diagnosis per host, made the first time a request to it fails.
  const diagnoses = new Map<string, Promise<HostDiagnosis>>();
  const diagnose = options.diagnose ?? diagnoseHost;
  const diagnosisFor = (host: string) => {
    if (!diagnoses.has(host)) diagnoses.set(host, diagnose(host));
    return diagnoses.get(host)!;
  };

  const politeFetch = async (url: string, accept?: string): Promise<Response> => {
    const host = new URL(url).host;
    const wait = (lastRequestAt.get(host) ?? 0) + delayMs - Date.now();
    if (wait > 0) await new Promise((done) => setTimeout(done, wait));
    lastRequestAt.set(host, Date.now());
    return fetch(url, {
      headers: { "user-agent": userAgent, accept: accept ?? "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8" },
      redirect: "follow",
      signal: AbortSignal.timeout(options.timeoutMs ?? 20_000),
    });
  };

  const robotsFor = (url: string) => {
    const { origin } = new URL(url);
    if (!robotsByOrigin.has(origin)) {
      robotsByOrigin.set(
        origin,
        politeFetch(`${origin}/robots.txt`, "text/plain")
          .then(async (response) => (response.ok ? parseRobots(await response.text()) : undefined))
          .catch(() => undefined),
      );
    }
    return robotsByOrigin.get(origin)!;
  };

  const record = async (result: FetchResult) => {
    if (!options.recordDir) return;
    const stem = `${String(recorded.length / 2 + 1).padStart(3, "0")}-${basename(new URL(result.url).pathname) || "index"}`.replace(/[^a-z0-9._-]/gi, "_").slice(0, 80);
    const compress = result.body.length > 200_000;
    const bodyPath = `${stem}.body${compress ? ".gz" : ""}`;
    const bodyBytes = compress ? gzipSync(result.body) : result.body;
    const headerBytes = Buffer.from(formatHeaderFile(result.status, { ...result.headers, date: result.headers.date ?? new Date(result.retrievedAt).toUTCString() }));
    await mkdir(resolve(options.recordDir, "evidence"), { recursive: true });
    await writeFile(resolve(options.recordDir, "evidence", bodyPath), bodyBytes);
    await writeFile(resolve(options.recordDir, "evidence", `${stem}.headers`), headerBytes);
    recorded.push(
      { path: bodyPath, source_url: result.url, bytes: bodyBytes.length, sha256: sha256(bodyBytes) },
      { path: `${stem}.headers`, source_url: result.url, bytes: headerBytes.length, sha256: sha256(headerBytes) },
    );
  };

  return {
    mode: "live",
    async fetch(url, init) {
      if (!url.endsWith("/robots.txt")) {
        const robots = await robotsFor(url);
        if (robots && !robotsAllows(robots, url)) return noResponse(url, "blocked_by_robots", "disallowed by robots.txt");
      }
      try {
        const response = await politeFetch(url, init?.accept);
        const length = Number(response.headers.get("content-length") ?? 0);
        if (length > MAX_BYTES) {
          await response.body?.cancel();
          return noResponse(url, "too_large", `${length} bytes`);
        }
        const body = Buffer.from(await response.arrayBuffer());
        const headers: Record<string, string> = {};
        response.headers.forEach((value, name) => {
          headers[name] = value;
        });
        const result: FetchResult = { url, finalUrl: response.url || url, status: response.status, headers, body: body.subarray(0, MAX_BYTES), retrievedAt: new Date().toISOString() };
        if (isBotChallenge(response.status, headers, body.subarray(0, 20_000).toString("utf8"))) {
          return { ...noResponse(url, "network_blocked", `bot_challenge: HTTP ${response.status} anti-bot challenge page. Not bypassed.`), status: 0 };
        }
        await record(result);
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // Tell a network that refuses the host apart from a site that failed.
        const diagnosis = await diagnosisFor(new URL(url).hostname);
        // A name that does not resolve with no proxy in the way is a dead
        // link (the domain is gone), not a network that refuses the request.
        if (diagnosis.status === "dns_failure" && !diagnosis.viaProxy) return noResponse(url, "network_error", `dead link: ${diagnosis.host} does not resolve (${diagnosis.detail})`);
        if (diagnosis.status !== "ok" && diagnosis.status !== "http_error") {
          return noResponse(url, "network_blocked", `${diagnosis.status}: ${diagnosis.detail}${diagnosis.fix ? `. ${diagnosis.fix}` : ""}`);
        }
        return noResponse(url, "network_error", message);
      }
    },
    async flush() {
      if (!options.recordDir || recorded.length === 0) return;
      await writeAtomically(
        resolve(options.recordDir, "evidence-manifest.json"),
        `${JSON.stringify({ recorded_at: new Date().toISOString(), notes: ["Recorded by scripts/discovery (live mode). Set-Cookie headers omitted. .gz bodies decompress to the original response."], files: recorded }, null, 2)}\n`,
      );
    },
  };
}
