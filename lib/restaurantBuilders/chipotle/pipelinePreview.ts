// Local preview only: the Chipotle menu as the import pipeline projects it,
// run through the same runtime adapter as the live generated menu.
//
// Selected by runtimeMenu.ts when NEXT_PUBLIC_CHIPOTLE_PIPELINE_PREVIEW
// is "1". The input is the pipeline's staging output, regenerated with
// `npm run pipeline -- chipotle`; it is not a published menu.
import projectedMenu from "@/data/restaurants/staging/chipotle/runtime-menu.json";
import { adaptGeneratedChipotleMenuForRuntime } from "@/lib/restaurantBuilders/chipotle/generatedRuntimeAdapter";
import { toGeneratedChipotleInput } from "@/lib/restaurantBuilders/chipotle/pipelinePreviewInput";
import type { RestaurantMenu } from "@/types/menu";

let previewMenu: RestaurantMenu | undefined;

export function getChipotlePipelinePreviewMenu(): RestaurantMenu {
  return previewMenu ??= adaptGeneratedChipotleMenuForRuntime(
    toGeneratedChipotleInput(projectedMenu as unknown as RestaurantMenu),
  );
}
