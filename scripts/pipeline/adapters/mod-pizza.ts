// MOD Pizza adapter (draft/staging only).
//
// Sources, per docs/research/mod-pizza/discovery-report.md:
//   A. ordering-page embedded JSON  → catalog, sizes, selection rules, calories
//   B. official nutrition HTML      → reference calories per component
// Neither publishes protein, carbs or fat. Those stay empty.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import type { ServingType } from "../../../types/menu";
import { normalizeName } from "../../lib/normalize-name";
import type {
  AdapterIngredient,
  AdapterItem,
  AdapterOutput,
  DataIssue,
  ItemVariant,
  MenuModel,
  NutritionInput,
  PortionOption,
  ReferenceNutritionRow,
  RestaurantAdapter,
  SelectionGroup,
  SelectionOption,
  SourceDescriptor,
} from "../contracts";

// ── Raw source shapes (only the fields this adapter reads) ───────────────

export type ModOption = {
  id: string;
  global_option_id?: string | null;
  name: string;
  calories: number | null;
  is_default: boolean;
  is_available: boolean;
  option_groups?: ModOptionGroup[];
};

export type ModOptionGroup = {
  id: string;
  global_id?: string | null;
  description: string;
  min_selections: number | null;
  max_selections: number | null;
  is_adv_nested_modifier?: boolean;
  requires_user_selection?: boolean;
  is_hidden?: boolean;
  options: ModOption[];
};

export type ModProduct = {
  id: string;
  global_id?: string | null;
  name: string;
  description?: string | null;
  calories: number | null;
  is_disabled: boolean;
  option_groups?: ModOptionGroup[];
};

export type ModCategory = {
  id: string;
  name: string;
  is_hidden?: boolean;
  products: ModProduct[];
};

export type ModStoreMenu = {
  storeId: string;
  url: string;
  retrievedAt: string;
  sha256?: string;
  categories: ModCategory[];
};

export type ModNutritionRow = {
  category: string;
  name: string;
  caloriesText: string;
};

export type ModPizzaRaw = {
  stores: ModStoreMenu[];
  nutrition: {
    url: string;
    retrievedAt: string;
    sourceUpdatedAt?: string;
    sha256?: string;
    rows: ModNutritionRow[];
  };
};

// ── Restaurant knowledge ─────────────────────────────────────────────────

const NUTRITION_SOURCE_ID = "mod:nutrition-html";
const storeSourceId = (storeId: string) => `mod:ordering:${storeId}`;

const CATEGORY_PROFILE: Record<string, { category: string; servingType: ServingType; model: MenuModel }> = {
  pizza: { category: "Pizza", servingType: "entree", model: "build-your-own" },
  salads: { category: "Salads", servingType: "entree", model: "build-your-own" },
  sides: { category: "Sides", servingType: "side", model: "standard" },
  desserts: { category: "Desserts", servingType: "dessert", model: "standard" },
  "kids meal": { category: "Kids", servingType: "kids", model: "standard" },
  beverages: { category: "Drinks", servingType: "drink", model: "standard" },
  extras: { category: "Extras", servingType: "addon", model: "standard" },
};

// The product and size whose default portion calories stand for an
// ingredient when it is compared with the national nutrition table.
const REFERENCE_BUILDER = "the mod";
const REFERENCE_VARIANT_PREFIX = "regular 11";

// Groups that list an item's included ingredients without naming their kind.
const INCLUDED_INGREDIENTS_GROUP = "tap to remove or modify your ingredient";
const UNCATEGORIZED_INGREDIENTS = "Included Ingredients";

// National nutrition heading → ordering groups a row may be name-matched in.
const REFERENCE_CATEGORY_MAP: Record<string, string[]> = {
  Sauce: ["Sauces", "Finishing Sauces"],
  Cheese: ["Cheeses"],
  Meat: ["Meats"],
  "Veggies & Good Stuff": ["Veggies, Herbs & Good Stuff", "Seasoning, Herbs & Extras", "Greens"],
  "Salad Dressing": ["Dressings (On the side)"],
  Desserts: ["Desserts"],
  "More Stuff": ["Sides"],
};

// Ordering size label (normalized prefix) → national "Crust" row name.
const CRUST_CROSSWALK: Array<[string, string]> = [
  ["small 6", "small (thin 6-inch)"],
  ["regular 11", "regular (thin 11-inch)"],
  ["extra thick crust", "thick crust (11-inch)"],
  ["cauliflower crust", "cauliflower crust"],
  ["gluten friendly", "gluten-friendly*"],
];

// discovery-report.md ties the national Buffalo row to the base pizza sauce.
const INGREDIENT_CROSSWALK: Array<[category: string, name: string, referenceCategory: string, referenceName: string]> = [
  ["Sauces", "Frank's RedHot Buffalo Sauce", "Sauce", "Frank's Redhot Buffalo Sauce"],
];

const KNOWN_ISSUES: DataIssue[] = [
  {
    severity: "blocker",
    code: "macros_unpublished",
    message:
      "No inspected official MOD Pizza source publishes protein, carbohydrates or fat. Only calories are imported; the other core macros are left empty and MOD Pizza cannot be published until an official macro specification is obtained.",
    sourceIds: [NUTRITION_SOURCE_ID],
  },
  {
    severity: "warning",
    code: "topping_calories_not_additive_verified",
    message:
      "The ordering site states topping calories apply to a one-topping pizza and may be lower on multi-topping pizzas. Summed builder totals are unverified.",
  },
  {
    severity: "warning",
    code: "salad_size_labels_unreconciled",
    message:
      "The national menu labels salad sizes MINI / MOD / MEGA while ordering uses Small / Regular / Large. National salad and signature-pizza calorie totals name no size, so they are not linked to any variant.",
    sourceIds: [NUTRITION_SOURCE_ID],
  },
  {
    severity: "warning",
    code: "recipe_conflict",
    message: "Italian Chop: the national menu description omits chickpeas; the Hamburg ordering description includes them.",
  },
  {
    severity: "warning",
    code: "store_coverage_partial",
    message: "Catalog comes from two sampled stores (4080, 4168). It is not a national census; catering was not inspected.",
  },
  {
    severity: "info",
    code: "allergen_declarations_not_imported",
    message: "Component ingredient and allergen declarations (modpizza.com/allergen) are not imported in this version.",
  },
];

// ── Translation ──────────────────────────────────────────────────────────

const slug = (value: string) => normalizeName(value).replace(/ /g, "-");
const cleanLabel = (value: string) => value.replace(/\s+/g, " ").trim();
const itemId = (category: string, name: string) => `mod:item:${slug(category)}:${slug(name)}`;
const ingredientId = (category: string, name: string) => `mod:ingredient:${slug(category)}:${slug(name)}`;
const referenceId = (category: string, name: string) => `mod:reference:${slug(category)}:${slug(name)}`;

function caloriesInput(calories: number | null, sourceId: string, recordId: string, description: string): NutritionInput {
  // null means the source shows no value. It is not zero.
  if (calories === null) return [];
  return [
    {
      source: { sourceId, recordId },
      values: { calories },
      basis: { kind: "selected_portion", description },
    },
  ];
}

// A portion group is the amount/placement choice nested under one ingredient
// (Light / Regular / Extra, On Top / Side Cup). Most carry the advanced-nested
// flag; a few are only recognizable as a pre-selected single choice of leaves.
function isPortionGroup(group: ModOptionGroup): boolean {
  if (group.max_selections !== 1) return false;
  if (group.is_adv_nested_modifier === true) return true;
  return (
    group.min_selections === 1 &&
    group.requires_user_selection === false &&
    group.options.filter((option) => option.is_default).length === 1 &&
    group.options.every((option) => (option.option_groups ?? []).length === 0)
  );
}

type TranslationContext = {
  sourceId: string;
  model: MenuModel;
  // normalized ingredient name → categories it appears under in named groups
  categoriesByIngredientName: Map<string, Set<string>>;
  ingredients: Map<string, AdapterIngredient>;
  isReferenceBranch: boolean;
};

function collectNamedIngredientCategories(groups: readonly ModOptionGroup[], into: Map<string, Set<string>>): void {
  for (const group of groups) {
    const label = cleanLabel(group.description);
    for (const option of group.options) {
      const nested = option.option_groups ?? [];
      collectNamedIngredientCategories(nested.filter((entry) => !isPortionGroup(entry)), into);
      if (isPortionGroup(group) || normalizeName(label) === INCLUDED_INGREDIENTS_GROUP) continue;
      const key = normalizeName(option.name);
      into.set(key, (into.get(key) ?? new Set()).add(label));
    }
  }
}

function translateGroups(
  groups: readonly ModOptionGroup[],
  ownerId: string,
  path: string[],
  context: TranslationContext,
): SelectionGroup<NutritionInput>[] {
  const result: SelectionGroup<NutritionInput>[] = [];
  const usedIds = new Set<string>();

  for (const group of groups) {
    if (group.is_hidden) continue;
    const label = cleanLabel(group.description);
    const isPreparation = /cooking instructions/i.test(label);
    const options: SelectionOption<NutritionInput>[] = [];
    const hoisted: SelectionGroup<NutritionInput>[] = [];
    const groupPath = [...path, label];

    for (const option of group.options) {
      const nested = option.option_groups ?? [];
      const portionGroup = nested.find(isPortionGroup);
      const containerGroups = nested.filter((entry) => !isPortionGroup(entry));
      const optionLabel = cleanLabel(option.name);

      // An option that only opens further groups ("Add More") is a container:
      // its groups belong to the same owner.
      if (containerGroups.length > 0) {
        hoisted.push(...translateGroups(containerGroups, ownerId, [...groupPath, optionLabel], context));
        if (!portionGroup && option.calories === null) continue;
      }

      const optionId = `${ownerId}:${slug(label)}:${slug(optionLabel)}`;
      const isExclusive = /^no\s/i.test(optionLabel);
      const portions = portionGroup?.options.map(
        (portion): PortionOption<NutritionInput> => ({
          id: `${optionId}:${slug(portion.name)}`,
          label: cleanLabel(portion.name),
          isDefault: portion.is_default,
          nutrition: caloriesInput(portion.calories, context.sourceId, portion.id, `${optionLabel}, ${cleanLabel(portion.name)}`),
          source: { sourceId: context.sourceId, recordId: portion.id },
        }),
      );

      let linkedIngredientId: string | undefined;
      if (context.model === "build-your-own" && !isPreparation && !isExclusive) {
        let category = label;
        if (normalizeName(label) === INCLUDED_INGREDIENTS_GROUP) {
          const known = context.categoriesByIngredientName.get(normalizeName(optionLabel));
          category = known?.size === 1 ? [...known][0] : UNCATEGORIZED_INGREDIENTS;
        }
        linkedIngredientId = ingredientId(category, optionLabel);
        const ingredient: AdapterIngredient = context.ingredients.get(linkedIngredientId) ?? {
          id: linkedIngredientId,
          name: optionLabel,
          sourceCategory: category,
          nutrition: [],
          sources: [],
        };
        context.ingredients.set(linkedIngredientId, ingredient);
        const ref = { sourceId: context.sourceId };
        if (!ingredient.sources.some((entry) => entry.sourceId === ref.sourceId)) ingredient.sources.push(ref);
        if (context.isReferenceBranch && ingredient.nutrition.every((entry) => entry.source.sourceId !== context.sourceId)) {
          const reference = portions?.find((portion) => portion.isDefault);
          const calories = reference ? reference.nutrition[0]?.values.calories : (option.calories ?? undefined);
          if (calories !== undefined) {
            ingredient.nutrition.push({
              source: { sourceId: context.sourceId, recordId: option.id, path: groupPath },
              values: { calories },
              basis: {
                kind: "selected_portion",
                description: `The MOD, regular 11-inch crust, ${reference?.label ?? "standard"} amount`,
              },
            });
          }
        }
      }

      options.push({
        id: optionId,
        label: optionLabel,
        ingredientId: linkedIngredientId,
        isDefault: option.is_default,
        isAvailable: option.is_available,
        ...(isExclusive ? { isExclusive: true } : {}),
        nutrition: portions ? [] : caloriesInput(option.calories, context.sourceId, option.id, optionLabel),
        ...(portions ? { portionPolicy: "alternative" as const, portions } : {}),
        source: { sourceId: context.sourceId, recordId: option.id, path: groupPath },
      });
    }

    if (options.length > 0) {
      let id = `${ownerId}:${slug(label)}`;
      for (let suffix = 2; usedIds.has(id); suffix += 1) id = `${ownerId}:${slug(label)}-${suffix}`;
      usedIds.add(id);
      result.push({
        id,
        label,
        role: isPreparation
          ? "preparation"
          : context.model === "build-your-own"
            ? "ingredient_group"
            : (group.min_selections ?? 0) > 0
              ? "required_choice"
              : "modification",
        minSelections: group.min_selections,
        maxSelections: group.max_selections,
        options,
        source: { sourceId: context.sourceId, recordId: group.id, path },
      });
    }
    for (const nestedGroup of hoisted) {
      const baseId = nestedGroup.id;
      for (let suffix = 2; usedIds.has(nestedGroup.id); suffix += 1) nestedGroup.id = `${baseId}-${suffix}`;
      usedIds.add(nestedGroup.id);
      result.push(nestedGroup);
    }
  }
  return result;
}

// A product's first group is a size/variant axis when it is a required single
// choice whose options each open their own groups.
function variantAxis(product: ModProduct): ModOptionGroup | undefined {
  const first = product.option_groups?.[0];
  if (!first || first.min_selections !== 1 || first.max_selections !== 1) return undefined;
  return first.options.every((option) => (option.option_groups ?? []).some((group) => !isPortionGroup(group)))
    ? first
    : undefined;
}

function parseCalories(text: string): number[] {
  return text
    .split("/")
    .map((part) => part.trim())
    .filter((part) => /^\d+(\.\d+)?$/.test(part))
    .map(Number);
}

function translateReferenceRows(raw: ModPizzaRaw["nutrition"]): ReferenceNutritionRow[] {
  const rows: ReferenceNutritionRow[] = [];
  for (const row of raw.rows) {
    const calories = parseCalories(row.caloriesText);
    const isBeverage = normalizeName(row.category) === "beverage";
    const name = cleanLabel(row.name.replace(/\(16 fl oz \/ 24 fl oz\)/i, ""));
    // Fountain drinks publish a 16 fl oz and a 24 fl oz value on one row.
    const sizes = isBeverage && calories.length === 2 ? [16, 24] : [undefined];
    if (calories.length !== sizes.length) continue;
    sizes.forEach((size, index) => {
      const sizedName = size ? `${name} (${size} fl oz)` : name;
      rows.push({
        id: referenceId(row.category, sizedName),
        name: sizedName,
        category: row.category,
        observation: {
          source: { sourceId: NUTRITION_SOURCE_ID, recordId: row.name },
          values: { calories: calories[index] },
          basis: size
            ? { kind: "whole_item", unit: "fl oz", amount: size }
            : { kind: "per_serving_unit", description: `Published under "${row.category}"` },
        },
      });
    });
  }
  return rows;
}

export function translateModPizza(raw: ModPizzaRaw): AdapterOutput {
  const sources: SourceDescriptor[] = [
    ...raw.stores.map(
      (store): SourceDescriptor => ({
        id: storeSourceId(store.storeId),
        kind: "ordering_structured_data",
        authority: "ordering_system",
        url: store.url,
        retrievedAt: store.retrievedAt,
        scope: `Store ${store.storeId}`,
        sha256: store.sha256,
        notes: "Embedded __NEXT_DATA__ menu query. Calories only.",
      }),
    ),
    {
      id: NUTRITION_SOURCE_ID,
      kind: "official_html",
      authority: "official",
      url: raw.nutrition.url,
      retrievedAt: raw.nutrition.retrievedAt,
      sourceUpdatedAt: raw.nutrition.sourceUpdatedAt,
      sha256: raw.nutrition.sha256,
      notes: "Calories and allergen flags only; no protein, carbohydrate or fat columns.",
    },
  ];

  const items: AdapterItem[] = [];
  const ingredients = new Map<string, AdapterIngredient>();
  const nutritionCrosswalk: Record<string, string> = {};
  const knownIssues = [...KNOWN_ISSUES];
  const unprofiledCategories = new Set<string>();

  for (const store of raw.stores) {
    const sourceId = storeSourceId(store.storeId);
    const categoriesByIngredientName = new Map<string, Set<string>>();
    for (const category of store.categories) {
      for (const product of category.products) {
        collectNamedIngredientCategories(product.option_groups ?? [], categoriesByIngredientName);
      }
    }

    for (const category of store.categories) {
      if (category.is_hidden) continue;
      const profile = CATEGORY_PROFILE[normalizeName(category.name)];
      if (!profile) unprofiledCategories.add(cleanLabel(category.name));
      const model = profile?.model ?? "standard";

      for (const product of category.products) {
        const name = cleanLabel(product.name);
        const id = itemId(category.name, name);
        const axis = variantAxis(product);
        const isReferenceBuilder = normalizeName(name) === REFERENCE_BUILDER;
        const contextFor = (isReferenceBranch: boolean): TranslationContext => ({
          sourceId,
          model,
          categoriesByIngredientName,
          ingredients,
          isReferenceBranch,
        });

        const variants = (axis?.options ?? []).map((option): ItemVariant<NutritionInput> => {
          const label = cleanLabel(option.name);
          const variantId = `${id}:variant:${slug(label)}`;
          const isReferenceBranch = isReferenceBuilder && normalizeName(label).startsWith(REFERENCE_VARIANT_PREFIX);
          if (normalizeName(category.name) === "pizza") {
            const crust = CRUST_CROSSWALK.find(([prefix]) => normalizeName(label).startsWith(prefix));
            if (crust) nutritionCrosswalk[variantId] = referenceId("Crust", crust[1]);
          }
          return {
            id: variantId,
            label,
            isDefault: option.is_default,
            nutrition: caloriesInput(option.calories, sourceId, option.id, `${label}, before selections`),
            groups: translateGroups(option.option_groups ?? [], variantId, [name, label], contextFor(isReferenceBranch)),
            source: { sourceId, recordId: option.id, path: [name] },
          };
        });

        const itemGroups = (product.option_groups ?? []).filter((group) => group !== axis);
        items.push({
          id,
          name,
          description: product.description ?? undefined,
          model,
          sourceCategory: cleanLabel(category.name),
          servingType: profile?.servingType ?? "single",
          isAvailable: !product.is_disabled,
          nutrition: caloriesInput(product.calories, sourceId, product.id, "Product calorie field"),
          variants,
          groups: translateGroups(itemGroups, id, [name], contextFor(false)),
          sources: [{ sourceId, recordId: product.id }],
        });
      }
    }
  }

  for (const [category, name, referenceCategory, referenceName] of INGREDIENT_CROSSWALK) {
    const id = ingredientId(category, name);
    if (ingredients.has(id)) nutritionCrosswalk[id] = referenceId(referenceCategory, referenceName);
  }
  if (unprofiledCategories.size > 0) {
    knownIssues.push({
      severity: "warning",
      code: "category_profile_missing",
      message: `Ordering categories with no adapter profile were treated as standard items: ${[...unprofiledCategories].join(", ")}.`,
    });
  }

  return {
    restaurant: { id: "mod", name: "MOD Pizza" },
    sources,
    items,
    ingredients: [...ingredients.values()],
    referenceNutrition: translateReferenceRows(raw.nutrition),
    categoryMap: Object.fromEntries(Object.entries(CATEGORY_PROFILE).map(([source, profile]) => [source, profile.category])),
    nutritionCrosswalk,
    referenceCategoryMap: REFERENCE_CATEGORY_MAP,
    // No precedence: where MOD's own sources disagree, no value is chosen.
    knownIssues,
  };
}

// ── Loading the research evidence ────────────────────────────────────────

const EVIDENCE_DIR = resolve(process.cwd(), "docs/research/mod-pizza/evidence");
const MANIFEST_PATH = resolve(process.cwd(), "docs/research/mod-pizza/evidence-manifest.json");

const decodeEntities = (value: string) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"');
const stripTags = (value: string) => cleanLabel(decodeEntities(value.replace(/<[^>]+>/g, " ")));

export function parseOrderingHtml(html: string): ModCategory[] {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) throw new Error("MOD ordering page has no __NEXT_DATA__ payload.");
  const queries = JSON.parse(match[1])?.props?.pageProps?.initialProps?.serverState?.queries;
  const menu = Array.isArray(queries)
    ? queries.find((query) => Array.isArray(query?.queryKey) && query.queryKey[0] === "menu")
    : undefined;
  const categories = menu?.state?.data?.[0];
  if (!Array.isArray(categories)) throw new Error("MOD ordering payload has no menu query.");
  return categories as ModCategory[];
}

export function parseNutritionHtml(html: string): ModNutritionRow[] {
  const rows: ModNutritionRow[] = [];
  let category = "";
  const pattern = /<h3 id="heading[^"]*">([\s\S]*?)<\/h3>|<div class="row menu-item__nutrition">([\s\S]*?)(?=<div class="row menu-item__nutrition">|<div class="card">|<h3 id="heading|$)/g;
  for (const match of html.matchAll(pattern)) {
    if (match[1] !== undefined) {
      category = stripTags(match[1]);
      continue;
    }
    const name = match[2].match(/<strong>([\s\S]*?)<\/strong>/);
    const calories = match[2].match(/class="center-align--md">([^<]*)</);
    if (name && calories) rows.push({ category, name: stripTags(name[1]), caloriesText: calories[1].trim() });
  }
  return rows;
}

async function loadModPizza(): Promise<ModPizzaRaw> {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as {
    research_date_local: string;
    files: Array<{ path: string; sha256: string }>;
  };
  const sha256 = (path: string) => manifest.files.find((file) => file.path === path)?.sha256;
  const retrievedAt = manifest.research_date_local;

  const stores = await Promise.all(
    [
      { storeId: "4080", file: "ordering.html.gz" },
      { storeId: "4168", file: "ordering-4168.html.gz" },
    ].map(async ({ storeId, file }): Promise<ModStoreMenu> => {
      const html = gunzipSync(await readFile(resolve(EVIDENCE_DIR, file))).toString("utf8");
      return {
        storeId,
        url: `https://orders.modpizza.com/store/${storeId}`,
        retrievedAt,
        sha256: sha256(file),
        categories: parseOrderingHtml(html),
      };
    }),
  );

  return {
    stores,
    nutrition: {
      url: "https://modpizza.com/nutrition/",
      retrievedAt,
      // WordPress modified_gmt recorded in discovery-report.md.
      sourceUpdatedAt: "2026-08-25T23:19:03Z",
      sha256: sha256("nutrition.html"),
      rows: parseNutritionHtml(await readFile(resolve(EVIDENCE_DIR, "nutrition.html"), "utf8")),
    },
  };
}

export const modPizzaAdapter: RestaurantAdapter<ModPizzaRaw> = {
  id: "mod-pizza",
  name: "MOD Pizza",
  load: loadModPizza,
  translate: translateModPizza,
};
