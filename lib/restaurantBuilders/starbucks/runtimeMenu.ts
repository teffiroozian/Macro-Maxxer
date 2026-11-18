import staged from "@/data/restaurants/staging/starbucks/runtime-menu.json";
import { STARBUCKS_GENERATED_RUNTIME_MENU } from "./generatedRuntimeAdapter";
import type { RestaurantMenu } from "@/types/menu";

export const isStarbucksPipelinePreview = process.env.NEXT_PUBLIC_STARBUCKS_PIPELINE_PREVIEW === "1";

export function getStarbucksRuntimeMenu(): RestaurantMenu {
  return isStarbucksPipelinePreview ? staged as unknown as RestaurantMenu : STARBUCKS_GENERATED_RUNTIME_MENU;
}
