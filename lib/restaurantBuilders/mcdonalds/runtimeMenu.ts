import staged from "@/data/restaurants/staging/mcdonalds/runtime-menu.json";
import type { RestaurantMenu } from "@/types/menu";
import { MCDONALDS_GENERATED_RUNTIME_MENU } from "./generatedRuntimeAdapter";

export const isMcDonaldsPipelinePreview = process.env.NEXT_PUBLIC_MCDONALDS_PIPELINE_PREVIEW === "1";

export function getMcDonaldsRuntimeMenu(): RestaurantMenu {
  return isMcDonaldsPipelinePreview ? staged as unknown as RestaurantMenu : MCDONALDS_GENERATED_RUNTIME_MENU;
}
