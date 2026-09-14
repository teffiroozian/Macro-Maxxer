#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const sourcePath = path.join(root, "data/restaurants/starbucks/raw/menu.json");
const outputPath = path.join(root, "data/restaurants/starbucks/generated/component-inventory.json");
const reportPath = path.join(root, "data/restaurants/starbucks/generated/component-inventory-report.md");

const catalog = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

const categoryByPath = new Map([
  ["Add-ins > Creamer", "creamer"],
  ["Add-ins > Flavored Pearls", "inclusion"],
  ["Add-ins > Fruit Add-Ins", "inclusion"],
  ["Add-ins > Ice", "ice"],
  ["Add-ins > Line the Cup", "drizzle"],
  ["Add-ins > Room", "preparation"],
  ["Add-ins > Water", "water"],
  ["Blended Options > Blended Add-Ins", "inclusion"],
  ["Blended Options > Blended Prep", "preparation"],
  ["Blended Options > Frappuccino Roast", "coffee base"],
  ["Butter & Spreads", "spread"],
  ["Caffeine Options > Caffeine Options", "caffeine option"],
  ["Cold Foams > Cold Foam", "foam"],
  ["Cold Foams > Nondairy Cold Foam", "foam"],
  ["Cold Foams > Protein Cold Foam (15g)*", "foam"],
  ["Condiments", "condiment"],
  ["Cup Options > Cup Sizes", "cup option"],
  ["Cup Options > Other", "cup option"],
  ["Espresso & Shot Options > Affogato-Style Shots", "espresso"],
  ["Espresso & Shot Options > Espresso Roast Options", "espresso"],
  ["Espresso & Shot Options > Espresso Shots", "espresso"],
  ["Espresso & Shot Options > Ristretto or Long Shot", "espresso preparation"],
  ["Espresso & Shot Options > Shot Prep", "espresso preparation"],
  ["Extra Starbucks Refreshers Bases", "base"],
  ["Flavors > Powders", "powder"],
  ["Flavors > Sauces", "sauce"],
  ["Flavors > Syrups", "syrup"],
  ["Grind Options", "grind option"],
  ["Juice Options", "juice"],
  ["Lemonade", "lemonade"],
  ["Milk > Milk Foam", "milk preparation"],
  ["Milk > Milk Options", "milk"],
  ["Milk > Milk Temperature", "milk preparation"],
  ["Milk > Milk on Top", "milk"],
  ["Oatmeal Toppings", "topping"],
  ["Preparation > Milk Instead of Water", "preparation"],
  ["Preparation Method", "preparation"],
  ["Sandwich Options > Cheeses", "cheese"],
  ["Sandwich Options > Eggs", "egg"],
  ["Sandwich Options > Meats", "meat"],
  ["Starbucks Refreshers Bases", "base"],
  ["Sweeteners > Liquid Sweeteners", "sweetener"],
  ["Sweeteners > Sweetener Packets", "sweetener"],
  ["Tea > Chai Teas", "tea base"],
  ["Tea > Extras", "tea addition"],
  ["Tea > Iced Tea", "tea"],
  ["Tea > Looseleaf Tea", "tea"],
  ["Tea > Tea Powders", "powder"],
  ["Toppings > Drizzle", "drizzle"],
  ["Toppings > Powders", "powder"],
  ["Toppings > Topping Options", "topping"],
  ["Toppings > Whipped Cream", "topping"],
  ["Warming", "preparation"],
]);

const normalizeUnit = (unit) => {
  if (unit == null) return null;
  return unit.replace(/\(s\)$/, "");
};

const components = new Map();

function getComponent(productNumber) {
  const id = String(productNumber);
  if (!components.has(id)) {
    components.set(id, {
      name: null,
      productComponentId: id,
      category: null,
      sourceOptionPath: null,
      appearsInDefaultRecipe: false,
      appearsAsCustomizationOption: false,
      customizationOnly: false,
      unit: null,
      appearances: new Map(),
    });
  }
  return components.get(id);
}

function getAppearance(component, product) {
  const key = `${product.productNumber}/${product.formCode}`;
  if (!component.appearances.has(key)) {
    component.appearances.set(key, {
      productNumber: String(product.productNumber),
      productName: product.name,
      productType: product.productType,
      form: product.formCode,
      defaultRecipeAppearances: [],
      customization: null,
    });
  }
  return component.appearances.get(key);
}

function walkOptions(groups, product, parentPath = []) {
  for (const group of groups || []) {
    const optionPath = [...parentPath, group.name];
    const optionPathText = optionPath.join(" > ");
    for (const option of group.products || []) {
      const component = getComponent(option.productNumber);
      const category = categoryByPath.get(optionPathText);
      if (!category) throw new Error(`Unclassified Starbucks option path: ${optionPathText}`);
      if (component.category && component.category !== category) {
        throw new Error(`Conflicting categories for component ${component.productComponentId}`);
      }
      if (component.sourceOptionPath && component.sourceOptionPath !== optionPathText) {
        throw new Error(`Conflicting option paths for component ${component.productComponentId}`);
      }
      component.name = option.form.name;
      component.category = category;
      component.sourceOptionPath = optionPathText;
      component.unit = normalizeUnit(group.attributes?.unitOfMeasure ?? null);
      component.appearsAsCustomizationOption = true;

      const appearance = getAppearance(component, product);
      appearance.customization = {
        availableForProductSizes: (product.sizes || []).map((size) => ({
          sizeCode: size.sizeCode,
          name: size.name,
          sku: String(size.sku),
        })),
        componentForm: option.form.formCode,
        availability: option.form.availability,
        optionValues: (option.form.sizes || []).map((size) => ({
          sizeCode: size.sizeCode,
          name: size.name,
          sku: String(size.sku),
        })),
      };
    }
    walkOptions(group.children, product, optionPath);
  }
}

for (const entry of catalog.responses) {
  const product = entry.response.products.find(
    (candidate) => String(candidate.productNumber) === String(entry.productNumber)
      && candidate.formCode.toLowerCase() === entry.form,
  );
  if (!product) throw new Error(`Missing product ${entry.productNumber}/${entry.form}`);

  walkOptions(product.productOptions, product);
  for (const size of product.sizes || []) {
    for (const recipeItem of size.recipe?.default || []) {
      const component = getComponent(recipeItem.productOption.productNumber);
      component.appearsInDefaultRecipe = true;
      const appearance = getAppearance(component, product);
      appearance.defaultRecipeAppearances.push({
        productSizeCode: size.sizeCode,
        productSizeName: size.name,
        productSku: String(size.sku),
        quantity: recipeItem.quantity,
        selectedOptionSizeCode: recipeItem.sizeCode,
        recipeName: recipeItem.skuName,
      });
    }
  }
}

for (const component of components.values()) {
  if (!component.name || !component.category) {
    throw new Error(`Component ${component.productComponentId} lacks customization metadata`);
  }
  component.customizationOnly = !component.appearsInDefaultRecipe;
}

const inventory = [...components.values()]
  .sort((a, b) => a.name.localeCompare(b.name) || a.productComponentId.localeCompare(b.productComponentId))
  .map((component) => ({
    ...component,
    appearances: [...component.appearances.values()]
      .sort((a, b) => a.productName.localeCompare(b.productName) || a.form.localeCompare(b.form)),
  }));

const countsByCategory = Object.fromEntries(
  [...inventory.reduce((counts, component) => {
    counts.set(component.category, (counts.get(component.category) || 0) + 1);
    return counts;
  }, new Map())].sort(([a], [b]) => a.localeCompare(b)),
);

const result = {
  schemaVersion: 1,
  source: {
    file: "data/restaurants/starbucks/raw/menu.json",
    region: catalog.region,
    sourceUpdatedAt: catalog.updatedAt,
    sourceLastRun: catalog.lastRun,
    sourceSha256: catalog.menuSha256,
    productFormResponses: catalog.responses.length,
  },
  methodology: {
    scope: "Union of component products in size-level default recipes and product-level customization trees.",
    identity: "Deduplicated by Starbucks component productNumber; names and category paths were checked for aliases and conflicts.",
    exclusions: "Nutrition, regional PDFs, prior research outputs, and prior generated restaurant data were not used.",
    customizationSizeMeaning: "availableForProductSizes are parent menu-item sizes; optionValues are the component's selectable values.",
  },
  totalDistinctComponents: inventory.length,
  countsByCategory,
  components: inventory,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);

const categoryRows = Object.entries(countsByCategory).map(([category, count]) => `| ${category} | ${count} |`).join("\n");
const defaultCount = inventory.filter((component) => component.appearsInDefaultRecipe).length;
const customizationOnlyCount = inventory.filter((component) => component.customizationOnly).length;
const report = `# Starbucks component inventory\n\n` +
  `Extracted from the current raw US menu snapshot only. No nutrition data, regional PDFs, old research outputs, or prior generated restaurant data were used. Components are deduplicated by Starbucks component product ID after checking names and option paths for aliases.\n\n` +
  `- Total distinct components: **${inventory.length}**\n` +
  `- Appearing in at least one default recipe: **${defaultCount}**\n` +
  `- Customization-only: **${customizationOnlyCount}**\n\n` +
  `## Counts by category\n\n| Category | Count |\n|---|---:|\n${categoryRows}\n`;
fs.writeFileSync(reportPath, report);

console.log(JSON.stringify({ outputPath, reportPath, totalDistinctComponents: inventory.length, defaultCount, customizationOnlyCount, countsByCategory }, null, 2));
