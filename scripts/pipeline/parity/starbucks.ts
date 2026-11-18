import { isDeepStrictEqual } from "node:util";
import type { RestaurantMenu } from "../../../types/menu";
import type { RestaurantDraft } from "../contracts";
import type { RuntimeProjection } from "../project";

export function compareStarbucks(baseline: RestaurantMenu, draft: RestaurantDraft, projection: RuntimeProjection) {
  const staged = new Map(projection.menu.items.map((item) => [item.id, item]));
  const differences: string[] = [];
  const compare = (id: string, before: unknown, after: unknown) => {
    const clean = (value: unknown) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
    if (!isDeepStrictEqual(clean(before), clean(after))) differences.push(id);
  };
  compare("catalog_order", baseline.items.map((item) => item.id), projection.menu.items.map((item) => item.id));
  for (const item of baseline.items) {
    const candidate = staged.get(item.id);
    if (!candidate) { differences.push(`${item.id}: missing`); continue; }
    for (const field of ["image", "tags", "category", "categories", "name", "servingType", "nutrition", "defaultVariantId", "defaultOrder", "source"] as const) {
      compare(`${item.id}/${field}`, item[field], candidate[field]);
    }
    compare(`${item.id}/size_order`, item.variants?.map((entry) => entry.id), candidate.variants?.map((entry) => entry.id));
    for (const variant of item.variants ?? []) {
      const size = candidate.variants?.find((entry) => entry.id === variant.id);
      if (!size) { differences.push(`${variant.id}: missing`); continue; }
      for (const field of ["label", "tags", "category", "categories", "servingType", "nutrition", "source"] as const) {
        compare(`${variant.id}/${field}`, variant[field], size[field]);
      }
    }
  }
  return {
    draft: draft.summary,
    runtime: {
      items: staged.size,
      sizes: projection.menu.items.reduce((total, item) => total + (item.variants?.length ?? 0), 0),
      idConflicts: projection.ids.conflicts.length,
      draftOnlyIdAssignments: projection.ids.additions.map((entry) => entry.id),
      executableCustomizationPlans: projection.menu.items.filter((item) => item.orderingPlan || item.additionalOrderingPlans?.length).length,
    },
    differences,
  };
}
