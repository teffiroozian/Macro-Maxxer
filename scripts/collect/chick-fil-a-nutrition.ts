import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const SOURCE_URL = "https://www.chick-fil-a.com/nutrition-allergens";
const OUTPUT_PATH = resolve("data/raw/chick-fil-a/nutrition.csv");
const SOURCE_METADATA_PATH = resolve("data/raw/chick-fil-a/source.json");
const INTERACTIVITY_STATE_ID =
  "wp-script-module-data-@wordpress/interactivity";

const FIELD_COLUMNS = {
  "Serving Size": "serving_size",
  Calories: "calories",
  "Fat (g)": "total_fat",
  "Sat. Fat (g)": "saturated_fat",
  "Trans Fat (g)": "trans_fat",
  "Cholesterol (mg)": "cholesterol",
  "Sodium (mg)": "sodium",
  "Carbohydrates (g)": "total_carbohydrates",
  "Fiber (g)": "dietary_fiber",
  "Sugar (g)": "sugars",
  "Protein (g)": "protein",
} as const;

const CSV_COLUMNS = [
  "source_id",
  "categories",
  "name",
  ...Object.values(FIELD_COLUMNS),
] as const;

type NutritionColumn = (typeof FIELD_COLUMNS)[keyof typeof FIELD_COLUMNS];
type CsvColumn = (typeof CSV_COLUMNS)[number];

interface SourceField {
  label: string;
  value: unknown;
}

interface SourceItem {
  ID: number | string;
  title: string;
  fields: SourceField[];
  sub_items?: SourceItem[];
}

interface SourceMenu {
  menu: string;
  items: SourceItem[];
}

interface NutritionStore {
  activeTableData: SourceMenu[];
}

interface InteractivityState {
  state?: Record<string, unknown>;
}

type NutritionRecord = Record<NutritionColumn, number | null> & {
  source_id: number | string;
  categories: string[];
  name: string;
};

function extractInteractivityState(html: string): InteractivityState {
  const escapedId = INTERACTIVITY_STATE_ID.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
  const scriptPattern = new RegExp(
    `<script\\b[^>]*\\bid=["']${escapedId}["'][^>]*>([\\s\\S]*?)<\\/script>`,
    "i",
  );
  const match = html.match(scriptPattern);

  if (!match) {
    throw new Error(
      `Could not find Chick-fil-A's embedded nutrition JSON (${INTERACTIVITY_STATE_ID}).`,
    );
  }

  try {
    return JSON.parse(match[1]) as InteractivityState;
  } catch (error) {
    throw new Error("Chick-fil-A's embedded nutrition JSON could not be parsed.", {
      cause: error,
    });
  }
}

function getNutritionStore(state: InteractivityState): NutritionStore {
  const store = state.state?.["nutrition-allergens-table-store"] as
    | Partial<NutritionStore>
    | undefined;

  if (!store || !Array.isArray(store.activeTableData)) {
    throw new Error(
      "Chick-fil-A's embedded JSON did not contain the expected nutrition table data.",
    );
  }

  return store as NutritionStore;
}

function normalizeNutritionValue(value: unknown, label: string): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Non-finite value published for ${label}.`);
    }
    return value;
  }

  if (typeof value !== "string") {
    throw new Error(`Unsupported value type published for ${label}.`);
  }

  const match = value.trim().match(/^(-?(?:\d+(?:\.\d+)?|\.\d+))\s*(?:g|mg)?$/i);
  if (!match) {
    throw new Error(`Could not safely normalize ${label} value ${JSON.stringify(value)}.`);
  }

  return Number(match[1]);
}

function parseItem(item: SourceItem, category: string): NutritionRecord {
  if (
    (typeof item.ID !== "number" && typeof item.ID !== "string") ||
    item.ID === ""
  ) {
    throw new Error("A Chick-fil-A nutrition record is missing its source ID.");
  }
  if (typeof item.title !== "string" || item.title.trim() === "") {
    throw new Error(`Nutrition record ${item.ID} is missing its item name.`);
  }
  if (!Array.isArray(item.fields)) {
    throw new Error(`Nutrition record ${item.ID} is missing its nutrition fields.`);
  }

  const record = {
    source_id: item.ID,
    categories: [category],
    name: item.title,
  } as NutritionRecord;
  const seenLabels = new Set<string>();

  for (const field of item.fields) {
    const column = FIELD_COLUMNS[field.label as keyof typeof FIELD_COLUMNS];
    if (!column) {
      throw new Error(
        `Nutrition record ${item.ID} contains an unmapped published field: ${field.label}.`,
      );
    }
    if (seenLabels.has(field.label)) {
      throw new Error(
        `Nutrition record ${item.ID} repeats the published field ${field.label}.`,
      );
    }

    seenLabels.add(field.label);
    record[column] = normalizeNutritionValue(field.value, field.label);
  }

  for (const [label, column] of Object.entries(FIELD_COLUMNS)) {
    if (!seenLabels.has(label)) {
      record[column as NutritionColumn] = null;
    }
  }

  return record;
}

function nutritionSignature(record: NutritionRecord): string {
  return JSON.stringify(
    Object.fromEntries(
      CSV_COLUMNS.filter((column) => column !== "categories").map((column) => [
        column,
        column === "source_id" || column === "name"
          ? record[column]
          : record[column as NutritionColumn],
      ]),
    ),
  );
}

function collectRecords(store: NutritionStore): NutritionRecord[] {
  const recordsById = new Map<string, NutritionRecord>();

  const visitItems = (items: SourceItem[], category: string): void => {
    for (const item of items) {
      const record = parseItem(item, category);
      const key = String(record.source_id);
      const existing = recordsById.get(key);

      if (existing) {
        if (nutritionSignature(existing) !== nutritionSignature(record)) {
          throw new Error(
            `Source ID ${record.source_id} appears more than once with conflicting nutrition data.`,
          );
        }
        if (!existing.categories.includes(category)) {
          existing.categories.push(category);
        }
      } else {
        recordsById.set(key, record);
      }

      if (item.sub_items !== undefined && !Array.isArray(item.sub_items)) {
        throw new Error(
          `Nutrition record ${item.ID} has an invalid sub-item collection.`,
        );
      }
      visitItems(item.sub_items ?? [], category);
    }
  };

  for (const menu of store.activeTableData) {
    if (
      typeof menu.menu !== "string" ||
      menu.menu.trim() === "" ||
      !Array.isArray(menu.items)
    ) {
      throw new Error("Chick-fil-A published an invalid nutrition category.");
    }
    visitItems(menu.items, menu.menu);
  }

  return [...recordsById.values()];
}

function escapeCsv(value: string | number | null): string {
  if (value === null) {
    return "";
  }

  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(records: NutritionRecord[]): string {
  const lines = [CSV_COLUMNS.join(",")];

  for (const record of records) {
    lines.push(
      CSV_COLUMNS.map((column: CsvColumn) => {
        if (column === "categories") {
          return escapeCsv(record.categories.join(" | "));
        }
        if (column === "source_id" || column === "name") {
          return escapeCsv(record[column]);
        }
        return escapeCsv(record[column]);
      }).join(","),
    );
  }

  return `${lines.join("\n")}\n`;
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
  let response: Response;

  try {
    response = await fetch(SOURCE_URL, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "Macro-Maxxer Chick-fil-A nutrition collector/1.0",
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

  const html = await response.text();
  const records = collectRecords(getNutritionStore(extractInteractivityState(html)));

  if (records.length === 0) {
    throw new Error(
      "Zero Chick-fil-A nutrition records were found; existing raw files were not changed.",
    );
  }

  const metadata = {
    restaurant: "Chick-fil-A",
    source: SOURCE_URL,
    retrieved: getLocalDate(),
    recordCount: records.length,
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeAtomically(OUTPUT_PATH, toCsv(records));
  await writeAtomically(
    SOURCE_METADATA_PATH,
    `${JSON.stringify(metadata, null, 2)}\n`,
  );

  console.log(`Collected ${records.length} Chick-fil-A nutrition records.`);
  console.log("Saved to data/raw/chick-fil-a/nutrition.csv");
}

main().catch((error: unknown) => {
  console.error(
    `Chick-fil-A nutrition collection failed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exitCode = 1;
});
