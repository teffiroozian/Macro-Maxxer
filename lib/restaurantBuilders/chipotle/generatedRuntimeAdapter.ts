import generatedChipotle from "@/data/generated/chipotle/restaurant.json";
import {
  CHIPOTLE_BROWSE_TAXONOMY,
  CHIPOTLE_NAVIGATION_CATEGORY_IMAGE,
  CHIPOTLE_PRESENTATION_CARDS,
  CHIPOTLE_PRESENTATION_NAVIGATION,
  chipotlePresentationImageForGeneratedId,
} from "@/data/restaurants/chipotle-generated-presentation";
import { resolveEffectiveIngredientNutrition } from "@/lib/ingredientNutrition";
import type {
  ChipotleBuilderConfig,
  ChipotleTacoCount,
  ChipotleTacoShell,
} from "@/lib/restaurantBuilders/chipotle/types";
import type {
  GeneratedMenuSourceIdentity,
  IngredientItem,
  ItemVariant,
  MenuItem,
  MenuSourceIdentity,
  RestaurantMenu,
  ServingType,
  VariantContainerIngredientItem,
} from "@/types/menu";
import type { Nutrition } from "@/types/nutrition";

type GeneratedChipotleSource = GeneratedMenuSourceIdentity & {
  restaurantId: number;
  menu: {
    itemIds: string[];
    itemType: string;
    itemCategory: string;
    role: string;
    buildBaseItemId?: string;
  };
};

type GeneratedChipotleVariant = {
  id: string;
  label: string;
  categories: string[];
  nutrition: Nutrition;
  source?: GeneratedChipotleSource;
};

type GeneratedChipotleIngredient = {
  id: string;
  name: string;
  image?: string;
  categories: string[];
  nutrition?: Nutrition;
  variants?: GeneratedChipotleVariant[];
  defaultVariantId?: string;
  maxQuantity: number;
  defaultOrder: number;
  source?: GeneratedChipotleSource;
  hideFromIngredientView?: boolean;
};

type GeneratedChipotleItem = {
  id: string;
  name: string;
  image?: string;
  categories: string[];
  servingType: string;
  nutrition: Nutrition;
  variants?: GeneratedChipotleVariant[];
  defaultVariantId?: string;
  defaultOrder: number;
  ingredients?: string[];
  customization?: MenuItem["customization"];
  source?: GeneratedChipotleSource;
};

type RuntimeItemNutritionSource = {
  ingredientId: string;
  variantId: string;
};

// Runtime browse cards use the same serving context as entree builds. Keep
// the standalone generated item as the card's identity/image/source, while
// resolving its displayed nutrition from the generated entree ingredient.
// This maps generated identities only; no nutrition values are duplicated.
const RUNTIME_ITEM_NUTRITION_SOURCE_BY_ID: Readonly<
  Record<string, RuntimeItemNutritionSource>
> = {
  "chipotle-cmg-1141": {
    ingredientId: "chipotle-protein-pollo-asado",
    variantId: "chipotle-protein-pollo-asado-normal",
  },
};

// Presentation-only order overrides. A maximal sort key keeps Queso Blanco
// last as the eligible topping set changes between entree contexts, without
// changing generated data or the relative order of any other topping.
const RUNTIME_INGREDIENT_DISPLAY_ORDER_BY_ID: Readonly<Record<string, number>> = {
  "chipotle-cmg-1029": Number.MAX_SAFE_INTEGER,
};

function adaptSource(
  generated: GeneratedChipotleSource | undefined,
): MenuSourceIdentity | undefined {
  if (!generated) return undefined;
  return {
    menu: { tags: [], pins: [] },
    generated,
  };
}

function adaptVariant(variant: GeneratedChipotleVariant): ItemVariant {
  return {
    id: variant.id,
    label: variant.label,
    categories: [...variant.categories],
    nutrition: { ...variant.nutrition },
    source: adaptSource(variant.source),
  };
}

const servingTypes = new Set<ServingType>([
  "addon",
  "breakfast",
  "combo",
  "dessert",
  "drink",
  "entree",
  "kids",
  "shareable",
  "side",
  "single",
]);

function servingTypeFor(value: string): ServingType {
  if (!servingTypes.has(value as ServingType)) {
    throw new Error(`Unsupported generated Chipotle servingType: ${value}`);
  }
  return value as ServingType;
}

function runtimeItemNutrition(
  item: GeneratedChipotleItem,
  generatedIngredientsById: ReadonlyMap<string, GeneratedChipotleIngredient>,
) {
  const source = RUNTIME_ITEM_NUTRITION_SOURCE_BY_ID[item.id];
  if (!source) return item.nutrition;

  const ingredient = generatedIngredientsById.get(source.ingredientId);
  const variant = ingredient?.variants?.find(
    (candidate) => candidate.id === source.variantId,
  );
  if (!variant) {
    throw new Error(
      `Generated Chipotle runtime nutrition source ${source.ingredientId}:${source.variantId} for ${item.id} is missing.`,
    );
  }
  return variant.nutrition;
}

function adaptItem(
  item: GeneratedChipotleItem,
  generatedIngredientsById: ReadonlyMap<string, GeneratedChipotleIngredient>,
): MenuItem {
  return {
    id: item.id,
    name: item.name,
    image: chipotlePresentationImageForGeneratedId(item.id).image,
    categories: [...item.categories],
    servingType: servingTypeFor(item.servingType),
    nutrition: { ...runtimeItemNutrition(item, generatedIngredientsById) },
    variants: item.variants?.map(adaptVariant),
    defaultVariantId: item.defaultVariantId,
    defaultOrder: item.defaultOrder,
    ingredients: item.ingredients ? [...item.ingredients] : undefined,
    customization: item.customization,
    source: adaptSource(item.source),
    sourceOnly:
      item.source?.menu.role === "structural" ||
      item.source?.menu.role === "build_container",
  };
}

function adaptIngredient(
  ingredient: GeneratedChipotleIngredient,
): IngredientItem {
  const sourceCategories = ingredient.categories.map((category) =>
    category.trim().toLowerCase(),
  );
  const presentationCategory = sourceCategories.includes("included ingredients")
    ? "Included Ingredients"
    : sourceCategories.includes("proteins")
    ? "Proteins"
    : sourceCategories.includes("rice")
      ? "Rice"
      : sourceCategories.includes("beans")
        ? "Beans"
        : sourceCategories.some((category) =>
              ["tortillas"].includes(category),
            )
          ? "Included Ingredients"
          : sourceCategories.some((category) =>
                ["side", "sides", "kids side", "kids drink", "beverages"].includes(category),
              )
            ? "Side"
            : "Toppings";
  const base = {
    id: ingredient.id,
    name: ingredient.name,
    image: chipotlePresentationImageForGeneratedId(ingredient.id).image,
    categories: [presentationCategory],
    maxQuantity: ingredient.maxQuantity,
    defaultOrder:
      RUNTIME_INGREDIENT_DISPLAY_ORDER_BY_ID[ingredient.id] ??
      ingredient.defaultOrder,
    source: adaptSource(ingredient.source),
    hideFromIngredientView: ingredient.hideFromIngredientView,
  };
  const variants = ingredient.variants?.map(adaptVariant);

  if (ingredient.nutrition) {
    return {
      ...base,
      nutrition: { ...ingredient.nutrition },
      variants,
      defaultVariantId: ingredient.defaultVariantId,
    };
  }

  if (!variants?.length || !ingredient.defaultVariantId) {
    throw new Error(
      `Generated Chipotle ingredient ${ingredient.id} has neither direct nutrition nor a default variant.`,
    );
  }
  if (!variants.some((variant) => variant.id === ingredient.defaultVariantId)) {
    throw new Error(
      `Generated Chipotle ingredient ${ingredient.id} has an invalid defaultVariantId.`,
    );
  }

  return {
    ...base,
    variants: variants as VariantContainerIngredientItem["variants"],
    defaultVariantId: ingredient.defaultVariantId,
  };
}

type GeneratedChipotleInput = {
  hasBuildYourOwn?: RestaurantMenu["hasBuildYourOwn"];
  items: GeneratedChipotleItem[];
  ingredients: GeneratedChipotleIngredient[];
  addonGroups?: RestaurantMenu["addonGroups"];
  customizationRules?: RestaurantMenu["customizationRules"];
  builderConfig?: RestaurantMenu["builderConfig"];
};

// Bowl has no generated ingredient record for an optional side tortilla —
// "Tortilla on the Side" (chipotle-cmg-4025) only exists as a standalone
// generated menu item (the Chips & Sides browse card). This projects that
// exact record's nutrition/source into a selectable Bowl-build ingredient
// without touching generated data. It gets its own id (rather than reusing
// chipotle-cmg-4025 verbatim) because that id already names a real,
// separately-purchasable standalone item with its own official display
// name ("Tortilla on the Side") — sharing one id between the two would
// force them to share a single display name/category, corrupting whichever
// surface loses. The id still carries the real CMG-4025 source identity
// via `source`, so it is not a fabricated record: nutrition and provenance
// both trace back to the one official "Tortilla on the Side" item, the
// same way e.g. chipotle-protein-chicken-kids-byo is its own id for a
// context, not a new "chicken" identity.
function buildBowlSideTortillaIngredient(
  generated: GeneratedChipotleInput,
): IngredientItem {
  const source = generated.items.find((item) => item.id === "chipotle-cmg-4025");
  if (!source) {
    throw new Error(
      "Generated Chipotle item chipotle-cmg-4025 (Tortilla on the Side) is missing — Bowl's optional Side Tortilla add-on depends on its nutrition/source.",
    );
  }
  return {
    id: "chipotle-cmg-4025-bowl-side",
    name: "Side Tortilla",
    image: chipotlePresentationImageForGeneratedId("chipotle-cmg-4025").image,
    categories: ["Side"],
    nutrition: { ...source.nutrition },
    maxQuantity: 1,
    defaultOrder: 1,
    source: adaptSource(source.source),
  };
}

export function adaptGeneratedChipotleMenuForRuntime(
  generated: GeneratedChipotleInput,
): RestaurantMenu {
  const generatedIngredientsById = new Map(
    generated.ingredients.map((ingredient) => [ingredient.id, ingredient] as const),
  );
  const rawItems = generated.items.map((item) =>
    adaptItem(item, generatedIngredientsById),
  );
  const adaptedGeneratedIngredients = generated.ingredients.map(adaptIngredient);
  const generatedIngredientIds = new Set(
    adaptedGeneratedIngredients.map((ingredient) => ingredient.id),
  );
  const presetReferencedItemIds = new Set(
    generated.items
      .filter((item) => item.source?.menu.role === "preconfigured_meal")
      .flatMap((item) => item.ingredients ?? [])
      .map((entry) => entry.split(":", 1)[0]),
  );
  // Some official presets include a separately purchasable side. Project
  // that already-generated menu record into the runtime ingredient catalog
  // so the preset builder can select it, while retaining the exact same id,
  // nutrition, image, and source provenance rather than copying data.
  const presetItemIngredients = rawItems.flatMap<IngredientItem>((item) => {
    if (!presetReferencedItemIds.has(item.id) || generatedIngredientIds.has(item.id)) {
      return [];
    }
    return [{
      id: item.id,
      name: item.name,
      image: item.image,
      categories: ["Side"],
      nutrition: { ...item.nutrition },
      maxQuantity: 1,
      defaultOrder: item.defaultOrder,
      source: item.source,
    }];
  });
  const rawIngredients = [
    ...adaptedGeneratedIngredients,
    ...presetItemIngredients,
    buildBowlSideTortillaIngredient(generated),
  ];
  const recordsById = new Map<string, MenuItem | IngredientItem>([
    ...rawItems.map((item) => [item.id, item] as const),
    ...rawIngredients.map((ingredient) => [ingredient.id, ingredient] as const),
  ]);
  const browseCategoryByRecordId = new Map(
    CHIPOTLE_BROWSE_TAXONOMY.flatMap((category) =>
      category.generatedRecordIds.map(
        (recordId, displayOrder) =>
          [recordId, { label: category.label, displayOrder }] as const,
      ),
    ),
  );
  const familyCards = CHIPOTLE_PRESENTATION_CARDS.filter(
    (card) =>
      (!card.contextRestricted && card.members.length > 1) ||
      card.browseCategory === "Kids Drinks" ||
      card.browseCategory === "Kids",
  );
  const familyMemberIds = new Set(
    familyCards.flatMap((card) => card.members.map((member) => member.recordId)),
  );
  const familyPrimaryIds = new Set(
    familyCards
      .map((card) => {
        const first = card.members[0];
        return first && !first.variantId ? first.recordId : undefined;
      })
      .filter((id): id is string => Boolean(id)),
  );

  const presentationItems = familyCards.flatMap<MenuItem>((card) => {
    const variants = card.members
      .filter((member) => member.visibilityContext !== "kids_meal_only")
      .flatMap<ItemVariant>((member) => {
      const record = recordsById.get(member.recordId);
      if (!record) return [];
      if (!member.variantId && record.variants?.length) {
        return record.variants.map((variant) => ({
          ...variant,
          categories: [card.browseCategory],
          canonicalItemId: member.recordId,
        }));
      }
      const sourceVariant = member.variantId
        ? record.variants?.find((variant) => variant.id === member.variantId)
        : undefined;
      const nutrition = sourceVariant?.nutrition ??
        ("maxQuantity" in record
          ? resolveEffectiveIngredientNutrition(record)
          : record.nutrition);
      if (!nutrition) return [];
      return [{
        id: member.variantId ?? member.recordId,
        label: member.label,
        categories: [card.browseCategory],
        nutrition: { ...nutrition },
        image: sourceVariant?.image ?? record.image ?? card.image,
        servingType:
          "servingType" in record ? record.servingType : "side",
        source: sourceVariant?.source ?? record.source,
        canonicalItemId: member.recordId,
      }];
    });
    const firstMember = card.members[0];
    const firstRecord = firstMember
      ? recordsById.get(firstMember.recordId)
      : undefined;
    const firstVariant = variants[0];
    if (!firstMember || !firstRecord || !firstVariant) return [];

    // A presentation card id is itself an existing generated record or
    // nested generated variant id. Selecting it persists canonicalItemId +
    // the exact generated variant id; no synthetic presentation id becomes
    // a runtime/cart identity.
    return [{
      id: firstMember.variantId ?? firstMember.recordId,
      name: card.label,
      image: card.image,
      categories: [card.browseCategory],
      servingType:
        "servingType" in firstRecord ? firstRecord.servingType : "side",
      nutrition: { ...firstVariant.nutrition },
      variants,
      defaultVariantId: firstVariant.id,
      defaultOrder: card.displayOrder,
      source: firstRecord.source,
    }];
  });

  const presentedRawItems = rawItems
    .filter((item) => !familyPrimaryIds.has(item.id))
    .map((item) => {
      const placement = browseCategoryByRecordId.get(item.id);
      return {
        ...item,
        categories: placement ? [placement.label] : item.categories,
        defaultOrder: placement?.displayOrder ?? item.defaultOrder,
        sourceOnly: familyMemberIds.has(item.id) ? true : item.sourceOnly,
      };
    });

  return {
    hasBuildYourOwn: generated.hasBuildYourOwn,
    items: [...presentedRawItems, ...presentationItems],
    ingredients: rawIngredients,
    addonGroups: generated.addonGroups,
    customizationRules: generated.customizationRules,
    builderConfig: buildGeneratedChipotleBuilderConfig(
      generated,
      rawItems,
    ),
  };
}

function buildGeneratedChipotleBuilderConfig(
  generated: GeneratedChipotleInput,
  rawItems: MenuItem[],
): ChipotleBuilderConfig {
  const itemById = new Map(rawItems.map((item) => [item.id, item]));
  const generatedItemById = new Map(
    generated.items.map((item) => [item.id, item]),
  );
  const ingredientIds = (itemId: string) =>
    generatedItemById
      .get(itemId)
      ?.customization?.ingredientCategories?.flatMap(
        (category) => category.ingredients,
      ) ?? [];
  const standardProteinIds = ingredientIds("chipotle-bowl").filter((id) =>
    id.startsWith("chipotle-protein-"),
  );
  const tacoNonProteinIds = ingredientIds("chipotle-tacos-3").filter(
    (id) =>
      !id.startsWith("chipotle-protein-") &&
      !id.startsWith("chipotle-tortilla-"),
  );
  const adultTacoShellIngredientIdsByCount: Record<
    ChipotleTacoCount,
    Record<ChipotleTacoShell, string[]>
  > = {
    1: {
      crispy: ["chipotle-tortilla-crispy-corn-taco"],
      soft: ["chipotle-tortilla-soft-flour-taco"],
    },
    3: {
      crispy: ["chipotle-tortilla-crispy-corn-tacos-3"],
      soft: ["chipotle-tortilla-soft-flour-tacos-3"],
    },
  };
  const adultTacoShellIngredientIds = Object.values(
    adultTacoShellIngredientIdsByCount,
  ).flatMap((idsByShell) => Object.values(idsByShell).flat());
  const kidsTacoShellIngredientIds = ["chipotle-cmg-5403", "chipotle-cmg-5404"];
  const tacoShellIngredientIds = [
    ...adultTacoShellIngredientIds,
    ...kidsTacoShellIngredientIds,
  ];
  const navigationById = new Map<string, (typeof CHIPOTLE_PRESENTATION_NAVIGATION)[number]>(
    CHIPOTLE_PRESENTATION_NAVIGATION.map((entry) => [entry.id, entry]),
  );
  const option = (
    id: string,
    generatedId: string,
    includedIngredientIds: string[] = [],
  ) => {
    const item = itemById.get(generatedId);
    return {
      id: generatedId,
      label:
        navigationById.get(id)?.label ??
        generated.builderConfig?.entreeOptions?.[id]?.label ??
        item?.name ??
        id,
      image:
        CHIPOTLE_NAVIGATION_CATEGORY_IMAGE[
          id as keyof typeof CHIPOTLE_NAVIGATION_CATEGORY_IMAGE
        ] ??
        item?.image ??
        chipotlePresentationImageForGeneratedId(generatedId).image,
      includedIngredientIds,
    };
  };

  return {
    entreeOptions: {
      bowl: option("bowl", "chipotle-bowl"),
      // The Burrito's own included tortilla (chipotle-cmg-4026-burrito-base,
      // required/locked, labeled "Tortilla") is the ONLY included ingredient
      // here. Double Wrap with Tortilla (chipotle-cmg-4026) is a genuine
      // optional upsell — unlike Quesadilla, whose tortilla+cheese base is
      // structurally included — so it must not be pre-selected/pinned to
      // Included Ingredients. It stays eligible via ingredientIdsByEntree
      // below so it still renders as a normal, unselected Side add-on.
      burrito: option("burrito", "chipotle-burrito", [
        "chipotle-cmg-4026-burrito-base",
      ]),
      quesadilla: option("quesadilla", "chipotle-quesadilla", [
        "chipotle-cmg-4026",
        "chipotle-cmg-5252",
      ]),
      // Romaine Lettuce (required, locked) then Chipotle-Honey Vinaigrette
      // (included but removable — see includedRemovableIngredientIds below)
      // — order here drives the Included Ingredients display order.
      salad: option("salad", "chipotle-salad", [
        "chipotle-cmg-5351",
        "chipotle-cmg-5353",
      ]),
      tacos: {
        ...option("taco", "chipotle-tacos-3"),
        label: navigationById.get("tacos")?.label ?? "Tacos",
        includedIngredientIdsByOption: {
          crispy: [...adultTacoShellIngredientIdsByCount[3].crispy],
          soft: [...adultTacoShellIngredientIdsByCount[3].soft],
        },
      },
      // "High Protein Menu" is a browse_groups pseudo-entree (no
      // generatedTargets of its own — see navigationById), so it has no
      // single generated record to represent it. Its label is keyed off its
      // own "high-protein-menu" navigation id; its image comes from
      // CHIPOTLE_NAVIGATION_CATEGORY_IMAGE (Chipotle's own official category
      // artwork), not from this fallback generatedId — same for
      // "chips-sides"/"drinks" below.
      "high-protein-menu": option(
        "high-protein-menu",
        "chipotle-meal-653abfb2-3b20-4b17-8638-d6a20b2c340c",
      ),
      // Label overridden to the short, official "Kid's Meal" navigation
      // name — the id/generatedId pair stays "kids-build-your-own" /
      // chipotle-kids-build-your-own (both the underlying Kids BYO record
      // and the build_choice navigation to it are unchanged); only the
      // display label changes, same pattern as tacos above.
      "kids-meal": {
        ...option("kids-build-your-own", "chipotle-kids-build-your-own"),
        label: "Kid's Meal",
      },
      "chips-sides": option("chips-sides", "chipotle-cmg-1002"),
      drinks: option("drinks", "chipotle-cmg-2810"),
    },
    categoryMaxSelections: {
      ...(generated.builderConfig?.categoryMaxSelections ?? {}),
      proteins: 2,
      rice: 2,
      beans: 2,
    },
    selectedIngredientCategoryOrder: [
      "included ingredients",
      "proteins",
      "rice",
      "beans",
      "toppings",
      "side",
    ],
    selectedIngredientCategoryLabels: {
      "included ingredients": "Included Ingredients",
      proteins: "Proteins",
      rice: "Rice",
      beans: "Beans",
      toppings: "Toppings",
      side: "Side",
    },
    chipotle: {
      tacoShellIngredientIds,
      tacoShellIngredientIdsByCount: adultTacoShellIngredientIdsByCount,
      kidsBuildYourOwnTortillaIdsByOption: {
        crispy: [kidsTacoShellIngredientIds[0]],
        soft: [kidsTacoShellIngredientIds[1]],
      },
      // The generated Kids Quesadilla composition's own tortilla record
      // (chipotle-cmg-5401, 80 cal) is a rounded duplicate of the official
      // single-taco Soft Flour Tortilla panel (chipotle-tortilla-soft-flour-
      // taco, 83 cal/3g fat/2g protein/13g carbs) — that more accurate,
      // already-official record is used here instead so Kids Quesadilla's
      // included tortilla macros match the real single-tortilla panel.
      kidsQuesadillaIncludedIngredientIds: [
        "chipotle-tortilla-soft-flour-taco",
        "chipotle-cmg-5252",
      ],
      kidsMealOptions: [
        {
          id: "build-your-own",
          label: "Kid's Build Your Own",
          image: itemById.get("chipotle-kids-build-your-own")?.image ?? "",
        },
        {
          id: "quesadilla",
          label: "Kid's Quesadilla",
          image: itemById.get("chipotle-kids-quesadilla")?.image ?? "",
        },
      ],
      specialVariantIds: {
        quesadillaTripleCheese: "chipotle-cmg-5252",
      },
      ingredientIdsByEntree: {
        // Side Tortilla is Bowl-only, unselected by default (not part of
        // includedIngredientIds above), and its own id so it never gets
        // confused with the Burrito's Double Wrap or the base Bowl itself.
        bowl: [...ingredientIds("chipotle-bowl"), "chipotle-cmg-4025-bowl-side"],
        burrito: [
          ...ingredientIds("chipotle-burrito"),
          "chipotle-cmg-4026-burrito-base",
          "chipotle-cmg-4026",
        ],
        // Romaine Lettuce isn't in the generated Salad's own topping list
        // (it's a real, separate selectable topping there, distinct from
        // the implicit unlisted Supergreens base mix baked into the Salad's
        // own nutrition) — added here as the Included Ingredients' required
        // component alongside the vinaigrette above.
        salad: [...ingredientIds("chipotle-salad"), "chipotle-cmg-5351"],
        // chipotle-cmg-5354 (Chipotle-Honey Vinaigrette) is the generated
        // Quesadilla's own Dips-category record, but Vinaigrette is a
        // Salad dressing, not a Quesadilla topping — excluded here so it
        // never renders on the Quesadilla page. Salad keeps its own
        // vinaigrette (chipotle-cmg-5353, a different generated id) via
        // salad's own ingredientIdsByEntree entry above, untouched.
        quesadilla: [
          ...ingredientIds("chipotle-quesadilla").filter(
            (id) => id !== "chipotle-cmg-5354",
          ),
          "chipotle-cmg-4026",
          "chipotle-cmg-5252",
        ],
        tacos: [
          ...standardProteinIds,
          ...tacoNonProteinIds,
          ...adultTacoShellIngredientIds,
        ],
        "kids-build-your-own": ingredientIds("chipotle-kids-build-your-own"),
        // The generated Kids Quesadilla composition's own tortilla id
        // (chipotle-cmg-5401) is swapped out for the more accurate
        // chipotle-tortilla-soft-flour-taco record above, so it's dropped
        // here too — otherwise it would still surface as a selectable
        // (if unincluded) duplicate tortilla. The official calculator
        // separately supplies the standard single Cheese serving as the
        // other required base component.
        "kids-quesadilla": Array.from(new Set([
          ...ingredientIds("chipotle-kids-quesadilla").filter(
            (id) => id !== "chipotle-cmg-5401",
          ),
          "chipotle-tortilla-soft-flour-taco",
          "chipotle-cmg-5252",
        ])),
      },
      tortillaSideIngredientId: "chipotle-cmg-4026",
      cheeseIngredientId: "chipotle-cmg-5252",
      // "Double Wrap with Tortilla" is chipotle-cmg-4026's real generated
      // name, but that phrase only describes the Burrito's optional extra
      // tortilla. Quesadilla includes the same generated record as its
      // plain included tortilla base, so it (and any future context) gets
      // the generic label; only Burrito overrides to the specific one.
      tortillaSideGenericLabel: "Tortilla",
      tortillaSideLabelByEntree: {
        burrito: "Double Wrap with Tortilla",
      },
      // Salad's Chipotle-Honey Vinaigrette: included/selected by default,
      // but not a required lock like Romaine Lettuce above it — the user
      // can remove and re-add it. See ChipotleSpecificBuilderConfig.
      includedRemovableIngredientIds: ["chipotle-cmg-5353"],
    },
  };
}

const generatedChipotleInput: GeneratedChipotleInput = generatedChipotle;

export const CHIPOTLE_GENERATED_RUNTIME_MENU =
  adaptGeneratedChipotleMenuForRuntime(generatedChipotleInput);
