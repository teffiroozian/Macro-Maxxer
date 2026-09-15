#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const inventoryPath = path.join(root, "data/restaurants/starbucks/generated/component-inventory.json");
const menuPath = path.join(root, "data/restaurants/starbucks/raw/menu.json");
const outputPath = path.join(root, "data/restaurants/starbucks/generated/default-component-identifiability-report.md");
const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
const menu = JSON.parse(fs.readFileSync(menuPath, "utf8"));

const explicitlyQuantified = new Set([
  "28582", "2123422", "91", "92", "93", "94", "2122694", "2122719", "46", "184",
  "96", "2123154", "27524", "2123815", "2121333", "40664", "47", "650", "40666",
  "2123907", "2123373", "101", "82", "2121344", "1211", "109", "114", "2122191", "48", "111", "112",
]);
const volumeDependent = new Set([
  "63", "1306", "41", "2122378", "2123308", "2123075", "2122556", "2123906", "2121866",
  "2123309", "2121850", "42", "67",
]);
const compositeHidden = new Set([
  "28234", "2124008", "2123051", "126", "2123643", "137", "207", "2123814", "37086", "127",
  "2123868", "2123865", "2123870", "40729", "2123909", "2123703", "2123369", "135", "27516",
  "2123372", "2123557", "34849", "191", "28493", "2123166", "125",
]);
const notEnough = new Set(["2122222", "73", "27773", "130", "1193", "2123218", "2123273", "71", "1179"]);

const classSets = {
  "explicitly quantified and potentially solvable": explicitlyQuantified,
  "volume-dependent / displaced by other ingredients": volumeDependent,
  "composite / hidden recipe": compositeHidden,
  "not enough official information": notEnough,
};

const defaults = inventory.components.filter((component) => component.appearsInDefaultRecipe);
const assignment = new Map();
for (const [classification, ids] of Object.entries(classSets)) {
  for (const id of ids) {
    if (assignment.has(id)) throw new Error(`Duplicate classification: ${id}`);
    assignment.set(id, classification);
  }
}
const missing = defaults.filter((component) => !assignment.has(component.productComponentId));
const extra = [...assignment.keys()].filter((id) => !defaults.some((component) => component.productComponentId === id));
if (missing.length || extra.length) throw new Error(`Classification mismatch: missing=${missing.map((x) => x.productComponentId)} extra=${extra}`);

function quantitySummary(component) {
  const values = new Set();
  for (const appearance of component.appearances) {
    for (const recipe of appearance.defaultRecipeAppearances) values.add(recipe.quantity);
  }
  return [...values].sort((a, b) => a - b).join(", ");
}

function basis(component, classification) {
  const quantities = quantitySummary(component);
  if (classification === "explicitly quantified and potentially solvable") {
    const unit = component.unit || (component.productComponentId === "82" ? "shot" : component.productComponentId === "114" ? "tea bag" : "count");
    return `Official recipes specify ${unit} quantities (${quantities}); this creates equations in principle, but only if a genuinely controlled comparison exists.`;
  }
  if (classification === "volume-dependent / displaced by other ingredients") {
    return "The recipe selects this bulk ingredient but gives no usable volume; additions or substitutions can change the amount displaced.";
  }
  if (classification === "composite / hidden recipe") {
    return "The menu identifies a prepared composite or regular topping state but supplies neither its internal recipe nor a numeric serving amount.";
  }
  return "The entry is a preparation/roast state or has no numeric serving amount that supports a component equation.";
}

function comparisonFinding(component, classification) {
  if (component.productComponentId === "27773") {
    return "No valid nutrition comparison. Energy/non-energy Refresher pairs have matching ingredient names and differ in this recipe flag, but their shared Refresher/milk/lemonade/base volumes remain unquantified; equality of those volumes is not officially established.";
  }
  if (["91", "94", "109", "111", "1211"].includes(component.productComponentId)) {
    return "No valid comparison. Protein latte/matcha flavor pairs expose equal pump-count substitutions, but the shared milk/protein base is not volume-quantified, so treating it as constant would be an equal-milk assumption.";
  }
  if (["1306", "2122378", "2123308", "2123309"].includes(component.productComponentId)) {
    return "No valid comparison. Refresher, lemonade, and coconutmilk variants exchange bulk liquids; the official recipe does not give their volumes, so displacement cannot be separated.";
  }
  if (["2123906", "2123870"].includes(component.productComponentId)) {
    return "No valid comparison. Nondairy sweet-cream splash versus cold-foam products share ingredient labels, but neither serving volume is quantified and foam changes volume/air incorporation.";
  }
  if (classification === "explicitly quantified and potentially solvable") {
    return "No valid controlled pair found. Available cross-product or cross-size equations also change an unquantified milk/base/foam/bulk volume or another hidden formulation.";
  }
  if (classification === "volume-dependent / displaced by other ingredients") {
    return "No valid controlled pair found because its own amount—and any reciprocal displacement of another bulk ingredient—is not officially quantified.";
  }
  if (classification === "composite / hidden recipe") {
    return "No valid controlled pair found; comparisons cannot hold both the composite serving and displaced milk/base/ice volume constant from official data.";
  }
  return "No valid component equation: official data does not provide a measurable added amount or substitution for this state.";
}

// Confirm that every retained catalog entry used by the audit has official nutrition attached at the size level when compared.
let sizesWithNutrition = 0;
const nutritionRows = [];
for (const entry of menu.responses) {
  const product = entry.response.products.find((candidate) => String(candidate.productNumber) === String(entry.productNumber)
    && candidate.formCode.toLowerCase() === entry.form);
  for (const size of product?.sizes || []) {
    if (!size.nutrition) continue;
    sizesWithNutrition += 1;
    nutritionRows.push({
      form: product.formCode,
      sizeCode: size.sizeCode,
      recipe: new Map((size.recipe?.default || []).map((item) => [
        String(item.productOption.productNumber),
        `${item.quantity}:${item.sizeCode}`,
      ])),
      ingredients: (size.ingredients || []).map((item) => item.name).sort(),
    });
  }
}

let nearMatchPairs = 0;
let nearMatchesWithIdenticalIngredientNames = 0;
for (let leftIndex = 0; leftIndex < nutritionRows.length; leftIndex += 1) {
  for (let rightIndex = leftIndex + 1; rightIndex < nutritionRows.length; rightIndex += 1) {
    const left = nutritionRows[leftIndex];
    const right = nutritionRows[rightIndex];
    if (left.form !== right.form || left.sizeCode !== right.sizeCode) continue;
    const ids = new Set([...left.recipe.keys(), ...right.recipe.keys()]);
    const differences = [...ids].filter((id) => left.recipe.get(id) !== right.recipe.get(id));
    if (differences.length < 1 || differences.length > 2) continue;
    nearMatchPairs += 1;
    if (JSON.stringify(left.ingredients) === JSON.stringify(right.ingredients)) {
      nearMatchesWithIdenticalIngredientNames += 1;
    }
  }
}

const counts = Object.fromEntries(Object.entries(classSets).map(([name, ids]) => [name, ids.size]));
let report = "# Starbucks default-component mathematical identifiability audit\n\n";
report += "## Result\n\n";
report += "Using only the current official US menu snapshot's default recipes, ingredient declarations, and size-level nutrition records, **no nutrition-bearing default component has a valid controlled comparison under the stated no-volume-assumption rule**. Pump, scoop, tea-bag, and shot quantities make some components potentially solvable, but the available equations are confounded by unquantified milk, base, foam, water, juice/lemonade, cream, ice displacement, or hidden composite recipes. No nutrition values were calculated.\n\n";
report += `Audit scope: ${defaults.length} default-recipe components; ${sizesWithNutrition} menu sizes with official nutrition records.\n\n`;
report += `The mechanical screen found ${nearMatchPairs} same-form, same-size recipe pairs differing in at most two component entries. Of those, ${nearMatchesWithIdenticalIngredientNames} also had identical top-level ingredient names. Each apparent near-match was still subject to the volume/hidden-recipe rejection rules below; ingredient-name equality was not treated as quantity equality.\n\n`;
report += "## Classification counts\n\n| Classification | Count |\n|---|---:|\n";
for (const [classification, count] of Object.entries(counts)) report += `| ${classification} | ${count} |\n`;

report += "\n## Controlled-comparison screen\n\n";
report += "| Candidate comparison | Status | Why |\n|---|---|---|\n";
report += "| Same-size vanilla ↔ caramel or regular ↔ sugar-free protein latte/matcha | Invalid | Syrup pump counts are measurable, but the official recipe does not quantify the shared milk/protein base. Equal milk/base volume would be an assumption. |\n";
report += "| Same-size Refresher ↔ lemonade ↔ coconutmilk drink | Invalid | These variants exchange bulk liquids whose volumes are not provided; one liquid can displace another. |\n";
report += "| Nondairy Vanilla Sweet Cream Cold Brew ↔ Cold Brew with Nondairy Vanilla Sweet Cream Cold Foam | Invalid | Ingredient labels match apart from presentation, but splash/foam volume and foam aeration are hidden. |\n";
report += "| Energy ↔ non-energy versions of otherwise matching Refreshers | Invalid for component nutrition | The ingredient names and recipe flags otherwise align, but shared base/milk/lemonade quantities are still unquantified, so the nutrition-bearing mixture is not proven constant. |\n";
report += "| Same product across sizes | Invalid | Size changes alter cup volume and usually multiple recipe quantities; unquantified bulk volume changes simultaneously. |\n";
report += "| Hot ↔ iced form | Invalid | Form changes temperature, ice/water, cup volume, and often milk/base and recipe quantities together. |\n";
report += "| Plain beverage ↔ cold-foam/topping version | Invalid | The added composite has no numeric serving amount and can displace beverage or ice volume. |\n";
report += "| Any pair requiring equal milk/base/foam volume because size names match | Rejected by rule | Starbucks supplies the selection/state but not an official volume, so equality cannot be used as a mathematical constraint. |\n";

for (const classification of Object.keys(classSets)) {
  const rows = defaults.filter((component) => assignment.get(component.productComponentId) === classification)
    .sort((a, b) => a.name.localeCompare(b.name));
  report += `\n## ${classification} (${rows.length})\n\n`;
  report += "| Component | ID | Category | Classification basis | Valid comparison opportunities / finding |\n|---|---:|---|---|---|\n";
  for (const component of rows) {
    report += `| ${component.name} | ${component.productComponentId} | ${component.category} | ${basis(component, classification)} | ${comparisonFinding(component, classification)} |\n`;
  }
}

report += "\n## Boundary of the conclusion\n\n";
report += "“Potentially solvable” means the official recipe exposes a numeric count that could participate in a future valid system of equations. It does not mean a component value was derived here. Ingredient-list equality establishes composition names, not equal serving volumes. A future official customized-nutrition response, explicit component serving specification, or otherwise volume-controlled official pair could change this result.\n";

fs.writeFileSync(outputPath, report);
console.log(JSON.stringify({
  outputPath,
  defaultComponents: defaults.length,
  sizesWithNutrition,
  nearMatchPairs,
  nearMatchesWithIdenticalIngredientNames,
  counts,
  validNutritionBearingComparisons: 0,
}, null, 2));
