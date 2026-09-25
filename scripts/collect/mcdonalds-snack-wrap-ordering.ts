import { resolve } from "node:path";

import { writeAtomically } from "../lib/write-atomically";

const ENDPOINT = "https://api-consumer-client.doordash.com/graphql/itemPage?operation=itemPage";
const STORE_ID = "662234";
const MENU_ID = "958481";
const OUTPUT_DIRECTORY = resolve("data/restaurants/mcdonalds/research/ordering/raw");

const items = [
  { slug: "ranch-snack-wrap", itemId: "27679120461" },
  { slug: "spicy-snack-wrap", itemId: "27679120462" },
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

async function capture(itemId: string): Promise<unknown> {
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140 Safari/537.36",
      },
      body: JSON.stringify({
        operationName: "itemPage",
        query,
        variables: { storeId: STORE_ID, itemId, isMerchantPreview: false, isNested: false, fulfillmentType: "Delivery" },
      }),
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
  const results = [];
  for (const item of items) {
    const response = await capture(item.itemId);
    const output = resolve(OUTPUT_DIRECTORY, `${item.slug}-item-page.json`);
    await writeAtomically(output, `${JSON.stringify(response)}\n`);
    results.push({ ...item, output });
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 4000));
  }
  console.log(JSON.stringify({ capturedAt: new Date().toISOString(), storeId: STORE_ID, menuId: MENU_ID, results }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
