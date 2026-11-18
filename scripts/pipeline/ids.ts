// Stable id registry.
//
// Runtime ids are persisted outside this repository (saved carts, links), so
// an id must never change because a name did. The registry is an append-only
// record of every id a restaurant has been given, with the source keys that
// identify the record it belongs to. Projection resolves ids through it and
// only mints a new id for a record no key recognizes.
import { normalizeName } from "../lib/normalize-name";

export type IdKind = "item" | "variant" | "ingredient" | "ingredient-variant" | "category" | "entree-option";

export type IdRegistryEntry = {
  id: string;
  kind: IdKind;
  // Any one of these identifies the record. Most are source record ids, so a
  // rename does not change the match.
  keys: string[];
};

export type IdRegistry = {
  restaurantId: string;
  version: 1;
  entries: IdRegistryEntry[];
};

export const emptyRegistry = (restaurantId: string): IdRegistry => ({ restaurantId, version: 1, entries: [] });

const slug = (value: string) => normalizeName(value).replace(/ /g, "-");

// Key builders shared by seeding and projection, so both sides agree.
export const idKeys = {
  source: (recordId: string) => `src:${recordId}`,
  // A source record that means different things in different owners.
  sourceIn: (recordId: string, ownerId: string) => `src:${recordId}@${ownerId}`,
  name: (category: string, name: string) => `name:${normalizeName(category)}/${normalizeName(name)}`,
  variantSource: (ownerId: string, sourceId: string) => `${ownerId}/variant-source:${sourceId}`,
  variant: (ownerId: string, label: string) => `${ownerId}/variant:${normalizeName(label)}`,
  portion: (ownerId: string, label: string) => `${ownerId}/portion:${normalizeName(label)}`,
  group: (ownerId: string, label: string) => `${ownerId}/group:${normalizeName(label).replace(/s$/, "")}`,
  entreeOption: (ownerId: string) => `${ownerId}/entree-option`,
};

export type IdResolution = { id: string; isNew: boolean };

export class IdResolver {
  private readonly byKey = new Map<string, IdRegistryEntry>();
  private readonly entries: IdRegistryEntry[];
  private readonly usedIds = new Set<string>();
  private readonly claimed = new Set<string>();
  readonly additions: IdRegistryEntry[] = [];
  readonly conflicts: string[] = [];

  constructor(private readonly registry: IdRegistry) {
    this.entries = registry.entries.map((entry) => ({ ...entry, keys: [...entry.keys] }));
    for (const entry of this.entries) {
      this.usedIds.add(entry.id);
      for (const key of entry.keys) this.byKey.set(`${entry.kind}|${key}`, entry);
    }
  }

  // The id the registry already holds for the first matching key, without
  // claiming it.
  peek(kind: IdKind, keys: readonly string[]): string | undefined {
    for (const key of keys) {
      const entry = this.byKey.get(`${kind}|${key}`);
      if (entry) return entry.id;
    }
    return undefined;
  }

  // Keys are tried in order, most specific first. The first key that names an
  // id not already given to another record in this run wins. With no match a
  // new id is minted from `base` and recorded as an addition.
  resolve(kind: IdKind, keys: readonly string[], base: string, ownerId?: string): IdResolution {
    for (const key of keys) {
      const entry = this.byKey.get(`${kind}|${key}`);
      if (!entry) continue;
      const claim = JSON.stringify([kind, ownerId, entry.id]);
      // One category id may serve several items (a shared toppings list).
      if (kind !== "category" && this.claimed.has(claim)) {
        // Two records sharing a name is ordinary (one ingredient at two
        // servings); two records sharing a source key is worth reporting.
        if (!key.startsWith("name:")) {
          this.conflicts.push(`${kind} id "${entry.id}" is named by key ${key} but was already given to another record in this run.`);
        }
        continue;
      }
      this.claimed.add(claim);
      return { id: entry.id, isNew: false };
    }

    let id = slug(base);
    for (let suffix = 2; this.usedIds.has(id); suffix += 1) id = `${slug(base)}-${suffix}`;
    // Keys already owned by another record stay with that record.
    const entry: IdRegistryEntry = { id, kind, keys: keys.filter((key) => !this.byKey.has(`${kind}|${key}`)) };
    this.entries.push(entry);
    this.additions.push(entry);
    this.usedIds.add(id);
    this.claimed.add(JSON.stringify([kind, ownerId, id]));
    for (const key of entry.keys) this.byKey.set(`${kind}|${key}`, entry);
    return { id, isNew: true };
  }

  // The registry including this run's additions. Existing entries are never
  // removed or changed.
  toRegistry(): IdRegistry {
    return { ...this.registry, entries: this.entries };
  }
}

// ── Seeding from a menu the app already serves ───────────────────────────

type SeedSource = { menu?: { itemIds?: string[]; recordId?: string } };
type SeedVariant = { id: string; label: string; source?: SeedSource; sourceVariantId?: string };
type SeedCategory = { name: string; id?: string; ingredients: string[] };
export type SeedMenu = {
  items: Array<{
    id: string;
    name: string;
    categories: string[];
    variants?: SeedVariant[];
    customization?: { ingredientCategories?: SeedCategory[] };
    source?: SeedSource;
  }>;
  ingredients?: Array<{ id: string; name: string; categories: string[]; variants?: SeedVariant[]; source?: SeedSource }>;
  builderConfig?: { entreeOptions?: Record<string, { id: string }> };
};

// Records the ids of a menu that is already live, keyed by the source record
// ids its own provenance carries. Run once per restaurant, before the
// pipeline projects anything for it.
export function seedRegistryFromRuntimeMenu(restaurantId: string, menu: SeedMenu): IdRegistry {
  const entries = new Map<string, IdRegistryEntry>();
  const add = (kind: IdKind, id: string, keys: string[]) => {
    const entry = entries.get(`${kind}|${id}`) ?? { id, kind, keys: [] };
    for (const key of keys) if (!entry.keys.includes(key)) entry.keys.push(key);
    entries.set(`${kind}|${id}`, entry);
  };
  const recordIds = (source?: SeedSource) => source?.menu?.itemIds ?? (source?.menu?.recordId ? [source.menu.recordId] : []);

  for (const item of menu.items) {
    add("item", item.id, [...recordIds(item.source).map(idKeys.source), idKeys.name(item.categories[0] ?? "", item.name)]);
    for (const variant of item.variants ?? []) add("variant", variant.id, [
      ...(variant.sourceVariantId ? [idKeys.variantSource(item.id, variant.sourceVariantId)] : []),
      idKeys.variant(item.id, variant.label),
    ]);
    for (const category of item.customization?.ingredientCategories ?? []) {
      if (category.id) add("category", category.id, [idKeys.group(item.id, category.name)]);
    }
  }
  for (const [key, option] of Object.entries(menu.builderConfig?.entreeOptions ?? {})) {
    add("entree-option", key, [idKeys.entreeOption(option.id)]);
  }

  const ingredients = menu.ingredients ?? [];
  const sourceIdsOf = (ingredient: (typeof ingredients)[number]) => [
    ...new Set([...recordIds(ingredient.source), ...(ingredient.variants ?? []).flatMap((variant) => recordIds(variant.source))]),
  ];
  const owners = new Map<string, Set<string>>();
  for (const ingredient of ingredients) {
    for (const recordId of sourceIdsOf(ingredient)) owners.set(recordId, (owners.get(recordId) ?? new Set()).add(ingredient.id));
  }
  for (const ingredient of ingredients) {
    const users = menu.items.filter((item) =>
      (item.customization?.ingredientCategories ?? []).some((category) => category.ingredients.includes(ingredient.id)),
    );
    const keys: string[] = [];
    for (const recordId of sourceIdsOf(ingredient)) {
      // A source record shared by several ingredients only identifies one of
      // them inside the item that offers it.
      if (owners.get(recordId)?.size === 1) keys.push(idKeys.source(recordId));
      else keys.push(...users.map((item) => idKeys.sourceIn(recordId, item.id)));
    }
    add("ingredient", ingredient.id, [...keys, idKeys.name(ingredient.categories[0] ?? "", ingredient.name)]);
    for (const variant of ingredient.variants ?? []) add("ingredient-variant", variant.id, [idKeys.portion(ingredient.id, variant.label)]);
  }

  // A key must name exactly one id per kind; a name shared by two records
  // identifies neither.
  const keyOwners = new Map<string, number>();
  for (const entry of entries.values()) for (const key of entry.keys) keyOwners.set(`${entry.kind}|${key}`, (keyOwners.get(`${entry.kind}|${key}`) ?? 0) + 1);
  for (const entry of entries.values()) entry.keys = entry.keys.filter((key) => keyOwners.get(`${entry.kind}|${key}`) === 1);

  return { restaurantId, version: 1, entries: [...entries.values()] };
}
