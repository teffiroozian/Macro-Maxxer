import { access } from "node:fs/promises";
import { resolve } from "node:path";

import { writeAtomically } from "../lib/write-atomically";

const ENDPOINT = "https://api-consumer-client.doordash.com/graphql/itemPage?operation=itemPage";
const STORE_ID = "662393";
const OUTPUT_DIRECTORY = resolve("data/restaurants/mcdonalds/research/ordering/raw");

const items = [
  { slug: "big-breakfast", itemId: "6570917221" },
  { slug: "big-breakfast-with-hotcakes", itemId: "6570917222" },
  { slug: "hotcakes-and-sausage", itemId: "6570917223" },
  { slug: "hotcakes", itemId: "6570917224" },
  { slug: "fruit-maple-oatmeal", itemId: "6570921441" },
  { slug: "sausage-burrito", itemId: "6570932133" },
  { slug: "premium-roast-coffee", itemId: "6570913666" },
  { slug: "premium-roast-decaf-coffee", itemId: "6570913667" },
  { slug: "iced-coffee", itemId: "6570913669" },
  { slug: "iced-caramel-coffee", itemId: "6570913670" },
  { slug: "iced-vanilla-coffee", itemId: "6570913672" },
  { slug: "hot-chocolate", itemId: "6570936474" },
  { slug: "mocha-frappe", itemId: "6570936478" },
  { slug: "caramel-frappe", itemId: "6570936479" },
  { slug: "caramel-macchiato", itemId: "6570936480" },
  { slug: "iced-caramel-macchiato", itemId: "6570936481" },
  { slug: "mocha-latte", itemId: "6570936482" },
  { slug: "iced-mocha-latte", itemId: "6570936484" },
  { slug: "latte", itemId: "6570936486" },
  { slug: "caramel-latte", itemId: "6570936487" },
  { slug: "vanilla-latte", itemId: "6570936489" },
  { slug: "iced-latte", itemId: "6570936491" },
  { slug: "iced-caramel-latte", itemId: "6570936492" },
  { slug: "iced-vanilla-latte", itemId: "6570936494" },
  { slug: "cappuccino", itemId: "6570936496" },
  { slug: "vanilla-cappuccino", itemId: "6570936497" },
  { slug: "caramel-cappuccino", itemId: "6570936500" },
  { slug: "americano", itemId: "6570936501" },
] as const;

const query = `query itemPage($storeId: ID!, $itemId: ID!, $isMerchantPreview: Boolean, $isNested: Boolean!, $fulfillmentType: FulfillmentType) {
  itemPage(storeId: $storeId, itemId: $itemId, isMerchantPreview: $isMerchantPreview, fulfillmentType: $fulfillmentType) {
    itemHeader @skip(if: $isNested) { id name description unitAmount currency caloricInfoDisplayString quantityLimit menuId }
    optionLists {
      type id name subtitle selectionNode minNumOptions maxNumOptions
      minAggregateOptionsQuantity maxAggregateOptionsQuantity minOptionChoiceQuantity maxOptionChoiceQuantity
      numFreeOptions isOptional
      options { id name unitAmount currency displayString caloricInfoDisplayString chargeAbove defaultQuantity minOptionChoiceQuantity maxOptionChoiceQuantity }
    }
    itemType
  }
}`;

async function exists(path: string): Promise<boolean> {
  try { await access(path); return true; } catch { return false; }
}

async function capture(itemId: string): Promise<unknown> {
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140 Safari/537.36" },
      body: JSON.stringify({ operationName: "itemPage", query, variables: { storeId: STORE_ID, itemId, isMerchantPreview: false, isNested: false, fulfillmentType: "Delivery" } }),
      signal: AbortSignal.timeout(30_000),
    });
    const text = await response.text();
    try {
      const body = JSON.parse(text) as { data?: { itemPage?: { itemHeader?: { id?: string } } }; errors?: unknown[] };
      if (response.ok && !body.errors?.length && body.data?.itemPage?.itemHeader?.id === itemId) return body;
    } catch {}
    if (attempt < 8) await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 4000));
  }
  throw new Error(`DoorDash itemPage ${itemId}: retries exhausted`);
}

async function main(): Promise<void> {
  const results: Array<(typeof items)[number] & { output: string; status: string }> = [];
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const item = items[cursor++];
    const output = resolve(OUTPUT_DIRECTORY, `${item.slug}-item-page.json`);
    if (await exists(output)) { results.push({ ...item, output, status: "existing" }); continue; }
    const response = await capture(item.itemId);
    await writeAtomically(output, `${JSON.stringify(response)}\n`);
    results.push({ ...item, output, status: "captured" });
    console.log(`captured ${item.slug}`);
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 3500));
    }
  }
  await Promise.all([worker(), worker(), worker()]);
  console.log(JSON.stringify({ capturedAt: new Date().toISOString(), storeId: STORE_ID, results }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
