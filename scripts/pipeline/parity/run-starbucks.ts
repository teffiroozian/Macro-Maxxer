import { readFile } from "node:fs/promises";
import { STARBUCKS_GENERATED_RUNTIME_MENU } from "../../../lib/restaurantBuilders/starbucks/generatedRuntimeAdapter";
import { writeAtomically } from "../../lib/write-atomically";
import { starbucksAdapter } from "../adapters/starbucks";
import { normalizeRestaurant } from "../engine";
import type { IdRegistry } from "../ids";
import { registryPath } from "../ids-seed";
import { checkRuntimeMenu, projectToRestaurantMenu } from "../project";
import { compareStarbucks } from "./starbucks";

// The capture contains ordering choices, not verified component panels.
function customizationCoverage(capture: Awaited<ReturnType<typeof starbucksAdapter.load>>) {
  type Row = Record<string, unknown>;
  const rows = (value: unknown): Row[] => Array.isArray(value)
    ? value.filter((entry): entry is Row => Boolean(entry && typeof entry === "object" && !Array.isArray(entry)))
    : [];
  const record = (value: unknown): Row => value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
  const summary = {
    catalogProducts: 0,
    catalogSizes: 0,
    productsWithOptions: 0,
    productsWithMilkCategory: 0,
    productsWithSyrupCategory: 0,
    sizesWithRecipe: 0,
    sizesWithOptionDefaults: 0,
    positiveRecipeQuantities: 0,
    zeroRecipeQuantityFields: 0,
    optionSizeOccurrencesWithNutrition: 0,
  };
  function visit(categories: Row[], names: Set<string>) {
    for (const category of categories) {
      if (typeof category.name === "string") names.add(category.name);
      for (const option of rows(category.products)) for (const size of rows(record(option.form).sizes)) {
        if (size.nutrition) summary.optionSizeOccurrencesWithNutrition++;
      }
      visit(rows(category.children), names);
    }
  }
  for (const { response } of capture.raw.responses) for (const product of response.products ?? []) {
    summary.catalogProducts++;
    const options = rows(product.productOptions);
    if (options.length) summary.productsWithOptions++;
    const names = new Set<string>();
    visit(options, names);
    if (names.has("Milk")) summary.productsWithMilkCategory++;
    if ([...names].some((name) => /syrup/i.test(name))) summary.productsWithSyrupCategory++;
    for (const size of product.sizes) {
      summary.catalogSizes++;
      if (rows(size.defaultOptionValues).length) summary.sizesWithOptionDefaults++;
      const recipe = rows(record(size.recipe).default);
      if (recipe.length) summary.sizesWithRecipe++;
      for (const option of recipe) {
        if (typeof option.quantity === "number" && option.quantity > 0) summary.positiveRecipeQuantities++;
        if (option.quantity === 0) summary.zeroRecipeQuantityFields++;
      }
    }
  }
  return summary;
}

async function main() {
  const [capture, registryJson] = await Promise.all([
    starbucksAdapter.load(),
    readFile(registryPath(starbucksAdapter.id), "utf8"),
  ]);
  const draft = normalizeRestaurant(starbucksAdapter.translate(capture));
  const projection = projectToRestaurantMenu(draft, { registry: JSON.parse(registryJson) as IdRegistry });
  const report = {
    ...compareStarbucks(STARBUCKS_GENERATED_RUNTIME_MENU, draft, projection),
    references: checkRuntimeMenu(projection.menu),
    customizationEvidence: customizationCoverage(capture),
    sourceGaps: capture.unresolvedOutput.records,
  };
  await writeAtomically("data/restaurants/staging/starbucks/parity.json", `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ runtime: report.runtime, differences: report.differences, references: report.references }, null, 2));
  if (report.differences.length || report.references.length) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
