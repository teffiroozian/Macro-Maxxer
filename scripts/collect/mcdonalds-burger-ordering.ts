import { access } from "node:fs/promises";
import { resolve } from "node:path";

import { writeAtomically } from "../lib/write-atomically";

const ENDPOINT = "https://api-consumer-client.doordash.com/graphql/itemPage?operation=itemPage";
const STORE_ID = "662234";
const OUTPUT_DIRECTORY = resolve("data/restaurants/mcdonalds/research/ordering/raw");

const items = [
  { slug: "cheeseburger", itemId: "25120693146" },
  { slug: "hamburger", itemId: "6600487523" },
  { slug: "mcdouble", itemId: "6600487528" },
  { slug: "double-cheeseburger", itemId: "6600487519" },
  { slug: "daily-double", itemId: "6600487527" },
  { slug: "quarter-pounder-deluxe", itemId: "25120693140" },
  { slug: "double-quarter-pounder", itemId: "25120693136" },
  { slug: "bacon-quarter-pounder", itemId: "25120693138" },
] as const;

const query = `query itemPage($storeId: ID!, $itemId: ID!, $isMerchantPreview: Boolean, $isNested: Boolean!, $fulfillmentType: FulfillmentType) {
  itemPage(storeId: $storeId, itemId: $itemId, isMerchantPreview: $isMerchantPreview, fulfillmentType: $fulfillmentType) {
    itemHeader @skip(if: $isNested) { id name unitAmount currency caloricInfoDisplayString quantityLimit menuId }
    optionLists {
      type id name subtitle selectionNode minNumOptions maxNumOptions
      minAggregateOptionsQuantity maxAggregateOptionsQuantity minOptionChoiceQuantity maxOptionChoiceQuantity
      numFreeOptions isOptional
      options { id name unitAmount currency displayString caloricInfoDisplayString chargeAbove defaultQuantity minOptionChoiceQuantity maxOptionChoiceQuantity }
    }
    itemType
  }
}`;

async function capture(itemId: string): Promise<unknown> {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "Macro Maxxer McDonald's ordering data capture" },
      body: JSON.stringify({
        operationName: "itemPage",
        query,
        variables: { storeId: STORE_ID, itemId, isMerchantPreview: false, isNested: false, fulfillmentType: "Delivery" },
      }),
    });
    if (response.status === 429 && attempt < 5) {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 3000));
      continue;
    }
    if (!response.ok) throw new Error(`DoorDash itemPage ${itemId}: HTTP ${response.status}`);
    const body = await response.json() as { errors?: unknown[] };
    if (body.errors?.length) throw new Error(`DoorDash itemPage ${itemId}: ${JSON.stringify(body.errors)}`);
    return body;
  }
  throw new Error(`DoorDash itemPage ${itemId}: retries exhausted`);
}

async function main(): Promise<void> {
  const results = [];
  for (const item of items) {
    const output = resolve(OUTPUT_DIRECTORY, `${item.slug}-item-page.json`);
    try {
      await access(output);
      results.push({ ...item, output, reused: true });
      continue;
    } catch {}
    const response = await capture(item.itemId);
    await writeAtomically(output, `${JSON.stringify(response)}\n`);
    results.push({ ...item, output });
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1500));
  }
  console.log(JSON.stringify({ capturedAt: new Date().toISOString(), storeId: STORE_ID, results }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
