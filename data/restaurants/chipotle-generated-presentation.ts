import generatedChipotle from "@/data/generated/chipotle/restaurant.json";
import enrichmentPlan from "@/data/review/chipotle/enrichment-plan.json";
import imageEnrichment from "@/data/review/chipotle/runtime-image-enrichment.json";

export const CHIPOTLE_PRESENTATION_FALLBACK_IMAGE =
  "/restaurants/chipotle/brand/logo.jpeg";

export type ChipotleBrowseCategory =
  | "Chips & Dips"
  | "Single Sides"
  | "Protein Meals"
  | "Protein Cups"
  | "Drinks"
  | "Fountain Drinks"
  | "Tractor Beverages"
  | "Kids Drinks"
  | "Kids";

export type ChipotlePresentationEntreeGroup =
  | "bowl"
  | "burrito"
  | "quesadilla"
  | "salad"
  | "tacos"
  | "high-protein-menu"
  | "kids-meal"
  | "chips-sides"
  | "drinks";

// Official Chipotle category/navigation artwork for the three browse_groups
// pseudo-entrees (High Protein Menu, Chips & Sides, Drinks) — none of these
// is itself a real generated item, so unlike every other navigation card
// (Bowl, Burrito, ... which are each a real build/item) there is no single
// representative record whose own image is correct here. These come from
// menu-metadata.json's own top-level "groups" entries (thumbnailImageUrl for
// group ids 60055797-1a08-4cf0-a3e7-e48bdb557ec1 "High Protein Menu",
// 43d65a90-166b-4ec0-850f-0bceff35d316 "Chips & Sides", and
// 5ba6e809-5fc3-4477-b678-e3784c8f3b53 "Drinks") — Chipotle's own
// category-level thumbnails, not an arbitrary member item's image. Pinned
// explicitly rather than derived from members[0]/any child record.
export const CHIPOTLE_NAVIGATION_CATEGORY_IMAGE: Partial<
  Record<ChipotlePresentationEntreeGroup, string>
> = {
  "high-protein-menu":
    "https://www.chipotle.com/content/dam/chipotle/menu/meal-types/high-protein/web-desktop/high-protein-meal.png",
  "chips-sides":
    "https://www.chipotle.com/content/dam/chipotle/menu/meal-types/chips-and-guac/web-desktop/order.png",
  drinks:
    "https://www.chipotle.com/content/dam/chipotle/menu/meal-types/pickup-drinks/web-desktop/pickup-drinks.png",
};

type GeneratedVariant = { id: string; label?: string };
type GeneratedIngredientCategory = {
  id?: string;
  name: string;
  ingredients: string[];
};
type GeneratedRecord = {
  id: string;
  name: string;
  image?: string;
  variants?: GeneratedVariant[];
  customization?: { ingredientCategories?: GeneratedIngredientCategory[] };
  source?: { menu?: { role?: string } };
};

type BrowseCategoryPlan = {
  label: ChipotleBrowseCategory;
  generatedRecordIds: string[];
  presentationFamilyIds?: string[];
};

type PlannedRecordVariant = {
  label: string;
  recordId: string;
  recordType?: "ingredient";
  legacyVariantId?: string;
};

type PlannedRecordFamily = {
  id: string;
  label: string;
  legacyParentId?: string;
  variants: PlannedRecordVariant[];
  contextRestricted?: boolean;
};

type PlannedFountainFamily = {
  id: string;
  label: string;
  slug: string;
  legacyParentId?: string;
};

type NavigationPlan = {
  order: ChipotlePresentationEntreeGroup[];
  entries: Record<
    ChipotlePresentationEntreeGroup,
    {
      label: string;
      targetType: "build" | "build_choice" | "browse_groups";
      generatedTargets?: string[];
      browseCategories?: ChipotleBrowseCategory[];
      defaultTarget?: string;
    }
  >;
};

type OfficialImage = { image: string; method: string };

export type ChipotlePresentationMember = {
  recordId: string;
  variantId?: string;
  label: string;
  visibilityContext?: "kids_meal_only";
};

export type ChipotlePresentationCard = {
  id: string;
  label: string;
  browseCategory: ChipotleBrowseCategory;
  displayOrder: number;
  image: string;
  imageSource: "official" | "fallback";
  contextRestricted: boolean;
  members: ChipotlePresentationMember[];
};

export type ChipotleIngredientCategoryPresentation = {
  key: string;
  generatedBuildIds: readonly string[];
  generatedCategoryId?: string;
  generatedCategoryName: string;
  label:
    | "Included Ingredients"
    | "Proteins"
    | "Rice"
    | "Beans"
    | "Toppings"
    | "Side";
  displayOrder: number;
};

export type ChipotleNavigationEntry = {
  id: ChipotlePresentationEntreeGroup;
  label: string;
  targetType: "build" | "build_choice" | "browse_groups";
  generatedTargets: readonly string[];
  browseCategories: readonly ChipotleBrowseCategory[];
  defaultTarget?: string;
};

export type ChipotleGeneratedPresentationValidation = {
  errors: string[];
  browseableItemIds: string[];
  placedBrowseableItemIds: string[];
  unplacedBrowseableItemIds: string[];
  officialImageRecordIds: string[];
  fallbackImageRecordIds: string[];
  sourceOnlyRecordIds: string[];
};

const items = generatedChipotle.items as GeneratedRecord[];
const ingredients = generatedChipotle.ingredients as GeneratedRecord[];
const allRecords = [...items, ...ingredients];
const recordsById = new Map(allRecords.map((record) => [record.id, record]));
const itemsById = new Map(items.map((record) => [record.id, record]));
const imageRecords = imageEnrichment.records as Record<string, OfficialImage>;

const categoryPlans = enrichmentPlan.browseTaxonomy
  .categories as BrowseCategoryPlan[];
const familyPlan = enrichmentPlan.presentationVariantFamilies as unknown as {
  sideFamilies: PlannedRecordFamily[];
  tractorFamilies: PlannedRecordFamily[];
  fountainFamilies: PlannedFountainFamily[];
  fountainVariantTemplate: {
    adult22: { parentRecordId: string; variantIdTemplate: string };
    adult32: { parentRecordId: string; variantIdTemplate: string };
    kids16: {
      parentRecordId: string;
      variantIdTemplate: string;
      visibilityContext: "kids_meal_only";
    };
  };
};
const navigationPlan = enrichmentPlan.navigation as NavigationPlan;

export const CHIPOTLE_BROWSE_TAXONOMY = categoryPlans.map(
  ({ label, generatedRecordIds, presentationFamilyIds }, displayOrder) => ({
    label,
    displayOrder,
    generatedRecordIds: [...generatedRecordIds],
    presentationFamilyIds: [...(presentationFamilyIds ?? [])],
  }),
);

export const CHIPOTLE_OFFICIAL_IMAGE_BY_GENERATED_ID = {
  ...Object.fromEntries(
    Object.entries(imageRecords).map(([id, record]) => [id, record.image]),
  ),
  // Format-base component records reuse the exact official product/context
  // imagery that their generated provenance points to.
  "chipotle-cmg-4026-burrito-base": imageRecords["chipotle-cmg-4026"].image,
  // No official per-ingredient Supergreens photo exists in Chipotle's own
  // data — the closest and correct official artwork is Romaine Lettuce
  // (chipotle-cmg-5351, itself one of the Supergreens blend's components),
  // not the whole Salad entree's bowl photo this used to point at.
  "chipotle-salad-supergreens-base": imageRecords["chipotle-cmg-5351"].image,
} as Readonly<Record<string, string>>;

export const CHIPOTLE_IMAGE_REMOTE_HOSTS = [
  "chipotlestrg-cdn.chipotle.com",
  "miinternal-cdn.chipotle.com",
  "www.chipotle.com",
] as const;

function imageForGeneratedRecord(recordId: string) {
  const officialImage = CHIPOTLE_OFFICIAL_IMAGE_BY_GENERATED_ID[recordId];
  return officialImage
    ? { image: officialImage, imageSource: "official" as const }
    : {
        image: CHIPOTLE_PRESENTATION_FALLBACK_IMAGE,
        imageSource: "fallback" as const,
      };
}

function fillVariantTemplate(template: string, slug: string) {
  return template.replace("{slug}", slug);
}

const fountainCards: ChipotlePresentationCard[] = familyPlan.fountainFamilies.map(
  (family, displayOrder) => {
    const members: ChipotlePresentationMember[] = [
      {
        recordId: familyPlan.fountainVariantTemplate.adult22.parentRecordId,
        variantId: fillVariantTemplate(
          familyPlan.fountainVariantTemplate.adult22.variantIdTemplate,
          family.slug,
        ),
        label: "22 fl oz",
      },
      {
        recordId: familyPlan.fountainVariantTemplate.adult32.parentRecordId,
        variantId: fillVariantTemplate(
          familyPlan.fountainVariantTemplate.adult32.variantIdTemplate,
          family.slug,
        ),
        label: "32 fl oz",
      },
      {
        recordId: familyPlan.fountainVariantTemplate.kids16.parentRecordId,
        variantId: fillVariantTemplate(
          familyPlan.fountainVariantTemplate.kids16.variantIdTemplate,
          family.slug,
        ),
        label: "16 fl oz",
        visibilityContext:
          familyPlan.fountainVariantTemplate.kids16.visibilityContext,
      },
    ];
    return {
      id: family.id,
      label: family.label,
      browseCategory: "Fountain Drinks",
      displayOrder,
      contextRestricted: false,
      members,
      ...imageForGeneratedRecord(members[0].recordId),
    };
  },
);

const recordFamilies: Array<PlannedRecordFamily & { category: ChipotleBrowseCategory }> = [
  ...familyPlan.sideFamilies.map((family) => ({
    ...family,
    category: categoryPlans.find((category) =>
      family.variants.some((variant) =>
        category.generatedRecordIds.includes(variant.recordId),
      ),
    )?.label as ChipotleBrowseCategory,
  })),
  ...familyPlan.tractorFamilies.map((family) => ({
    ...family,
    category: "Tractor Beverages" as const,
  })),
];

const recordFamilyByMemberId = new Map(
  recordFamilies.flatMap((family) =>
    family.variants.map((variant) => [variant.recordId, family] as const),
  ),
);

function makeBrowseCards(): ChipotlePresentationCard[] {
  const cards: ChipotlePresentationCard[] = [];
  const emittedFamilyIds = new Set<string>();

  for (const category of categoryPlans) {
    if (category.label === "Fountain Drinks") {
      cards.push(...fountainCards);
      continue;
    }

    let displayOrder = 0;
    for (const recordId of category.generatedRecordIds) {
      const family = recordFamilyByMemberId.get(recordId);
      if (family) {
        if (emittedFamilyIds.has(family.id)) continue;
        emittedFamilyIds.add(family.id);
        const members = family.variants.map((variant) => ({
          recordId: variant.recordId,
          label: variant.label,
        }));
        cards.push({
          id: family.id,
          label: family.label,
          browseCategory: category.label,
          displayOrder,
          contextRestricted: family.contextRestricted ?? false,
          members,
          ...imageForGeneratedRecord(members[0].recordId),
        });
      } else {
        const record = recordsById.get(recordId);
        cards.push({
          id: `record:${recordId}`,
          label: record?.name ?? recordId,
          browseCategory: category.label,
          displayOrder,
          contextRestricted: !itemsById.has(recordId),
          members: [{ recordId, label: record?.name ?? recordId }],
          ...imageForGeneratedRecord(recordId),
        });
      }
      displayOrder += 1;
    }
  }

  return cards;
}

export const CHIPOTLE_PRESENTATION_CARDS = makeBrowseCards();

const ingredientLabelOrder = {
  "Included Ingredients": 0,
  Proteins: 1,
  Rice: 2,
  Beans: 3,
  Toppings: 4,
  Side: 5,
} as const;

function presentationLabelForIngredientCategory(
  name: string,
): ChipotleIngredientCategoryPresentation["label"] {
  if (name === "Protein") return "Proteins";
  if (name === "Rice") return "Rice";
  if (name === "Beans") return "Beans";
  if (name === "Tortilla" || name === "Tortillas") {
    return "Included Ingredients";
  }
  if (name === "Kids Side" || name === "Kids Drink") return "Side";
  return "Toppings";
}

export function generatedIngredientCategoryKey(
  generatedBuildId: string,
  category: Pick<GeneratedIngredientCategory, "id" | "name">,
) {
  // Protein categories currently have no source ID in generated JSON. The
  // scoped key preserves their generated build identity without inventing a
  // global category ID or changing the generated file.
  return category.id ?? `${generatedBuildId}::${category.name.toLowerCase()}`;
}

function makeIngredientCategoryPresentation() {
  const presentation: Record<string, ChipotleIngredientCategoryPresentation> = {};
  for (const item of items) {
    for (const category of item.customization?.ingredientCategories ?? []) {
      const label = presentationLabelForIngredientCategory(category.name);
      const key = generatedIngredientCategoryKey(item.id, category);
      const existing = presentation[key];
      presentation[key] = {
        key,
        generatedBuildIds: existing
          ? [...existing.generatedBuildIds, item.id]
          : [item.id],
        generatedCategoryId: category.id,
        generatedCategoryName: category.name,
        label,
        displayOrder: ingredientLabelOrder[label],
      };
    }
  }
  return presentation;
}

export const CHIPOTLE_INGREDIENT_CATEGORY_PRESENTATION =
  makeIngredientCategoryPresentation();

export const CHIPOTLE_PRESENTATION_NAVIGATION: readonly ChipotleNavigationEntry[] =
  navigationPlan.order.map((id) => {
    const entry = navigationPlan.entries[id];
    const label = id === "kids-meal" ? "Kids" : entry.label;
    return {
      id,
      label,
      targetType: entry.targetType,
      generatedTargets: entry.generatedTargets ?? [],
      browseCategories: entry.browseCategories ?? [],
      defaultTarget: entry.defaultTarget,
    };
  });

const navigationGroupByGeneratedId = Object.fromEntries(
  CHIPOTLE_PRESENTATION_NAVIGATION.flatMap((entry) => [
    ...entry.generatedTargets.map((id) => [id, entry.id] as const),
    ...CHIPOTLE_BROWSE_TAXONOMY.filter((category) =>
      entry.browseCategories.includes(category.label),
    ).flatMap((category) =>
      category.generatedRecordIds.map((id) => [id, entry.id] as const),
    ),
  ]),
) as Readonly<Record<string, ChipotlePresentationEntreeGroup>>;
const browseCategoryByPresentationCardId = new Map(
  CHIPOTLE_PRESENTATION_CARDS.flatMap((card) => {
    const first = card.members[0];
    return first
      ? [[first.variantId ?? first.recordId, card.browseCategory] as const]
      : [];
  }),
);
const navigationGroupByPresentationCardId = new Map(
  [...browseCategoryByPresentationCardId].flatMap(([cardId, category]) => {
    const navigation = CHIPOTLE_PRESENTATION_NAVIGATION.find((entry) =>
      entry.browseCategories.includes(category),
    );
    return navigation ? [[cardId, navigation.id] as const] : [];
  }),
);

/** Presentation-only replacement for the old `entreeGroup` field. */
export function chipotlePresentationGroupForGeneratedId(generatedId: string) {
  return (
    navigationGroupByGeneratedId[generatedId] ??
    navigationGroupByPresentationCardId.get(generatedId)
  );
}

export function chipotleBrowseCategoriesForGeneratedId(generatedId: string) {
  const categories = CHIPOTLE_BROWSE_TAXONOMY.filter((category) =>
    category.generatedRecordIds.includes(generatedId),
  ).map((category) => category.label);
  const presentationCategory = browseCategoryByPresentationCardId.get(generatedId);
  return presentationCategory && !categories.includes(presentationCategory)
    ? [...categories, presentationCategory]
    : categories;
}

const legacyPresentationGroupById: Record<
  string,
  ChipotlePresentationEntreeGroup
> = {};
const legacyBrowseCategoriesById: Partial<
  Record<string, readonly ChipotleBrowseCategory[]>
> = {};

for (const [legacyId, generatedId] of Object.entries(
  enrichmentPlan.legacyIdMigration.oneToOne,
)) {
  const group = chipotlePresentationGroupForGeneratedId(generatedId);
  if (group) legacyPresentationGroupById[legacyId] = group;
  const categories = chipotleBrowseCategoriesForGeneratedId(generatedId);
  if (categories.length > 0) legacyBrowseCategoriesById[legacyId] = categories;
}
for (const family of recordFamilies) {
  const group = family.variants
    .map((variant) => chipotlePresentationGroupForGeneratedId(variant.recordId))
    .find(Boolean);
  const legacyIds = [
    family.legacyParentId,
    ...family.variants.map((variant) => variant.legacyVariantId),
  ].filter((id): id is string => Boolean(id));
  for (const legacyId of legacyIds) {
    if (group) legacyPresentationGroupById[legacyId] = group;
    legacyBrowseCategoriesById[legacyId] = [family.category];
  }
}
for (const family of familyPlan.fountainFamilies) {
  if (!family.legacyParentId) continue;
  const legacyIds = [
    family.legacyParentId,
    `${family.legacyParentId}-22-fl-oz`,
    `${family.legacyParentId}-32-fl-oz`,
  ];
  for (const legacyId of legacyIds) {
    legacyPresentationGroupById[legacyId] = "drinks";
    legacyBrowseCategoriesById[legacyId] = ["Fountain Drinks"];
  }
}
for (const id of enrichmentPlan.legacyIdMigration.obsoleteInvalidations) {
  legacyPresentationGroupById[id] =
    id.includes("high-protein") || id === "chicken-al-pastor"
      ? "high-protein-menu"
      : "drinks";
}
legacyBrowseCategoriesById["side-of-chicken-al-pastor-high-protein"] = [
  "Protein Cups",
];

/** Supports the still-loaded old dataset without restoring source fields. */
export function chipotlePresentationGroupForCompatibleId(itemId: string) {
  return (
    chipotlePresentationGroupForGeneratedId(itemId) ??
    legacyPresentationGroupById[itemId]
  );
}

export function chipotleBrowseCategoriesForCompatibleId(itemId: string) {
  const generated = chipotleBrowseCategoriesForGeneratedId(itemId);
  return generated.length > 0
    ? generated
    : (legacyBrowseCategoriesById[itemId] ?? []);
}

export function chipotlePresentationImageForGeneratedId(generatedId: string) {
  return imageForGeneratedRecord(generatedId);
}

export function validateChipotleGeneratedPresentation(): ChipotleGeneratedPresentationValidation {
  const errors: string[] = [];
  const allRecordIds = new Set(allRecords.map((record) => record.id));
  const allVariantIdsByRecord = new Map(
    allRecords.map((record) => [
      record.id,
      new Set((record.variants ?? []).map((variant) => variant.id)),
    ]),
  );
  const browseCategoryLabels = new Set(
    CHIPOTLE_BROWSE_TAXONOMY.map((category) => category.label),
  );
  const sourceOnlyRecordIds = items
    .filter((item) => item.source?.menu?.role === "structural")
    .map((item) => item.id);
  const sourceOnlyIdSet = new Set(sourceOnlyRecordIds);
  const navigationBuildIds = new Set(
    CHIPOTLE_PRESENTATION_NAVIGATION.flatMap((entry) => entry.generatedTargets),
  );
  const browseableItemIds = items
    .filter(
      (item) =>
        !sourceOnlyIdSet.has(item.id) && !navigationBuildIds.has(item.id),
    )
    .map((item) => item.id);
  const placedBrowseableItemIds = [...new Set(
    CHIPOTLE_BROWSE_TAXONOMY.flatMap((category) => category.generatedRecordIds),
  )].filter((id) => itemsById.has(id));
  const placedSet = new Set(placedBrowseableItemIds);
  const unplacedBrowseableItemIds = browseableItemIds.filter(
    (id) => !placedSet.has(id),
  );

  for (const category of CHIPOTLE_BROWSE_TAXONOMY) {
    for (const recordId of category.generatedRecordIds) {
      if (!allRecordIds.has(recordId)) {
        errors.push(`Browse category ${category.label} references missing ${recordId}.`);
      }
    }
  }
  for (const entry of CHIPOTLE_PRESENTATION_NAVIGATION) {
    for (const recordId of entry.generatedTargets) {
      if (!itemsById.has(recordId)) {
        errors.push(`Navigation ${entry.id} references missing item ${recordId}.`);
      }
    }
    for (const category of entry.browseCategories) {
      if (!browseCategoryLabels.has(category)) {
        errors.push(`Navigation ${entry.id} references missing browse category ${category}.`);
      }
    }
    if (entry.defaultTarget && !entry.generatedTargets.includes(entry.defaultTarget)) {
      errors.push(`Navigation ${entry.id} has an invalid default target.`);
    }
  }
  for (const card of CHIPOTLE_PRESENTATION_CARDS) {
    for (const member of card.members) {
      if (!allRecordIds.has(member.recordId)) {
        errors.push(`Card ${card.id} references missing record ${member.recordId}.`);
      }
      if (
        member.variantId &&
        !allVariantIdsByRecord.get(member.recordId)?.has(member.variantId)
      ) {
        errors.push(
          `Card ${card.id} references missing variant ${member.variantId} on ${member.recordId}.`,
        );
      }
    }
  }
  for (const itemId of browseableItemIds) {
    if (!CHIPOTLE_OFFICIAL_IMAGE_BY_GENERATED_ID[itemId]) {
      errors.push(`Browseable item ${itemId} has no official presentation image.`);
    }
  }
  for (const itemId of unplacedBrowseableItemIds) {
    errors.push(`Browseable item ${itemId} has no presentation placement.`);
  }

  return {
    errors,
    browseableItemIds,
    placedBrowseableItemIds,
    unplacedBrowseableItemIds,
    officialImageRecordIds: allRecords
      .filter((record) => CHIPOTLE_OFFICIAL_IMAGE_BY_GENERATED_ID[record.id])
      .map((record) => record.id),
    fallbackImageRecordIds: allRecords
      .filter((record) => !CHIPOTLE_OFFICIAL_IMAGE_BY_GENERATED_ID[record.id])
      .map((record) => record.id),
    sourceOnlyRecordIds,
  };
}

export const CHIPOTLE_GENERATED_PRESENTATION_CONFIG = {
  browseTaxonomy: CHIPOTLE_BROWSE_TAXONOMY,
  cards: CHIPOTLE_PRESENTATION_CARDS,
  ingredientCategories: CHIPOTLE_INGREDIENT_CATEGORY_PRESENTATION,
  navigation: CHIPOTLE_PRESENTATION_NAVIGATION,
  officialImages: CHIPOTLE_OFFICIAL_IMAGE_BY_GENERATED_ID,
  imageFallback: CHIPOTLE_PRESENTATION_FALLBACK_IMAGE,
  imageRemoteHosts: CHIPOTLE_IMAGE_REMOTE_HOSTS,
  kidsFruit: {
    generatedId: enrichmentPlan.kidsFruit.canonicalGeneratedId,
    image: enrichmentPlan.kidsFruit.officialImage,
  },
  identityPolicy:
    "Presentation cards retain exact generated recordId/variantId members; they never merge or replace source identities.",
} as const;
