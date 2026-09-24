import { resolve } from "node:path";

import { writeAtomically } from "../lib/write-atomically";

const ITEM_ENDPOINT = "https://api-consumer-client.doordash.com/graphql/itemPage?operation=itemPage";
const MENU_ENDPOINT = "https://api-consumer-client.doordash.com/graphql/storepageFeed?operation=storepageFeed";
const OUTPUT_DIRECTORY = resolve("data/restaurants/mcdonalds/research/ordering/raw");

const items = [
  { slug: "chicken-mcnuggets-4-piece", storeId: "662234", menuId: "958481", itemId: "6600489915" },
  { slug: "chicken-mcnuggets-6-piece", storeId: "662234", menuId: "958481", itemId: "6600489916" },
  { slug: "chicken-mcnuggets-10-piece", storeId: "662234", menuId: "958481", itemId: "6600489918" },
  { slug: "chicken-mcnuggets-20-piece", storeId: "662234", menuId: "958481", itemId: "6600489920" },
  { slug: "chicken-mcnuggets-40-piece", storeId: "653555", menuId: "927318", itemId: "6599600707" },
  { slug: "mccrispy-strips-3-piece", storeId: "662234", menuId: "958481", itemId: "25266199124" },
  { slug: "mccrispy-strips-4-piece", storeId: "662234", menuId: "958481", itemId: "25266199126" },
] as const;

const itemQuery = `query itemPage($storeId: ID!, $itemId: ID!, $isMerchantPreview: Boolean, $isNested: Boolean!, $fulfillmentType: FulfillmentType) {
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

const menuQuery = `query storepageFeed($storeId: ID!, $menuId: ID, $fulfillmentType: FulfillmentType) {
  storepageFeed(storeId: $storeId, menuId: $menuId, fulfillmentType: $fulfillmentType) {
    storeHeader { id name }
    menuBook { id name menuCategories { id name numItems } }
    itemLists { id name items { id name description displayPrice imageUrl } }
  }
}`;

async function request(endpoint: string, operationName: string, query: string, variables: Record<string, unknown>, expectedItemId?: string): Promise<unknown> {
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140 Safari/537.36",
      },
      body: JSON.stringify({ operationName, query, variables }),
      signal: AbortSignal.timeout(30_000),
    });
    const text = await response.text();
    try {
      const body = JSON.parse(text) as { data?: { itemPage?: { itemHeader?: { id?: string } } }; errors?: unknown[] };
      const identityMatches = !expectedItemId || body.data?.itemPage?.itemHeader?.id === expectedItemId;
      if (response.ok && !body.errors?.length && identityMatches) return body;
    } catch {}
    if (attempt < 8) await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 4000));
  }
  throw new Error(`DoorDash ${operationName}: retries exhausted`);
}

async function main(): Promise<void> {
  const chicagoMenu = await request(MENU_ENDPOINT, "storepageFeed", menuQuery, {
    storeId: "653555",
    menuId: "927318",
    fulfillmentType: "Delivery",
  });
  await writeAtomically(resolve(OUTPUT_DIRECTORY, "doordash-menu-identities-store-653555.json"), `${JSON.stringify(chicagoMenu)}\n`);

  const results = [];
  for (const item of items) {
    const response = await request(ITEM_ENDPOINT, "itemPage", itemQuery, {
      storeId: item.storeId,
      itemId: item.itemId,
      isMerchantPreview: false,
      isNested: false,
      fulfillmentType: "Delivery",
    }, item.itemId);
    const output = resolve(OUTPUT_DIRECTORY, `${item.slug}-item-page.json`);
    await writeAtomically(output, `${JSON.stringify(response)}\n`);
    results.push({ ...item, output });
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 4000));
  }
  console.log(JSON.stringify({ capturedAt: new Date().toISOString(), results }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
