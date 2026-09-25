import { resolve } from "node:path";

import { writeAtomically } from "../lib/write-atomically";

const ENDPOINT = "https://www.mcdonalds.com/dnaapp/itemList";
const OUTPUT = resolve("data/restaurants/mcdonalds/research/ordering/raw/filet-o-fish-dna.json");
const requests = [
  { id: "filet-o-fish-patty", expression: "200445(300055)" },
  { id: "filet-o-fish-bun", expression: "200445(301578)" },
  { id: "filet-o-fish-tartar-sauce", expression: "200445(302503)" },
  { id: "filet-o-fish-half-cheese", expression: "200445(300716)" },
  { id: "filet-o-fish-standard", expression: "200445()" },
] as const;

async function main(): Promise<void> {
  const captures = [];
  for (const request of requests) {
    const url = new URL(ENDPOINT);
    url.searchParams.set("country", "US");
    url.searchParams.set("language", "en");
    url.searchParams.set("showLiveData", "true");
    url.searchParams.set("nutrient_req", "Y");
    url.searchParams.set("item", request.expression);
    const response = await fetch(url, { headers: { "user-agent": "Macro Maxxer McDonald's data importer" } });
    if (!response.ok) throw new Error(`McDonald's DNA ${request.expression}: HTTP ${response.status}`);
    captures.push({ ...request, url: url.toString(), response: await response.json() });
  }
  await writeAtomically(OUTPUT, `${JSON.stringify({ capturedAt: new Date().toISOString(), endpoint: ENDPOINT, captures }, null, 2)}\n`);
  console.log(JSON.stringify({ output: OUTPUT, captures: captures.length }, null, 2));
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.stack ?? error.message : error); process.exitCode = 1; });
