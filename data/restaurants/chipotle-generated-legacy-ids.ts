import enrichmentPlan from "@/data/review/chipotle/enrichment-plan.json";

/**
 * Compatibility data only. Nothing in this module performs a redirect or
 * rewrites a cart item. The next compatibility phase can opt into these maps
 * explicitly once generated Chipotle records are used at runtime.
 */
export type ChipotleGeneratedLegacyIdConfig = {
  canonicalPolicy: string;
  oneToOne: Readonly<Record<string, string>>;
  presentationFamilyRule: string;
  contextualRules: ReadonlyArray<{
    legacyIds: ReadonlyArray<string>;
    contexts?: Readonly<Record<string, string>>;
    rule?: string;
    failurePolicy: string;
  }>;
  explicitlyNotSilentlyMigrated: ReadonlyArray<string>;
  obsoleteInvalidations: ReadonlyArray<string>;
  gracefulInvalidationBehavior: string;
};

export const CHIPOTLE_GENERATED_LEGACY_ID_CONFIG =
  enrichmentPlan.legacyIdMigration as ChipotleGeneratedLegacyIdConfig;

export type ChipotleLegacyRecordFamily = {
  id: string;
  label: string;
  legacyParentId?: string;
  contextRestricted?: boolean;
  variants: ReadonlyArray<{
    label: string;
    recordId: string;
    recordType?: "ingredient";
    legacyVariantId?: string;
  }>;
};

export type ChipotleLegacyFountainFamily = {
  id: string;
  label: string;
  slug: string;
  legacyParentId?: string;
};

export const CHIPOTLE_GENERATED_LEGACY_PRESENTATION_FAMILIES =
  enrichmentPlan.presentationVariantFamilies as unknown as {
    sideFamilies: ReadonlyArray<ChipotleLegacyRecordFamily>;
    tractorFamilies: ReadonlyArray<ChipotleLegacyRecordFamily>;
    fountainFamilies: ReadonlyArray<ChipotleLegacyFountainFamily>;
    fountainVariantTemplate: {
      adult22: { parentRecordId: string; variantIdTemplate: string };
      adult32: { parentRecordId: string; variantIdTemplate: string };
    };
  };
