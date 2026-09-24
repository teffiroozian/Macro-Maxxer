import { resolve } from "node:path";

import { writeAtomically } from "../lib/write-atomically";

const ENDPOINT = "https://www.mcdonalds.com/dnaapp/itemList";
const OUTPUT = resolve("data/restaurants/mcdonalds/customization/raw/dna-calculator.json");

type RequestDefinition = {
  id: string;
  kind: "component" | "validation";
  parentItemId: number;
  componentIds?: number[];
  notes: string;
};

const requests: RequestDefinition[] = [
  { id: "qpc-beef", kind: "component", parentItemId: 200466, componentIds: [301574], notes: "Quarter Pounder default beef portion" },
  { id: "qpc-bun", kind: "component", parentItemId: 200466, componentIds: [301516], notes: "Quarter Pounder default bun portion" },
  { id: "qpc-cheese-default", kind: "component", parentItemId: 200466, componentIds: [301518], notes: "Quarter Pounder default two-slice cheese portion" },
  { id: "american-cheese-single", kind: "component", parentItemId: 200463, componentIds: [301518], notes: "Single American cheese slice used for Extra American Cheese" },
  { id: "qpc-ketchup", kind: "component", parentItemId: 200466, componentIds: [300037], notes: "Quarter Pounder ketchup portion" },
  { id: "qpc-pickle", kind: "component", parentItemId: 200466, componentIds: [300042], notes: "Quarter Pounder pickle portion" },
  { id: "qpc-onions", kind: "component", parentItemId: 200466, componentIds: [301502], notes: "Quarter Pounder slivered-onion portion" },
  { id: "qpc-mustard", kind: "component", parentItemId: 200466, componentIds: [300044], notes: "Quarter Pounder mustard portion" },
  { id: "big-mac-sauce", kind: "component", parentItemId: 200463, componentIds: [301554], notes: "Big Mac Sauce portion" },
  { id: "big-mac-bun", kind: "component", parentItemId: 200463, componentIds: [302510], notes: "Big Mac three-part bun portion" },
  { id: "big-mac-beef-default", kind: "component", parentItemId: 200463, componentIds: [300038], notes: "Default two-patty Big Mac beef portion used to validate the one-patty context" },
  { id: "big-mac-beef-single", kind: "component", parentItemId: 200477, componentIds: [300038], notes: "Single 1/10 lb beef patty from Hamburger; same component used by Big Mac" },
  { id: "big-mac-diced-onions", kind: "component", parentItemId: 200463, componentIds: [300041], notes: "Big Mac diced-onion portion" },
  { id: "big-mac-shredded-lettuce", kind: "component", parentItemId: 200463, componentIds: [300098], notes: "Big Mac shredded-lettuce portion" },
  { id: "big-mac-pickle", kind: "component", parentItemId: 200463, componentIds: [300042], notes: "Big Mac pickle portion" },
  { id: "tomato-single-slice", kind: "component", parentItemId: 200497, componentIds: [301407], notes: "Single Roma tomato slice from Daily Double; Big Mac ordering add option specifies two slices" },
  { id: "regular-bun", kind: "component", parentItemId: 200477, componentIds: [301578], notes: "Regular hamburger bun portion" },
  { id: "small-ketchup", kind: "component", parentItemId: 200477, componentIds: [300037], notes: "Hamburger-family ketchup portion" },
  { id: "small-pickle-single", kind: "component", parentItemId: 200477, componentIds: [300042], notes: "Single-patty hamburger-family pickle portion" },
  { id: "small-pickle-double", kind: "component", parentItemId: 200491, componentIds: [300042], notes: "Double-patty hamburger-family pickle portion" },
  { id: "diced-onions-single", kind: "component", parentItemId: 200477, componentIds: [300041], notes: "Single-patty hamburger-family diced-onion portion" },
  { id: "diced-onions-double", kind: "component", parentItemId: 200491, componentIds: [300041], notes: "Double-patty hamburger-family diced-onion portion" },
  { id: "bacon-two-half-strips", kind: "component", parentItemId: 200424, componentIds: [300163], notes: "Two-half-strip bacon portion used by regular-burger add options" },
  { id: "daily-double-lettuce-default", kind: "component", parentItemId: 200497, componentIds: [300098], notes: "Daily Double default half-size shredded-lettuce portion" },
  { id: "qpc-add-bacon", kind: "component", parentItemId: 203410, componentIds: [300163], notes: "Three-half-strip bacon portion from Bacon Quarter Pounder" },
  { id: "qpc-add-lettuce", kind: "component", parentItemId: 200765, componentIds: [300098], notes: "Shredded lettuce portion from Quarter Pounder Deluxe" },
  { id: "qpc-add-tomato", kind: "component", parentItemId: 200765, componentIds: [301407], notes: "Three-slice tomato portion from Quarter Pounder Deluxe" },
  { id: "qpc-add-mayonnaise", kind: "component", parentItemId: 200765, componentIds: [300430], notes: "Mayonnaise portion from Quarter Pounder Deluxe" },
  { id: "mccrispy-filet", kind: "component", parentItemId: 203747, componentIds: [302309], notes: "McCrispy default chicken filet portion" },
  { id: "mccrispy-potato-roll", kind: "component", parentItemId: 203747, componentIds: [302402], notes: "McCrispy default potato-roll portion" },
  { id: "mccrispy-crinkle-pickle", kind: "component", parentItemId: 203747, componentIds: [302415], notes: "McCrispy default crinkle-cut-pickle portion" },
  { id: "mccrispy-butter", kind: "component", parentItemId: 203747, componentIds: [300310], notes: "McCrispy default salted-butter portion" },
  { id: "mccrispy-spicy-sauce", kind: "component", parentItemId: 203901, componentIds: [302376], notes: "Spicy McCrispy default spicy-pepper-sauce portion" },
  { id: "deluxe-mccrispy-tomato", kind: "component", parentItemId: 203745, componentIds: [301407], notes: "Deluxe McCrispy default three-slice tomato portion" },
  { id: "deluxe-mccrispy-lettuce", kind: "component", parentItemId: 203745, componentIds: [300098], notes: "Deluxe McCrispy default shredded-lettuce portion" },
  { id: "deluxe-mccrispy-mayonnaise", kind: "component", parentItemId: 203745, componentIds: [300430], notes: "Deluxe McCrispy default mayonnaise portion" },
  { id: "mchicken-patty", kind: "component", parentItemId: 200438, componentIds: [300708], notes: "McChicken default chicken-patty portion" },
  { id: "mchicken-bun", kind: "component", parentItemId: 200438, componentIds: [301578], notes: "McChicken default regular-bun portion" },
  { id: "mchicken-lettuce", kind: "component", parentItemId: 200438, componentIds: [300098], notes: "McChicken default shredded-lettuce portion" },
  { id: "mchicken-mayonnaise", kind: "component", parentItemId: 200438, componentIds: [300430], notes: "McChicken default mayonnaise portion" },
  { id: "mccrispy-ranch-sauce", kind: "validation", parentItemId: 204161, notes: "Standalone McCrispy Ranch Sauce item matching the captured add option" },
  { id: "filet-o-fish-patty", kind: "component", parentItemId: 200445, componentIds: [300055], notes: "Filet-O-Fish default fish-filet patty portion" },
  { id: "filet-o-fish-bun", kind: "component", parentItemId: 200445, componentIds: [301578], notes: "Filet-O-Fish default regular-bun portion" },
  { id: "filet-o-fish-tartar-sauce", kind: "component", parentItemId: 200445, componentIds: [302503], notes: "Filet-O-Fish default tartar-sauce portion" },
  { id: "filet-o-fish-half-cheese", kind: "component", parentItemId: 200445, componentIds: [300716], notes: "Filet-O-Fish dedicated half-slice American cheese portion" },
  { id: "big-mac-standard", kind: "validation", parentItemId: 200463, notes: "Official default Big Mac" },
  { id: "big-mac-no-sauce", kind: "validation", parentItemId: 200463, componentIds: [302510, 300038, 300098, 301518, 300042, 300041], notes: "Big Mac without component 301554" },
  { id: "big-mac-no-cheese", kind: "validation", parentItemId: 200463, componentIds: [302510, 300038, 300098, 301554, 300042, 300041], notes: "Big Mac without component 301518" },
  { id: "cheeseburger-standard", kind: "validation", parentItemId: 200480, notes: "Official default Cheeseburger" },
  { id: "hamburger-standard", kind: "validation", parentItemId: 200477, notes: "Official default Hamburger" },
  { id: "mcdouble-standard", kind: "validation", parentItemId: 200491, notes: "Official default McDouble" },
  { id: "double-cheeseburger-standard", kind: "validation", parentItemId: 200486, notes: "Official default Double Cheeseburger" },
  { id: "daily-double-standard", kind: "validation", parentItemId: 200497, notes: "Official default Daily Double" },
  { id: "quarter-pounder-deluxe-standard", kind: "validation", parentItemId: 200765, notes: "Official default Quarter Pounder with Cheese Deluxe" },
  { id: "double-quarter-pounder-standard", kind: "validation", parentItemId: 200476, notes: "Official default Double Quarter Pounder with Cheese" },
  { id: "bacon-quarter-pounder-standard", kind: "validation", parentItemId: 203410, notes: "Official default Bacon Quarter Pounder with Cheese" },
  { id: "qpc-standard", kind: "validation", parentItemId: 200466, notes: "Official default Quarter Pounder with Cheese" },
  { id: "qpc-no-cheese", kind: "validation", parentItemId: 200466, componentIds: [301574, 301516, 300037, 300042, 301502, 300044], notes: "Quarter Pounder without component 301518" },
  { id: "qpc-no-ketchup", kind: "validation", parentItemId: 200466, componentIds: [301574, 301516, 301518, 300042, 301502, 300044], notes: "Quarter Pounder without component 300037" },
  { id: "mccrispy-standard", kind: "validation", parentItemId: 203747, notes: "Official default McCrispy" },
  { id: "deluxe-mccrispy-standard", kind: "validation", parentItemId: 203745, notes: "Official default Deluxe McCrispy" },
  { id: "spicy-mccrispy-standard", kind: "validation", parentItemId: 203901, notes: "Official default Spicy McCrispy" },
  { id: "spicy-deluxe-mccrispy-standard", kind: "validation", parentItemId: 203873, notes: "Official default Spicy Deluxe McCrispy" },
  { id: "mcchicken-standard", kind: "validation", parentItemId: 200438, notes: "Official default McChicken" },
  { id: "filet-o-fish-standard", kind: "validation", parentItemId: 200445, notes: "Official default Filet-O-Fish" },
];

function expression(request: RequestDefinition): string {
  return `${request.parentItemId}(${request.componentIds?.join("|") ?? ""})`;
}

async function fetchJson(url: string): Promise<unknown> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "user-agent": "Macro Maxxer McDonald's data importer" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 500));
    }
  }
  throw lastError;
}

async function main(): Promise<void> {
  const captures = [];
  for (const request of requests) {
    const url = new URL(ENDPOINT);
    url.searchParams.set("country", "US");
    url.searchParams.set("language", "en");
    url.searchParams.set("showLiveData", "true");
    url.searchParams.set("nutrient_req", "Y");
    url.searchParams.set("item", expression(request));
    const response = await fetchJson(url.toString());
    captures.push({ ...request, expression: expression(request), url: url.toString(), response });
  }
  const output = {
    capturedAt: new Date().toISOString(),
    endpoint: ENDPOINT,
    requestSchema: {
      method: "GET",
      query: { country: "US", language: "en", showLiveData: "true", nutrient_req: "Y", item: "{parentItemId}({includedComponentIdsPipeSeparated})" },
    },
    captures,
  };
  await writeAtomically(OUTPUT, `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify({ output: OUTPUT, captures: captures.length }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
