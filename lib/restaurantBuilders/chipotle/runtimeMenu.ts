import { CHIPOTLE_GENERATED_RUNTIME_MENU } from "@/lib/restaurantBuilders/chipotle/generatedRuntimeAdapter";
import { getChipotlePipelinePreviewMenu } from "@/lib/restaurantBuilders/chipotle/pipelinePreview";

export const isChipotlePipelinePreview = process.env.NEXT_PUBLIC_CHIPOTLE_PIPELINE_PREVIEW === "1";

// Cart lookups are synchronous, so the menu loader and compatibility helpers
// use the same synchronous selector. Adapt the staged data only in preview.
export function getChipotleRuntimeMenu() {
  return isChipotlePipelinePreview
    ? getChipotlePipelinePreviewMenu()
    : CHIPOTLE_GENERATED_RUNTIME_MENU;
}
