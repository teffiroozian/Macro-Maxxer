import preview from "@/data/restaurants/staging/chickfila/runtime-menu.json";
import { CHICKFILA_GENERATED_RUNTIME_MENU, adaptChickfilaMenuForRuntime } from "./generatedRuntimeAdapter";
import type { RestaurantMenu } from "@/types/menu";

export const isChickfilaPipelinePreview = process.env.NEXT_PUBLIC_CHICKFILA_PIPELINE_PREVIEW === "1";

let previewMenu: RestaurantMenu | undefined;

export function getChickfilaRuntimeMenu(): RestaurantMenu {
  if (!isChickfilaPipelinePreview) return CHICKFILA_GENERATED_RUNTIME_MENU;
  return previewMenu ??= adaptChickfilaMenuForRuntime(preview as unknown as RestaurantMenu);
}
