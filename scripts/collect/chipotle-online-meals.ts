import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const RESTAURANT = "Chipotle";
const RESTAURANT_ID = "469";
const CHANNEL_ID = "web";

const SERVICES_BASE_URL = "https://services.chipotle.com";
const CALCULATOR_PAGE_URL = "https://www.chipotle.com/nutrition-calculator";
const ONLINE_MEALS_URL = new URL(
  `/menuinnovation/v1/restaurants/${RESTAURANT_ID}/onlinemeals?channelId=${CHANNEL_ID}`,
  SERVICES_BASE_URL,
).toString();

const ONLINE_MEALS_OUTPUT_PATH = resolve("data/raw/chipotle/online-meals.json");
const ONLINE_MEALS_SOURCE_PATH = resolve(
  "data/raw/chipotle/online-meals-source.json",
);

// Chipotle's Azure API Management gateway requires a subscription key on
// services.chipotle.com calls. The nutrition-calculator page embeds the
// public, browser-facing key it uses for these calls in a meta tag:
//   <meta property="servicesconfig" data-host="..." data-appkey="..."/>
// We discover it at collection time instead of hardcoding it, since
// Chipotle controls and may rotate this value. (Mirrors
// scripts/collect/chipotle-calculator-menu.ts.)
const SERVICES_CONFIG_TAG_PATTERN = /<meta\s+property="servicesconfig"[^>]*>/i;
const DATA_HOST_PATTERN = /data-host="([^"]+)"/i;
const DATA_APPKEY_PATTERN = /data-appkey="([^"]+)"/i;

const EXPECTED_MEAL_FIELDS = [
  "mealId",
  "mealName",
  "mealType",
  "description",
  "mealPrice",
  "mealDeliveryPrice",
  "calories",
  "entree",
  "sides",
  "drinks",
] as const;

const CMG_ITEM_ID_PATTERN = /^CMG-\d+$/;

type JsonObject = Record<string, unknown>;

interface ServicesConfig {
  host: string;
  appKey: string;
}

function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function fetchText(
  url: string,
  label: string,
  headers?: Record<string, string>,
): Promise<string> {
  let response: Response;

  try {
    response = await fetch(url, { headers, redirect: "follow" });
  } catch (error) {
    throw new Error(`Failed to fetch ${label} from ${url}.`, { cause: error });
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${label} from ${url}: ${response.status} ${response.statusText}.`,
    );
  }

  const text = await response.text();
  if (text.trim() === "") {
    throw new Error(`${label} returned an empty response.`);
  }

  return text;
}

async function fetchJson(
  url: string,
  label: string,
  headers?: Record<string, string>,
): Promise<unknown> {
  const text = await fetchText(url, label, headers);

  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new Error(`${label} returned invalid JSON.`, { cause: error });
  }
}

async function discoverServicesConfig(): Promise<ServicesConfig> {
  const html = await fetchText(
    CALCULATOR_PAGE_URL,
    "Chipotle nutrition calculator page",
  );

  const tagMatch = html.match(SERVICES_CONFIG_TAG_PATTERN);
  if (!tagMatch) {
    throw new Error(
      'Could not find the "servicesconfig" meta tag on Chipotle\'s nutrition calculator page.',
    );
  }

  const tag = tagMatch[0];
  const hostMatch = tag.match(DATA_HOST_PATTERN);
  const appKeyMatch = tag.match(DATA_APPKEY_PATTERN);

  if (!hostMatch || !appKeyMatch) {
    throw new Error(
      'The "servicesconfig" meta tag on Chipotle\'s nutrition calculator page is missing data-host or data-appkey.',
    );
  }

  return { host: hostMatch[1], appKey: appKeyMatch[1] };
}

function validateOnlineMealsShape(
  meals: unknown,
): asserts meals is JsonObject[] {
  if (!Array.isArray(meals)) {
    throw new Error("Chipotle's onlinemeals response was not a JSON array.");
  }
  if (meals.length === 0) {
    throw new Error("Chipotle's onlinemeals response was an empty array.");
  }

  for (const [index, meal] of meals.entries()) {
    if (!isJsonObject(meal)) {
      throw new Error(`Chipotle's onlinemeals response item ${index} was not a JSON object.`);
    }
    const missing = EXPECTED_MEAL_FIELDS.filter((field) => !(field in meal));
    if (missing.length > 0) {
      throw new Error(
        `Chipotle's onlinemeals response item ${index} ("${meal.mealName as string}") is missing expected field(s): ${missing.join(", ")}.`,
      );
    }
  }
}

function collectCmgItemIds(meals: JsonObject[]): Set<string> {
  const ids = new Set<string>();

  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!isJsonObject(value)) return;

    const itemId = value.itemId;
    if (typeof itemId === "string" && CMG_ITEM_ID_PATTERN.test(itemId)) {
      ids.add(itemId);
    }

    for (const nested of Object.values(value)) {
      if (isJsonObject(nested) || Array.isArray(nested)) {
        visit(nested);
      }
    }
  };

  meals.forEach(visit);
  return ids;
}

function getTimestamp(): string {
  return new Date().toISOString();
}

async function writeAtomically(path: string, contents: string): Promise<void> {
  const temporaryPath = `${path}.${process.pid}.tmp`;

  try {
    await writeFile(temporaryPath, contents, "utf8");
    await rename(temporaryPath, path);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

async function main(): Promise<void> {
  const servicesConfig = await discoverServicesConfig();
  const requestHeaders = {
    accept: "application/json",
    "Ocp-Apim-Subscription-Key": servicesConfig.appKey,
  };

  const meals = await fetchJson(
    ONLINE_MEALS_URL,
    "Chipotle online meals",
    requestHeaders,
  );
  validateOnlineMealsShape(meals);

  const cmgItemIds = collectCmgItemIds(meals);
  const mealTypeCounts: Record<string, number> = {};
  for (const meal of meals) {
    const mealType = String(meal.mealType ?? "unknown");
    mealTypeCounts[mealType] = (mealTypeCounts[mealType] ?? 0) + 1;
  }

  await mkdir(dirname(ONLINE_MEALS_OUTPUT_PATH), { recursive: true });
  await writeAtomically(
    ONLINE_MEALS_OUTPUT_PATH,
    `${JSON.stringify(meals, null, 2)}\n`,
  );

  const onlineMealsMetadata = {
    restaurant: RESTAURANT,
    sourceType: "official-onlinemeals-api",
    source: ONLINE_MEALS_URL,
    restaurantId: RESTAURANT_ID,
    channelId: CHANNEL_ID,
    retrieved: getTimestamp(),
    collectorScript: "scripts/collect/chipotle-online-meals.ts",
    mealCount: meals.length,
    mealCountsByType: mealTypeCounts,
    distinctCmgItemIdCount: cmgItemIds.size,
    subscriptionKeyDiscovery: {
      method:
        'Discovered dynamically at collection time from the <meta property="servicesconfig" data-host="..." data-appkey="..."/> tag on the nutrition-calculator page, rather than hardcoded, since Chipotle controls and may rotate this value.',
      discoveredFromPage: CALCULATOR_PAGE_URL,
      discoveredHost: servicesConfig.host,
    },
    notes: [
      "This endpoint is restaurant-specific (restaurant 469), matching the restaurant used for calculator-menu.json and menu-metadata.json.",
      `As of collection time, the mealType values present were: ${Object.keys(mealTypeCounts).join(", ")}. No entries were observed with an explicit \"FamilyMeal\"-style mealType; the response instead mixes Build-Your-Own, High Protein, and Influencer-branded preconfigured meals. This is reported as-is, not corrected or filtered.`,
      "Each meal's \"entree\" and, where present, \"sides\"/\"drinks\" arrays reference component items by the same \"CMG-*\" itemId scheme used in calculator-menu.json and menu-metadata.json.",
      "This file is the fully untouched source JSON array from the onlinemeals endpoint: no fields renamed, no records removed or deduplicated, no reconciliation against the other Chipotle raw sources, and no mapping to Macro Maxxer's schema.",
    ],
  };

  await writeAtomically(
    ONLINE_MEALS_SOURCE_PATH,
    `${JSON.stringify(onlineMealsMetadata, null, 2)}\n`,
  );

  console.log(
    `Collected ${meals.length} Chipotle online meals for restaurant ${RESTAURANT_ID}.`,
  );
  console.log("Meal counts by type:", mealTypeCounts);
  console.log(`Distinct CMG item IDs referenced: ${cmgItemIds.size}`);
  console.log("Saved to data/raw/chipotle/online-meals.json");
  console.log("Saved to data/raw/chipotle/online-meals-source.json");
}

main().catch((error: unknown) => {
  console.error(
    `Chipotle online-meals collection failed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exitCode = 1;
});
