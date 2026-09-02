import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { writeAtomically } from "../lib/write-atomically";

const GENERATED_MENU_PATH = resolve("data/generated/chipotle/restaurant.json");
const MENU_METADATA_PATH = resolve("data/raw/chipotle/menu-metadata.json");
const MENU_METADATA_SOURCE_PATH = resolve("data/raw/chipotle/menu-metadata-source.json");
const ONLINE_MEALS_PATH = resolve("data/raw/chipotle/online-meals.json");
const ONLINE_MEALS_SOURCE_PATH = resolve("data/raw/chipotle/online-meals-source.json");
const OUTPUT_PATH = resolve("data/review/chipotle/runtime-image-enrichment.json");

type GeneratedRecord = {
  id: string;
  name: string;
  source?: {
    menu?: {
      itemIds?: string[];
      role?: string;
    };
  };
  variants?: Array<{ id: string }>;
};

type GeneratedMenu = {
  items: GeneratedRecord[];
  ingredients: GeneratedRecord[];
};

type MetadataItem = {
  thumbnailUrl?: string;
};

type MetadataGroup = {
  id: string;
  displayName: string;
  thumbnailImageUrl?: string;
  bannerImageUrl?: string;
};

type MenuMetadata = {
  groups: MetadataGroup[];
  items: Record<string, MetadataItem>;
};

type OnlineMealImage = {
  imageCategory: string;
  imageUrl: string;
};

type OnlineMeal = {
  mealId: string;
  mealName: string;
  primaryImages?: OnlineMealImage[];
};

type SourceDescriptor = {
  source: string;
  retrieved?: string;
};

type ImageMethod =
  | "menu_metadata_item_thumbnail"
  | "menu_metadata_group_thumbnail"
  | "online_meal_web_primary";

type ImageCandidate = {
  image: string;
  method: ImageMethod;
  sourceFile: string;
  sourceEndpoint: string;
  sourceRecordId: string;
  sourceField: string;
};

type ImageMapping = ImageCandidate & {
  name: string;
  recordType: "item" | "ingredient";
  generatedSourceIds: string[];
  alternateOfficialImages: string[];
};

const BUILD_GROUP_BY_GENERATED_ID: Record<string, string> = {
  "chipotle-burrito": "Burrito",
  "chipotle-bowl": "Burrito Bowl",
  "chipotle-salad": "Salad",
  "chipotle-quesadilla": "Quesadilla",
  "chipotle-taco": "One Taco",
  "chipotle-tacos-3": "Three Tacos",
  "chipotle-kids-build-your-own": "Kid's Build Your Own",
  "chipotle-kids-quesadilla": "Kid's Quesadilla",
};

const OFFICIAL_IMAGE_HOSTS = new Set([
  "www.chipotle.com",
  "miinternal-cdn.chipotle.com",
  "chipotlestrg-cdn.chipotle.com",
]);

function isUsableOfficialImage(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      OFFICIAL_IMAGE_HOSTS.has(url.hostname) &&
      /\.(?:png|jpe?g|webp)$/i.test(url.pathname)
    );
  } catch {
    return false;
  }
}

function unique<T>(values: Iterable<T>): T[] {
  return [...new Set(values)];
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

async function sha256(path: string): Promise<string> {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function main(): Promise<void> {
  const [
    generated,
    metadata,
    metadataSource,
    onlineMeals,
    onlineMealsSource,
  ] = await Promise.all([
    readJson<GeneratedMenu>(GENERATED_MENU_PATH),
    readJson<MenuMetadata>(MENU_METADATA_PATH),
    readJson<SourceDescriptor>(MENU_METADATA_SOURCE_PATH),
    readJson<OnlineMeal[]>(ONLINE_MEALS_PATH),
    readJson<SourceDescriptor>(ONLINE_MEALS_SOURCE_PATH),
  ]);

  const groupsByName = new Map(metadata.groups.map((group) => [group.displayName, group]));
  const onlineMealsById = new Map(onlineMeals.map((meal) => [meal.mealId, meal]));

  function buildGroupCandidate(record: GeneratedRecord): ImageCandidate | undefined {
    const displayName = BUILD_GROUP_BY_GENERATED_ID[record.id];
    if (!displayName) return undefined;
    const group = groupsByName.get(displayName);
    if (!group || !isUsableOfficialImage(group.thumbnailImageUrl)) return undefined;
    return {
      image: group.thumbnailImageUrl,
      method: "menu_metadata_group_thumbnail",
      sourceFile: "data/raw/chipotle/menu-metadata.json",
      sourceEndpoint: metadataSource.source,
      sourceRecordId: group.id,
      sourceField: "groups[].thumbnailImageUrl",
    };
  }

  function onlineMealCandidate(record: GeneratedRecord): ImageCandidate | undefined {
    for (const sourceId of record.source?.menu?.itemIds ?? []) {
      const meal = onlineMealsById.get(sourceId);
      const webImage = meal?.primaryImages?.find(
        (candidate) =>
          candidate.imageCategory.toUpperCase() === "WEB" &&
          isUsableOfficialImage(candidate.imageUrl),
      );
      if (meal && webImage) {
        return {
          image: webImage.imageUrl,
          method: "online_meal_web_primary",
          sourceFile: "data/raw/chipotle/online-meals.json",
          sourceEndpoint: onlineMealsSource.source,
          sourceRecordId: meal.mealId,
          sourceField: "primaryImages[imageCategory=WEB].imageUrl",
        };
      }
    }
    return undefined;
  }

  function itemThumbnailCandidates(record: GeneratedRecord): ImageCandidate[] {
    return (record.source?.menu?.itemIds ?? []).flatMap((sourceId) => {
      const image = metadata.items[sourceId]?.thumbnailUrl;
      if (!isUsableOfficialImage(image)) return [];
      return [
        {
          image,
          method: "menu_metadata_item_thumbnail" as const,
          sourceFile: "data/raw/chipotle/menu-metadata.json",
          sourceEndpoint: metadataSource.source,
          sourceRecordId: sourceId,
          sourceField: `items.${sourceId}.thumbnailUrl`,
        },
      ];
    });
  }

  function resolveImage(record: GeneratedRecord): {
    selected?: ImageCandidate;
    alternatives: string[];
  } {
    const buildImage = buildGroupCandidate(record);
    if (buildImage) return { selected: buildImage, alternatives: [] };

    const mealImage = onlineMealCandidate(record);
    if (mealImage) {
      const alternatives = unique(
        (record.source?.menu?.itemIds ?? []).flatMap((sourceId) =>
          (onlineMealsById.get(sourceId)?.primaryImages ?? [])
            .filter((candidate) => isUsableOfficialImage(candidate.imageUrl))
            .map((candidate) => candidate.imageUrl),
        ),
      ).filter((image) => image !== mealImage.image);
      return { selected: mealImage, alternatives };
    }

    const itemImages = itemThumbnailCandidates(record);
    const selected = itemImages[0];
    return {
      selected,
      alternatives: unique(itemImages.map((candidate) => candidate.image)).filter(
        (image) => image !== selected?.image,
      ),
    };
  }

  const records: Record<string, ImageMapping> = {};
  const unmapped: Array<{
    id: string;
    name: string;
    recordType: "item" | "ingredient";
    generatedSourceIds: string[];
    sourceOnly: boolean;
    reason: string;
  }> = [];

  const allRecords = [
    ...generated.items.map((record) => ({ record, recordType: "item" as const })),
    ...generated.ingredients.map((record) => ({ record, recordType: "ingredient" as const })),
  ];

  for (const { record, recordType } of allRecords) {
    if (records[record.id]) throw new Error(`Duplicate generated record id: ${record.id}`);
    const generatedSourceIds = record.source?.menu?.itemIds ?? [];
    const { selected, alternatives } = resolveImage(record);
    if (!selected) {
      const sourceOnly = record.source?.menu?.role === "structural";
      unmapped.push({
        id: record.id,
        name: record.name,
        recordType,
        generatedSourceIds,
        sourceOnly,
        reason: sourceOnly
          ? "No official image exists for this non-browseable structural/non-food record."
          : "No usable official image URL matched any generated source identity.",
      });
      continue;
    }
    records[record.id] = {
      name: record.name,
      recordType,
      image: selected.image,
      method: selected.method,
      sourceFile: selected.sourceFile,
      sourceEndpoint: selected.sourceEndpoint,
      sourceRecordId: selected.sourceRecordId,
      sourceField: selected.sourceField,
      generatedSourceIds,
      alternateOfficialImages: alternatives,
    };
  }

  const byMethod = Object.fromEntries(
    [...new Set(Object.values(records).map((mapping) => mapping.method))]
      .sort()
      .map((method) => [
        method,
        Object.values(records).filter((mapping) => mapping.method === method).length,
      ]),
  );
  const byHost = Object.fromEntries(
    [...new Set(Object.values(records).map((mapping) => new URL(mapping.image).hostname))]
      .sort()
      .map((host) => [
        host,
        Object.values(records).filter(
          (mapping) => new URL(mapping.image).hostname === host,
        ).length,
      ]),
  );
  const mappedItems = generated.items.filter((record) => records[record.id]).length;
  const mappedIngredients = generated.ingredients.filter((record) => records[record.id]).length;
  const variantCount = allRecords.reduce(
    (total, { record }) => total + (record.variants?.length ?? 0),
    0,
  );

  const report = {
    version: 1,
    generatedAt: "2026-09-01",
    status: "prepared_not_wired",
    purpose:
      "Runtime-ready official-image enrichment keyed by generated Chipotle record id. This file does not modify raw data, generated menu data, or runtime wiring.",
    inputs: {
      generatedMenu: {
        path: "data/generated/chipotle/restaurant.json",
        sha256: await sha256(GENERATED_MENU_PATH),
      },
      menuMetadata: {
        path: "data/raw/chipotle/menu-metadata.json",
        sha256: await sha256(MENU_METADATA_PATH),
        sourceEndpoint: metadataSource.source,
        retrieved: metadataSource.retrieved ?? null,
      },
      onlineMeals: {
        path: "data/raw/chipotle/online-meals.json",
        sha256: await sha256(ONLINE_MEALS_PATH),
        sourceEndpoint: onlineMealsSource.source,
        retrieved: onlineMealsSource.retrieved ?? null,
      },
    },
    policy: {
      priority: [
        "menu-metadata group thumbnail for generated build containers",
        "online-meals WEB primary image for generated preconfigured meals",
        "menu-metadata item thumbnail matched by generated source CMG id",
      ],
      restrictions: [
        "Only HTTPS URLs on official Chipotle hosts are accepted.",
        "Homepage/root placeholders and URLs without an image extension are rejected.",
        "Current generated source IDs drive matching; names are never used for item-image matching.",
        "Variants inherit their parent record image unless a future official source provides a distinct variant image.",
      ],
      officialHosts: [...OFFICIAL_IMAGE_HOSTS].sort(),
    },
    coverage: {
      generatedTopLevelRecords: allRecords.length,
      mappedTopLevelRecords: Object.keys(records).length,
      unmappedTopLevelRecords: unmapped.length,
      generatedItems: generated.items.length,
      mappedItems,
      generatedIngredients: generated.ingredients.length,
      mappedIngredients,
      generatedVariantsInheritingParentImage: variantCount,
      byMethod,
      byHost,
    },
    records,
    unmapped,
  };

  const totalAccounted = Object.keys(records).length + unmapped.length;
  if (totalAccounted !== allRecords.length) {
    throw new Error(
      `Image mapping coverage mismatch: ${totalAccounted} accounted for, ${allRecords.length} generated records.`,
    );
  }
  if (unmapped.some((record) => !record.sourceOnly)) {
    throw new Error(
      `Browseable records remain without official images: ${unmapped
        .filter((record) => !record.sourceOnly)
        .map((record) => record.id)
        .join(", ")}`,
    );
  }

  await writeAtomically(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    `Mapped official Chipotle images for ${Object.keys(records).length}/${allRecords.length} generated records (${mappedItems}/${generated.items.length} items, ${mappedIngredients}/${generated.ingredients.length} ingredients); ${unmapped.length} source-only records intentionally unmapped.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
