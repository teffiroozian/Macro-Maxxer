// Network diagnosis for live discovery.
//
// A failed request says nothing about a restaurant's sources until we know
// why it failed. diagnoseHost tells apart:
//   proxy_denied   an egress proxy refused the CONNECT (e.g. a cloud sandbox
//                  whose allowlist lacks the host)
//   dns_failure    the name does not resolve from here
//   timeout / tls_error / connection_error
//   bot_challenge  the site answered with a challenge page (Cloudflare, Akamai,
//                  captcha). Discovery never solves or bypasses these.
//   http_error     the site answered with an error status
//   ok
import { lookup } from "node:dns/promises";
import { request } from "node:http";

export type NetworkStatus = "ok" | "proxy_denied" | "dns_failure" | "timeout" | "tls_error" | "connection_error" | "bot_challenge" | "http_error";

export type HostDiagnosis = {
  host: string;
  status: NetworkStatus;
  httpStatus?: number;
  viaProxy: boolean;
  detail: string;
  fix?: string;
};

export function proxyUrl(): string | undefined {
  return process.env.HTTPS_PROXY ?? process.env.https_proxy ?? process.env.HTTP_PROXY ?? process.env.http_proxy;
}

function bypassesProxy(host: string): boolean {
  const list = (process.env.NO_PROXY ?? process.env.no_proxy ?? "").split(",").map((entry) => entry.trim()).filter(Boolean);
  return list.some((entry) => entry === "*" || host === entry.replace(/^\*?\./, "") || host.endsWith(entry.startsWith(".") ? entry : `.${entry.replace(/^\*\./, "")}`));
}

// Signs of an anti-bot interstitial instead of the page.
export function isBotChallenge(status: number, headers: Record<string, string>, body: string): boolean {
  if (headers["cf-mitigated"] === "challenge") return true;
  if (status !== 403 && status !== 429 && status !== 503) return false;
  return /just a moment|cf-chl|challenge-platform|captcha|access denied|attention required|px-captcha|_incapsula_/i.test(body.slice(0, 20_000));
}

function proxyConnect(proxy: string, host: string, timeoutMs: number): Promise<{ status: number } | { error: string }> {
  return new Promise((resolve) => {
    const target = new URL(proxy);
    const req = request({ host: target.hostname, port: Number(target.port || 80), method: "CONNECT", path: `${host}:443`, timeout: timeoutMs });
    req.on("connect", (response, socket) => {
      socket.destroy();
      resolve({ status: response.statusCode ?? 0 });
    });
    req.on("timeout", () => {
      req.destroy();
      resolve({ error: "timeout" });
    });
    req.on("error", (error) => resolve({ error: error.message }));
    req.end();
  });
}

const FIX: Partial<Record<NetworkStatus, string>> = {
  proxy_denied: "The egress proxy's allowlist does not include this host. Add it to the environment's allowed hosts (cloud: environment network settings), or run discovery locally.",
  dns_failure: "The host name does not resolve from this machine. Check the domain in the target, or the machine's DNS.",
  timeout: "No answer in time. Retry later, or from another network.",
  tls_error: "TLS failed. If a proxy re-signs traffic, point NODE_EXTRA_CA_CERTS at its CA bundle.",
  bot_challenge: "The site served an anti-bot challenge. Discovery does not bypass it. Try --browser (a real browser page load), or collect this page by hand.",
};

export async function diagnoseHost(host: string, timeoutMs = 15_000): Promise<HostDiagnosis> {
  const proxy = proxyUrl();
  const viaProxy = Boolean(proxy) && !bypassesProxy(host);
  const finish = (status: NetworkStatus, detail: string, httpStatus?: number): HostDiagnosis => ({ host, status, viaProxy, detail, httpStatus, fix: FIX[status] });

  if (viaProxy) {
    const connect = await proxyConnect(proxy!, host, timeoutMs);
    if ("error" in connect) return finish("connection_error", `proxy unreachable: ${connect.error}`);
    if (connect.status === 403 || connect.status === 407) return finish("proxy_denied", `egress proxy answered ${connect.status} to CONNECT ${host}:443`);
    if (connect.status === 502 || connect.status === 504) return finish("connection_error", `proxy could not reach ${host} (${connect.status})`);
    if (connect.status !== 200) return finish("connection_error", `proxy answered ${connect.status}`);
  } else {
    try {
      await lookup(host);
    } catch (error) {
      return finish("dns_failure", error instanceof Error ? error.message : String(error));
    }
  }

  try {
    const response = await fetch(`https://${host}/robots.txt`, { redirect: "follow", signal: AbortSignal.timeout(timeoutMs), headers: { "user-agent": "MacroMaxxer-SourceDiscovery/1.0 (diagnosis)" } });
    const headers: Record<string, string> = {};
    response.headers.forEach((value, name) => {
      headers[name] = value;
    });
    const body = await response.text();
    if (isBotChallenge(response.status, headers, body)) return finish("bot_challenge", `HTTP ${response.status} challenge page`, response.status);
    if (response.status >= 500) return finish("http_error", `HTTP ${response.status}`, response.status);
    return finish("ok", `HTTP ${response.status}${viaProxy ? " via proxy" : ""}`, response.status);
  } catch (error) {
    const cause = (error as { cause?: { code?: string; message?: string } }).cause;
    const message = `${(error as Error).message}${cause ? ` (${cause.code ?? ""} ${cause.message ?? ""})` : ""}`;
    if (/timeout|aborted/i.test(message)) return finish("timeout", message);
    if (/cert|tls|ssl|self.signed|UNABLE_TO/i.test(message)) return finish("tls_error", message);
    if (viaProxy && !process.env.NODE_USE_ENV_PROXY) return finish("connection_error", `${message}. Node's fetch ignores HTTPS_PROXY unless NODE_USE_ENV_PROXY=1 (npm run discover sets it).`);
    return finish("connection_error", message);
  }
}

export async function diagnoseHosts(hosts: string[]): Promise<HostDiagnosis[]> {
  return Promise.all([...new Set(hosts)].map((host) => diagnoseHost(host)));
}

export function formatDiagnoses(diagnoses: HostDiagnosis[]): string {
  return diagnoses
    .map((entry) => `${entry.status === "ok" ? "ok   " : "FAIL "} ${entry.host.padEnd(32)} ${entry.status.padEnd(16)} ${entry.detail}${entry.fix ? `\n      → ${entry.fix}` : ""}`)
    .join("\n");
}
