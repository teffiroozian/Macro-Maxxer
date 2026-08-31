import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

// pdfjs-dist ships without types for the legacy Node build's default export
// shape, so we import it dynamically and treat its surface as unknown.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type PdfJsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

const RESTAURANT = "Chipotle";
const SOURCE_URL =
  "https://www.chipotle.com/content/dam/chipotle/menu/nutrition/US-Nutrition-Facts-Paper-Menu-3-2025.pdf";
const PDF_PATH = resolve("data/raw/chipotle/nutrition-paper-menu.pdf");
const OUTPUT_PATH = resolve("data/raw/chipotle/nutrition.json");
const SOURCE_METADATA_PATH = resolve("data/raw/chipotle/nutrition-source.json");

// Nutrition table pages only. Page 1 is the descriptive front-of-menu page
// (calorie call-outs mixed into marketing copy) and does not carry the full
// "nutrition facts" table with all required columns, so it is out of scope
// for this structured extraction.
const TABLE_PAGE_NUMBERS = [2, 3] as const;

const EXPECTED_COLUMNS = [
  "Portion",
  "Calories",
  "Calories From Fat",
  "Total Fat (g)",
  "Saturated Fats (g)",
  "Trans Fat (g)",
  "Cholesterol (mg)",
  "Sodium (mg)",
  "Carbohydrates (g)",
  "Dietary Fiber (g)",
  "Sugar (g)",
  "Protein (g)",
] as const;

const NUTRITION_FIELDS = [
  "calories",
  "caloriesFromFat",
  "totalFat",
  "saturatedFat",
  "transFat",
  "cholesterol",
  "sodium",
  "carbohydrates",
  "dietaryFiber",
  "sugar",
  "protein",
] as const;

type NutritionField = (typeof NUTRITION_FIELDS)[number];

// Rows on the same visual line differ in y by a fraction of a point (the
// item name and its numeric cells are drawn from slightly different text
// runs); distinct table rows are spaced about 8.3pt apart. A tolerance well
// under that spacing safely clusters same-row fragments without merging
// neighboring rows.
const ROW_Y_TOLERANCE = 2.5;

const PORTION_PATTERN = /^\d+(?:\.\d+)?\s*(?:fl\s*oz|oz|ea|g|ml)$/i;
const PORTION_PARTS_PATTERN =
  /^(\d+(?:\.\d+)?)\s*(fl\s*oz|oz|ea|g|ml)$/i;
const PLAIN_NUMBER_PATTERN = /^-?\d+(?:\.\d+)?$/;
const LESS_THAN_PATTERN = /^<\s*(\d+(?:\.\d+)?)$/;
const LEADING_NUMBER_PATTERN = /^(-?\d+(?:\.\d+)?)/;

const VERSION_MARKER_PATTERN = /^[A-Z]{3}-\d{4}-US-[A-Z]+$/;
const KIDS_HEADER_TOKEN = "kids Menu";

const CORE_RECORD_NAMES = [
  "Chicken",
  "Steak",
  "Black Beans",
  "Cilantro-Lime White Rice",
  "Guacamole",
  "Queso Blanco",
];

interface TextItem {
  str: string;
  x: number;
  y: number;
}

interface ValueCell {
  raw: string;
  value: number | null;
  clean: boolean;
}

interface PortionCell {
  raw: string;
  amount: number | null;
  unit: string | null;
}

interface NutritionRecord {
  name: string;
  section: "adult" | "kids";
  page: number;
  documentVariant: string | null;
  portion: PortionCell;
  calories: ValueCell;
  caloriesFromFat: ValueCell;
  totalFat: ValueCell;
  saturatedFat: ValueCell;
  transFat: ValueCell;
  cholesterol: ValueCell;
  sodium: ValueCell;
  carbohydrates: ValueCell;
  dietaryFiber: ValueCell;
  sugar: ValueCell;
  protein: ValueCell;
  sourceOrder: number;
  continuedFromPreviousRow: boolean;
}

interface UnparsedRow {
  page: number;
  section: "adult" | "kids" | "unknown";
  tokens: string[];
  reason: string;
}

interface UncleanValue {
  page: number;
  section: "adult" | "kids";
  name: string;
  field: string;
  raw: string;
  parsedValue: number | null;
}

type PdfDocumentProxy = Awaited<
  ReturnType<PdfJsModule["getDocument"]>["promise"]
>;

async function loadPdfJs(): Promise<PdfJsModule> {
  const pdfjsLib = (await import(
    "pdfjs-dist/legacy/build/pdf.mjs"
  )) as PdfJsModule;
  return pdfjsLib;
}

async function getPageTextItems(
  doc: PdfDocumentProxy,
  pageNumber: number,
): Promise<TextItem[]> {
  if (pageNumber > doc.numPages) {
    throw new Error(
      `Chipotle PDF only has ${doc.numPages} pages; expected at least ${pageNumber}.`,
    );
  }

  const page = await doc.getPage(pageNumber);
  const content = await page.getTextContent();

  return content.items
    .map((item) => {
      const textItem = item as { str: string; transform: number[] };
      return {
        str: textItem.str,
        x: textItem.transform[4],
        y: textItem.transform[5],
      };
    })
    .filter((item) => item.str.trim() !== "");
}

function clusterIntoRows(items: TextItem[]): TextItem[][] {
  const sorted = [...items].sort((a, b) => b.y - a.y);
  const rows: TextItem[][] = [];

  for (const item of sorted) {
    const currentRow = rows.at(-1);
    if (currentRow && Math.abs(item.y - currentRow[0].y) <= ROW_Y_TOLERANCE) {
      currentRow.push(item);
    } else {
      rows.push([item]);
    }
  }

  return rows.map((row) => [...row].sort((a, b) => a.x - b.x));
}

function normalizeValueCell(raw: string): ValueCell {
  const trimmed = raw.trim();

  const lessThanMatch = trimmed.match(LESS_THAN_PATTERN);
  if (lessThanMatch) {
    return { raw: trimmed, value: null, clean: true };
  }

  if (PLAIN_NUMBER_PATTERN.test(trimmed)) {
    return { raw: trimmed, value: Number(trimmed), clean: true };
  }

  const leadingMatch = trimmed.match(LEADING_NUMBER_PATTERN);
  if (leadingMatch) {
    return { raw: trimmed, value: Number(leadingMatch[1]), clean: false };
  }

  return { raw: trimmed, value: null, clean: false };
}

function normalizePortionCell(raw: string): PortionCell {
  const trimmed = raw.trim();
  const match = trimmed.match(PORTION_PARTS_PATTERN);

  if (!match) {
    return { raw: trimmed, amount: null, unit: null };
  }

  return {
    raw: trimmed,
    amount: Number(match[1]),
    unit: match[2].replace(/\s+/g, " ").toLowerCase(),
  };
}

function findDocumentVariant(rows: TextItem[][]): string | null {
  for (const row of rows) {
    if (row.length !== 1) continue;
    const candidate = row[0].str.trim();
    if (VERSION_MARKER_PATTERN.test(candidate)) {
      return candidate;
    }
  }
  return null;
}

function isHeaderRow(tokens: string[]): boolean {
  return tokens.includes("Portion") && tokens.includes("Calories");
}

function isKidsMarkerRow(tokens: string[]): boolean {
  return tokens.includes(KIDS_HEADER_TOKEN);
}

function isTitleRow(tokens: string[]): boolean {
  return (
    tokens.length <= 2 &&
    tokens.every((token) => token === "nutrition" || token === "facts")
  );
}

function isFooterRow(tokens: string[]): boolean {
  if (tokens.length !== 1) return false;
  const token = tokens[0];
  return (
    VERSION_MARKER_PATTERN.test(token) ||
    token.startsWith("Offerings may vary") ||
    token.startsWith("vary from order to order") ||
    token.startsWith("seasons, or differences") ||
    token.startsWith("for general nutrition advice") ||
    token.startsWith("keep this chart")
  );
}

function validateHeaderColumns(tokens: string[], page: number): void {
  const missing = EXPECTED_COLUMNS.filter((column) => !tokens.includes(column));
  if (missing.length > 0) {
    throw new Error(
      `Chipotle nutrition table on page ${page} is missing expected column(s): ${missing.join(", ")}.`,
    );
  }
}

function extractPageRecords(
  rows: TextItem[][],
  page: number,
  documentVariant: string | null,
  unparsedRows: UnparsedRow[],
  uncleanValues: UncleanValue[],
): NutritionRecord[] {
  const records: NutritionRecord[] = [];
  let section: "adult" | "kids" = "adult";
  let lastName: string | null = null;
  let sourceOrder = 0;
  let sawHeaderForSection = false;

  for (const row of rows) {
    const tokens = row.map((item) => item.str.trim());

    if (isTitleRow(tokens)) continue;

    if (isKidsMarkerRow(tokens)) {
      section = "kids";
      lastName = null;
      sawHeaderForSection = false;
      continue;
    }

    if (isHeaderRow(tokens)) {
      validateHeaderColumns(tokens, page);
      sawHeaderForSection = true;
      continue;
    }

    if (isFooterRow(tokens)) {
      // Footer / legal disclaimer text and the version marker line signal
      // the end of the table for this page.
      break;
    }

    if (!sawHeaderForSection) {
      // Anything before the first column-header row on a page is title
      // or disclaimer text, not table data.
      continue;
    }

    const isContinuationRow =
      tokens.length === NUTRITION_FIELDS.length + 1 &&
      PORTION_PATTERN.test(tokens[0]);
    const isFullRow = tokens.length === NUTRITION_FIELDS.length + 2;

    if (!isContinuationRow && !isFullRow) {
      unparsedRows.push({
        page,
        section,
        tokens,
        reason: `Expected ${NUTRITION_FIELDS.length + 2} cells (name, portion, ${NUTRITION_FIELDS.length} values) or ${NUTRITION_FIELDS.length + 1} cells (portion + values) for a multi-size continuation row, got ${tokens.length}.`,
      });
      continue;
    }

    let name: string;
    let portionToken: string;
    let valueTokens: string[];

    if (isContinuationRow) {
      if (!lastName) {
        unparsedRows.push({
          page,
          section,
          tokens,
          reason:
            "Row looks like a multi-size continuation (starts with a portion) but no prior item name was seen.",
        });
        continue;
      }
      name = lastName;
      portionToken = tokens[0];
      valueTokens = tokens.slice(1);
    } else {
      name = tokens[0];
      portionToken = tokens[1];
      valueTokens = tokens.slice(2);
      lastName = name;
    }

    if (!PORTION_PATTERN.test(portionToken)) {
      unparsedRows.push({
        page,
        section,
        tokens,
        reason: `Expected a portion cell (e.g. "4 oz") in position, got "${portionToken}".`,
      });
      continue;
    }

    const values = valueTokens.map((token) => normalizeValueCell(token));
    const record: Partial<Record<NutritionField, ValueCell>> = {};
    NUTRITION_FIELDS.forEach((field, index) => {
      record[field] = values[index];
      if (!values[index].clean) {
        uncleanValues.push({
          page,
          section,
          name,
          field,
          raw: values[index].raw,
          parsedValue: values[index].value,
        });
      }
    });

    records.push({
      name,
      section,
      page,
      documentVariant,
      portion: normalizePortionCell(portionToken),
      calories: record.calories!,
      caloriesFromFat: record.caloriesFromFat!,
      totalFat: record.totalFat!,
      saturatedFat: record.saturatedFat!,
      transFat: record.transFat!,
      cholesterol: record.cholesterol!,
      sodium: record.sodium!,
      carbohydrates: record.carbohydrates!,
      dietaryFiber: record.dietaryFiber!,
      sugar: record.sugar!,
      protein: record.protein!,
      sourceOrder: sourceOrder++,
      continuedFromPreviousRow: isContinuationRow,
    });
  }

  return records;
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
  const pdfjsLib = await loadPdfJs();
  const data = new Uint8Array(await readFile(PDF_PATH));
  const doc = await pdfjsLib.getDocument({ data }).promise;

  const unparsedRows: UnparsedRow[] = [];
  const uncleanValues: UncleanValue[] = [];
  const allRecords: NutritionRecord[] = [];
  const documentVariantsByPage: Record<number, string | null> = {};

  for (const pageNumber of TABLE_PAGE_NUMBERS) {
    const items = await getPageTextItems(doc, pageNumber);
    const rows = clusterIntoRows(items);
    const documentVariant = findDocumentVariant(rows);
    documentVariantsByPage[pageNumber] = documentVariant;

    const pageRecords = extractPageRecords(
      rows,
      pageNumber,
      documentVariant,
      unparsedRows,
      uncleanValues,
    );
    allRecords.push(...pageRecords);
  }

  if (allRecords.length === 0) {
    throw new Error(
      "Zero Chipotle nutrition records were extracted; existing raw files were not changed.",
    );
  }

  const missingCoreRecords = CORE_RECORD_NAMES.filter(
    (coreName) =>
      !allRecords.some((record) =>
        record.name.toLowerCase().includes(coreName.toLowerCase()),
      ),
  );

  const countsBySection: Record<string, number> = {};
  for (const record of allRecords) {
    const key = `page${record.page}_${record.section}`;
    countsBySection[key] = (countsBySection[key] ?? 0) + 1;
  }

  const output = {
    restaurant: RESTAURANT,
    records: allRecords,
  };

  const metadata = {
    restaurant: RESTAURANT,
    sourceType: "official-nutrition-pdf",
    source: SOURCE_URL,
    localPdfPath: "data/raw/chipotle/nutrition-paper-menu.pdf",
    generatedJsonPath: "data/raw/chipotle/nutrition.json",
    pdfFilename: "US-Nutrition-Facts-Paper-Menu-3-2025.pdf",
    retrieved: getLocalDate(),
    pageCount: doc.numPages,
    tablePages: [...TABLE_PAGE_NUMBERS],
    documentVersionMarkersByPage: documentVariantsByPage,
    extractionScript: "scripts/collect/chipotle-nutrition.ts",
    recordCount: allRecords.length,
    recordCountsBySection: countsBySection,
    notes: [
      'The source URL filename contains "3-2025" (US-Nutrition-Facts-Paper-Menu-3-2025.pdf), suggesting a March 2025 publication or update.',
      'The PDF footer on page 2 reads "OCT-2024-US-CK" and on page 3 reads "OCT-2024-US-PPS", suggesting an October 2024 print/version marker. Both date markers are preserved here as-is; neither is treated as authoritative over the other.',
      "Page 1 is the descriptive front-of-menu page (marketing copy with partial calorie call-outs) and does not contain the full structured nutrition table (missing fat/sodium/fiber/etc. columns), so it was excluded from structured extraction.",
      "Pages 2 and 3 each contain a full nutrition-facts table pair (adult section, then a kids Menu section). The non-drink items are duplicated verbatim across both pages; the drink lineup differs because page 2 lists Coca-Cola-family beverages (variant marker OCT-2024-US-CK) and page 3 lists Pepsi-family beverages (variant marker OCT-2024-US-PPS). Both pages were extracted in full and are NOT deduplicated against each other, so records may appear once per page they were printed on; each record carries its own `page` and `documentVariant` fields so downstream consumers can decide how to reconcile them.",
      "Multi-size drink rows (e.g. a 22 fl oz and 32 fl oz row for the same product) print the product name only once, on the first size's row. The extractor carries the name forward onto subsequent portion-only rows (continuedFromPreviousRow: true) so no product name is lost or misattributed.",
      '"< 1" / "<1" style source strings are preserved verbatim in each value cell\'s `raw` field; `value` is left null in that case rather than guessing a number.',
      "One value cell in the source PDF (page 3, adult section, \"Chipotle Iced Tea\", 22 fl oz, calories column) contains the literal text \"10w\" rather than a clean number, almost certainly a font/kerning artifact in Chipotle's PDF. It is preserved verbatim in `raw`; `value` is best-effort parsed as 10 from the leading digits, and the cell is flagged in `uncleanValues` below.",
      "This is a raw, faithful extraction of the source PDF's nutrition tables only. No mapping to Macro Maxxer's product/ingredient/build schema, no reconciliation against the ordering menu or nutrition calculator, and no classification of items (protein/ingredient/build/etc.) has been performed at this stage.",
    ],
    limitations: {
      unparsedRowCount: unparsedRows.length,
      unparsedRows,
      uncleanValueCount: uncleanValues.length,
      uncleanValues,
      missingCoreRecords,
    },
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeAtomically(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  await writeAtomically(
    SOURCE_METADATA_PATH,
    `${JSON.stringify(metadata, null, 2)}\n`,
  );

  console.log(`Collected ${allRecords.length} Chipotle nutrition records.`);
  console.log("Counts by page/section:");
  for (const [key, count] of Object.entries(countsBySection).sort()) {
    console.log(`  ${key}: ${count}`);
  }
  if (missingCoreRecords.length > 0) {
    console.warn(
      `WARNING: expected core record(s) not found: ${missingCoreRecords.join(", ")}`,
    );
  }
  if (unparsedRows.length > 0) {
    console.warn(`WARNING: ${unparsedRows.length} row(s) could not be parsed cleanly.`);
  }
  if (uncleanValues.length > 0) {
    console.warn(
      `WARNING: ${uncleanValues.length} value cell(s) had non-clean source text (see nutrition-source.json limitations.uncleanValues).`,
    );
  }
  console.log("Saved to data/raw/chipotle/nutrition.json");
  console.log("Saved to data/raw/chipotle/nutrition-source.json");
}

main().catch((error: unknown) => {
  console.error(
    `Chipotle nutrition extraction failed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exitCode = 1;
});
