import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import lz4 from "lz4js";

const RESTAURANT = "Chipotle";
const RESTAURANT_ID = "469";
const CHANNEL_ID = "web";
const INCLUDE_UNAVAILABLE_ITEMS = true;

const SERVICES_BASE_URL = "https://services.chipotle.com";
const CALCULATOR_PAGE_URL = "https://www.chipotle.com/nutrition-calculator";
const COMPRESSED_MENU_URL = new URL(
  `/menuinnovation/v1/restaurants/${RESTAURANT_ID}/onlinemenu/compressed?channelId=${CHANNEL_ID}&includeUnavailableItems=${INCLUDE_UNAVAILABLE_ITEMS}`,
  SERVICES_BASE_URL,
).toString();
// The nutrition calculator also loads this endpoint. It is NOT merged into
// the compressed-menu output (different source, different shape); it is
// fetched and saved separately below to preserve source boundaries.
const MENU_METADATA_URL =
  "https://services.chipotle.com/menu-metadata/v1/menu-metadata?channel=web&region=US";

const CALCULATOR_MENU_OUTPUT_PATH = resolve(
  "data/raw/chipotle/calculator-menu.json",
);
const CALCULATOR_MENU_SOURCE_PATH = resolve(
  "data/raw/chipotle/calculator-menu-source.json",
);
const MENU_METADATA_OUTPUT_PATH = resolve(
  "data/raw/chipotle/menu-metadata.json",
);
const MENU_METADATA_SOURCE_PATH = resolve(
  "data/raw/chipotle/menu-metadata-source.json",
);

// Chipotle's Azure API Management gateway requires a subscription key on
// services.chipotle.com calls. The nutrition-calculator page embeds the
// public, browser-facing key it uses for these calls in a meta tag:
//   <meta property="servicesconfig" data-host="..." data-appkey="..."/>
// We discover it at collection time instead of hardcoding it, since
// Chipotle controls and may rotate this value.
const SERVICES_CONFIG_TAG_PATTERN = /<meta\s+property="servicesconfig"[^>]*>/i;
const DATA_HOST_PATTERN = /data-host="([^"]+)"/i;
const DATA_APPKEY_PATTERN = /data-appkey="([^"]+)"/i;

const EXPECTED_MENU_ARRAY_FIELDS = [
  "entrees",
  "sides",
  "drinks",
  "nonFoodItems",
] as const;

type JsonObject = Record<string, unknown>;

interface CompressedMenuResponse {
  compressedMenu: string;
  decompressedMenuSize: number;
}

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

function decompressChipotleMenu(response: CompressedMenuResponse): {
  menu: unknown;
  bytesWritten: number;
} {
  if (
    typeof response.compressedMenu !== "string" ||
    response.compressedMenu.trim() === ""
  ) {
    throw new Error(
      "Chipotle's compressed-menu response did not include a compressedMenu string.",
    );
  }
  if (
    !Number.isInteger(response.decompressedMenuSize) ||
    response.decompressedMenuSize <= 0
  ) {
    throw new Error(
      "Chipotle's compressed-menu response did not include a valid decompressedMenuSize.",
    );
  }

  // Mirrors Chipotle's own frontend flow:
  //   const compressed = Uint8Array.from(atob(response.compressedMenu), c => c.charCodeAt(0));
  //   const decompressed = new Uint8Array(response.decompressedMenuSize);
  //   decompressBlock(compressed, decompressed, 0, compressed.length, 0);
  // `Buffer.from(base64, "base64")` is byte-for-byte equivalent to the
  // atob + charCodeAt pattern traced from the frontend bundle.
  const compressed = Uint8Array.from(
    Buffer.from(response.compressedMenu, "base64"),
  );
  const decompressed = new Uint8Array(response.decompressedMenuSize);

  let bytesWritten: number;
  try {
    bytesWritten = lz4.decompressBlock(
      compressed,
      decompressed,
      0,
      compressed.length,
      0,
    ) as number;
  } catch (error) {
    throw new Error(
      "Failed to LZ4-decompress Chipotle's compressed-menu payload.",
      { cause: error },
    );
  }

  if (bytesWritten !== response.decompressedMenuSize) {
    throw new Error(
      `Decompressed size mismatch: Chipotle reported decompressedMenuSize=${response.decompressedMenuSize}, but decompressBlock wrote ${bytesWritten} bytes.`,
    );
  }

  let text: string;
  try {
    // fatal: true refuses to silently replace invalid UTF-8 with U+FFFD,
    // so a corrupted decompression fails loudly instead of producing
    // silently-mangled JSON.
    text = new TextDecoder("utf-8", { fatal: true }).decode(decompressed);
  } catch (error) {
    throw new Error(
      "Chipotle's decompressed menu bytes were not valid UTF-8.",
      { cause: error },
    );
  }

  let menu: unknown;
  try {
    menu = JSON.parse(text) as unknown;
  } catch (error) {
    throw new Error(
      "Chipotle's decompressed menu payload was not valid JSON.",
      { cause: error },
    );
  }

  return { menu, bytesWritten };
}

function validateMenuShape(menu: unknown): asserts menu is JsonObject {
  if (!isJsonObject(menu)) {
    throw new Error(
      "Chipotle's decompressed menu payload was not a JSON object.",
    );
  }

  const missing = EXPECTED_MENU_ARRAY_FIELDS.filter(
    (field) => !Array.isArray(menu[field]),
  );
  if (missing.length > 0) {
    throw new Error(
      `Chipotle's decompressed menu payload is missing expected array field(s): ${missing.join(", ")}.`,
    );
  }
}

function validateMenuMetadataShape(
  metadata: unknown,
): asserts metadata is JsonObject {
  if (!isJsonObject(metadata)) {
    throw new Error("Chipotle's menu-metadata response was not a JSON object.");
  }
  if (!isJsonObject(metadata.items)) {
    throw new Error(
      'Chipotle\'s menu-metadata response is missing an "items" object.',
    );
  }
  if (!Array.isArray(metadata.groups)) {
    throw new Error(
      'Chipotle\'s menu-metadata response is missing a "groups" array.',
    );
  }
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

  const compressedResponse = (await fetchJson(
    COMPRESSED_MENU_URL,
    "Chipotle compressed online menu",
    requestHeaders,
  )) as Partial<CompressedMenuResponse>;

  if (
    typeof compressedResponse.compressedMenu !== "string" ||
    typeof compressedResponse.decompressedMenuSize !== "number"
  ) {
    throw new Error(
      'Chipotle\'s compressed-menu response is missing "compressedMenu" or "decompressedMenuSize".',
    );
  }

  const { menu, bytesWritten } = decompressChipotleMenu(
    compressedResponse as CompressedMenuResponse,
  );
  validateMenuShape(menu);

  const recordCounts: Record<string, number> = {};
  for (const field of EXPECTED_MENU_ARRAY_FIELDS) {
    recordCounts[field] = (menu[field] as unknown[]).length;
  }

  await mkdir(dirname(CALCULATOR_MENU_OUTPUT_PATH), { recursive: true });
  await writeAtomically(
    CALCULATOR_MENU_OUTPUT_PATH,
    `${JSON.stringify(menu, null, 2)}\n`,
  );

  const calculatorMenuMetadata = {
    restaurant: RESTAURANT,
    sourceType: "official-onlinemenu-compressed-api",
    source: COMPRESSED_MENU_URL,
    restaurantId: RESTAURANT_ID,
    channelId: CHANNEL_ID,
    includeUnavailableItems: INCLUDE_UNAVAILABLE_ITEMS,
    retrieved: getTimestamp(),
    collectorScript: "scripts/collect/chipotle-calculator-menu.ts",
    compressedResponseFieldsUsed: ["compressedMenu", "decompressedMenuSize"],
    decompression: {
      method:
        "LZ4 raw block decompression (no frame/header bytes), reproducing Chipotle's own frontend flow: base64-decode compressedMenu, allocate a Uint8Array of decompressedMenuSize, then decompressBlock(compressed, decompressed, 0, compressed.length, 0).",
      library: "lz4js (npm)",
      libraryVersion: "0.2.0",
      exportUsed: "decompressBlock(src, dst, sIndex, sLength, dIndex)",
      decompressedMenuSizeReported: compressedResponse.decompressedMenuSize,
      bytesWrittenByDecompressor: bytesWritten,
      sizeMatch: bytesWritten === compressedResponse.decompressedMenuSize,
    },
    parsedJsonSummary: {
      restaurantId: menu.restaurantId,
      recordCountsByCategory: recordCounts,
      totalRecords: Object.values(recordCounts).reduce((a, b) => a + b, 0),
    },
    subscriptionKeyDiscovery: {
      method:
        'Discovered dynamically at collection time from the <meta property="servicesconfig" data-host="..." data-appkey="..."/> tag on the nutrition-calculator page, rather than hardcoded, since Chipotle controls and may rotate this value.',
      discoveredFromPage: CALCULATOR_PAGE_URL,
      discoveredHost: servicesConfig.host,
    },
    notes: [
      "This endpoint was discovered via Chipotle's official nutrition-calculator frontend (https://www.chipotle.com/nutrition-calculator), which loads this restaurant's compressed online menu and decompresses it client-side to power the calculator UI.",
      "This data has NOT yet been reconciled against the official nutrition PDF source (data/raw/chipotle/nutrition-paper-menu.pdf / nutrition.json) or against the menu-metadata endpoint recorded below.",
      "The decompressed onlinemenu payload (calculator-menu.json) contains ZERO nutrition fields of any kind: no calories, fat, protein, carbohydrates, sodium, fiber, or sugar were found anywhere in it. It is purely menu/ordering structure: item IDs (e.g. \"CMG-2\"), display names, pricing, customizations, and content groups.",
      `A related official endpoint, ${MENU_METADATA_URL}, is used by the same calculator and DOES include a "nutrition" array per item, but that array only ever contains "Calories" and "Portion" entries in this response; no fat/protein/carbohydrate/sodium/fiber/sugar fields were found there either. Full macros do not appear to be available from either of these two endpoints.`,
      "The menu-metadata endpoint's \"items\" dictionary is keyed by the same \"CMG-*\" item IDs used as \"itemId\" in this onlinemenu payload (e.g. \"CMG-2\" identifies Steak in both). This is an observation only — no reconciliation, joining, or normalization has been performed at this stage.",
      "Saved separately for source-boundary reasons (different endpoint, different response shape, not merged): data/raw/chipotle/menu-metadata.json and data/raw/chipotle/menu-metadata-source.json.",
      "This file (calculator-menu.json) is the fully decompressed, unmodified source JSON: no fields renamed, no records removed or deduplicated, no mapping to Macro Maxxer's schema.",
    ],
  };

  await writeAtomically(
    CALCULATOR_MENU_SOURCE_PATH,
    `${JSON.stringify(calculatorMenuMetadata, null, 2)}\n`,
  );

  console.log(
    `Collected Chipotle compressed online menu for restaurant ${RESTAURANT_ID}.`,
  );
  console.log(
    `Decompression size check: reported=${compressedResponse.decompressedMenuSize}, actual=${bytesWritten}, match=${bytesWritten === compressedResponse.decompressedMenuSize}.`,
  );
  console.log("Record counts:", recordCounts);
  console.log("Saved to data/raw/chipotle/calculator-menu.json");
  console.log("Saved to data/raw/chipotle/calculator-menu-source.json");

  // Fetch and save the companion menu-metadata endpoint as its own,
  // untouched raw source (not merged into calculator-menu.json).
  const metadata = await fetchJson(
    MENU_METADATA_URL,
    "Chipotle menu-metadata",
    requestHeaders,
  );
  validateMenuMetadataShape(metadata);

  await writeAtomically(
    MENU_METADATA_OUTPUT_PATH,
    `${JSON.stringify(metadata, null, 2)}\n`,
  );

  const menuMetadataMetadata = {
    restaurant: RESTAURANT,
    sourceType: "official-menu-metadata-api",
    source: MENU_METADATA_URL,
    channel: CHANNEL_ID,
    region: "US",
    retrieved: getTimestamp(),
    collectorScript: "scripts/collect/chipotle-calculator-menu.ts",
    itemCount: Object.keys(metadata.items as JsonObject).length,
    groupCount: (metadata.groups as unknown[]).length,
    notes: [
      "Fetched alongside the compressed online-menu payload because Chipotle's nutrition-calculator frontend uses both endpoints together, but kept as its own untouched raw source file (different endpoint, different response shape).",
      'Per-item "nutrition" arrays observed here only contain "Calories" and "Portion" entries — no fat/protein/carbohydrate/sodium/fiber/sugar fields were found.',
      "This data has NOT yet been reconciled against calculator-menu.json or the official nutrition PDF source.",
    ],
  };

  await writeAtomically(
    MENU_METADATA_SOURCE_PATH,
    `${JSON.stringify(menuMetadataMetadata, null, 2)}\n`,
  );

  console.log(
    `Collected Chipotle menu-metadata (${menuMetadataMetadata.itemCount} items, ${menuMetadataMetadata.groupCount} groups).`,
  );
  console.log("Saved to data/raw/chipotle/menu-metadata.json");
  console.log("Saved to data/raw/chipotle/menu-metadata-source.json");
}

main().catch((error: unknown) => {
  console.error(
    `Chipotle calculator-menu collection failed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exitCode = 1;
});
