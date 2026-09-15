#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const inventoryPath = path.join(root, "data/restaurants/starbucks/generated/component-inventory.json");
const reviewPath = path.join(root, "data/restaurants/starbucks/generated/default-component-review.md");
const outputPath = path.join(root, "data/restaurants/starbucks/generated/default-component-nutrition-checklist.md");

const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
const review = fs.readFileSync(reviewPath, "utf8");
const retainedClassifications = new Set(["nutrition-relevant", "needs reverse-engineering"]);
const knownUnitOverrides = new Map([["82", "shot"]]);
const retainedIds = new Set();
let currentClassification = null;

for (const line of review.split("\n")) {
  const heading = line.match(/^## (.+?) \(\d+\)$/);
  if (heading) {
    currentClassification = heading[1];
    continue;
  }
  if (!retainedClassifications.has(currentClassification) || !line.startsWith("| ")) continue;
  const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
  if (cells[0] === "Name" || cells[0] === "---") continue;
  retainedIds.add(cells[1]);
}

const components = inventory.components
  .filter((component) => component.appearsInDefaultRecipe && retainedIds.has(component.productComponentId))
  .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

if (components.length !== retainedIds.size) {
  throw new Error(`Review/inventory mismatch: review=${retainedIds.size}, inventory=${components.length}`);
}

const groups = new Map();
for (const component of components) {
  if (!groups.has(component.category)) groups.set(component.category, []);
  groups.get(component.category).push(component);
}

let report = "# Starbucks default-component nutrition checklist\n\n";
report += "Every current default-recipe component identified as nutrition-relevant or needing reverse-engineering. Preparation-only, zero-calorie/negligible, and non-nutrition components are excluded. No values were estimated or researched.\n\n";
report += `Total components needing a nutrition value: **${components.length}**\n\n`;

for (const [category, items] of groups) {
  report += `## ${category} (${items.length})\n\n`;
  report += "| Name | Component ID | Category | Unit | Current nutrition status |\n";
  report += "|---|---:|---|---|---|\n";
  for (const component of items) {
    const unit = component.unit ?? knownUnitOverrides.get(component.productComponentId) ?? "—";
    report += `| ${component.name} | ${component.productComponentId} | ${component.category} | ${unit} | missing |\n`;
  }
  report += "\n";
}

fs.writeFileSync(outputPath, report);
console.log(JSON.stringify({
  outputPath,
  totalComponents: components.length,
  countsByCategory: Object.fromEntries([...groups].map(([category, items]) => [category, items.length])),
}, null, 2));
