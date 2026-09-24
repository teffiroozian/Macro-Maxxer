import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  calculateMcDonaldsCustomizationNutrition,
  type McDonaldsComponentNutritionContext,
  type McDonaldsCustomizationAction,
  type McDonaldsCustomizationModel,
  type McDonaldsNutrients,
  type McDonaldsOrderingOption,
} from "../../lib/restaurantBuilders/mcdonalds/customization";
import { writeAtomically } from "../lib/write-atomically";

const DETAILS = resolve("data/restaurants/mcdonalds/raw/item-details.json");
const CALCULATOR = resolve("data/restaurants/mcdonalds/customization/raw/dna-calculator.json");
const FILET_CALCULATOR = resolve("data/restaurants/mcdonalds/research/ordering/raw/filet-o-fish-dna.json");
const ORDERING_DIRECTORY = resolve("data/restaurants/mcdonalds/research/ordering/raw");
const OUTPUT_DIRECTORY = resolve("data/restaurants/mcdonalds/customization/generated");

type JsonObject = Record<string, unknown>;
type Capture = { id: string; kind: string; parentItemId: number; componentIds?: number[]; expression: string; url: string; response: JsonObject };
type DefaultComponent = { componentId: number; nutritionContextId: string; quantity: number };
type OptionComponent = { componentId: number; nutritionContextId: string };
type BurgerDefinition = {
  slug: string;
  itemId: number;
  validationCaptureId: string;
  orderingFile: string;
  defaults: DefaultComponent[];
  options: Record<string, OptionComponent>;
};

const commonRegularOptions: Record<string, OptionComponent> = {
  mustard: { componentId: 300044, nutritionContextId: "qpc-mustard" },
  ketchup: { componentId: 300037, nutritionContextId: "small-ketchup" },
  "american cheese": { componentId: 301518, nutritionContextId: "american-cheese-single" },
  "1/10 lb beef": { componentId: 300038, nutritionContextId: "big-mac-beef-single" },
  "regular bun": { componentId: 301578, nutritionContextId: "regular-bun" },
  "2 half strips bacon": { componentId: 300163, nutritionContextId: "bacon-two-half-strips" },
  "shredded lettuce": { componentId: 300098, nutritionContextId: "qpc-add-lettuce" },
  "x2 slc tomato": { componentId: 301407, nutritionContextId: "tomato-two-slices" },
  mayonnaise: { componentId: 300430, nutritionContextId: "qpc-add-mayonnaise" },
};

const commonQuarterPounderOptions: Record<string, OptionComponent> = {
  mustard: { componentId: 300044, nutritionContextId: "qpc-mustard" },
  ketchup: { componentId: 300037, nutritionContextId: "qpc-ketchup" },
  mayonnaise: { componentId: 300430, nutritionContextId: "qpc-add-mayonnaise" },
  "shredded lettuce": { componentId: 300098, nutritionContextId: "qpc-add-lettuce" },
  "slivered onions": { componentId: 301502, nutritionContextId: "qpc-onions" },
  pickle: { componentId: 300042, nutritionContextId: "qpc-pickle" },
  "x3 slc tomato": { componentId: 301407, nutritionContextId: "qpc-add-tomato" },
  "american cheese": { componentId: 301518, nutritionContextId: "american-cheese-single" },
  "1/4 lb beef": { componentId: 301574, nutritionContextId: "qpc-beef" },
  "sesame seed bun": { componentId: 301516, nutritionContextId: "qpc-bun" },
  "3 half strips bacon": { componentId: 300163, nutritionContextId: "qpc-add-bacon" },
};

const commonMcCrispyOptions: Record<string, OptionComponent> = {
  "mccrispy filet": { componentId: 302309, nutritionContextId: "mccrispy-filet" },
  filet: { componentId: 302309, nutritionContextId: "mccrispy-filet" },
  "potato roll": { componentId: 302402, nutritionContextId: "mccrispy-potato-roll" },
  "crinkle cut pickle": { componentId: 302415, nutritionContextId: "mccrispy-crinkle-pickle" },
  "american cheese": { componentId: 301518, nutritionContextId: "american-cheese-single" },
  "3 half strips bacon": { componentId: 300163, nutritionContextId: "qpc-add-bacon" },
  mustard: { componentId: 300044, nutritionContextId: "qpc-mustard" },
  mayonnaise: { componentId: 300430, nutritionContextId: "deluxe-mccrispy-mayonnaise" },
  "mccrispy ranch sauce": { componentId: 204161, nutritionContextId: "mccrispy-ranch-sauce" },
};

const deluxeMcCrispyOptions: Record<string, OptionComponent> = {
  ...commonMcCrispyOptions,
  "shredded lettuce": { componentId: 300098, nutritionContextId: "deluxe-mccrispy-lettuce" },
  lettuce: { componentId: 300098, nutritionContextId: "deluxe-mccrispy-lettuce" },
  "x3 slc tomato": { componentId: 301407, nutritionContextId: "deluxe-mccrispy-tomato" },
};

function regularOptions(portion: "single" | "double"): Record<string, OptionComponent> {
  return {
    ...commonRegularOptions,
    "diced onions": { componentId: 300041, nutritionContextId: portion === "single" ? "diced-onions-single" : "diced-onions-double" },
    pickle: { componentId: 300042, nutritionContextId: portion === "single" ? "small-pickle-single" : "small-pickle-double" },
  };
}

const definitions: BurgerDefinition[] = [
  {
    slug: "cheeseburger", itemId: 200480, validationCaptureId: "cheeseburger-standard", orderingFile: "cheeseburger-item-page.json",
    defaults: [
      { componentId: 301578, nutritionContextId: "regular-bun", quantity: 1 },
      { componentId: 300038, nutritionContextId: "big-mac-beef-single", quantity: 1 },
      { componentId: 301518, nutritionContextId: "american-cheese-single", quantity: 1 },
      { componentId: 300037, nutritionContextId: "small-ketchup", quantity: 1 },
      { componentId: 300042, nutritionContextId: "small-pickle-single", quantity: 1 },
      { componentId: 300041, nutritionContextId: "diced-onions-single", quantity: 1 },
      { componentId: 300044, nutritionContextId: "qpc-mustard", quantity: 1 },
    ], options: regularOptions("single"),
  },
  {
    slug: "hamburger", itemId: 200477, validationCaptureId: "hamburger-standard", orderingFile: "hamburger-item-page.json",
    defaults: [
      { componentId: 301578, nutritionContextId: "regular-bun", quantity: 1 },
      { componentId: 300038, nutritionContextId: "big-mac-beef-single", quantity: 1 },
      { componentId: 300037, nutritionContextId: "small-ketchup", quantity: 1 },
      { componentId: 300042, nutritionContextId: "small-pickle-single", quantity: 1 },
      { componentId: 300041, nutritionContextId: "diced-onions-single", quantity: 1 },
      { componentId: 300044, nutritionContextId: "qpc-mustard", quantity: 1 },
    ], options: regularOptions("single"),
  },
  {
    slug: "mcdouble", itemId: 200491, validationCaptureId: "mcdouble-standard", orderingFile: "mcdouble-item-page.json",
    defaults: [
      { componentId: 300038, nutritionContextId: "big-mac-beef-single", quantity: 2 },
      { componentId: 301578, nutritionContextId: "regular-bun", quantity: 1 },
      { componentId: 301518, nutritionContextId: "american-cheese-single", quantity: 1 },
      { componentId: 300042, nutritionContextId: "small-pickle-double", quantity: 1 },
      { componentId: 300041, nutritionContextId: "diced-onions-double", quantity: 1 },
      { componentId: 300037, nutritionContextId: "small-ketchup", quantity: 1 },
      { componentId: 300044, nutritionContextId: "qpc-mustard", quantity: 1 },
    ], options: regularOptions("double"),
  },
  {
    slug: "double-cheeseburger", itemId: 200486, validationCaptureId: "double-cheeseburger-standard", orderingFile: "double-cheeseburger-item-page.json",
    defaults: [
      { componentId: 300038, nutritionContextId: "big-mac-beef-single", quantity: 2 },
      { componentId: 301578, nutritionContextId: "regular-bun", quantity: 1 },
      { componentId: 301518, nutritionContextId: "american-cheese-single", quantity: 2 },
      { componentId: 300042, nutritionContextId: "small-pickle-double", quantity: 1 },
      { componentId: 300041, nutritionContextId: "diced-onions-double", quantity: 1 },
      { componentId: 300037, nutritionContextId: "small-ketchup", quantity: 1 },
      { componentId: 300044, nutritionContextId: "qpc-mustard", quantity: 1 },
    ], options: regularOptions("double"),
  },
  {
    slug: "daily-double", itemId: 200497, validationCaptureId: "daily-double-standard", orderingFile: "daily-double-item-page.json",
    defaults: [
      { componentId: 300038, nutritionContextId: "big-mac-beef-single", quantity: 2 },
      { componentId: 301578, nutritionContextId: "regular-bun", quantity: 1 },
      { componentId: 301518, nutritionContextId: "american-cheese-single", quantity: 1 },
      { componentId: 300430, nutritionContextId: "qpc-add-mayonnaise", quantity: 1 },
      { componentId: 301407, nutritionContextId: "tomato-single-slice", quantity: 1 },
      { componentId: 301502, nutritionContextId: "qpc-onions", quantity: 1 },
      { componentId: 300098, nutritionContextId: "daily-double-lettuce-default", quantity: 1 },
    ],
    options: {
      mayonnaise: { componentId: 300430, nutritionContextId: "qpc-add-mayonnaise" },
      "american cheese": { componentId: 301518, nutritionContextId: "american-cheese-single" },
      "slivered onions": { componentId: 301502, nutritionContextId: "qpc-onions" },
      "shredded lettuce": { componentId: 300098, nutritionContextId: "daily-double-lettuce-default" },
      "1/10 lb beef": { componentId: 300038, nutritionContextId: "big-mac-beef-single" },
      "regular bun": { componentId: 301578, nutritionContextId: "regular-bun" },
    },
  },
  {
    slug: "quarter-pounder-deluxe", itemId: 200765, validationCaptureId: "quarter-pounder-deluxe-standard", orderingFile: "quarter-pounder-deluxe-item-page.json",
    defaults: [
      { componentId: 301574, nutritionContextId: "qpc-beef", quantity: 1 },
      { componentId: 301516, nutritionContextId: "qpc-bun", quantity: 1 },
      { componentId: 301518, nutritionContextId: "american-cheese-single", quantity: 2 },
      { componentId: 301407, nutritionContextId: "qpc-add-tomato", quantity: 1 },
      { componentId: 300037, nutritionContextId: "qpc-ketchup", quantity: 1 },
      { componentId: 300098, nutritionContextId: "qpc-add-lettuce", quantity: 1 },
      { componentId: 300430, nutritionContextId: "qpc-add-mayonnaise", quantity: 1 },
      { componentId: 300042, nutritionContextId: "qpc-pickle", quantity: 1 },
      { componentId: 301502, nutritionContextId: "qpc-onions", quantity: 1 },
      { componentId: 300044, nutritionContextId: "qpc-mustard", quantity: 1 },
    ], options: commonQuarterPounderOptions,
  },
  {
    slug: "double-quarter-pounder", itemId: 200476, validationCaptureId: "double-quarter-pounder-standard", orderingFile: "double-quarter-pounder-item-page.json",
    defaults: [
      { componentId: 301574, nutritionContextId: "qpc-beef", quantity: 2 },
      { componentId: 301516, nutritionContextId: "qpc-bun", quantity: 1 },
      { componentId: 301518, nutritionContextId: "american-cheese-single", quantity: 2 },
      { componentId: 300037, nutritionContextId: "qpc-ketchup", quantity: 1 },
      { componentId: 300042, nutritionContextId: "qpc-pickle", quantity: 1 },
      { componentId: 301502, nutritionContextId: "qpc-onions", quantity: 1 },
      { componentId: 300044, nutritionContextId: "qpc-mustard", quantity: 1 },
    ], options: commonQuarterPounderOptions,
  },
  {
    slug: "bacon-quarter-pounder", itemId: 203410, validationCaptureId: "bacon-quarter-pounder-standard", orderingFile: "bacon-quarter-pounder-item-page.json",
    defaults: [
      { componentId: 301574, nutritionContextId: "qpc-beef", quantity: 1 },
      { componentId: 301516, nutritionContextId: "qpc-bun", quantity: 1 },
      { componentId: 301518, nutritionContextId: "american-cheese-single", quantity: 2 },
      { componentId: 300163, nutritionContextId: "qpc-add-bacon", quantity: 1 },
      { componentId: 300037, nutritionContextId: "qpc-ketchup", quantity: 1 },
      { componentId: 300042, nutritionContextId: "qpc-pickle", quantity: 1 },
      { componentId: 301502, nutritionContextId: "qpc-onions", quantity: 1 },
      { componentId: 300044, nutritionContextId: "qpc-mustard", quantity: 1 },
    ], options: commonQuarterPounderOptions,
  },
  {
    slug: "mccrispy", itemId: 203747, validationCaptureId: "mccrispy-standard", orderingFile: "mccrispy-item-page.json",
    defaults: [
      { componentId: 302309, nutritionContextId: "mccrispy-filet", quantity: 1 },
      { componentId: 302402, nutritionContextId: "mccrispy-potato-roll", quantity: 1 },
      { componentId: 302415, nutritionContextId: "mccrispy-crinkle-pickle", quantity: 1 },
      { componentId: 300310, nutritionContextId: "mccrispy-butter", quantity: 1 },
    ],
    options: {
      ...commonMcCrispyOptions,
      butter: { componentId: 300310, nutritionContextId: "mccrispy-butter" },
    },
  },
  {
    slug: "deluxe-mccrispy", itemId: 203745, validationCaptureId: "deluxe-mccrispy-standard", orderingFile: "deluxe-mccrispy-item-page.json",
    defaults: [
      { componentId: 302309, nutritionContextId: "mccrispy-filet", quantity: 1 },
      { componentId: 302402, nutritionContextId: "mccrispy-potato-roll", quantity: 1 },
      { componentId: 301407, nutritionContextId: "deluxe-mccrispy-tomato", quantity: 1 },
      { componentId: 300098, nutritionContextId: "deluxe-mccrispy-lettuce", quantity: 1 },
      { componentId: 300430, nutritionContextId: "deluxe-mccrispy-mayonnaise", quantity: 1 },
    ],
    options: deluxeMcCrispyOptions,
  },
  {
    slug: "spicy-mccrispy", itemId: 203901, validationCaptureId: "spicy-mccrispy-standard", orderingFile: "spicy-mccrispy-item-page.json",
    defaults: [
      { componentId: 302309, nutritionContextId: "mccrispy-filet", quantity: 1 },
      { componentId: 302402, nutritionContextId: "mccrispy-potato-roll", quantity: 1 },
      { componentId: 302376, nutritionContextId: "mccrispy-spicy-sauce", quantity: 1 },
      { componentId: 302415, nutritionContextId: "mccrispy-crinkle-pickle", quantity: 1 },
    ],
    options: {
      ...commonMcCrispyOptions,
      "spicy pepper sauce": { componentId: 302376, nutritionContextId: "mccrispy-spicy-sauce" },
    },
  },
  {
    slug: "spicy-deluxe-mccrispy", itemId: 203873, validationCaptureId: "spicy-deluxe-mccrispy-standard", orderingFile: "spicy-deluxe-mccrispy-item-page.json",
    defaults: [
      { componentId: 302309, nutritionContextId: "mccrispy-filet", quantity: 1 },
      { componentId: 302402, nutritionContextId: "mccrispy-potato-roll", quantity: 1 },
      { componentId: 301407, nutritionContextId: "deluxe-mccrispy-tomato", quantity: 1 },
      { componentId: 302376, nutritionContextId: "mccrispy-spicy-sauce", quantity: 1 },
      { componentId: 300098, nutritionContextId: "deluxe-mccrispy-lettuce", quantity: 1 },
    ],
    options: {
      ...deluxeMcCrispyOptions,
      "spicy pepper sauce": { componentId: 302376, nutritionContextId: "mccrispy-spicy-sauce" },
    },
  },
  {
    slug: "mcchicken", itemId: 200438, validationCaptureId: "mcchicken-standard", orderingFile: "mcchicken-item-page.json",
    defaults: [
      { componentId: 300708, nutritionContextId: "mchicken-patty", quantity: 1 },
      { componentId: 301578, nutritionContextId: "mchicken-bun", quantity: 1 },
      { componentId: 300098, nutritionContextId: "mchicken-lettuce", quantity: 1 },
      { componentId: 300430, nutritionContextId: "mchicken-mayonnaise", quantity: 1 },
    ],
    options: {
      lettuce: { componentId: 300098, nutritionContextId: "mchicken-lettuce" },
      "shredded lettuce": { componentId: 300098, nutritionContextId: "mchicken-lettuce" },
      mayo: { componentId: 300430, nutritionContextId: "mchicken-mayonnaise" },
      mayonnaise: { componentId: 300430, nutritionContextId: "mchicken-mayonnaise" },
      "mcchicken patty": { componentId: 300708, nutritionContextId: "mchicken-patty" },
      "regular bun": { componentId: 301578, nutritionContextId: "mchicken-bun" },
      "2 half strips bacon": { componentId: 300163, nutritionContextId: "bacon-two-half-strips" },
      "american cheese": { componentId: 301518, nutritionContextId: "american-cheese-single" },
      "x2 tomato": { componentId: 301407, nutritionContextId: "tomato-two-slices" },
      "x2 slc tomato": { componentId: 301407, nutritionContextId: "tomato-two-slices" },
      mustard: { componentId: 300044, nutritionContextId: "qpc-mustard" },
    },
  },
  {
    slug: "filet-o-fish", itemId: 200445, validationCaptureId: "filet-o-fish-standard", orderingFile: "filet-o-fish-item-page.json",
    defaults: [
      { componentId: 300055, nutritionContextId: "filet-o-fish-patty", quantity: 1 },
      { componentId: 301578, nutritionContextId: "filet-o-fish-bun", quantity: 1 },
      { componentId: 302503, nutritionContextId: "filet-o-fish-tartar-sauce", quantity: 1 },
      { componentId: 300716, nutritionContextId: "filet-o-fish-half-cheese", quantity: 1 },
    ],
    options: {
      "tartar sauce": { componentId: 302503, nutritionContextId: "filet-o-fish-tartar-sauce" },
      "american cheese": { componentId: 300716, nutritionContextId: "american-cheese-single" },
      "filet-o-fish patty": { componentId: 300055, nutritionContextId: "filet-o-fish-patty" },
      "regular bun": { componentId: 301578, nutritionContextId: "filet-o-fish-bun" },
      "2 half strips bacon": { componentId: 300163, nutritionContextId: "bacon-two-half-strips" },
      "shredded lettuce": { componentId: 300098, nutritionContextId: "qpc-add-lettuce" },
      "x2 slc tomato": { componentId: 301407, nutritionContextId: "tomato-two-slices" },
      mustard: { componentId: 300044, nutritionContextId: "qpc-mustard" },
      mayonnaise: { componentId: 300430, nutritionContextId: "qpc-add-mayonnaise" },
    },
  },
];

function object(value: unknown): JsonObject | undefined { return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : undefined; }
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function text(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
function number(value: unknown): number | null { const parsed = Number(value); return value === null || value === undefined || value === "" || !Number.isFinite(parsed) ? null : parsed; }
function normalizedOptionName(name: string): { action?: McDonaldsCustomizationAction; ingredient: string } {
  const normalized = name.replace(/[®™]/g, "").normalize("NFKC").replace(/\s+/g, " ").trim();
  const match = normalized.match(/^(No|Extra|Add)\s+(.+)$/i);
  if (!match) return { ingredient: normalized.toLocaleLowerCase("en-US") };
  return { action: ({ no: "remove", extra: "extra", add: "add" } as const)[match[1].toLocaleLowerCase("en-US") as "no" | "extra" | "add"], ingredient: match[2].toLocaleLowerCase("en-US") };
}
function responseItem(capture: Capture): JsonObject {
  const rows = array(object(capture.response.items)?.item);
  const item = object(rows[0] ?? object(capture.response.items)?.item);
  if (!item) throw new Error(`Capture ${capture.id} has no items.item response`);
  return item;
}
function nutrients(item: JsonObject, raw: boolean): McDonaldsNutrients {
  const output: McDonaldsNutrients = {};
  for (const row of array(object(item.nutrient_facts)?.nutrient)) {
    const nutrient = object(row); const key = text(nutrient?.nutrient_name_id); const value = number(raw ? nutrient?.raw_value ?? nutrient?.value : nutrient?.value);
    if (key && value !== null) output[key] = value;
  }
  return output;
}
function componentName(details: JsonObject, componentId: number): string {
  for (const wrapper of Object.values(details)) {
    const item = object(object(wrapper)?.item);
    for (const value of array(object(item?.components)?.component)) {
      const component = object(value); if (number(component?.id) === componentId) return text(component?.product_name) || `Component ${componentId}`;
    }
  }
  return `Component ${componentId}`;
}
function maxError(left: McDonaldsNutrients, right: McDonaldsNutrients): number {
  return Math.max(0, ...new Set([...Object.keys(left), ...Object.keys(right)]).values().map((key) => Math.abs((left[key] ?? 0) - (right[key] ?? 0))));
}

async function main(): Promise<void> {
  const [details, calculator, filetCalculator] = await Promise.all([
    readFile(DETAILS, "utf8").then((value) => JSON.parse(value) as JsonObject),
    readFile(CALCULATOR, "utf8").then((value) => JSON.parse(value) as { captures: Capture[] }),
    readFile(FILET_CALCULATOR, "utf8").then((value) => JSON.parse(value) as { captures: Capture[] }),
  ]);
  calculator.captures.push(...filetCalculator.captures.map((capture) => ({
    ...capture,
    kind: capture.id === "filet-o-fish-standard" ? "validation" : "component",
    parentItemId: 200445,
    componentIds: ({
      "filet-o-fish-patty": [300055],
      "filet-o-fish-bun": [301578],
      "filet-o-fish-tartar-sauce": [302503],
      "filet-o-fish-half-cheese": [300716],
    } as Record<string, number[]>)[capture.id],
  })));
  const captureById = new Map(calculator.captures.map((capture) => [capture.id, capture]));
  const contexts: McDonaldsComponentNutritionContext[] = calculator.captures.filter((capture) => capture.kind === "component" && capture.componentIds?.length === 1).map((capture) => ({
    id: capture.id, componentId: String(capture.componentIds![0]), parentItemId: String(capture.parentItemId),
    name: componentName(details, capture.componentIds![0]), nutrients: nutrients(responseItem(capture), true),
    displayedNutrients: nutrients(responseItem(capture), false), sourceExpression: capture.expression,
  }));
  const tomatoSlice = contexts.find((context) => context.id === "tomato-single-slice");
  if (!tomatoSlice) throw new Error("Missing tomato-single-slice context");
  contexts.push({
    ...tomatoSlice, id: "tomato-two-slices", parentItemId: "shared", name: "Roma Tomato (2 slices)",
    nutrients: Object.fromEntries(Object.entries(tomatoSlice.nutrients).map(([key, value]) => [key, value * 2])),
    displayedNutrients: Object.fromEntries(Object.entries(tomatoSlice.displayedNutrients).map(([key, value]) => [key, value * 2])),
    sourceExpression: "2 * 200497(301407); validated by 200765(301407) = 3 * single slice",
  });
  const ranchCapture = captureById.get("mccrispy-ranch-sauce");
  if (!ranchCapture) throw new Error("Missing mccrispy-ranch-sauce context");
  const ranchItem = responseItem(ranchCapture);
  contexts.push({
    id: "mccrispy-ranch-sauce", componentId: "204161", parentItemId: "204161", name: "McCrispy Ranch Sauce",
    nutrients: nutrients(ranchItem, true), displayedNutrients: nutrients(ranchItem, false), sourceExpression: ranchCapture.expression,
  });
  const contextById = new Map(contexts.map((context) => [context.id, context]));
  const outputs = [];
  for (const definition of definitions) {
    const ordering = JSON.parse(await readFile(resolve(ORDERING_DIRECTORY, definition.orderingFile), "utf8")) as JsonObject;
    const itemPage = object(object(ordering.data)?.itemPage); const header = object(itemPage?.itemHeader);
    const groups: McDonaldsCustomizationModel["groups"] = []; const options: McDonaldsOrderingOption[] = [];
    const unmatched: Array<{ optionId: string; name: string; reason: string }> = [];
    for (const rawGroup of array(itemPage?.optionLists)) {
      const group = object(rawGroup); const groupName = text(group?.name); if (!/^(Remove from|Extra for)/i.test(groupName)) continue;
      const mappedIds: string[] = [];
      for (const rawOption of array(group?.options)) {
        const option = object(rawOption); const id = text(option?.id); const name = text(option?.name); const parsed = normalizedOptionName(name);
        if (!parsed.action) { unmatched.push({ optionId: id, name, reason: "unsupported_action" }); continue; }
        if (parsed.ingredient === "salt") { unmatched.push({ optionId: id, name, reason: "salt_nutrition_unresolved" }); continue; }
        const match = definition.options[parsed.ingredient];
        if (!match || !contextById.has(match.nutritionContextId)) { unmatched.push({ optionId: id, name, reason: "no_validated_nutrition_mapping" }); continue; }
        options.push({ id, groupId: text(group?.id), groupName, action: parsed.action, name, componentId: String(match.componentId), nutritionContextId: match.nutritionContextId,
          priceCents: number(option?.unitAmount) ?? 0, currency: text(option?.currency) || "USD", calorieLabel: text(option?.caloricInfoDisplayString),
          chargeAbove: number(option?.chargeAbove) ?? 0, available: true, defaultQuantity: number(option?.defaultQuantity) ?? 0,
          minQuantity: number(option?.minOptionChoiceQuantity), maxQuantity: number(option?.maxOptionChoiceQuantity) });
        mappedIds.push(id);
      }
      const subtitleMaximum = text(group?.subtitle).match(/up to\s+(\d+)/i)?.[1]; const capturedMaximum = number(group?.maxNumOptions) ?? 0;
      groups.push({ id: text(group?.id), name: groupName, minOptions: number(group?.minNumOptions) ?? 0,
        maxOptions: subtitleMaximum ? Math.min(capturedMaximum, Number(subtitleMaximum)) : capturedMaximum,
        optional: group?.isOptional === true, optionIds: mappedIds });
    }
    const usedContextIds = new Set([...definition.defaults.map((entry) => entry.nutritionContextId), ...options.map((option) => option.nutritionContextId)]);
    const model: McDonaldsCustomizationModel = {
      schemaVersion: 1, itemId: String(definition.itemId), orderingItemId: text(header?.id),
      defaultComponents: definition.defaults.map(({ componentId, ...entry }) => ({ componentId: String(componentId), ...entry })),
      componentContexts: contexts.filter((context) => usedContextIds.has(context.id)), groups, options,
    };
    const expected = nutrients(responseItem(captureById.get(definition.validationCaptureId)!), true);
    const calculated = calculateMcDonaldsCustomizationNutrition(model, []); const error = maxError(calculated, expected);
    const report = { itemId: model.itemId, orderingItemId: model.orderingItemId, orderingFile: definition.orderingFile,
      summary: { optionsMapped: options.length, unmatched: unmatched.length, defaultNutritionValidated: error < 0.000001, maxRawNutrientError: error },
      unmatched, validation: { expected, calculated } };
    const modelOutput = resolve(OUTPUT_DIRECTORY, `${definition.slug}.json`); const reportOutput = resolve(OUTPUT_DIRECTORY, `${definition.slug}-report.json`);
    await Promise.all([writeAtomically(modelOutput, `${JSON.stringify(model, null, 2)}\n`), writeAtomically(reportOutput, `${JSON.stringify(report, null, 2)}\n`)]);
    outputs.push({ slug: definition.slug, modelOutput, reportOutput, summary: report.summary });
  }
  console.log(JSON.stringify(outputs, null, 2));
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.stack ?? error.message : error); process.exitCode = 1; });
