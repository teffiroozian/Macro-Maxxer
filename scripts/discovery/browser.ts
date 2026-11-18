// Browser retrieval for JavaScript-rendered pages.
//
// withBrowser(fetcher) adds render(url): load the page in headless Chromium
// (Playwright), wait for the network to settle, and return the rendered HTML
// plus every JSON response the page itself fetched with GET. It is passive:
// no clicks, no form input, no login, no cookies carried between runs. A page
// that answers with an anti-bot challenge is reported as network_blocked and
// never solved or bypassed. robots.txt is honored by checking the page through
// the base fetcher's rules first.
//
// Playwright is loaded on demand. Where it is not installed, render() returns
// a network_blocked result that says so, and discovery carries on.
import { createRequire } from "node:module";
import { join } from "node:path";
import type { FetchResult, Fetcher, RenderResult } from "./contracts";
import { isBotChallenge, proxyUrl } from "./network";
import { USER_AGENT } from "./fetchers";

const MAX_JSON_BYTES = 5 * 1024 * 1024;
const MAX_RESPONSES = 40;

export type BrowserOptions = {
  timeoutMs?: number;
  // Only keep JSON from these hosts (restaurant and ordering hosts).
  keepHost?: (host: string) => boolean;
  executablePath?: string;
};

const blocked = (url: string, detail: string): FetchResult => ({ url, finalUrl: url, status: 0, headers: {}, body: Buffer.alloc(0), retrievedAt: new Date().toISOString(), failure: "network_blocked", failureDetail: detail });

// The small part of Playwright's API used here.
type PwResponse = { url(): string; status(): number; headers(): Record<string, string>; allHeaders(): Promise<Record<string, string>>; body(): Promise<Buffer>; request(): { method(): string } };
type PwPage = { on(event: "response", listener: (response: PwResponse) => void): void; goto(url: string, options: Record<string, unknown>): Promise<PwResponse | null>; content(): Promise<string>; url(): string };
type PwContext = { newPage(): Promise<PwPage>; close(): Promise<void> };
type PwBrowser = { newContext(options: Record<string, unknown>): Promise<PwContext>; close(): Promise<void> };
type PlaywrightModule = { chromium: { launch(options: Record<string, unknown>): Promise<PwBrowser> } };

async function loadPlaywright(): Promise<PlaywrightModule | undefined> {
  // The project dependency first, then a machine-wide install (cloud images
  // ship one under NODE_PATH).
  const require = createRequire(join(process.cwd(), "package.json"));
  for (const base of [process.cwd(), ...(process.env.NODE_PATH ?? "").split(":").filter(Boolean), "/opt/node-tools"]) {
    try {
      return require(require.resolve("playwright", { paths: [base] })) as PlaywrightModule;
    } catch {
      // try the next location
    }
  }
  return undefined;
}

export function withBrowser(base: Fetcher, options: BrowserOptions = {}): Fetcher & { close(): Promise<void> } {
  let browserPromise: Promise<PwBrowser> | undefined;
  const launch = async () => {
    const playwright = await loadPlaywright();
    if (!playwright) throw new Error("Playwright is not installed; browser rendering unavailable (npm i -D playwright, then npx playwright install chromium).");
    const proxy = proxyUrl();
    return playwright.chromium.launch({
      headless: true,
      ...(options.executablePath ? { executablePath: options.executablePath } : {}),
      ...(proxy ? { proxy: { server: proxy } } : {}),
    });
  };

  return {
    mode: base.mode,
    fetch: (url, init) => base.fetch(url, init),
    async render(url): Promise<RenderResult> {
      // robots.txt and network reachability, through the polite base fetcher.
      const probe = await base.fetch(url);
      if (probe.status === 0) return { page: probe, responses: [] };
      let browser: PwBrowser;
      try {
        browserPromise ??= launch();
        browser = await browserPromise;
      } catch (error) {
        browserPromise = undefined;
        return { page: blocked(url, error instanceof Error ? error.message : String(error)), responses: [] };
      }
      const context = await browser.newContext({ userAgent: `${USER_AGENT} browser`, ignoreHTTPSErrors: false });
      const page = await context.newPage();
      const responses: FetchResult[] = [];
      const pending: Promise<void>[] = [];
      page.on("response", (response) => {
        const request = response.request();
        const type = String(response.headers()["content-type"] ?? "");
        if (request.method() !== "GET" || !type.includes("json") || responses.length >= MAX_RESPONSES) return;
        const host = new URL(response.url()).hostname;
        if (options.keepHost && !options.keepHost(host)) return;
        pending.push(
          response
            .body()
            .then((body) => {
              if (body.length > MAX_JSON_BYTES) return;
              responses.push({ url: response.url(), finalUrl: response.url(), status: response.status(), headers: response.headers(), body, retrievedAt: new Date().toISOString() });
            })
            .catch(() => undefined),
        );
      });
      try {
        const main = await page.goto(url, { waitUntil: "networkidle", timeout: options.timeoutMs ?? 45_000 });
        await Promise.all(pending);
        const html = await page.content();
        const headers: Record<string, string> = main ? await main.allHeaders() : {};
        const status = main?.status() ?? 0;
        if (isBotChallenge(status, headers, html)) return { page: blocked(url, `bot_challenge: HTTP ${status} anti-bot challenge in the browser. Not bypassed.`), responses: [] };
        return {
          page: { url, finalUrl: page.url(), status, headers: { ...headers, "content-type": "text/html; charset=utf-8" }, body: Buffer.from(html), retrievedAt: new Date().toISOString() },
          responses,
        };
      } catch (error) {
        return { page: blocked(url, `browser: ${error instanceof Error ? error.message : String(error)}`), responses };
      } finally {
        await context.close().catch(() => undefined);
      }
    },
    async close() {
      if (browserPromise) await (await browserPromise.catch(() => undefined))?.close();
      browserPromise = undefined;
    },
  };
}
