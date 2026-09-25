import { resolve } from "node:path";

import { writeAtomically } from "../lib/write-atomically";

const ENDPOINT = "https://api-consumer-client.doordash.com/graphql/itemPage?operation=itemPage";
const STORE_ID = "662234";
const OUTPUT = resolve("data/restaurants/mcdonalds/research/ordering/raw/filet-o-fish-item-page.json");
const CANDIDATE_ITEM_IDS = process.argv.slice(2).length > 0
  ? process.argv.slice(2)
  : ["6600487520", "6600487521", "6600487522", "6600487524", "6600487525", "6600487526", "6600487529", "6600487531", "6600487532"];

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
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "Macro Maxxer McDonald's ordering data capture" },
      body: JSON.stringify({ operationName: "itemPage", query,
        variables: { storeId: STORE_ID, itemId, isMerchantPreview: false, isNested: false, fulfillmentType: "Delivery" } }),
    });
    if (response.status === 429 && attempt < 3) {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 2000));
      continue;
    }
    if (!response.ok) throw new Error(`DoorDash itemPage ${itemId}: HTTP ${response.status}`);
    return response.json();
  }
  throw new Error(`DoorDash itemPage ${itemId}: retries exhausted`);
}

async function main(): Promise<void> {
  for (const itemId of CANDIDATE_ITEM_IDS) {
    const response = await capture(itemId) as { data?: { itemPage?: { itemHeader?: { name?: string } } } };
    console.log(JSON.stringify({ candidateItemId: itemId, name: response.data?.itemPage?.itemHeader?.name ?? null }));
    if (/filet-o-fish/i.test(response.data?.itemPage?.itemHeader?.name ?? "")) {
      await writeAtomically(OUTPUT, `${JSON.stringify(response)}\n`);
      console.log(JSON.stringify({ capturedAt: new Date().toISOString(), storeId: STORE_ID, itemId, output: OUTPUT }, null, 2));
      return;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1500));
  }
  throw new Error("Filet-O-Fish was not found in the bounded candidate identity range");
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.stack ?? error.message : error); process.exitCode = 1; });
