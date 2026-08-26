import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const RESTAURANT = "Chick-fil-A";
const LOCATION_ID = "04094";
const LANGUAGE = "en-US";
const ORDER_APP_URL = "https://order.chick-fil-a.com/";
const PROFILE_API_URL = "https://profile.api.my.chick-fil-a.com/";
const ORDER_API_URL = "https://order.api.my.chick-fil-a.com/";
const SOURCE_PATH = `orders/locations/2.0/${LOCATION_ID}/menu/client/nutrition?language=${LANGUAGE}`;
const SOURCE_URL = new URL(SOURCE_PATH, ORDER_API_URL).toString();
const OUTPUT_PATH = resolve(
  "data/raw/chick-fil-a/ordering-nutrition.json",
);
const SOURCE_METADATA_PATH = resolve(
  "data/raw/chick-fil-a/ordering-nutrition-source.json",
);

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function fetchText(url: string, label: string): Promise<string> {
  let response: Response;

  try {
    response = await fetch(url, { redirect: "follow" });
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

function extractOrderingAppBundleUrl(html: string): string {
  for (const scriptMatch of html.matchAll(/<script\b[^>]*>/gi)) {
    const scriptTag = scriptMatch[0];
    if (!/\btype=["']module["']/i.test(scriptTag)) continue;

    const sourceMatch = scriptTag.match(/\bsrc=["']([^"']+)["']/i);
    if (sourceMatch) {
      return new URL(sourceMatch[1], ORDER_APP_URL).toString();
    }
  }

  throw new Error(
    "Could not find the deployed JavaScript bundle in Chick-fil-A's ordering app.",
  );
}

function extractUsGetterValue(bundle: string, getterName: string): string {
  const escapedName = getterName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = bundle.match(
    new RegExp(
      `static\\s+get\\s+${escapedName}\\(\\)\\{[\\s\\S]{0,2000}?default:return["']([^"']+)["']`,
    ),
  );

  if (!match) {
    throw new Error(
      `Could not discover ${getterName} in Chick-fil-A's deployed ordering app.`,
    );
  }

  return match[1];
}

async function parseJsonResponse(
  response: Response,
  label: string,
): Promise<unknown> {
  const text = await response.text();
  if (text.trim() === "") {
    throw new Error(`${label} returned an empty response.`);
  }

  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new Error(`${label} returned invalid JSON.`, { cause: error });
  }
}

async function getGuestAccessToken(): Promise<string> {
  const appHtml = await fetchText(ORDER_APP_URL, "Chick-fil-A ordering app");
  const bundleUrl = extractOrderingAppBundleUrl(appHtml);
  const bundle = await fetchText(
    bundleUrl,
    "Chick-fil-A ordering app configuration",
  );
  const bootstrapToken = extractUsGetterValue(bundle, "GUEST_SESSION_JWT");
  const guestSessionEndpoint = extractUsGetterValue(
    bundle,
    "GUEST_SESSION_ENDPOINT",
  );
  const guestSessionUrl = new URL(guestSessionEndpoint, PROFILE_API_URL);

  let response: Response;
  try {
    response = await fetch(guestSessionUrl, {
      method: "POST",
      headers: { Authorization: `JWTBearer ${bootstrapToken}` },
    });
  } catch (error) {
    throw new Error("Failed to create a Chick-fil-A guest session.", {
      cause: error,
    });
  }

  if (!response.ok) {
    throw new Error(
      `Failed to create a Chick-fil-A guest session: ${response.status} ${response.statusText}.`,
    );
  }

  const data = await parseJsonResponse(response, "Chick-fil-A guest session");
  const accessToken = isJsonObject(data) ? data.access_token : undefined;
  if (typeof accessToken !== "string" || accessToken.trim() === "") {
    throw new Error(
      "Chick-fil-A's guest-session response did not contain an access token.",
    );
  }

  return accessToken;
}

async function fetchOrderingNutrition(accessToken: string): Promise<JsonObject> {
  let response: Response;

  try {
    response = await fetch(SOURCE_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
      redirect: "follow",
    });
  } catch (error) {
    throw new Error(`Failed to fetch ${SOURCE_URL}.`, { cause: error });
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${SOURCE_URL}: ${response.status} ${response.statusText}.`,
    );
  }

  const data = await parseJsonResponse(
    response,
    "Chick-fil-A ordering nutrition API",
  );
  if (!isJsonObject(data) || !Array.isArray(data.items) || data.items.length === 0) {
    throw new Error(
      "Chick-fil-A's ordering nutrition API returned no item records; existing raw files were not changed.",
    );
  }

  for (const [index, item] of data.items.entries()) {
    if (!isJsonObject(item) || typeof item.tag !== "string" || item.tag.trim() === "") {
      throw new Error(`Ordering nutrition item ${index} has no source tag.`);
    }
  }

  return data;
}

function getLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  const accessToken = await getGuestAccessToken();
  const data = await fetchOrderingNutrition(accessToken);
  const items = data.items as unknown[];
  const metadata: JsonObject = {
    restaurant: RESTAURANT,
    sourceType: "official-ordering-nutrition-api",
    source: SOURCE_URL,
    locationId: LOCATION_ID,
    language: LANGUAGE,
    retrieved: getLocalDate(),
    itemCount: items.length,
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeAtomically(OUTPUT_PATH, `${JSON.stringify(data, null, 2)}\n`);
  await writeAtomically(
    SOURCE_METADATA_PATH,
    `${JSON.stringify(metadata, null, 2)}\n`,
  );

  console.log(
    `Collected ${items.length} Chick-fil-A ordering nutrition records for location ${LOCATION_ID}.`,
  );
  console.log("Saved to data/raw/chick-fil-a/ordering-nutrition.json");
}

main().catch((error: unknown) => {
  console.error(
    `Chick-fil-A ordering nutrition collection failed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exitCode = 1;
});
