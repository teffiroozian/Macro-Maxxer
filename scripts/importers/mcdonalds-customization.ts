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
const ORDERING = resolve("data/restaurants/mcdonalds/research/ordering/raw/quarter-pounder-item-page.json");
const BIG_MAC_ORDERING = resolve("data/restaurants/mcdonalds/research/ordering/raw/big-mac-item-page.json");
const CALCULATOR = resolve("data/restaurants/mcdonalds/customization/raw/dna-calculator.json");
const MODEL_OUTPUT = resolve("data/restaurants/mcdonalds/customization/generated/quarter-pounder.json");
const BIG_MAC_MODEL_OUTPUT = resolve("data/restaurants/mcdonalds/customization/generated/big-mac.json");
const REPORT_OUTPUT = resolve("data/restaurants/mcdonalds/customization/generated/report.json");
const BIG_MAC_REPORT_OUTPUT = resolve("data/restaurants/mcdonalds/customization/generated/big-mac-report.json");

type JsonObject = Record<string, unknown>;
type Capture = { id: string; kind: string; parentItemId: number; componentIds?: number[]; expression: string; url: string; response: JsonObject };

const optionComponentAliases: Record<string, number> = {
  mustard: 300044,
  ketchup: 300037,
  "slivered onions": 301502,
  pickle: 300042,
  "american cheese": 301518,
  "1/4 lb beef": 301574,
  "sesame seed bun": 301516,
  "3 half strips bacon": 300163,
  "shredded lettuce": 300098,
  "x3 slc tomato": 301407,
  mayonnaise: 300430,
};

const defaultContextByComponent: Record<number, string> = {
  301574: "qpc-beef", 301516: "qpc-bun", 301518: "qpc-cheese-default", 300037: "qpc-ketchup",
  300042: "qpc-pickle", 301502: "qpc-onions", 300044: "qpc-mustard",
};

const optionContextByComponent: Record<number, string> = {
  301574: "qpc-beef", 301516: "qpc-bun", 301518: "american-cheese-single", 300037: "qpc-ketchup",
  300042: "qpc-pickle", 301502: "qpc-onions", 300044: "qpc-mustard", 300163: "qpc-add-bacon",
  300098: "qpc-add-lettuce", 301407: "qpc-add-tomato", 300430: "qpc-add-mayonnaise",
};

function object(value: unknown): JsonObject | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : undefined;
}

function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function text(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
function number(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizedOptionName(name: string): { action?: McDonaldsCustomizationAction; ingredient: string } {
  const normalized = name.replace(/[®™]/g, "").normalize("NFKC").replace(/\s+/g, " ").trim();
  const match = normalized.match(/^(No|Extra|Add)\s+(.+)$/i);
  if (!match) return { ingredient: normalized.toLocaleLowerCase("en-US") };
  return {
    action: ({ no: "remove", extra: "extra", add: "add" } as const)[match[1].toLocaleLowerCase("en-US") as "no" | "extra" | "add"],
    ingredient: match[2].toLocaleLowerCase("en-US"),
  };
}

function responseItem(capture: Capture): JsonObject {
  const items = object(capture.response.items);
  const rows = array(items?.item);
  const item = object(rows[0] ?? items?.item);
  if (!item) throw new Error(`Capture ${capture.id} has no items.item response`);
  return item;
}

function nutrients(item: JsonObject, raw: boolean): McDonaldsNutrients {
  const output: McDonaldsNutrients = {};
  for (const row of array(object(item.nutrient_facts)?.nutrient)) {
    const nutrient = object(row);
    const key = text(nutrient?.nutrient_name_id);
    const value = number(raw ? nutrient?.raw_value ?? nutrient?.value : nutrient?.value);
    if (key && value !== null) output[key] = value;
  }
  return output;
}

function componentName(details: JsonObject, componentId: number): string {
  for (const wrapper of Object.values(details)) {
    const item = object(object(wrapper)?.item);
    for (const value of array(object(item?.components)?.component)) {
      const component = object(value);
      if (number(component?.id) === componentId) return text(component?.product_name) || `Component ${componentId}`;
    }
  }
  return `Component ${componentId}`;
}

function delta(left: McDonaldsNutrients, right: McDonaldsNutrients): McDonaldsNutrients {
  return Object.fromEntries([...new Set([...Object.keys(left), ...Object.keys(right)])].map((key) => [key, (left[key] ?? 0) - (right[key] ?? 0)]));
}

function maxError(left: McDonaldsNutrients, right: McDonaldsNutrients): number {
  return Math.max(0, ...Object.keys(left).map((key) => Math.abs((left[key] ?? 0) - (right[key] ?? 0))));
}

async function main(): Promise<void> {
  const [details, ordering, bigMacOrdering, calculator] = await Promise.all([
    readFile(DETAILS, "utf8").then((value) => JSON.parse(value) as JsonObject),
    readFile(ORDERING, "utf8").then((value) => JSON.parse(value) as JsonObject),
    readFile(BIG_MAC_ORDERING, "utf8").then((value) => JSON.parse(value) as JsonObject),
    readFile(CALCULATOR, "utf8").then((value) => JSON.parse(value) as { capturedAt: string; endpoint: string; captures: Capture[] }),
  ]);
  const captureById = new Map(calculator.captures.map((capture) => [capture.id, capture]));
  const contexts: McDonaldsComponentNutritionContext[] = calculator.captures
    .filter((capture) => capture.kind === "component" && capture.componentIds?.length === 1)
    .map((capture) => ({
      id: capture.id,
      componentId: String(capture.componentIds![0]),
      parentItemId: String(capture.parentItemId),
      name: componentName(details, capture.componentIds![0]),
      nutrients: nutrients(responseItem(capture), true),
      displayedNutrients: nutrients(responseItem(capture), false),
      sourceExpression: capture.expression,
    }));

  const itemPage = object(object(ordering.data)?.itemPage);
  const header = object(itemPage?.itemHeader);
  const groups = [] as McDonaldsCustomizationModel["groups"];
  const options: McDonaldsOrderingOption[] = [];
  const unmatched: Array<{ optionId: string; name: string; reason: string }> = [];
  const ambiguous: Array<{ optionId: string; name: string; reason: string }> = [];
  for (const rawGroup of array(itemPage?.optionLists)) {
    const group = object(rawGroup);
    const groupName = text(group?.name);
    if (!/^(Remove from|Extra for)/i.test(groupName)) continue;
    const mappedIds: string[] = [];
    for (const rawOption of array(group?.options)) {
      const option = object(rawOption);
      const id = text(option?.id);
      const name = text(option?.name);
      const parsed = normalizedOptionName(name);
      if (!parsed.action) { unmatched.push({ optionId: id, name, reason: "unsupported_action" }); continue; }
      const componentId = optionComponentAliases[parsed.ingredient];
      if (!componentId) { unmatched.push({ optionId: id, name, reason: "no_confident_dna_component_alias" }); continue; }
      const contextId = parsed.action === "remove" ? defaultContextByComponent[componentId] : optionContextByComponent[componentId];
      if (!contextId || !captureById.has(contextId)) { ambiguous.push({ optionId: id, name, reason: "component_matched_but_nutrition_portion_unresolved" }); continue; }
      options.push({
        id, groupId: text(group?.id), groupName, action: parsed.action, name, componentId: String(componentId),
        nutritionContextId: contextId, priceCents: number(option?.unitAmount) ?? 0, currency: text(option?.currency) || "USD",
        calorieLabel: text(option?.caloricInfoDisplayString), chargeAbove: number(option?.chargeAbove) ?? 0,
        available: true, defaultQuantity: number(option?.defaultQuantity) ?? 0,
        minQuantity: number(option?.minOptionChoiceQuantity), maxQuantity: number(option?.maxOptionChoiceQuantity),
      });
      mappedIds.push(id);
    }
    groups.push({ id: text(group?.id), name: groupName, minOptions: number(group?.minNumOptions) ?? 0, maxOptions: number(group?.maxNumOptions) ?? 0, optional: group?.isOptional === true, optionIds: mappedIds });
  }

  const model: McDonaldsCustomizationModel = {
    schemaVersion: 1,
    itemId: "200466",
    orderingItemId: text(header?.id),
    defaultComponents: Object.entries(defaultContextByComponent).map(([componentId, nutritionContextId]) => ({ componentId, nutritionContextId, quantity: 1 })),
    componentContexts: contexts.filter((context) => Object.values(defaultContextByComponent).includes(context.id) || Object.values(optionContextByComponent).includes(context.id)),
    groups,
    options,
  };

  const validationCases = [
    { id: "big-mac-no-sauce", standard: "big-mac-standard", removedContext: "big-mac-sauce" },
    { id: "big-mac-no-cheese", standard: "big-mac-standard", removedContext: "american-cheese-single" },
    { id: "qpc-no-cheese", standard: "qpc-standard", removedContext: "qpc-cheese-default" },
    { id: "qpc-no-ketchup", standard: "qpc-standard", removedContext: "qpc-ketchup" },
  ].map((entry) => {
    const standard = nutrients(responseItem(captureById.get(entry.standard)!), true);
    const expected = nutrients(responseItem(captureById.get(entry.id)!), true);
    const removed = contexts.find((context) => context.id === entry.removedContext)!.nutrients;
    const calculated = delta(standard, removed);
    return { ...entry, passed: maxError(calculated, expected) < 0.000001, maxRawNutrientError: maxError(calculated, expected), expected, calculated };
  });
  const qpcStandard = nutrients(responseItem(captureById.get("qpc-standard")!), true);
  const qpcCalculated = calculateMcDonaldsCustomizationNutrition(model, []);
  validationCases.push({ id: "qpc-component-sum", standard: "qpc-standard", removedContext: "none", passed: maxError(qpcCalculated, qpcStandard) < 0.000001, maxRawNutrientError: maxError(qpcCalculated, qpcStandard), expected: qpcStandard, calculated: qpcCalculated });

  const report = {
    generatedAt: new Date().toISOString(),
    sources: { itemDetails: DETAILS, orderingItemPage: ORDERING, calculatorCapture: CALCULATOR },
    summary: { componentNutritionContexts: contexts.length, orderingOptionsMapped: options.length, unmatched: unmatched.length, ambiguous: ambiguous.length, validationPassed: validationCases.every((entry) => entry.passed) },
    unmatched,
    ambiguous,
    validationCases,
  };

  const bigMacAliases: Record<string, number> = {
    "mac sauce": 301554,
    "diced onions": 300041,
    "shredded lettuce": 300098,
    pickle: 300042,
    "american cheese": 301518,
    "1/10 lb beef": 300038,
    "big mac bun": 302510,
    "x2 slc tomato": 301407,
    mayonnaise: 300430,
  };
  const bigMacDefaultContextByComponent: Record<number, { nutritionContextId: string; quantity: number }> = {
    302510: { nutritionContextId: "big-mac-bun", quantity: 1 },
    300038: { nutritionContextId: "big-mac-beef-single", quantity: 2 },
    300098: { nutritionContextId: "big-mac-shredded-lettuce", quantity: 1 },
    301554: { nutritionContextId: "big-mac-sauce", quantity: 1 },
    301518: { nutritionContextId: "american-cheese-single", quantity: 1 },
    300042: { nutritionContextId: "big-mac-pickle", quantity: 1 },
    300041: { nutritionContextId: "big-mac-diced-onions", quantity: 1 },
  };
  const bigMacOptionContextByComponent: Record<number, string> = {
    302510: "big-mac-bun",
    300038: "big-mac-beef-single",
    300098: "big-mac-shredded-lettuce",
    301554: "big-mac-sauce",
    301518: "american-cheese-single",
    300042: "big-mac-pickle",
    300041: "big-mac-diced-onions",
    301407: "big-mac-tomato-two-slices",
    300430: "qpc-add-mayonnaise",
  };
  const tomatoSlice = contexts.find((context) => context.id === "tomato-single-slice");
  if (!tomatoSlice) throw new Error("Missing captured single-slice tomato nutrition context");
  const tomatoTwoSlices: McDonaldsComponentNutritionContext = {
    ...tomatoSlice,
    id: "big-mac-tomato-two-slices",
    parentItemId: "200463",
    name: "Roma Tomato (2 slices)",
    nutrients: Object.fromEntries(Object.entries(tomatoSlice.nutrients).map(([key, value]) => [key, value * 2])),
    displayedNutrients: Object.fromEntries(Object.entries(tomatoSlice.displayedNutrients).map(([key, value]) => [key, value * 2])),
    sourceExpression: "2 * 200497(301407); validated by 200765(301407) = 3 * single slice",
  };
  const bigMacContexts = [...contexts, tomatoTwoSlices];
  const bigMacItemPage = object(object(bigMacOrdering.data)?.itemPage);
  const bigMacHeader = object(bigMacItemPage?.itemHeader);
  const bigMacGroups: McDonaldsCustomizationModel["groups"] = [];
  const bigMacOptions: McDonaldsOrderingOption[] = [];
  const bigMacUnmatched: Array<{ optionId: string; name: string; reason: string }> = [];
  const bigMacAmbiguous: Array<{ optionId: string; name: string; reason: string }> = [];
  for (const rawGroup of array(bigMacItemPage?.optionLists)) {
    const group = object(rawGroup);
    const groupName = text(group?.name);
    if (!/^(Remove from|Extra for)/i.test(groupName)) continue;
    const mappedIds: string[] = [];
    for (const rawOption of array(group?.options)) {
      const option = object(rawOption);
      const id = text(option?.id);
      const name = text(option?.name);
      const parsed = normalizedOptionName(name);
      if (!parsed.action) { bigMacUnmatched.push({ optionId: id, name, reason: "unsupported_action" }); continue; }
      const componentId = bigMacAliases[parsed.ingredient];
      if (!componentId) { bigMacUnmatched.push({ optionId: id, name, reason: parsed.ingredient === "salt" ? "salt_nutrition_unresolved" : "no_confident_dna_component_alias" }); continue; }
      const contextId = parsed.action === "remove"
        ? bigMacDefaultContextByComponent[componentId]?.nutritionContextId
        : bigMacOptionContextByComponent[componentId];
      if (!contextId || !bigMacContexts.some((context) => context.id === contextId)) {
        bigMacAmbiguous.push({ optionId: id, name, reason: "component_matched_but_nutrition_portion_unresolved" });
        continue;
      }
      bigMacOptions.push({
        id, groupId: text(group?.id), groupName, action: parsed.action, name, componentId: String(componentId),
        nutritionContextId: contextId, priceCents: number(option?.unitAmount) ?? 0, currency: text(option?.currency) || "USD",
        calorieLabel: text(option?.caloricInfoDisplayString), chargeAbove: number(option?.chargeAbove) ?? 0,
        available: true, defaultQuantity: number(option?.defaultQuantity) ?? 0,
        minQuantity: number(option?.minOptionChoiceQuantity), maxQuantity: number(option?.maxOptionChoiceQuantity),
      });
      mappedIds.push(id);
    }
    const subtitleMaximum = text(group?.subtitle).match(/up to\s+(\d+)/i)?.[1];
    const capturedMaximum = number(group?.maxNumOptions) ?? 0;
    bigMacGroups.push({
      id: text(group?.id), name: groupName, minOptions: number(group?.minNumOptions) ?? 0,
      maxOptions: subtitleMaximum ? Math.min(capturedMaximum, Number(subtitleMaximum)) : capturedMaximum,
      optional: group?.isOptional === true, optionIds: mappedIds,
    });
  }
  const bigMacModel: McDonaldsCustomizationModel = {
    schemaVersion: 1,
    itemId: "200463",
    orderingItemId: text(bigMacHeader?.id),
    defaultComponents: Object.entries(bigMacDefaultContextByComponent).map(([componentId, entry]) => ({ componentId, ...entry })),
    componentContexts: bigMacContexts.filter((context) =>
      Object.values(bigMacDefaultContextByComponent).some((entry) => entry.nutritionContextId === context.id) ||
      Object.values(bigMacOptionContextByComponent).includes(context.id)
    ),
    groups: bigMacGroups,
    options: bigMacOptions,
  };
  const bigMacStandard = nutrients(responseItem(captureById.get("big-mac-standard")!), true);
  const bigMacCalculated = calculateMcDonaldsCustomizationNutrition(bigMacModel, []);
  const bigMacValidationCases = [
    { id: "big-mac-component-sum", passed: maxError(bigMacCalculated, bigMacStandard) < 0.000001, maxRawNutrientError: maxError(bigMacCalculated, bigMacStandard), expected: bigMacStandard, calculated: bigMacCalculated },
  ];
  const bigMacReport = {
    generatedAt: new Date().toISOString(),
    sources: { itemDetails: DETAILS, orderingItemPage: BIG_MAC_ORDERING, calculatorCapture: CALCULATOR },
    summary: { componentNutritionContexts: bigMacModel.componentContexts.length, orderingOptionsMapped: bigMacOptions.length, unmatched: bigMacUnmatched.length, ambiguous: bigMacAmbiguous.length, validationPassed: bigMacValidationCases.every((entry) => entry.passed) },
    unmatched: bigMacUnmatched,
    ambiguous: bigMacAmbiguous,
    validationCases: bigMacValidationCases,
  };
  await Promise.all([
    writeAtomically(MODEL_OUTPUT, `${JSON.stringify(model, null, 2)}\n`),
    writeAtomically(REPORT_OUTPUT, `${JSON.stringify(report, null, 2)}\n`),
    writeAtomically(BIG_MAC_MODEL_OUTPUT, `${JSON.stringify(bigMacModel, null, 2)}\n`),
    writeAtomically(BIG_MAC_REPORT_OUTPUT, `${JSON.stringify(bigMacReport, null, 2)}\n`),
  ]);
  console.log(JSON.stringify({ model: MODEL_OUTPUT, report: REPORT_OUTPUT, summary: report.summary, bigMacModel: BIG_MAC_MODEL_OUTPUT, bigMacReport: BIG_MAC_REPORT_OUTPUT, bigMacSummary: bigMacReport.summary }, null, 2));
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.stack ?? error.message : error); process.exitCode = 1; });
