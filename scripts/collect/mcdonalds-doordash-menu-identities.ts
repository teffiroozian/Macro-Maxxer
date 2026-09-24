import { resolve } from "node:path";

import { writeAtomically } from "../lib/write-atomically";

const ENDPOINT = "https://api-consumer-client.doordash.com/graphql/storepageFeed?operation=storepageFeed";
const STORE_ID = "662234";
const MENU_ID = "958481";
const OUTPUT = resolve("data/restaurants/mcdonalds/research/ordering/raw/doordash-menu-identities.json");

const query = `query storepageFeed($storeId: ID!, $menuId: ID, $fulfillmentType: FulfillmentType) {
  storepageFeed(storeId: $storeId, menuId: $menuId, fulfillmentType: $fulfillmentType) {
    storeHeader { id name }
    menuBook { id name menuCategories { id name numItems } }
    itemLists { id name items { id name description displayPrice imageUrl ratingDisplayString } }
  }
}`;

async function main(): Promise<void> {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "Macro Maxxer McDonald's ordering data capture" },
    body: JSON.stringify({ operationName: "storepageFeed", variables: { storeId: STORE_ID, menuId: MENU_ID, fulfillmentType: "Delivery" }, query }),
  });
  const body = await response.json() as { errors?: unknown[] };
  if (!response.ok) throw new Error(`DoorDash menu: HTTP ${response.status}: ${JSON.stringify(body)}`);
  if (body.errors?.length) throw new Error(`DoorDash menu: ${JSON.stringify(body.errors)}`);
  await writeAtomically(OUTPUT, `${JSON.stringify(body)}\n`);
  console.log(JSON.stringify({ output: OUTPUT }, null, 2));
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.stack ?? error.message : error); process.exitCode = 1; });
