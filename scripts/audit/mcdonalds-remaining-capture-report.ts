import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { writeAtomically } from "../lib/write-atomically";

const breakfast = ["big-breakfast", "big-breakfast-with-hotcakes", "hotcakes", "hotcakes-and-sausage", "fruit-maple-oatmeal", "sausage-burrito"];
const mcCafe = ["premium-roast-coffee", "premium-roast-decaf-coffee", "iced-coffee", "iced-caramel-coffee", "iced-vanilla-coffee", "hot-chocolate", "mocha-frappe", "caramel-frappe", "caramel-macchiato", "iced-caramel-macchiato", "mocha-latte", "iced-mocha-latte", "latte", "caramel-latte", "vanilla-latte", "iced-latte", "iced-caramel-latte", "iced-vanilla-latte", "cappuccino", "vanilla-cappuccino", "caramel-cappuccino", "americano"];
const rawDirectory = resolve("data/restaurants/mcdonalds/research/ordering/raw");

type Raw = { data: { itemPage: { itemHeader: Record<string, unknown>; itemType: string; optionLists: Array<Record<string, unknown> & { options: Array<Record<string, unknown>> }> } } };

async function load(slug: string) {
  const body = JSON.parse(await readFile(resolve(rawDirectory, `${slug}-item-page.json`), "utf8")) as Raw;
  const page = body.data.itemPage;
  return {
    slug,
    item: page.itemHeader,
    itemType: page.itemType,
    groups: page.optionLists.filter((group) => !String(group.type).startsWith("recommended") && !String(group.id).startsWith("recommended_")).map((group) => ({
      type: group.type,
      id: group.id,
      name: group.name,
      minNumOptions: group.minNumOptions,
      maxNumOptions: group.maxNumOptions,
      minAggregateOptionsQuantity: group.minAggregateOptionsQuantity,
      maxAggregateOptionsQuantity: group.maxAggregateOptionsQuantity,
      minOptionChoiceQuantity: group.minOptionChoiceQuantity,
      maxOptionChoiceQuantity: group.maxOptionChoiceQuantity,
      isOptional: group.isOptional,
      options: group.options.map((option) => ({ id: option.id, name: option.name, defaultQuantity: option.defaultQuantity, minOptionChoiceQuantity: option.minOptionChoiceQuantity, maxOptionChoiceQuantity: option.maxOptionChoiceQuantity, caloricInfoDisplayString: option.caloricInfoDisplayString })),
    })),
  };
}

async function main() {
  const composedBreakfast = await Promise.all(breakfast.map(load));
  const coffeeDrinks = await Promise.all(mcCafe.map(load));
  const payload = { capturedAt: new Date().toISOString(), storeId: "662393", menuId: "18196178", composedBreakfast, mcCafe: coffeeDrinks };
  await writeAtomically(resolve("data/restaurants/mcdonalds/research/ordering/remaining-customization-capture.json"), `${JSON.stringify(payload, null, 2)}\n`);
  const render = (entry: Awaited<ReturnType<typeof load>>) => {
    const item = entry.item as { id: string; name: string; menuId: string; caloricInfoDisplayString?: string };
    return `### ${item.name}\n\n- Ordering item \`${item.id}\`; menu \`${item.menuId}\`; ${item.caloricInfoDisplayString ?? "no calorie label"}.\n${entry.groups.map((group) => `- Group \`${group.id}\` **${group.name}**: min/max ${group.minNumOptions}/${group.maxNumOptions}, aggregate ${group.minAggregateOptionsQuantity ?? "null"}/${group.maxAggregateOptionsQuantity ?? "null"}, optional ${group.isOptional}.\n${group.options.map((option) => `  - \`${option.id}\` ${option.name} (${option.caloricInfoDisplayString || "no calorie label"}; default ${option.defaultQuantity}; option min/max ${option.minOptionChoiceQuantity ?? "null"}/${option.maxOptionChoiceQuantity ?? "null"})`).join("\n")}`).join("\n")}`;
  };
  const markdown = `# Remaining McDonald's customization capture\n\nCaptured from store \`662393\`, Breakfast Menu \`18196178\`. Raw item-page payloads are in [raw/](raw/). Ordering calorie labels are evidence only and are not treated as full nutrition mappings. Recommended cross-sell groups are excluded below.\n\n## Composed breakfast\n\n${composedBreakfast.map(render).join("\n\n")}\n\n## McCafé\n\n${coffeeDrinks.map(render).join("\n\n")}\n\n## Safe implementation decision\n\n- Big Breakfast and Big Breakfast with Hotcakes: Ketchup Packet only, using catalog item \`200268\`.\n- Sausage Burrito: required Sauce slot with Ketchup Packet and No Sauce only. Picante salsas remain hidden.\n- Hotcakes, Hotcakes & Sausage, and Fruit & Maple Oatmeal: no modifier has an exact full-macro context, so captured food modifiers remain hidden.\n- McCafé: sizes remain the existing official nutrition variants. All captured ingredient modifiers remain hidden because the response does not establish size-specific full macros or pump/milk quantities; serviceware is not a nutrition customization.\n`;
  await writeAtomically(resolve("data/restaurants/mcdonalds/research/ordering/remaining-customization-capture.md"), markdown);
  console.log(JSON.stringify({ breakfast: composedBreakfast.length, mcCafe: coffeeDrinks.length }));
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
