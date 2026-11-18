import type { Nutrition } from "../../../types/nutrition";
import type { OrderingGroup, OrderingOption, OrderingPlan } from "../../../types/ordering";
import type { buildChickFilAFromCaptures } from "../../importers/chick-fil-a";

type Menu = Awaited<ReturnType<typeof buildChickFilAFromCaptures>>["restaurantOutput"];
type Edge = Menu["sourceRelationships"]["itemGroups"][number]["options"][number];

export function compileChickFilASourceOrdering(menu: Menu) {
  const groups = new Map(menu.sourceRelationships.itemGroups.map((group) => [group.sourceItemGroupId, group.options]));
  const items = new Map(menu.items.map((item) => [item.id, item]));
  const ingredients = new Map(menu.ingredients.map((item) => [item.id, item]));
  const additionalOrderingPlans: Record<string, OrderingPlan[]> = {};
  const coveredEdges = new Set<string>();
  const issues = new Map<string, Set<string>>();
  const carriers: Array<{ id: string; roots: string[]; reason?: string }> = [];
  const roots = new Set<string>();
  const excludedEntrees: Array<{ root: string; itemId: string; disposition: string }> = [];
  const key = (group: string, edge: Edge) => `${group}:${edge.optionIndex}`;
  const note = (id: string, reason: string) => {
    const previous = issues.get(id) ?? new Set<string>();
    previous.add(reason);
    issues.set(id, previous);
  };
  const clean = (name: string | null) => name?.replace(/<[^>]*>/g, "").trim() || "Choice";
  const complete = (panel: Nutrition | undefined): panel is Nutrition => Boolean(panel &&
    [panel.calories, panel.protein, panel.carbs, panel.totalFat].every((value) => Number.isFinite(value) && value >= 0));
  const byVariant = new Map<string, string[]>();
  for (const item of menu.items.filter((entry) => !entry.sourceOnly)) {
    for (const variant of item.variants ?? []) {
      byVariant.set(variant.id, [...(byVariant.get(variant.id) ?? []), item.id]);
    }
  }

  // A modifier group is executable only if its complete enabled membership,
  // bounds and included nutrition can be resolved in this exact parent.
  function modifierGroups(groupId: string, ownerId: string): OrderingGroup[] {
    const owner = items.get(ownerId);
    if (!owner) return [];
    return (groups.get(groupId) ?? []).flatMap((group): OrderingGroup[] => {
      if (group.disabled || group.itemClass !== "MODIFIER_GROUPING" || !group.referencedItemGroupId) return [];
      const id = key(groupId, group);
      const min = group.minimum ?? group.thirdPartyMinimum;
      const max = group.maximum;
      const removalOnly = /^(INCLUSIONS_REMOVAL|COFFEE_REMOVE|BFST_REMOVE|REMOVE_MOD)$/.test(group.tag ?? "") ||
        (group.tag === "COFFEE_SYRUP" && group.name === "Syrup Removal");
      if (max === null && !removalOnly) {
        note(id, "modifier_group_maximum_unpublished");
        return [];
      }
      const options: OrderingOption[] = [];
      const childGroup = group.referencedItemGroupId;
      for (const edge of groups.get(childGroup) ?? []) {
        if (edge.disabled) continue;
        const edgeId = key(childGroup, edge);
        const recordId = edge.standardizedRecordId;
        const record = recordId && (ingredients.get(recordId) ?? items.get(recordId));
        if (!recordId || !record || edge.referencedItemGroupId) {
          note(edgeId, "modifier_identity_or_nested_action_unresolved");
          return [];
        }
        const included = owner.ingredients?.includes(recordId) === true;
        const sourceUnit = edge.modifierNutritionUnit;
        const ownerUnit = owner.ingredientNutritionContexts?.[recordId];
        const unit = sourceUnit?.source.tag === edge.tag ? sourceUnit :
          ownerUnit?.source.tag === edge.tag ? ownerUnit : undefined;
        const panel = unit?.nutrition ?? (ownerUnit || sourceUnit ? undefined : record.nutrition);
        const exactOrderingPanel = record.source.nutrition?.orderingTag === edge.tag &&
          record.source.nutrition?.nutritionSource === "ordering_system";
        const preparation = /^ICE_(EXTRA|LITE|NONE)$/.test(edge.tag ?? "") && !panel;
        if ((!preparation && !complete(panel)) || (!preparation && edge.selectionRole !== (included ? "included" : "available")) ||
            (included && edge.tag !== group.defaultTag && !unit && !exactOrderingPanel) ||
            (removalOnly && (!included || !unit && !exactOrderingPanel))) {
          note(edgeId, "modifier_effect_or_contextual_nutrition_unverified");
          return [];
        }
        options.push({
          id: edgeId, label: clean(edge.name), itemId: recordId,
          role: "ingredient",
          min: edge.minimum ?? edge.thirdPartyMinimum ?? undefined,
          // A verified removal can only keep or remove the one included unit.
          // This is an action bound, not an inferred group maximum.
          max: removalOnly ? Math.min(edge.maximum ?? 1, 1) : edge.maximum ?? undefined,
          defaultQuantity: included ? 1 : 0,
          effect: preparation ? { kind: "none" } : {
            kind: included ? "included" : "add", nutrition: panel!,
            sourceId: unit?.source.sourceId ?? record.source.nutrition?.sourceId,
          },
        });
      }
      if (!options.length || (max !== null && options.reduce((count, option) => count + (option.defaultQuantity ?? 0), 0) > max)) {
        note(id, "modifier_membership_or_defaults_incompatible");
        return [];
      }
      return [{ id, label: clean(group.name), min: min ?? 0, max, options }];
    });
  }

  function componentGroup(parent: string, slot: Edge, role: OrderingOption["role"], seen: Set<string>): OrderingGroup | undefined {
    const id = key(parent, slot);
    const child = slot.referencedItemGroupId;
    if (!child || seen.has(child) || seen.size > 12 || !slot.defaultTag ||
        (slot.minimum ?? slot.thirdPartyMinimum ?? 0) > 1 || (slot.maximum !== null && slot.maximum !== 1)) {
      note(id, "component_default_or_single_slot_bounds_unverified");
      return;
    }
    const rows = (groups.get(child) ?? []).filter((edge) => !edge.disabled);
    if (rows.filter((edge) => edge.tag === slot.defaultTag).length !== 1) {
      note(id, "component_default_missing_or_ambiguous");
      return;
    }
    const options = rows.flatMap((edge): OrderingOption[] => {
      const edgeId = key(child, edge);
      const base = {
        id: edgeId, label: clean(edge.name), defaultQuantity: Number(edge.tag === slot.defaultTag),
        max: edge.maximum ?? undefined,
      };
      if ((edge.minimum ?? edge.thirdPartyMinimum ?? 0) > 0 || (edge.maximum !== null && edge.maximum !== 1)) {
        note(edgeId, "component_option_bounds_incompatible");
        return [];
      }
      const recordId = edge.standardizedRecordId;
      const record = recordId && items.get(recordId);
      if (record && complete(record.nutrition)) {
        return [{
          ...base, itemId: record.id, role: role === "non-nutrition" ? "included-dessert" : role, effect: { kind: "add", nutrition: record.nutrition, sourceId: record.source.nutrition?.sourceId },
          groups: edge.referencedItemGroupId ? modifierGroups(edge.referencedItemGroupId, record.id) : undefined,
        }];
      }
      if (edge.isEdible === false && role === "non-nutrition" && !edge.referencedItemGroupId) {
        return [{ ...base, role, effect: { kind: "none" } }];
      }
      if (edge.itemClass === "ITEM_GROUPING" && edge.referencedItemGroupId) {
        const nested = componentGroup(child, edge, role, new Set([...seen, child]));
        if (nested) return [{ ...base, effect: { kind: "none" }, groups: [nested] }];
      }
      note(edgeId, record ? "component_nutrition_unavailable" : "component_identity_unresolved");
      return [];
    });
    if (!options.some((option) => option.defaultQuantity === 1)) {
      note(id, "component_default_not_executable");
      return;
    }
    // This is the app's single component selector for a captured slot,
    // including slots where ordering does not publish an exact min/max.
    return { id, label: clean(slot.name), selectionMode: "single-component", min: slot.minimum ?? slot.thirdPartyMinimum ?? 0, max: slot.maximum, options };
  }

  function buildRoot(root: string, name: string) {
    if (roots.has(root)) return true;
    const edges = (groups.get(root) ?? []).filter((edge) => !edge.disabled);
    const entrees = edges.filter((edge) => edge.itemGroupType === "Entree");
    if (entrees.length !== 1 || !entrees[0].standardizedRecordId) {
      note(root, "entree_identity_unresolved");
      return false;
    }
    const edge = entrees[0];
    const entreeId = edge.standardizedRecordId!;
    const entree = items.get(entreeId);
    const owners = byVariant.get(entreeId) ?? [];
    const ownerId = entree && !entree.sourceOnly ? entree.id : owners.length === 1 ? owners[0] : undefined;
    if (!ownerId || !entree || !complete(entree.nutrition)) {
      note(root, ownerId ? "entree_nutrition_unavailable" : "entree_browse_or_variant_mapping_unresolved");
      excludedEntrees.push({
        root, itemId: entreeId,
        disposition: entree?.sourceOnly && /no hash brown/i.test(entree.name)
          ? "internal_scramble_recipe_state"
          : entree?.sourceOnly ? "source_only_meal_component_without_visible_variant"
            : "unverified_runtime_owner_or_panel",
      });
      return false;
    }
    const components: OrderingGroup[] = [];
    for (const component of edges.filter((entry) => entry !== edge)) {
      const role = component.itemGroupType === "Side" ? "side" :
        component.itemGroupType === "Beverage" ? "drink" :
        component.itemGroupType === "Surprise" ? "non-nutrition" :
        component.itemGroupType === "Item" && component.defaultTag ? "included-dessert" : undefined;
      if (!role) {
        note(key(root, component), "unknown_meal_component_role");
        return false;
      }
      const group = componentGroup(root, component, role, new Set([root]));
      if (!group) return false;
      components.push(group);
    }
    if (!components.length) return false;
    roots.add(root);
    (additionalOrderingPlans[ownerId] ??= []).push({
      id: `chickfila-source-${root}`,
      label: `Preview ${name}`,
      baseNutrition: entree.nutrition,
      groups: [{
        id: root, label: "Entrée", min: 1, max: 1,
        options: [{
          id: key(root, edge), label: clean(edge.name), defaultQuantity: 1, max: 1,
          effect: { kind: "none" }, itemId: ownerId, variantId: ownerId === entree.id ? undefined : entree.id,
          groups: [...(edge.referencedItemGroupId ? modifierGroups(edge.referencedItemGroupId, entree.id) : []), ...components],
        }],
      }],
    });
    return true;
  }

  for (const item of menu.items.filter((entry) => entry.comboConfig)) {
    const id = item.source.menu.itemGroupId;
    if (!id) {
      carriers.push({ id: item.id, roots: [], reason: "no_source_group" });
      continue;
    }
    const edges = (groups.get(id) ?? []).filter((edge) => !edge.disabled);
    const candidates = edges.some((edge) => edge.itemGroupType === "Entree") ? [{ id, name: item.name }] :
      edges.flatMap((edge) => edge.itemClass === "ITEM_GROUPING" && edge.referencedItemGroupId
        ? [{ id: edge.referencedItemGroupId, name: clean(edge.name) }] : []);
    const compiled = candidates.filter((candidate) => buildRoot(candidate.id, candidate.name)).map((candidate) => candidate.id);
    carriers.push({ id: item.id, roots: compiled, ...(compiled.length === candidates.length && compiled.length > 0
      ? {} : { reason: compiled.length ? "partial_variant_carrier" : "no_executable_root" }) });
  }

  function mark(groups: OrderingGroup[]) {
    for (const group of groups) {
      coveredEdges.add(group.id);
      for (const option of group.options) {
        coveredEdges.add(option.id);
        if (option.groups) mark(option.groups);
      }
    }
  }
  for (const plans of Object.values(additionalOrderingPlans)) plans.forEach((plan) => mark(plan.groups));

  // Use exact source group keys for legacy customization exposure. Reachability
  // from a visible order is evidence of relevance, not evidence of execution.
  const legacyGroups = new Set<string>();
  const visibleReach = new Set<string>();
  const sourcesByGroup = new Map<string, string[]>();
  function visit(groupId: string) {
    if (visibleReach.has(groupId)) return;
    visibleReach.add(groupId);
    for (const edge of groups.get(groupId) ?? []) {
      if (!edge.disabled && edge.referencedItemGroupId) visit(edge.referencedItemGroupId);
    }
  }
  for (const item of menu.items.filter((entry) => !entry.sourceOnly)) {
    for (const group of item.source.menu.referencedItemGroupIds) visit(group);
    for (const variant of item.variants ?? []) {
      for (const group of variant.source.menu.referencedItemGroupIds) visit(group);
    }
    for (const category of item.customization?.ingredientCategories ?? []) {
      const match = category.id?.match(/\[CFA (\d+):(\d+)\]$/);
      if (match) legacyGroups.add(`${match[1]}:${match[2]}`);
    }
    for (const ref of item.addonRefs ?? []) {
      const match = ref.match(/^cfa-addon-group-(\d+)-(\d+)-(\d+)$/);
      if (match) legacyGroups.add(`${match[1]}:${match[2]}`);
    }
  }
  for (const carrier of carriers) for (const root of carrier.roots) visit(root);
  for (const id of legacyGroups) {
    const [group, position] = id.split(":");
    const child = groups.get(group)?.find((edge) => edge.optionIndex === Number(position))?.referencedItemGroupId;
    if (child) sourcesByGroup.set(child, [...(sourcesByGroup.get(child) ?? []), id]);
  }

  const auditEdges = menu.sourceRelationships.itemGroups.flatMap((group) => group.options.map((edge) => ({
    id: key(group.sourceItemGroupId ?? "", edge),
    name: edge.name,
    itemClass: edge.itemClass,
    target: edge.referencedItemGroupId,
    bounds: { min: edge.minimum, thirdPartyMin: edge.thirdPartyMinimum, max: edge.maximum },
    status: edge.disabled ? "disabled" : coveredEdges.has(key(group.sourceItemGroupId ?? "", edge)) ? "compiled_path" : "outside_compiled_path",
    relevance: legacyGroups.has(key(group.sourceItemGroupId ?? "", edge)) || sourcesByGroup.has(group.sourceItemGroupId ?? "")
      ? "linked_to_existing_app_customization"
      : visibleReach.has(group.sourceItemGroupId ?? "") ? "reachable_from_visible_order" : "no_verified_visible_order_path",
    findings: [...(issues.get(key(group.sourceItemGroupId ?? "", edge)) ?? [])],
  })));
  return {
    additionalOrderingPlans,
    audit: {
      carriers,
      excludedEntrees,
      executableRoots: roots.size,
      edgeCounts: auditEdges.reduce<Record<string, number>>((counts, edge) => {
        const bucket = `${edge.status}/${edge.relevance}`;
        counts[bucket] = (counts[bucket] ?? 0) + 1;
        return counts;
      }, {}),
      edges: auditEdges,
      findings: [...issues].map(([id, reasons]) => ({ id, reasons: [...reasons] })),
      scope: "Source meal compiler pass. A compiled edge has at least one matching context; it does not certify every occurrence.",
    },
  };
}
