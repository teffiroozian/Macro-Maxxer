import {
  CHIPOTLE_GENERATED_LEGACY_ID_CONFIG,
  CHIPOTLE_GENERATED_LEGACY_PRESENTATION_FAMILIES,
} from "@/data/restaurants/chipotle-generated-legacy-ids";
import { CHIPOTLE_GENERATED_RUNTIME_MENU } from "@/lib/restaurantBuilders/chipotle/generatedRuntimeAdapter";
import type { CartItem } from "@/types/cart";

export type ChipotleLegacyBuildTargetId =
  | "chipotle-burrito"
  | "chipotle-bowl"
  | "chipotle-salad"
  | "chipotle-quesadilla"
  | "chipotle-taco"
  | "chipotle-tacos-3"
  | "chipotle-kids-build-your-own"
  | "chipotle-kids-quesadilla";

export type ChipotleLegacyResolution =
  | {
      status: "resolved";
      legacyId: string;
      recordId: string;
      variantId?: string;
      method: "canonical" | "one_to_one" | "presentation_family" | "contextual";
    }
  | {
      status: "ambiguous" | "obsolete" | "unknown";
      legacyId: string;
      reason: string;
    };

export type ResolveChipotleLegacyIdOptions = {
  legacyVariantId?: string;
  buildTargetId?: ChipotleLegacyBuildTargetId;
};

const generatedRecords = [
  ...CHIPOTLE_GENERATED_RUNTIME_MENU.items,
  ...(CHIPOTLE_GENERATED_RUNTIME_MENU.ingredients ?? []),
];
const generatedRecordIds = new Set(generatedRecords.map((record) => record.id));
const generatedVariantIds = new Set(
  generatedRecords.flatMap((record) =>
    (record.variants ?? []).map((variant) => variant.id),
  ),
);
const generatedRecordById = new Map(
  generatedRecords.map((record) => [record.id, record]),
);
const generatedItemIds = new Set(
  CHIPOTLE_GENERATED_RUNTIME_MENU.items.map((item) => item.id),
);

const obsoleteIds = new Set(
  CHIPOTLE_GENERATED_LEGACY_ID_CONFIG.obsoleteInvalidations,
);
const neverSilentIds = new Set(
  CHIPOTLE_GENERATED_LEGACY_ID_CONFIG.explicitlyNotSilentlyMigrated,
);

type ExactFamilyTarget = {
  recordId: string;
  variantId?: string;
};

const familyTargetByLegacyId = new Map<string, ExactFamilyTarget>();
const familyDefaultByLegacyParentId = new Map<string, ExactFamilyTarget>();

for (const family of [
  ...CHIPOTLE_GENERATED_LEGACY_PRESENTATION_FAMILIES.sideFamilies,
  ...CHIPOTLE_GENERATED_LEGACY_PRESENTATION_FAMILIES.tractorFamilies,
]) {
  const first = family.variants[0];
  if (family.legacyParentId && first) {
    familyDefaultByLegacyParentId.set(family.legacyParentId, {
      recordId: first.recordId,
    });
  }
  for (const variant of family.variants) {
    if (variant.legacyVariantId) {
      familyTargetByLegacyId.set(variant.legacyVariantId, {
        recordId: variant.recordId,
      });
    }
  }
}

function fillTemplate(template: string, slug: string) {
  return template.replace("{slug}", slug);
}

for (const family of CHIPOTLE_GENERATED_LEGACY_PRESENTATION_FAMILIES.fountainFamilies) {
  if (!family.legacyParentId) continue;
  const adult22 = {
    recordId:
      CHIPOTLE_GENERATED_LEGACY_PRESENTATION_FAMILIES.fountainVariantTemplate
        .adult22.parentRecordId,
    variantId: fillTemplate(
      CHIPOTLE_GENERATED_LEGACY_PRESENTATION_FAMILIES.fountainVariantTemplate
        .adult22.variantIdTemplate,
      family.slug,
    ),
  };
  const adult32 = {
    recordId:
      CHIPOTLE_GENERATED_LEGACY_PRESENTATION_FAMILIES.fountainVariantTemplate
        .adult32.parentRecordId,
    variantId: fillTemplate(
      CHIPOTLE_GENERATED_LEGACY_PRESENTATION_FAMILIES.fountainVariantTemplate
        .adult32.variantIdTemplate,
      family.slug,
    ),
  };
  familyDefaultByLegacyParentId.set(family.legacyParentId, adult22);
  familyTargetByLegacyId.set(`${family.legacyParentId}-22-fl-oz`, adult22);
  familyTargetByLegacyId.set(`${family.legacyParentId}-32-fl-oz`, adult32);
}

const contextualProteinIds = new Set([
  "chicken",
  "steak",
  "carnitas",
  "beef-barbacoa",
  "sofritas",
]);
const contextualRelationshipIds = new Set([
  "guacamole",
  "queso-blanco",
  "cilantro-lime-sauce",
]);
const contextualTortillaIds = new Set([
  "crispy-corn-tortilla",
  "soft-flour-tortilla",
]);

function proteinSuffixForBuildTarget(buildTargetId: ChipotleLegacyBuildTargetId) {
  if (buildTargetId === "chipotle-taco") return "-taco";
  if (buildTargetId === "chipotle-tacos-3") return "-tacos-3";
  if (buildTargetId === "chipotle-kids-build-your-own") return "-kids-byo";
  if (buildTargetId === "chipotle-kids-quesadilla") {
    return "-kids-quesadilla";
  }
  return "";
}

function resolveContextualRelationship(
  legacyId: string,
  buildTargetId: ChipotleLegacyBuildTargetId,
) {
  const target = CHIPOTLE_GENERATED_RUNTIME_MENU.items.find(
    (item) => item.id === buildTargetId,
  );
  const expectedName =
    legacyId === "queso-blanco"
      ? "Queso Blanco"
      : legacyId === "cilantro-lime-sauce"
        ? "Cilantro Lime Sauce"
        : "Guacamole";
  const relatedIds = new Set(
    target?.customization?.ingredientCategories?.flatMap(
      (category) => category.ingredients,
    ) ?? [],
  );
  const matches = [...relatedIds].filter(
    (id) => generatedRecordById.get(id)?.name === expectedName,
  );
  return matches.length === 1 ? matches[0] : undefined;
}

function resolveContextualTortilla(
  legacyId: string,
  buildTargetId: ChipotleLegacyBuildTargetId,
) {
  const isSoft = legacyId === "soft-flour-tortilla";
  const targets: Partial<
    Record<ChipotleLegacyBuildTargetId, { soft?: string; crispy?: string }>
  > = {
    "chipotle-taco": {
      soft: "chipotle-tortilla-soft-flour-taco",
      crispy: "chipotle-tortilla-crispy-corn-taco",
    },
    "chipotle-tacos-3": {
      soft: "chipotle-tortilla-soft-flour-tacos-3",
      crispy: "chipotle-tortilla-crispy-corn-tacos-3",
    },
    "chipotle-kids-build-your-own": {
      soft: "chipotle-cmg-5404",
      crispy: "chipotle-cmg-5403",
    },
    "chipotle-kids-quesadilla": {
      // Matches the live builder's included tortilla (see
      // kidsQuesadillaIncludedIngredientIds in generatedRuntimeAdapter.ts):
      // the more accurate official single-taco panel, not the generated
      // Kids Quesadilla composition's own rounded chipotle-cmg-5401 record.
      soft: "chipotle-tortilla-soft-flour-taco",
    },
  };
  return isSoft ? targets[buildTargetId]?.soft : targets[buildTargetId]?.crispy;
}

export function resolveChipotleLegacyId(
  legacyId: string,
  options: ResolveChipotleLegacyIdOptions = {},
): ChipotleLegacyResolution {
  if (generatedRecordIds.has(legacyId) || generatedVariantIds.has(legacyId)) {
    return {
      status: "resolved",
      legacyId,
      recordId: legacyId,
      method: "canonical",
    };
  }
  if (
    obsoleteIds.has(legacyId) ||
    [...obsoleteIds].some((id) => legacyId.startsWith(`${id}-`))
  ) {
    return {
      status: "obsolete",
      legacyId,
      reason: "The legacy product is not part of the current generated menu.",
    };
  }
  if (neverSilentIds.has(legacyId)) {
    return {
      status: "ambiguous",
      legacyId,
      reason: "The approved migration policy forbids silently replacing this identity.",
    };
  }

  const oneToOne = CHIPOTLE_GENERATED_LEGACY_ID_CONFIG.oneToOne[legacyId];
  if (oneToOne) {
    return {
      status: "resolved",
      legacyId,
      recordId: oneToOne,
      method: "one_to_one",
    };
  }

  const exactFamilyTarget = options.legacyVariantId
    ? familyTargetByLegacyId.get(options.legacyVariantId)
    : familyTargetByLegacyId.get(legacyId);
  const familyTarget =
    exactFamilyTarget ?? familyDefaultByLegacyParentId.get(legacyId);
  if (familyTarget) {
    return {
      status: "resolved",
      legacyId,
      ...familyTarget,
      method: "presentation_family",
    };
  }

  if (
    contextualProteinIds.has(legacyId) ||
    contextualRelationshipIds.has(legacyId) ||
    contextualTortillaIds.has(legacyId)
  ) {
    if (!options.buildTargetId) {
      return {
        status: "ambiguous",
        legacyId,
        reason: "An exact generated build target is required for this legacy ingredient.",
      };
    }
    let recordId: string | undefined;
    if (contextualProteinIds.has(legacyId)) {
      recordId = `chipotle-protein-${legacyId}${proteinSuffixForBuildTarget(options.buildTargetId)}`;
    } else if (contextualTortillaIds.has(legacyId)) {
      recordId = resolveContextualTortilla(legacyId, options.buildTargetId);
    } else {
      recordId = resolveContextualRelationship(legacyId, options.buildTargetId);
    }
    if (recordId && generatedRecordIds.has(recordId)) {
      return {
        status: "resolved",
        legacyId,
        recordId,
        method: "contextual",
      };
    }
    return {
      status: "ambiguous",
      legacyId,
      reason: "The supplied build target has no unique equivalent for this legacy ingredient.",
    };
  }

  return {
    status: "unknown",
    legacyId,
    reason: "No approved legacy mapping exists.",
  };
}

export function resolveChipotleLegacyItemRoute(itemSlug: string) {
  const resolution = resolveChipotleLegacyId(itemSlug);
  if (resolution.status !== "resolved") return resolution;
  if (!generatedItemIds.has(resolution.recordId)) {
    return {
      status: "ambiguous" as const,
      legacyId: itemSlug,
      reason: "The approved target is contextual or ingredient-only and cannot be opened as a standalone item route.",
    };
  }
  return {
    ...resolution,
    canonicalSlug: resolution.recordId,
  };
}

function buildTargetForGeneratedMainItem(recordId: string) {
  if (recordId === "chipotle-burrito" || recordId.includes("burrito")) {
    return "chipotle-burrito" as const;
  }
  if (recordId === "chipotle-taco" || recordId.includes("taco")) {
    return "chipotle-taco" as const;
  }
  if (recordId === "chipotle-quesadilla") return "chipotle-quesadilla" as const;
  if (recordId === "chipotle-salad") return "chipotle-salad" as const;
  if (recordId === "chipotle-kids-build-your-own") {
    return "chipotle-kids-build-your-own" as const;
  }
  if (recordId === "chipotle-kids-quesadilla") {
    return "chipotle-kids-quesadilla" as const;
  }
  return "chipotle-bowl" as const;
}

export function resolveChipotleLegacyCartMainItem(cartItem: CartItem) {
  if (cartItem.restaurantId !== "chipotle") {
    return {
      status: "unknown" as const,
      legacyId: cartItem.itemId,
      reason: "Legacy Chipotle migration does not apply to another restaurant.",
    };
  }
  const legacyVariantId =
    cartItem.selection.type === "standard"
      ? cartItem.selection.variantId ?? cartItem.variantId
      : cartItem.selection.buildConfiguration.variantId;
  if (cartItem.selection.type === "build-your-own") {
    const configuration = cartItem.selection.buildConfiguration;
    const baseItemId = configuration.baseItemId;
    const options = configuration.options ?? {};
    const generatedBuildTarget =
      baseItemId === "bowl"
        ? "chipotle-bowl"
        : baseItemId === "burrito"
          ? "chipotle-burrito"
          : baseItemId === "quesadilla"
            ? "chipotle-quesadilla"
            : baseItemId === "salad"
              ? "chipotle-salad"
              : baseItemId === "tacos"
                ? Number(options.selectedTacoCount) === 1
                  ? "chipotle-taco"
                  : "chipotle-tacos-3"
                : baseItemId === "kids-meal"
                  ? options.selectedKidsMeal === "quesadilla"
                    ? "chipotle-kids-quesadilla"
                    : "chipotle-kids-build-your-own"
                  : undefined;
    if (generatedBuildTarget) {
      return {
        status: "resolved" as const,
        legacyId: cartItem.itemId,
        recordId: generatedBuildTarget,
        method: "contextual" as const,
      };
    }
  }
  return resolveChipotleLegacyId(cartItem.itemId, { legacyVariantId });
}

export function resolveChipotleLegacyCartIngredientId(
  legacyId: string,
  mainItemResolution: ChipotleLegacyResolution,
) {
  const buildTargetId =
    mainItemResolution.status === "resolved"
      ? buildTargetForGeneratedMainItem(mainItemResolution.recordId)
      : undefined;
  return resolveChipotleLegacyId(legacyId, { buildTargetId });
}

const contextFreeLegacyIds = new Set([
  ...Object.keys(CHIPOTLE_GENERATED_LEGACY_ID_CONFIG.oneToOne),
  ...familyTargetByLegacyId.keys(),
  ...familyDefaultByLegacyParentId.keys(),
]);
const contextualLegacyIds = new Set([
  ...contextualProteinIds,
  ...contextualRelationshipIds,
  ...contextualTortillaIds,
]);

export const CHIPOTLE_LEGACY_COMPATIBILITY_SUMMARY = {
  contextFreeAutomaticIds: contextFreeLegacyIds.size,
  contextualIds: contextualLegacyIds.size,
  ambiguousWithoutContextIds: new Set([
    ...contextualLegacyIds,
    ...neverSilentIds,
  ]).size,
  neverSilentlyMigratedIds: neverSilentIds.size,
  obsoleteIds: obsoleteIds.size,
} as const;
