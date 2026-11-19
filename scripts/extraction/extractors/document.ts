// Official documents: PDF nutrition tables and CSV files. Restaurant-independent.
//
// PDF: text items are grouped into lines by their y position. A line with at
// least three nutrient column headers starts a table; its header cells give
// the column positions. Each following line is read against those columns.
// Lines a point or two apart are one row (names often sit slightly off the
// numbers). A row with numbers but no name continues the previous name (a
// second size of the same drink) and is flagged. A row with a name and no
// numbers is a section heading and becomes the category of what follows.
import type { NutrientKey } from "../../pipeline/contracts";
import type { ExtractedRecord, Provenance } from "../contracts";
import { nutrientForLabel, nutritionFlags, nutritionFromCells } from "../nutrients";

export type TextItem = { x: number; y: number; str: string };
export type PdfPage = { page: number; items: TextItem[] };

type Column = { x: number; key: NutrientKey | "serving" | "ignored" };

const SERVING_LABEL = /^(?:portion|serving(?:\s+size)?|size|amount)$/i;
const NUMERIC_CELL = /^(?:<\s*)?\d[\d.,]*\s*(?:g|mg|w)?$|^[-–—]$/i;
const ROW_JOIN = 3.5;

export async function readPdf(body: Buffer): Promise<PdfPage[]> {
  type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdfjs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as PdfJs;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(body), verbosity: 0 }).promise;
  const pages: PdfPage[] = [];
  for (let number = 1; number <= doc.numPages; number += 1) {
    const content = await (await doc.getPage(number)).getTextContent();
    const items: TextItem[] = [];
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      items.push({ x: item.transform[4], y: item.transform[5], str: item.str.trim() });
    }
    pages.push({ page: number, items });
  }
  await (doc as unknown as { cleanup?: () => Promise<void> }).cleanup?.();
  return pages;
}

function lines(items: TextItem[]): TextItem[][] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const out: TextItem[][] = [];
  for (const item of sorted) {
    const last = out[out.length - 1];
    if (last && Math.abs(last[0].y - item.y) <= 1) last.push(item);
    else out.push([item]);
  }
  return out.map((line) => line.sort((a, b) => a.x - b.x));
}

function headerColumns(line: TextItem[]): Column[] | undefined {
  const columns: Column[] = [];
  for (const item of line) {
    const nutrient = nutrientForLabel(item.str);
    if (nutrient) columns.push({ x: item.x, key: nutrient });
    else if (SERVING_LABEL.test(item.str)) columns.push({ x: item.x, key: "serving" });
    // A labelled column this pipeline does not store ("Calories From Fat",
    // "% DV"). It still owns its cells, so they never spill into a neighbour.
    else if (columns.length > 0 || /\(|%|from/i.test(item.str)) columns.push({ x: item.x, key: "ignored" });
  }
  return columns.filter((column) => column.key !== "serving" && column.key !== "ignored").length >= 3 ? columns : undefined;
}

// A value belongs to the column whose header starts nearest to it. Numbers
// are often right-aligned and start a few points left of their header.
function columnFor(x: number, columns: Column[]): Column | undefined {
  let best: Column | undefined;
  for (const column of columns) if (!best || Math.abs(column.x - x) < Math.abs(best.x - x)) best = column;
  return best;
}

export function extractPdfTables(pages: PdfPage[], provenance: Omit<Provenance, "locator">): ExtractedRecord[] {
  const records: ExtractedRecord[] = [];
  for (const { page, items } of pages) {
    let columns: Column[] | undefined;
    let firstDataX = Infinity;
    let section = "";
    let table = 0;
    let previousName: string | undefined;
    // Merge lines a few points apart into rows.
    const rows: TextItem[][] = [];
    for (const line of lines(items)) {
      const header = headerColumns(line);
      if (header) {
        rows.push([{ ...line[0], str: "\u0000header" }, ...line]);
        continue;
      }
      const last = rows[rows.length - 1];
      if (last && last[0].str !== "\u0000header" && Math.abs(last[0].y - line[0].y) <= ROW_JOIN) last.push(...line);
      else rows.push(line);
    }
    for (const row of rows) {
      if (row[0].str === "\u0000header") {
        columns = headerColumns(row.slice(1));
        firstDataX = Math.min(...columns!.map((column) => column.x)) - 15;
        // Text on the header line left of the columns is the table title.
        const title = row.slice(1).filter((item) => item.x < firstDataX).map((item) => item.str).join(" ");
        section = title && !/^(?:nutrition|facts|nutrition facts)$/i.test(title) ? title : section;
        table += 1;
        previousName = undefined;
        continue;
      }
      if (!columns) continue;
      const nameParts = row.filter((item) => item.x < firstDataX).sort((a, b) => b.y - a.y || a.x - b.x);
      const cells = row.filter((item) => item.x >= firstDataX);
      const numeric = cells.filter((item) => NUMERIC_CELL.test(item.str) || columnFor(item.x, columns!)?.key === "serving");
      const name = nameParts.map((item) => item.str).join(" ").replace(/\s+/g, " ").trim();
      if (numeric.length < 3) {
        // A heading row ("Kids Menu") or page furniture.
        if (name && cells.length === 0 && name.length < 60 && !/^(?:nutrition|facts|nutrition facts)$/i.test(name)) section = name;
        continue;
      }
      const byColumn: Partial<Record<NutrientKey | "serving", string>> = {};
      for (const cell of cells) {
        const column = columnFor(cell.x, columns);
        if (!column) continue;
        if (column.key === "ignored") continue;
        byColumn[column.key] = byColumn[column.key] ? `${byColumn[column.key]} ${cell.str}` : cell.str;
      }
      const { serving, ...nutrientCells } = byColumn;
      const flags: string[] = [];
      let recordName = name;
      if (!recordName && previousName) {
        recordName = previousName;
        flags.push("name_carried_forward");
      }
      if (!recordName) continue;
      previousName = recordName;
      const nutrition = nutritionFromCells(nutrientCells, serving ? { kind: "per_serving_unit", description: serving } : undefined);
      const locator = `page ${page} · table ${table} · row ${records.length + 1}`;
      records.push({
        id: `${provenance.sourceId}#${locator}`,
        kind: "nutrition_row",
        name: recordName,
        ...(section ? { category: section } : {}),
        ...(serving ? { servingText: serving } : {}),
        ...(nutrition ? { nutrition } : {}),
        provenance: { ...provenance, locator },
        flags: [...flags, ...nutritionFlags(nutrition)],
      });
    }
  }
  return records;
}

// ── CSV ──────────────────────────────────────────────────────────────────

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const endCell = () => {
    row.push(cell);
    cell = "";
  };
  const endRow = () => {
    endCell();
    rows.push(row);
    row = [];
  };
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") endCell();
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      endRow();
    } else cell += char;
  }
  if (cell || row.length) endRow();
  return rows.filter((cells) => cells.some((value) => value.trim()));
}

export function extractCsv(text: string, provenance: Omit<Provenance, "locator">): ExtractedRecord[] {
  const rows = parseCsv(text);
  const headerIndex = rows.findIndex((cells) => cells.filter((cell) => nutrientForLabel(cell)).length >= 3);
  if (headerIndex < 0) return [];
  const header = rows[headerIndex];
  const nameColumn = header.findIndex((cell) => /^(?:item|name|menu item|product|description)$/i.test(cell.trim()));
  const categoryColumn = header.findIndex((cell) => /^(?:category|section|group)$/i.test(cell.trim()));
  const servingColumn = header.findIndex((cell) => SERVING_LABEL.test(cell.trim()));
  const nutrientColumns = header.map((cell) => nutrientForLabel(cell));
  const records: ExtractedRecord[] = [];
  rows.slice(headerIndex + 1).forEach((cells, offset) => {
    const name = (cells[nameColumn >= 0 ? nameColumn : 0] ?? "").trim();
    if (!name) return;
    const nutrientCells: Partial<Record<NutrientKey, string>> = {};
    nutrientColumns.forEach((nutrient, column) => {
      if (nutrient && cells[column]?.trim()) nutrientCells[nutrient] = cells[column];
    });
    const serving = servingColumn >= 0 ? cells[servingColumn]?.trim() : undefined;
    const nutrition = nutritionFromCells(nutrientCells, serving ? { kind: "per_serving_unit", description: serving } : undefined);
    const locator = `row ${headerIndex + offset + 2}`;
    records.push({
      id: `${provenance.sourceId}#${locator}`,
      kind: "nutrition_row",
      name,
      ...(categoryColumn >= 0 && cells[categoryColumn]?.trim() ? { category: cells[categoryColumn].trim() } : {}),
      ...(serving ? { servingText: serving } : {}),
      ...(nutrition ? { nutrition } : {}),
      provenance: { ...provenance, locator },
      flags: nutritionFlags(nutrition),
    });
  });
  return records;
}
