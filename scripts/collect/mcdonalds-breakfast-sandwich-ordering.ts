import { access } from "node:fs/promises";
import { resolve } from "node:path";

import { writeAtomically } from "../lib/write-atomically";

const ITEM_ENDPOINT = "https://api-consumer-client.doordash.com/graphql/itemPage?operation=itemPage";
const MENU_ENDPOINT = "https://api-consumer-client.doordash.com/graphql/storepageFeed?operation=storepageFeed";
const STORE_ID = "662393";
const MENU_ID = "18196178";
const OUTPUT_DIRECTORY = resolve("data/restaurants/mcdonalds/research/ordering/raw");

const items = [
  { slug: "bacon-egg-cheese-bagel", itemId: "11811799990" },
  { slug: "egg-cheese-bagel", itemId: "11811808181" },
  { slug: "sausage-egg-cheese-bagel", itemId: "11811804143" },
  { slug: "steak-egg-cheese-bagel", itemId: "11811786026" },
  { slug: "bacon-egg-cheese-biscuit", itemId: "6570932120" },
  { slug: "egg-cheese-biscuit", itemId: "6570932124" },
  { slug: "sausage-biscuit-with-egg", itemId: "6570932121" },
  { slug: "sausage-biscuit", itemId: "6570932122" },
  { slug: "bacon-egg-cheese-mcgriddles", itemId: "6570932130" },
  { slug: "sausage-egg-cheese-mcgriddles", itemId: "6570932132" },
  { slug: "sausage-mcgriddles", itemId: "6570932131" },
  { slug: "egg-mcmuffin", itemId: "6570932126" },
  { slug: "sausage-mcmuffin-with-egg", itemId: "6570932127" },
  { slug: "sausage-mcmuffin", itemId: "6570932128" },
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

async function request(endpoint: string, operationName: string, query: string, variables: Record<string, unknown>): Promise<unknown> {
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140 Safari/537.36",
      },
      body: JSON.stringify({ operationName, query, variables }),
    });
    const text = await response.text();
    let body: { errors?: unknown[] };
    try {
      body = JSON.parse(text) as { errors?: unknown[] };
    } catch {
      if (attempt < 10) {
        await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 5000));
        continue;
      }
      throw new Error(`DoorDash ${operationName}: HTTP ${response.status}, non-JSON response: ${text.slice(0, 120)}`);
    }
    if ((!response.ok || body.errors?.length) && attempt < 10) {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 5000));
      continue;
    }
    if (!response.ok) throw new Error(`DoorDash ${operationName}: HTTP ${response.status}: ${JSON.stringify(body)}`);
    if (body.errors?.length) throw new Error(`DoorDash ${operationName}: ${JSON.stringify(body.errors)}`);
    return body;
  }
  throw new Error(`DoorDash ${operationName}: retries exhausted`);
}

async function main(): Promise<void> {
  const menuOutput = resolve(OUTPUT_DIRECTORY, "doordash-breakfast-menu-identities.json");
  try {
    await access(menuOutput);
  } catch {
    const menu = await request(MENU_ENDPOINT, "storepageFeed", menuQuery, {
      storeId: STORE_ID,
      menuId: MENU_ID,
      fulfillmentType: "Delivery",
    });
    await writeAtomically(menuOutput, `${JSON.stringify(menu)}\n`);
  }

  const results = [];
  for (const item of items) {
    const output = resolve(OUTPUT_DIRECTORY, `${item.slug}-item-page.json`);
    try {
      await access(output);
      results.push({ ...item, output, reused: true });
      continue;
    } catch {}
    const response = await request(ITEM_ENDPOINT, "itemPage", itemQuery, {
      storeId: STORE_ID,
      itemId: item.itemId,
      isMerchantPreview: false,
      isNested: false,
      fulfillmentType: "Delivery",
    });
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
