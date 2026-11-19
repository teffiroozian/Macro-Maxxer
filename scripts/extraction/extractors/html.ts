// Official HTML nutrition pages. Restaurant-independent.
//
// Two layouts are recognised:
//   1. <table>s whose header row names at least three nutrients.
//   2. Repeated row elements (same tag and class, five or more times), where
//      each cell carries its own label ("CALORIES (kcal) 670"), the way
//      responsive nutrition grids are usually built. A cell is read only when
//      its label is a nutrient or an allergen; the item name is the row's
//      first cell. The category is the nearest heading before the row.
// Allergen cells count as "contains" only when the cell holds a mark (an
// element or a symbol); an empty cell is "not marked", never "free of".
import type { NutrientKey } from "../../pipeline/contracts";
import type { ExtractedRecord, Provenance } from "../contracts";
import { nutrientForLabel, nutritionFlags, nutritionFromCells } from "../nutrients";

// ── A small tolerant HTML tree ───────────────────────────────────────────

export type HtmlNode = { tag: string; attrs: Record<string, string>; children: Array<HtmlNode | string>; parent?: HtmlNode };

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const RAW_TEXT = new Set(["script", "style", "noscript", "template", "svg"]);

export function decodeEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&rsquo;|&lsquo;/g, "’")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—");
}

export function parseHtml(html: string): HtmlNode {
  const root: HtmlNode = { tag: "#root", attrs: {}, children: [] };
  let current = root;
  const pattern = /<!--[\s\S]*?-->|<!\w[^>]*>|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:=\s*"[^"]*"|=\s*'[^']*'|[^>])*)>|([^<]+|<)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    const [, closing, opening, attrText, text] = match;
    if (text !== undefined) {
      current.children.push(text);
    } else if (opening) {
      const tag = opening.toLowerCase();
      const attrs: Record<string, string> = {};
      for (const attr of (attrText ?? "").matchAll(/([^\s=/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) attrs[attr[1].toLowerCase()] = decodeEntities(attr[2] ?? attr[3] ?? attr[4] ?? "");
      const node: HtmlNode = { tag, attrs, children: [], parent: current };
      current.children.push(node);
      if (RAW_TEXT.has(tag)) {
        const end = html.toLowerCase().indexOf(`</${tag}`, pattern.lastIndex);
        pattern.lastIndex = end < 0 ? html.length : html.indexOf(">", end) + 1 || html.length;
      } else if (!VOID.has(tag) && !/\/\s*$/.test(attrText ?? "")) current = node;
    } else if (closing) {
      const tag = closing.toLowerCase();
      // Close up to the nearest open element with this tag; ignore strays.
      let node: HtmlNode | undefined = current;
      while (node && node.tag !== tag) node = node.parent;
      if (node?.parent) current = node.parent;
    }
  }
  return root;
}

export function textOf(node: HtmlNode | string): string {
  if (typeof node === "string") return decodeEntities(node);
  if (RAW_TEXT.has(node.tag)) return "";
  const parts = node.children.map(textOf);
  return (node.tag === "br" ? " " : "") + parts.join(/^(?:div|p|li|td|th|tr|br|h\d)$/.test(node.tag) ? " " : "") + (/^(?:div|p|li|td|th|h\d)$/.test(node.tag) ? " " : "");
}

const clean = (value: string) => value.replace(/\s+/g, " ").trim();
const elements = (node: HtmlNode) => node.children.filter((child): child is HtmlNode => typeof child !== "string");

function* walk(node: HtmlNode): Generator<HtmlNode> {
  yield node;
  for (const child of elements(node)) yield* walk(child);
}

// ── Allergens ────────────────────────────────────────────────────────────

const ALLERGENS: Array<[RegExp, string]> = [
  [/\b(?:milk|dairy)\b/i, "milk"],
  [/\beggs?\b/i, "egg"],
  [/\bfish\b/i, "fish"],
  [/\bshellfish|crustacean/i, "shellfish"],
  [/\btree\s*nuts?\b/i, "tree_nuts"],
  [/\bpeanuts?\b/i, "peanuts"],
  [/\bwheat|gluten\b/i, "wheat_gluten"],
  [/\bsoy(?:beans?)?\b/i, "soy"],
  [/\bsesame\b/i, "sesame"],
];
const allergenForLabel = (label: string) => ALLERGENS.find(([pattern]) => pattern.test(label))?.[1];
const MARK = /^(?:x|✓|✔|•|●|yes|y|contains)$/i;

// ── Tables ───────────────────────────────────────────────────────────────

function extractTables(root: HtmlNode, provenance: Omit<Provenance, "locator">, headings: Map<HtmlNode, string>): ExtractedRecord[] {
  const records: ExtractedRecord[] = [];
  let tableIndex = 0;
  for (const table of walk(root)) {
    if (table.tag !== "table") continue;
    tableIndex += 1;
    const rows = [...walk(table)].filter((node) => node.tag === "tr");
    let header: Array<NutrientKey | "name" | "serving" | undefined> | undefined;
    rows.forEach((row, rowIndex) => {
      const cells = elements(row).filter((cell) => cell.tag === "td" || cell.tag === "th");
      const texts = cells.map((cell) => clean(textOf(cell)));
      const keys = texts.map((text) => nutrientForLabel(text) ?? (/^(?:serving|portion|size)/i.test(text) ? ("serving" as const) : undefined));
      if (keys.filter((key) => key && key !== "serving").length >= 3) {
        header = keys.map((key, index) => key ?? (index === 0 ? "name" : undefined));
        return;
      }
      if (!header || !texts[0]) return;
      const nutrientCells: Partial<Record<NutrientKey, string>> = {};
      let serving: string | undefined;
      header.forEach((key, index) => {
        if (!key || key === "name" || !texts[index]) return;
        if (key === "serving") serving = texts[index];
        else nutrientCells[key] = texts[index];
      });
      const nutrition = nutritionFromCells(nutrientCells, serving ? { kind: "per_serving_unit", description: serving } : undefined);
      if (!nutrition) return;
      const locator = `table ${tableIndex} · row ${rowIndex + 1}`;
      const category = headings.get(table);
      records.push({
        id: `${provenance.sourceId}#${locator}`,
        kind: "nutrition_row",
        name: texts[header.indexOf("name") >= 0 ? header.indexOf("name") : 0],
        ...(category ? { category } : {}),
        ...(serving ? { servingText: serving } : {}),
        nutrition,
        provenance: { ...provenance, locator },
        flags: nutritionFlags(nutrition),
      });
    });
  }
  return records;
}

// ── Repeated labelled rows ───────────────────────────────────────────────

type CellRead = { label: string; value: string; marked: boolean };

// A cell's label is its leading text up to a line break or a nested value
// element; its value is the remaining text.
function readCell(cell: HtmlNode): CellRead {
  const parts: string[] = [];
  let marked = false;
  const collect = (node: HtmlNode | string) => {
    if (typeof node === "string") {
      const text = clean(decodeEntities(node));
      if (text) parts.push(text);
      return;
    }
    if (node.tag === "br") return parts.push("\n");
    // An icon or a marker element; an empty value span is not a mark.
    if (node !== cell && (/^(?:img|svg|i)$/.test(node.tag) || /contain|check|tick|icon|dot|mark|\byes\b/i.test(node.attrs.class ?? ""))) marked = true;
    node.children.forEach(collect);
  };
  cell.children.forEach(collect);
  const joined = parts.join(" ").replace(/\s*\n\s*/g, "\n").trim();
  const [label, ...rest] = joined.split("\n");
  // A label spans the hidden mobile caption; numbers after it are the value.
  const labelMatch = clean(label).match(/^(.*?)\s*((?:<\s*)?\d[\d.,]*(?:\s*[-–]\s*\d[\d.,]*)?\s*(?:g|mg|kcal|cal)?)$/i);
  if (rest.length === 0 && labelMatch && labelMatch[1]) return { label: labelMatch[1], value: labelMatch[2], marked: marked || MARK.test(labelMatch[2]) };
  const value = clean(rest.join(" "));
  return { label: clean(label), value, marked: marked || MARK.test(value) };
}

function extractRepeatedRows(root: HtmlNode, provenance: Omit<Provenance, "locator">, headings: Map<HtmlNode, string>): ExtractedRecord[] {
  const groups = new Map<string, HtmlNode[]>();
  for (const node of walk(root)) {
    const className = node.attrs.class;
    if (!className || node.tag === "table" || node.tag === "tr") continue;
    const key = `${node.tag}.${className}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(node);
  }
  const records: ExtractedRecord[] = [];
  for (const [key, rows] of groups) {
    if (rows.length < 5) continue;
    // A row that holds several rows (a section wrapper) repeats a nutrient
    // label; only leaf rows are read.
    const parsed = rows
      .map((row) => {
        const cells = elements(row);
        return { row, cells, reads: cells.map(readCell) };
      })
      .filter(({ reads }) => {
        const labels = reads.map((read) => nutrientForLabel(read.label)).filter(Boolean);
        return new Set(labels).size === labels.length && reads.every((read) => !nutrientForLabel(read.value.replace(/^[\d\s.,<]+/, "").slice(0, 40)));
      });
    const nutrientRows = parsed.filter(({ reads }) => reads.some((read) => nutrientForLabel(read.label) && /\d/.test(read.value)));
    if (nutrientRows.length < rows.length / 2) continue;
    parsed.forEach(({ row, cells, reads }, index) => {
      const name = clean(textOf(cells[0] ?? row));
      if (!name) return;
      const nutrientCells: Partial<Record<NutrientKey, string>> = {};
      const allergens: string[] = [];
      let serving: string | undefined;
      reads.slice(1).forEach((read) => {
        const nutrient = nutrientForLabel(read.label);
        if (nutrient && read.value) nutrientCells[nutrient] = read.value;
        else if (/^(?:serving|portion|size)/i.test(read.label) && read.value) serving = read.value;
        else {
          const allergen = allergenForLabel(read.label);
          if (allergen && read.marked && !allergens.includes(allergen)) allergens.push(allergen);
        }
      });
      const nutrition = nutritionFromCells(nutrientCells, serving ? { kind: "per_serving_unit", description: serving } : undefined);
      if (!nutrition) return;
      const category = headings.get(row);
      const locator = `${key.slice(0, 60)} · row ${index + 1}`;
      records.push({
        id: `${provenance.sourceId}#${locator}`,
        kind: "nutrition_row",
        name,
        ...(category ? { category } : {}),
        ...(serving ? { servingText: serving } : {}),
        nutrition,
        ...(reads.some((read) => allergenForLabel(read.label)) ? { allergens } : {}),
        provenance: { ...provenance, locator },
        flags: nutritionFlags(nutrition),
      });
    });
  }
  return records;
}

// Nearest preceding heading (h1–h4) for every element, in document order.
function headingIndex(root: HtmlNode): Map<HtmlNode, string> {
  const map = new Map<HtmlNode, string>();
  let heading: string | undefined;
  for (const node of walk(root)) {
    if (/^h[1-4]$/.test(node.tag)) {
      const text = clean(textOf(node));
      // Skip hidden duplicate headings that repeat the visible one.
      if (text) heading = text;
    }
    if (heading) map.set(node, heading);
  }
  return map;
}

// ── Ingredient and allergen declarations ─────────────────────────────────

// Repeated rows that carry an ingredient statement and/or three or more
// allergen cells. An allergen cell is the largest element whose whole text is
// an allergen name; it counts as "contains" only with a marker inside it.
function extractDeclarations(root: HtmlNode, provenance: Omit<Provenance, "locator">, headings: Map<HtmlNode, string>): ExtractedRecord[] {
  const groups = new Map<string, HtmlNode[]>();
  for (const node of walk(root)) {
    const className = node.attrs.class;
    if (!className) continue;
    const key = `${node.tag}.${className}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(node);
  }
  const records: ExtractedRecord[] = [];
  const candidates: Array<{ key: string; usable: Array<{ row: HtmlNode; cells: Array<{ allergen: string; marked: boolean }>; ingredients?: string; name?: string }> }> = [];
  const isMarker = (node: HtmlNode) => /^(?:img|svg|i)$/.test(node.tag) || /contain|check|tick|icon|dot|mark|\byes\b/i.test(node.attrs.class ?? "");
  for (const [key, rows] of groups) {
    if (rows.length < 5) continue;
    const parsed = rows.map((row) => {
      const cells: Array<{ allergen: string; marked: boolean }> = [];
      let ingredients: string | undefined;
      let statements = 0;
      let name: string | undefined;
      for (const node of walk(row)) {
        if (node === row) continue;
        const text = clean(textOf(node));
        const allergen = text.length <= 30 ? allergenForLabel(text) : undefined;
        if (allergen && node.parent && clean(textOf(node.parent)) !== text && !cells.some((cell) => cell.allergen === allergen)) {
          cells.push({ allergen, marked: [...walk(node)].some((inner) => inner !== node && isMarker(inner)) });
        }
        if ((/ingredient/i.test(node.attrs.class ?? "") || (node.tag === "p" && (text.match(/,/g) ?? []).length >= 2)) && text.length > 20 && !(ingredients && ingredients.includes(text))) {
          statements += 1;
          ingredients ??= text;
        }
        if (!name && (node.tag === "strong" || /\bname\b|__name/i.test(node.attrs.class ?? "")) && text && text.length < 120) name = text;
      }
      return { row, cells, ingredients, name, statements };
    });
    // Skip wrappers: a row that contains another row of the same group.
    const leaf = parsed.filter(({ row }) => !rows.some((other) => other !== row && [...walk(row)].includes(other)));
    // A wrapper holding several items (a whole section) is not a row.
    const usable = leaf.filter((entry) => entry.name && entry.statements <= 1 && (entry.ingredients || entry.cells.length >= 3));
    if (usable.length < 5 || usable.length < leaf.length / 2) continue;
    // Only rows that declare something the nutrition rows do not already
    // cover: ingredient statements, or allergen grids with no nutrient cells.
    if (!usable.some((entry) => entry.ingredients)) continue;
    candidates.push({ key, usable });
  }
  // Nested groups describe the same rows; keep the outermost.
  const outer = candidates.filter((candidate) => !candidate.usable.every(({ row }) => candidates.some((other) => other !== candidate && other.usable.some((entry) => entry.row !== row && [...walk(entry.row)].includes(row)))));
  for (const { key, usable } of outer) {
    usable.forEach(({ row, cells, ingredients, name }, index) => {
      const locator = `${key.slice(0, 60)} · row ${index + 1}`;
      const category = headings.get(row);
      records.push({
        id: `${provenance.sourceId}#${locator}`,
        kind: "ingredient_declaration",
        name: name!,
        ...(category ? { category } : {}),
        ...(cells.length >= 3 ? { allergens: cells.filter((cell) => cell.marked).map((cell) => cell.allergen) } : {}),
        ...(ingredients ? { ingredientsText: ingredients } : {}),
        provenance: { ...provenance, locator },
        flags: cells.length >= 3 ? [] : ["allergens_not_listed"],
      });
    });
  }
  return records;
}

export function extractHtmlNutrition(html: string, provenance: Omit<Provenance, "locator">): { records: ExtractedRecord[]; extractors: string[] } {
  const root = parseHtml(html);
  const headings = headingIndex(root);
  const tables = extractTables(root, provenance, headings);
  const rows = extractRepeatedRows(root, provenance, headings);
  const declarations = extractDeclarations(root, provenance, headings);
  return {
    records: [...tables, ...rows, ...declarations],
    extractors: [...(tables.length ? ["html-table"] : []), ...(rows.length ? ["html-repeated-rows"] : []), ...(declarations.length ? ["html-declarations"] : [])],
  };
}
