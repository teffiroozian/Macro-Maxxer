import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const RESTAURANT = "Chipotle";
const COUNTRY = "US";

const SERVICES_BASE_URL = "https://services.chipotle.com";
const CALCULATOR_PAGE_URL = "https://www.chipotle.com/nutrition-calculator";
const MENU_RULES_URL = new URL(
  `/menuinnovation/v1/universalmenus/menurules?country=${COUNTRY}`,
  SERVICES_BASE_URL,
).toString();

const MENU_RULES_OUTPUT_PATH = resolve("data/raw/chipotle/menu-rules.json");
const MENU_RULES_SOURCE_PATH = resolve(
  "data/raw/chipotle/menu-rules-source.json",
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

const EXPECTED_TOP_LEVEL_ARRAY_FIELDS = [
  "entrees",
  "sides",
  "drinks",
  "nonFoodItems",
] as const;

const EXPECTED_ITEM_RULE_FIELDS = [
  "maxContents",
  "maxCustomizations",
  "maxOnTheSideCustomizations",
  "maxExtras",
  "maxHalfs",
  "maxExtrasPlusHalfs",
  "contentGroups",
] as const;

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

function validateMenuRulesShape(
  rules: unknown,
): asserts rules is JsonObject {
  if (!isJsonObject(rules)) {
    throw new Error("Chipotle's menurules response was not a JSON object.");
  }

  const missingArrays = EXPECTED_TOP_LEVEL_ARRAY_FIELDS.filter(
    (field) => !Array.isArray(rules[field]),
  );
  if (missingArrays.length > 0) {
    throw new Error(
      `Chipotle's menurules response is missing expected array field(s): ${missingArrays.join(", ")}.`,
    );
  }
}

function findFirstItemWithRuleFields(
  rules: JsonObject,
): JsonObject | undefined {
  for (const field of EXPECTED_TOP_LEVEL_ARRAY_FIELDS) {
    const items = rules[field] as unknown[];
    for (const item of items) {
      if (isJsonObject(item) && "maxContents" in item) {
        return item;
      }
    }
  }
  return undefined;
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

  const rules = await fetchJson(
    MENU_RULES_URL,
    "Chipotle universal menu rules",
    requestHeaders,
  );
  validateMenuRulesShape(rules);

  const recordCounts: Record<string, number> = {};
  for (const field of EXPECTED_TOP_LEVEL_ARRAY_FIELDS) {
    recordCounts[field] = (rules[field] as unknown[]).length;
  }

  const sampleItem = findFirstItemWithRuleFields(rules);
  const missingRuleFieldsOnSample = sampleItem
    ? EXPECTED_ITEM_RULE_FIELDS.filter((field) => !(field in sampleItem))
    : [...EXPECTED_ITEM_RULE_FIELDS];

  await mkdir(dirname(MENU_RULES_OUTPUT_PATH), { recursive: true });
  await writeAtomically(
    MENU_RULES_OUTPUT_PATH,
    `${JSON.stringify(rules, null, 2)}\n`,
  );

  const menuRulesMetadata = {
    restaurant: RESTAURANT,
    sourceType: "official-universal-menurules-api",
    source: MENU_RULES_URL,
    country: COUNTRY,
    retrieved: getTimestamp(),
    collectorScript: "scripts/collect/chipotle-menu-rules.ts",
    recordCountsByCategory: recordCounts,
    totalRecords: Object.values(recordCounts).reduce((a, b) => a + b, 0),
    sampleItemRuleFieldCheck: {
      sampleItemId: sampleItem?.itemId ?? null,
      sampleItemName: sampleItem?.itemName ?? null,
      expectedFields: [...EXPECTED_ITEM_RULE_FIELDS],
      missingFields: missingRuleFieldsOnSample,
    },
    subscriptionKeyDiscovery: {
      method:
        'Discovered dynamically at collection time from the <meta property="servicesconfig" data-host="..." data-appkey="..."/> tag on the nutrition-calculator page, rather than hardcoded, since Chipotle controls and may rotate this value.',
      discoveredFromPage: CALCULATOR_PAGE_URL,
      discoveredHost: servicesConfig.host,
    },
    notes: [
      "This endpoint is country-level (country=US), not restaurant-specific, unlike the compressed onlinemenu endpoint used for calculator-menu.json (restaurant 469).",
      'The top-level shape ("entrees"/"sides"/"drinks"/"nonFoodItems") matches calculator-menu.json\'s shape, but per-item content here additionally carries build/customization rule fields (maxContents, maxCustomizations, maxOnTheSideCustomizations, maxExtras, maxHalfs, maxExtrasPlusHalfs, contentGroups, minQuantity/maxQuantity, defaultContent, pricingReferenceItemId) that were not the focus of the calculator-menu collection.',
      "Kids-specific items and content groups (e.g. items named \"... Kids Build Your Own\", \"... Kids Quesadilla\") are present among these arrays, not in a separate kids-only section.",
      "HalfPortion/ExtraPortion relationships (e.g. items named with \"Half\" pairing to a full-size item via pricingReferenceItemId) were observed among entrees during investigation.",
      "This file is the fully untouched source JSON from the menurules endpoint: no fields renamed, no records removed or deduplicated, no reconciliation against calculator-menu.json or menu-metadata.json, and no mapping to Macro Maxxer's schema.",
    ],
  };

  await writeAtomically(
    MENU_RULES_SOURCE_PATH,
    `${JSON.stringify(menuRulesMetadata, null, 2)}\n`,
  );

  console.log(`Collected Chipotle universal menu rules for country=${COUNTRY}.`);
  console.log("Record counts:", recordCounts);
  console.log(
    "Sample item rule-field check:",
    menuRulesMetadata.sampleItemRuleFieldCheck,
  );
  if (missingRuleFieldsOnSample.length > 0) {
    console.warn(
      `WARNING: sample item is missing expected rule field(s): ${missingRuleFieldsOnSample.join(", ")}`,
    );
  }
  console.log("Saved to data/raw/chipotle/menu-rules.json");
  console.log("Saved to data/raw/chipotle/menu-rules-source.json");
}

main().catch((error: unknown) => {
  console.error(
    `Chipotle menu-rules collection failed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exitCode = 1;
});
