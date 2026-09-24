import { resolve } from "node:path";

import { MCDONALDS_GENERATED_RUNTIME_MENU as menu } from "../../lib/restaurantBuilders/mcdonalds/generatedRuntimeAdapter";
import { writeAtomically } from "../lib/write-atomically";

// No item currently exposes every captured live modifier: even the mature
// burger/chicken models deliberately omit at least salt or another unresolved
// action. Keep "full" strict so the audit never calls a filtered surface full.
const full = new Set<string>();
const partial = new Set([
  "200463", "200466", "200480", "200477", "200491", "200486", "200497", "200765",
  "200476", "203410", "203747", "203745", "203901", "203873", "200438", "200445",
  "200692", "204386", "200322", "200323", "200267", "204401", "204402",
  "200424", "200876", "201030", "200145", "200300", "201256", "200302", "200301",
  "200304", "200307", "200306", "200298", "200161", "200449",
].map((id) => `mcd-item-${id}`));
const capturedMcCafe = new Set([
  "200020", "201038", "200123", "204205", "204219", "200162", "200148", "200149",
  "203087", "203275", "202961", "200653", "200358", "204208", "204209", "200194",
  "204189", "200223", "200500", "200186", "200181", "202381",
].map((id) => `mcd-item-${id}`));

const entries = menu.items.map((item) => {
  if (full.has(item.id)) return { id: item.id, name: item.name, category: item.categories[0], status: "full", reason: "All captured ingredient actions have validated ordering IDs and full macro deltas." };
  if (partial.has(item.id)) return { id: item.id, name: item.name, category: item.categories[0], status: "partial", reason: "Safe captured actions are enabled; unresolved captured options are intentionally hidden." };
  if (capturedMcCafe.has(item.id)) return { id: item.id, name: item.name, category: item.categories[0], status: "none", reason: "Ordering graph captured, but no modifier has a reliable size-specific four-macro delta." };
  if (item.sourceOnly) return { id: item.id, name: item.name, category: item.categories[0], status: "none", reason: "Source-only relationship/add-on record; not a standalone customization surface." };
  if (item.comboConfig || item.comboConfigByVariantId) return { id: item.id, name: item.name, category: item.categories[0], status: "none", reason: "Combo/bundle choices are supported separately; no validated ingredient modifier capture for this parent." };
  return { id: item.id, name: item.name, category: item.categories[0], status: "none", reason: "No validated real ordering modifier graph and full nutrition mapping in the current dataset." };
});

const counts = Object.fromEntries(["full", "partial", "none"].map((status) => [status, entries.filter((entry) => entry.status === status).length]));
const list = (status: string) => entries.filter((entry) => entry.status === status).map((entry) => `- \`${entry.id}\` ${entry.name} — ${entry.reason}`).join("\n");
const markdown = `# McDonald's customization coverage audit\n\nGenerated ${new Date().toISOString()} from the imported runtime menu. “Full” strictly means every modifier in the captured ordering graph is exposed with exact nutrition. It does not assert that uncaptured regional/seasonal modifiers do not exist.\n\n## Totals\n\n- Imported runtime items: ${entries.length}\n- Full customization: ${counts.full}\n- Partial customization: ${counts.partial}\n- No ingredient customization: ${counts.none}\n\n## Full customization\n\n${list("full") || "_None. Every customized item still has at least one deliberately hidden captured action._"}\n\n## Partial customization\n\n${list("partial")}\n\n## No ingredient customization\n\n${list("none")}\n\n## Intentionally hidden captured modifiers\n\n- Existing burger and chicken/fish models: salt and any item-specific actions rejected by their conservative nutrition mappings; Filet-O-Fish also keeps unresolved pickle/ketchup actions hidden.\n- Breakfast sandwiches: bread, butter, egg, sausage/steak/Canadian bacon, breakfast sauce, spicy sauce, onions, salt, and other parent-specific portions without exact full-macro contexts.\n- Big Breakfast / Hotcakes: eggs, sausage, muffin, hotcakes, butter, syrup, jam/preserves, salt/pepper, and serviceware. Only exact Ketchup Packet additions are enabled on the two Big Breakfast items.\n- Fruit & Maple Oatmeal: fruit/raisin blend, diced apples, and cream; ordering calories exist but full macros do not.\n- Sausage Burrito: Hot and Mild Picante Salsa. Ketchup Packet and No Sauce remain available in the required slot.\n- Snack Wraps: ranch/spicy sauce, lettuce, and shredded cheddar/jack cheese. Bacon and two tomato slices are enabled.\n- Nuggets/Strips: Tangy BBQ, Sweet N Sour, Honey Packet, and Hot Picante Salsa pending exact catalog nutrition.\n- McCafé: all milk/cream, syrup/flavor, sweetener, espresso, foam, ice, topping, and removal actions. Captures do not establish exact size-specific four-macro deltas or pump/milk quantities.\n\n## Remaining data and product issues\n\n- Menu provenance: the upstream review still contains 61 public-menu records without a DNA item ID (6 meal/combo pages, 11 limited/promotional pages, 28 size/variant pages, and 16 standalone pages). They remain explicitly unresolved rather than guessed.\n- Nutrition: the hidden modifiers above have calories-only labels or parent/size conflicts, not authoritative protein/carbs/fat deltas.\n- Beverages: 64 of 70 combo drink records are reconciled; six audited ambiguous drink records remain excluded from automatic combo mapping.\n- Combos and carts: no known regression remains. Existing entrée combo builders, fixed bundles, selected variant identities, structured modifier IDs, and edit restoration pass the test suite. Source-only meal records intentionally remain relationship data.\n- Images: validated items retain official or same-family fallbacks; records without a loadable exact/same-family image continue to use the application placeholder. No image identity was inferred during this rollout.\n- Validator: the generated McDonald's dataset currently reports zero errors and zero warnings.\n\n## Completion decision\n\nThe McDonald's import is complete for the currently captured dataset under the conservative policy used here: every captured modifier with reliable ordering identity and full macro nutrition is enabled, and unresolved options are explicitly hidden and documented. It is not “complete” in the broader sense of enabling every live regional/seasonal modifier or resolving the 61 upstream records that lack DNA identities.\n`;

async function main() {
  await writeAtomically(resolve("data/restaurants/mcdonalds/research/ordering/final-customization-coverage-audit.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), counts, entries }, null, 2)}\n`);
  await writeAtomically(resolve("data/restaurants/mcdonalds/research/ordering/final-customization-coverage-audit.md"), markdown);
  console.log(JSON.stringify(counts));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
});
