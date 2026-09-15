#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const inventoryPath = path.join(root, "data/restaurants/starbucks/generated/component-inventory.json");
const outputPath = path.join(root, "data/restaurants/starbucks/generated/default-component-review.md");
const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));

const classifications = {
  "nutrition-relevant": {
    "126": "Sweet drizzle is a direct recipe ingredient that can contribute macros.",
    "127": "Chocolate drizzle is a direct recipe ingredient that can contribute macros.",
    "2122222": "Espresso contributes a small but nonzero amount and varies by shot count.",
    "82": "Espresso shots contribute a small but nonzero amount and vary by count.",
    "2123273": "Espresso contributes a small but nonzero amount and varies by shot count.",
    "2123075": "Juice blend is a direct liquid ingredient with carbohydrate contribution.",
    "2122378": "Lemonade is a direct liquid ingredient with carbohydrate contribution.",
    "63": "Milk is a direct recipe ingredient with calories and macronutrients.",
    "1306": "Plant milk is a direct recipe ingredient with calories and macronutrients.",
    "2122556": "Plant milk is a direct recipe ingredient with calories and macronutrients.",
    "67": "Milk is a direct recipe ingredient with calories and macronutrients.",
    "2122694": "Sauce is a pumped recipe ingredient that can contribute substantial macros.",
    "650": "Sauce is a pumped recipe ingredient that can contribute substantial macros.",
    "2123373": "Sauce is a pumped recipe ingredient that can contribute substantial macros.",
    "101": "Sauce is a pumped recipe ingredient that can contribute substantial macros.",
    "112": "Sauce is a pumped recipe ingredient that can contribute substantial macros.",
    "94": "Liquid sweetener is a pumped ingredient with carbohydrate contribution.",
    "2123154": "Honey-based sweetener is a pumped ingredient with carbohydrate contribution.",
    "28582": "Syrup is a pumped sweetener that can contribute carbohydrates.",
    "2123422": "Syrup is a pumped sweetener that can contribute carbohydrates.",
    "91": "Syrup is a pumped sweetener that can contribute carbohydrates.",
    "93": "Syrup is a pumped sweetener that can contribute carbohydrates.",
    "96": "Syrup is a pumped sweetener that can contribute carbohydrates.",
    "27524": "Syrup is a pumped sweetener that can contribute carbohydrates.",
    "2121333": "Syrup is a pumped sweetener that can contribute carbohydrates.",
    "2123907": "Syrup is a pumped sweetener that can contribute carbohydrates.",
    "2122191": "Syrup is a pumped sweetener that can contribute carbohydrates.",
    "111": "Syrup is a pumped sweetener that can contribute carbohydrates.",
    "125": "Whipped cream is a direct topping with calories and macronutrients.",
  },
  "non-nutrition / preparation-only": {
    "27773": "Changes caffeine preparation rather than adding a macro-bearing ingredient.",
    "2123218": "Specifies espresso extraction style rather than an added ingredient.",
    "41": "Controls ice preparation and does not add a nutritive ingredient.",
    "73": "Controls milk foaming rather than identifying an additional ingredient.",
    "71": "Controls milk temperature rather than identifying an additional ingredient.",
    "1193": "Controls food warming only.",
    "1179": "Controls food warming only.",
  },
  "obvious zero-calorie / negligible": {
    "130": "Cinnamon dusting is ordinarily nutritionally negligible at recipe scale.",
    "114": "Brewed tea leaves primarily flavor water and contribute negligible macros.",
    "42": "Water contributes no calories or macronutrients.",
  },
  "needs reverse-engineering": {
    "2123308": "Proprietary Refresher base; its per-serving contribution is not in the inventory.",
    "2123309": "Proprietary Refresher base; its per-serving contribution is not in the inventory.",
    "184": "Proprietary concentrated coffee base with pump-based dosing.",
    "2123906": "Composite nondairy sweet-cream splash with unspecified serving amount.",
    "2121866": "Composite sweet-cream splash with unspecified serving amount.",
    "28234": "Composite flavored protein foam with no component nutrition in the inventory.",
    "2124008": "Composite flavored cold foam with no component nutrition in the inventory.",
    "2123643": "Composite flavored cold foam with no component nutrition in the inventory.",
    "2123814": "Composite flavored cold foam with no component nutrition in the inventory.",
    "37086": "Composite flavored cold foam with no component nutrition in the inventory.",
    "2123868": "Composite nondairy flavored foam with no component nutrition in the inventory.",
    "2123865": "Composite nondairy flavored foam with no component nutrition in the inventory.",
    "2123870": "Composite nondairy sweet-cream foam with no component nutrition in the inventory.",
    "40729": "Composite flavored cold foam with no component nutrition in the inventory.",
    "2123703": "Composite flavored cold foam with no component nutrition in the inventory.",
    "2123369": "Composite flavored cold foam with no component nutrition in the inventory.",
    "27516": "Composite flavored cold foam with no component nutrition in the inventory.",
    "2123557": "Composite flavored cold foam with no component nutrition in the inventory.",
    "34849": "Composite flavored cold foam with no component nutrition in the inventory.",
    "28493": "Composite flavored protein foam with no component nutrition in the inventory.",
    "2123166": "Composite sweet-cream foam with no component nutrition in the inventory.",
    "2122719": "Proprietary fruit inclusion; contribution per scoop is not in the inventory.",
    "46": "Proprietary blended inclusion; contribution per scoop is not in the inventory.",
    "40664": "Proprietary flavored pearls; contribution per scoop is not in the inventory.",
    "2121344": "Proprietary fruit inclusion; contribution per scoop is not in the inventory.",
    "2121850": "Proprietary fruit puree; contribution per scoop is not in the inventory.",
    "2123815": "Proprietary flavored powder; contribution per scoop is not in the inventory.",
    "47": "Proprietary matcha blend; contribution per scoop is not in the inventory.",
    "40666": "Proprietary flavored powder; contribution per scoop is not in the inventory.",
    "48": "Proprietary flavored powder; contribution per scoop is not in the inventory.",
    "1211": "Sugar-free labeling alone is insufficient to assume zero contribution.",
    "109": "Sugar-free labeling alone is insufficient to assume zero contribution.",
    "92": "Proprietary chai concentrate; contribution per pump is not in the inventory.",
    "2123051": "Proprietary composite topping; its serving contribution is not in the inventory.",
    "137": "Proprietary sweet topping; its serving contribution is not in the inventory.",
    "207": "Proprietary composite topping; its serving contribution is not in the inventory.",
    "2123909": "Proprietary composite topping; its serving contribution is not in the inventory.",
    "135": "Proprietary sweet topping; its serving contribution is not in the inventory.",
    "2123372": "Proprietary composite topping; its serving contribution is not in the inventory.",
    "191": "Packaged topping amount and formulation require verification.",
  },
};

const defaults = inventory.components.filter((component) => component.appearsInDefaultRecipe);
const assignments = new Map();
for (const [classification, entries] of Object.entries(classifications)) {
  for (const [id, reason] of Object.entries(entries)) {
    if (assignments.has(id)) throw new Error(`Duplicate classification for component ${id}`);
    assignments.set(id, { classification, reason });
  }
}

const defaultIds = new Set(defaults.map((component) => component.productComponentId));
const missing = defaults.filter((component) => !assignments.has(component.productComponentId));
const extra = [...assignments.keys()].filter((id) => !defaultIds.has(id));
if (missing.length || extra.length) {
  throw new Error(`Classification mismatch; missing=${missing.map((item) => item.productComponentId)} extra=${extra}`);
}

const order = [
  "nutrition-relevant",
  "non-nutrition / preparation-only",
  "obvious zero-calorie / negligible",
  "needs reverse-engineering",
];

let report = "# Starbucks default-recipe component review\n\n";
report += "Scope: components marked `appearsInDefaultRecipe: true` in the current generated Starbucks component inventory. Classifications are review triage only; no nutrition values were estimated, and no old research outputs were used.\n\n";
report += `Total reviewed: **${defaults.length}**\n\n`;

for (const classification of order) {
  const rows = defaults
    .filter((component) => assignments.get(component.productComponentId).classification === classification)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((component) => {
      const reason = assignments.get(component.productComponentId).reason;
      return `| ${component.name} | ${component.productComponentId} | ${component.category} | ${classification} | ${reason} |`;
    });
  report += `## ${classification} (${rows.length})\n\n`;
  report += "| Name | Component ID | Category | Classification | Reason |\n";
  report += "|---|---:|---|---|---|\n";
  report += `${rows.join("\n")}\n\n`;
}

fs.writeFileSync(outputPath, report);
console.log(JSON.stringify({
  outputPath,
  total: defaults.length,
  counts: Object.fromEntries(order.map((classification) => [
    classification,
    [...assignments.values()].filter((assignment) => assignment.classification === classification).length,
  ])),
}, null, 2));
