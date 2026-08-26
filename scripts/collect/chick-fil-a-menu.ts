import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const RESTAURANT = "Chick-fil-A";
const LOCATION_ID = "04094";
const ORDER_TYPE = "pickup";
const SOURCE_URL = `https://order.api.my.chick-fil-a.com/menu/v1/3.2/${LOCATION_ID}?type=${ORDER_TYPE}`;
const ORDER_APP_URL = "https://order.chick-fil-a.com/";
const PROFILE_API_URL = "https://profile.api.my.chick-fil-a.com/";
const OUTPUT_PATH = resolve("data/raw/chick-fil-a/menu.json");
const SOURCE_METADATA_PATH = resolve(
  "data/raw/chick-fil-a/menu-source.json",
);

type JsonObject = Record<string, unknown>;

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
    if (!/\btype=["']module["']/i.test(scriptTag)) {
      continue;
    }

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

function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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
      headers: {
        Authorization: `JWTBearer ${bootstrapToken}`,
      },
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

async function fetchMenu(accessToken: string): Promise<unknown> {
  let response: Response;

  try {
    response = await fetch(SOURCE_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
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

  const menu = await parseJsonResponse(response, "Chick-fil-A menu API");
  const structurallyEmpty =
    (Array.isArray(menu) && menu.length === 0) ||
    (isJsonObject(menu) && Object.keys(menu).length === 0);

  if (menu === null || structurallyEmpty) {
    throw new Error(
      "Chick-fil-A's menu API returned empty JSON; existing raw files were not changed.",
    );
  }

  return menu;
}

function getLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getArrayCount(
  object: JsonObject,
  property: string,
): number | undefined {
  const value = object[property];
  return Array.isArray(value) ? value.length : undefined;
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
  const menu = await fetchMenu(accessToken);
  const menuObject = isJsonObject(menu) ? menu : undefined;
  const metadata: JsonObject = {
    restaurant: RESTAURANT,
    sourceType: "official-ordering-api",
    source: SOURCE_URL,
    locationId: LOCATION_ID,
    orderType: ORDER_TYPE,
    retrieved: getLocalDate(),
  };

  if (menuObject) {
    const categoryCount = getArrayCount(menuObject, "categories");
    const itemGroupCount = getArrayCount(menuObject, "itemGroups");
    if (categoryCount !== undefined) {
      metadata.categoryCount = categoryCount;
    }
    if (itemGroupCount !== undefined) {
      metadata.itemGroupCount = itemGroupCount;
    }
  }

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeAtomically(OUTPUT_PATH, `${JSON.stringify(menu, null, 2)}\n`);
  await writeAtomically(
    SOURCE_METADATA_PATH,
    `${JSON.stringify(metadata, null, 2)}\n`,
  );

  console.log(
    `Collected Chick-fil-A menu data for location ${LOCATION_ID}.`,
  );
  console.log("Saved to data/raw/chick-fil-a/menu.json");
}

main().catch((error: unknown) => {
  console.error(
    `Chick-fil-A menu collection failed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exitCode = 1;
});
