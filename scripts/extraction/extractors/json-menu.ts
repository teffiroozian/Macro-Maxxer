// Structured menu JSON (API responses, __NEXT_DATA__, JSON the browser
// loaded). Restaurant-independent: it recognises shapes, not restaurants.
//
//   category      a named object holding an array of products/items
//   menu_item     a named object in a category, or any named object with
//                 nutrients or customization groups, inside a menu container
//   option_group  an object with an options/modifiers/choices array (its own
//                 label may be in name, description or displayName), with
//                 its min/max selection limits exactly as published (or null)
//   option        an element of a group's options
//   portion       an option of a group whose choices are all portion words
//                 (Light / Regular / Extra), under the option it modifies
//
// Item dictionaries keyed by id ({"CMG-1": {...}}) are read too; the record
// is named by its key and flagged "name_from_key" for normalization to join.
// Payloads that define their own nutrient keys ([{ key: "prot", name:
// "Protein" }]) are honoured. Nutrient values are kept only as published.
import type { NutrientKey } from "../../pipeline/contracts";
import type { ExtractedRecord, Provenance, RecordKind } from "../contracts";
import { nutrientForKey, nutrientForLabel, nutritionFlags, nutritionFromCells } from "../nutrients";

const NAME_KEYS = ["name", "itemName", "displayName", "display_name", "title", "productName", "label"];
const GROUP_LABEL_KEYS = ["description", "name", "displayName", "display_name", "title", "label", "contentGroupName"];
const PRODUCTS_KEYS = /^(?:products|items|menuItems|menu_items|entrees|sides|drinks)$/i;
const GROUPS_KEYS = /^(?:option_?groups|optionGroups|modifier_?groups|modifierGroups|modifiers|customizations|contentGroups|choice_?groups)$/i;
const OPTIONS_KEYS = /^(?:options|choices|modifiers|items|values)$/i;
const NUTRITION_CONTAINERS = /^(?:nutrition|nutrients|nutritional_?info|nutritionalInfo|nutrition_?facts|nutritionInfo|nutritionValues)$/i;
const MIN_KEYS = ["min_selections", "minSelections", "minSelect", "minimum", "min", "minQuantity", "min_quantity"];
const MAX_KEYS = ["max_selections", "maxSelections", "maxSelect", "maximum", "max", "maxQuantity", "max_quantity"];
const PORTION_WORDS = /^(?:light|lite|regular|normal|standard|extra|double|easy|heavy|half|side|on the side|no|none|xtra)\b/i;
const DEFAULT_KEYS = ["is_default", "isDefault", "default", "selected", "isSelected"];
const AVAILABLE_KEYS = ["is_available", "isAvailable", "available", "isItemAvailable"];
const DISABLED_KEYS = ["is_disabled", "isDisabled", "disabled", "unavailable", "outOfStock"];
const HIDDEN_KEYS = ["is_hidden", "isHidden", "hidden"];
const ID_KEYS = ["id", "itemId", "item_id", "productId", "product_id", "global_id", "uuid", "key"];

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Obj = { [key: string]: Json };

const isObj = (value: Json | undefined): value is Obj => typeof value === "object" && value !== null && !Array.isArray(value);
const first = (obj: Obj, keys: string[]): Json | undefined => keys.map((key) => obj[key]).find((value) => value !== undefined && value !== null && value !== "");
const str = (value: Json | undefined) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : typeof value === "number" ? String(value) : undefined);
const bool = (value: Json | undefined) => (typeof value === "boolean" ? value : undefined);
const num = (value: Json | undefined): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);
const nameOf = (obj: Obj) => str(first(obj, NAME_KEYS));
const namedArray = (value: Json | undefined): value is Obj[] => Array.isArray(value) && value.length > 0 && value.every(isObj) && value.some((entry) => nameOf(entry) || str(first(entry, GROUP_LABEL_KEYS)));

// Nutrient keys a payload defines for itself.
function payloadLegend(root: Json): Map<string, NutrientKey> {
  const legend = new Map<string, NutrientKey>();
  const visit = (node: Json, depth: number) => {
    if (depth > 6 || node === null || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach((child) => visit(child, depth + 1));
    const key = str(node.key);
    const name = str(node.name);
    if (key && name && key.length <= 12) {
      const nutrient = nutrientForLabel(name);
      if (nutrient && !/from fat/i.test(name)) legend.set(key, nutrient);
    }
    for (const child of Object.values(node)) visit(child, depth + 1);
  };
  visit(root, 0);
  return legend;
}

type Cells = Partial<Record<NutrientKey, string>>;

function nutrientCells(obj: Obj, legend: Map<string, NutrientKey>): { cells: Cells; serving?: string } {
  const cells: Cells = {};
  let serving: string | undefined;
  const take = (key: string, value: Json | undefined) => {
    const nutrient = legend.get(key) ?? nutrientForKey(key);
    if (!nutrient || cells[nutrient] !== undefined) return;
    if (typeof value === "number" || (typeof value === "string" && /\d/.test(value))) cells[nutrient] = String(value);
    // { value: 9, unit: "g" } / { min: 60, max: 60 }
    else if (isObj(value)) {
      const inner = value.value ?? value.amount ?? value.quantity;
      if (typeof inner === "number" || typeof inner === "string") cells[nutrient] = String(inner);
      else if (typeof value.min === "number" && typeof value.max === "number") cells[nutrient] = value.min === value.max ? String(value.min) : `${value.min}-${value.max}`;
    }
  };
  for (const [key, value] of Object.entries(obj)) {
    if (NUTRITION_CONTAINERS.test(key)) {
      if (isObj(value)) for (const [inner, innerValue] of Object.entries(value)) take(inner, innerValue);
      // [{ name: "Protein", value: 9 }]
      if (Array.isArray(value))
        for (const entry of value) {
          if (!isObj(entry)) continue;
          const label = str(first(entry, ["name", "type", "key", "label", "nutrient"]));
          if (!label) continue;
          if (/^portion|serving/i.test(label)) serving = str(first(entry, ["value", "amount", "displayValue"]));
          const nutrient = legend.get(label) ?? nutrientForKey(label) ?? nutrientForLabel(label);
          const value2 = first(entry, ["value", "amount", "quantity", "displayValue"]);
          if (nutrient && cells[nutrient] === undefined && value2 !== undefined) cells[nutrient] = String(value2);
        }
    } else if (/^(?:portion|serving_?size|servingSize)$/i.test(key)) {
      serving = isObj(value) ? [str(value.value), str(value.unit)].filter(Boolean).join(" ") : str(value);
    } else take(key, value);
  }
  return { cells, serving };
}

export type JsonMenuOptions = {
  // Restrict to subtrees under these top-level paths ("props.pageProps…").
  roots?: string[];
};

export function extractJsonMenu(root: Json, provenance: Omit<Provenance, "locator">, options: JsonMenuOptions = {}): ExtractedRecord[] {
  const legend = payloadLegend(root);
  const records: ExtractedRecord[] = [];
  const seen = new Set<string>();

  const emit = (kind: RecordKind, obj: Obj, path: string, name: string, parentId: string | undefined, category: string | undefined, extraFlags: string[] = []) => {
    const id = `${provenance.sourceId}#${path}`;
    if (seen.has(id)) return id;
    seen.add(id);
    const { cells, serving } = nutrientCells(obj, legend);
    const nutrition = nutritionFromCells(cells, serving ? { kind: "per_serving_unit", description: serving } : kind === "option" || kind === "portion" ? { kind: "selected_portion", description: name } : undefined);
    const disabled = bool(first(obj, DISABLED_KEYS));
    const available = bool(first(obj, AVAILABLE_KEYS));
    const isAvailable = available ?? (disabled === undefined ? undefined : !disabled);
    const isDefault = bool(first(obj, DEFAULT_KEYS));
    const hidden = bool(first(obj, HIDDEN_KEYS));
    const sourceRecordId = str(first(obj, ID_KEYS));
    const description = kind === "menu_item" ? str(obj.description) : undefined;
    const flags = [...extraFlags, ...nutritionFlags(nutrition)];
    if (isAvailable === false) flags.push("unavailable");
    records.push({
      id,
      kind,
      name,
      ...(parentId ? { parentId } : {}),
      ...(category ? { category } : {}),
      ...(description ? { description } : {}),
      ...(serving ? { servingText: serving } : {}),
      ...(nutrition ? { nutrition } : {}),
      ...(kind === "option_group"
        ? { customization: { minSelections: num(first(obj, MIN_KEYS)), maxSelections: num(first(obj, MAX_KEYS)), ...(hidden !== undefined ? { hidden } : {}) } }
        : isDefault !== undefined || isAvailable !== undefined
          ? { customization: { minSelections: null, maxSelections: null, ...(isDefault !== undefined ? { isDefault } : {}), ...(isAvailable !== undefined ? { isAvailable } : {}) } }
          : {}),
      provenance: { ...provenance, locator: path, ...(sourceRecordId ? { sourceRecordId } : {}) },
      flags,
    });
    return id;
  };

  const groupsOf = (obj: Obj) => Object.entries(obj).filter(([key, value]) => GROUPS_KEYS.test(key) && namedArray(value)) as Array<[string, Obj[]]>;
  const optionsOf = (obj: Obj) => Object.entries(obj).find(([key, value]) => OPTIONS_KEYS.test(key) && namedArray(value)) as [string, Obj[]] | undefined;

  const visitGroups = (owner: Obj, path: string, parentId: string, category: string | undefined) => {
    for (const [key, groups] of groupsOf(owner)) {
      groups.forEach((group, index) => {
        const groupPath = `${path}.${key}.${index}`;
        const label = str(first(group, GROUP_LABEL_KEYS)) ?? `group ${index + 1}`;
        const groupId = emit("option_group", group, groupPath, label, parentId, category);
        const options = optionsOf(group);
        if (!options) return;
        const [optionsKey, entries] = options;
        const portionGroup = entries.every((entry) => PORTION_WORDS.test(nameOf(entry) ?? ""));
        entries.forEach((entry, optionIndex) => {
          const optionPath = `${groupPath}.${optionsKey}.${optionIndex}`;
          const optionName = nameOf(entry) ?? `option ${optionIndex + 1}`;
          const optionId = emit(portionGroup ? "portion" : "option", entry, optionPath, optionName, groupId, category);
          visitGroups(entry, optionPath, optionId, category);
        });
      });
    }
  };

  const itemLike = (obj: Obj) => {
    const { cells } = nutrientCells(obj, legend);
    return Object.keys(cells).length > 0 || groupsOf(obj).length > 0;
  };

  const visitItem = (obj: Obj, path: string, category: string | undefined, name: string, flags: string[] = []) => {
    const id = emit("menu_item", obj, path, name, undefined, category, flags);
    visitGroups(obj, path, id, category);
  };

  const visit = (node: Json, path: string, category: string | undefined, depth: number) => {
    if (depth > 14 || node === null || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach((child, index) => visit(child, path ? `${path}.${index}` : String(index), category, depth + 1));
      return;
    }
    const name = nameOf(node);
    const products = Object.entries(node).filter(([key, value]) => PRODUCTS_KEYS.test(key) && Array.isArray(value) && value.some(isObj)) as Array<[string, Json[]]>;
    // A category: a named object holding products.
    if (products.length && !GROUPS_KEYS.test(path.split(".").pop() ?? "")) {
      const nextCategory = name ?? category;
      for (const [key, list] of products)
        list.forEach((entry, index) => {
          if (!isObj(entry)) return;
          const entryName = nameOf(entry);
          const entryPath = `${path ? `${path}.` : ""}${key}.${index}`;
          if (entryName) visitItem(entry, entryPath, nextCategory ?? (/^(?:entrees|sides|drinks)$/i.test(key) ? key : undefined), entryName);
          else visit(entry, entryPath, nextCategory, depth + 1);
        });
      for (const [key, value] of Object.entries(node)) if (!products.some(([productsKey]) => productsKey === key)) visit(value, path ? `${path}.${key}` : key, nextCategory, depth + 1);
      return;
    }
    // A dictionary of items keyed by id: every value an object with nutrients.
    const values = Object.entries(node);
    if (values.length >= 3 && values.every(([, value]) => isObj(value)) && values.filter(([, value]) => itemLike(value as Obj)).length >= values.length * 0.8) {
      for (const [key, value] of values) {
        const entryName = nameOf(value as Obj);
        visitItem(value as Obj, path ? `${path}.${key}` : key, category, entryName ?? key, entryName ? [] : ["name_from_key"]);
      }
      return;
    }
    // A named object with nutrients or groups, inside an array: an item.
    if (name && itemLike(node) && /\.\d+$|^\d+$/.test(path)) return visitItem(node, path, category, name);
    for (const [key, value] of Object.entries(node)) visit(value, path ? `${path}.${key}` : key, category, depth + 1);
  };

  const pick = (path: string): Json | undefined => path.split(".").reduce<Json | undefined>((node, key) => (isObj(node) || Array.isArray(node) ? (node as Record<string, Json>)[key] : undefined), root);
  if (options.roots?.length) for (const path of options.roots) visit(pick(path) ?? null, path, undefined, 0);
  else visit(root, "", undefined, 0);
  return records;
}

// ── Embedded page data ───────────────────────────────────────────────────

export type EmbeddedPayload = { kind: "next_data" | "json_ld" | "json_script"; id?: string; json: Json };

export function embeddedPayloads(html: string): EmbeddedPayload[] {
  const out: EmbeddedPayload[] = [];
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = match[1];
    const type = attrs.match(/type=["']([^"']+)/i)?.[1]?.toLowerCase();
    const id = attrs.match(/id=["']([^"']+)/i)?.[1];
    if (type !== "application/json" && type !== "application/ld+json" && id !== "__NEXT_DATA__") continue;
    try {
      out.push({ kind: id === "__NEXT_DATA__" ? "next_data" : type === "application/ld+json" ? "json_ld" : "json_script", ...(id ? { id } : {}), json: JSON.parse(match[2]) as Json });
    } catch {
      // not JSON; ignore
    }
  }
  return out;
}
